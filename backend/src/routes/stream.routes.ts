import { Router } from "express";
import type { Response } from "express";

import {
  subscribe,
  getEventsAfter,
  type StreamEvent,
} from "../stream/event-broker.js";
import { activeFaults } from "../simulator/fault.config.js";

const router = Router();

interface EffectiveFaultConfig {
  latencyMs: number;
  duplicateRate: number;
  outOfOrder: boolean;
  disconnectAfter: number;
}

function getEffectiveFaultConfig(query: Record<string, unknown>): EffectiveFaultConfig {
  const queryLatency = Number(query.latencyMs ?? 0);
  const queryDuplicate = Number(query.duplicateRate ?? 0);
  const queryDisconnect = Number(query.disconnectAfter ?? 0);

  const latencyMs = Number.isFinite(queryLatency) && queryLatency > 0
    ? Math.min(3000, queryLatency)
    : activeFaults.latencyMs;

  const duplicateRate = Number.isFinite(queryDuplicate) && queryDuplicate > 0
    ? Math.min(1, queryDuplicate)
    : activeFaults.duplicateRate;

  const outOfOrder = query.outOfOrder === "true" || activeFaults.outOfOrder;

  const disconnectAfter = Number.isInteger(queryDisconnect) && queryDisconnect > 0
    ? queryDisconnect
    : activeFaults.disconnectAfter;

  return {
    latencyMs,
    duplicateRate,
    outOfOrder,
    disconnectAfter,
  };
}

function sendEvent(res: Response, event: StreamEvent): void {
  res.write(`id: ${event.id}\n`);
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event.data)}\n\n`);
}

router.get("/", (req, res) => {
  const config = getEffectiveFaultConfig(
    req.query as Record<string, unknown>
  );

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders();

  res.write(": Connected to fleet event stream\n\n");

  let deliveredCount = 0;
  let disconnected = false;

  const timers = new Set<ReturnType<typeof setTimeout>>();

  function scheduleEvent(event: StreamEvent): void {
    if (disconnected) return;

    // Check dynamic faults as well
    const effectiveLatency = activeFaults.latencyMs > 0 ? activeFaults.latencyMs : config.latencyMs;
    const effectiveOutOfOrder = activeFaults.outOfOrder || config.outOfOrder;
    const effectiveDuplicateRate = activeFaults.duplicateRate > 0 ? activeFaults.duplicateRate : config.duplicateRate;
    const effectiveDisconnectAfter = activeFaults.disconnectAfter > 0 ? activeFaults.disconnectAfter : config.disconnectAfter;

    let delay = effectiveLatency > 0
      ? Math.random() * effectiveLatency
      : 0;

    if (effectiveOutOfOrder) {
      delay = event.id % 2 === 0
        ? 0
        : (effectiveLatency > 0 ? effectiveLatency : 400);
    }

    const timer = setTimeout(() => {
      timers.delete(timer);

      if (disconnected) return;

      sendEvent(res, event);
      deliveredCount++;

      // Duplicate delivery fault
      if (Math.random() < effectiveDuplicateRate) {
        sendEvent(res, event);
      }

      // Disconnect fault
      if (
        (effectiveDisconnectAfter > 0 && deliveredCount >= effectiveDisconnectAfter) ||
        (activeFaults.disconnect && deliveredCount > 50)
      ) {
        disconnected = true;
        unsubscribe();
        clearInterval(heartbeat);

        for (const pendingTimer of timers) {
          clearTimeout(pendingTimer);
        }

        timers.clear();
        res.end();
      }
    }, delay);

    timers.add(timer);
  }

  // Subscribe before replaying buffered events.
  const unsubscribe = subscribe((event) => {
    scheduleEvent(event);
  });

  const lastEventId = Number(req.headers["last-event-id"] ?? req.query.lastEventId ?? 0);

  if (Number.isInteger(lastEventId) && lastEventId >= 0) {
    const missedEvents = getEventsAfter(lastEventId);

    for (const event of missedEvents) {
      scheduleEvent(event);
    }
  }

  const heartbeat = setInterval(() => {
    if (!disconnected) {
      res.write(": heartbeat\n\n");
    }
  }, 15000);

  req.on("close", () => {
    disconnected = true;
    unsubscribe();
    clearInterval(heartbeat);

    for (const timer of timers) {
      clearTimeout(timer);
    }

    timers.clear();
  });
});

export default router;
