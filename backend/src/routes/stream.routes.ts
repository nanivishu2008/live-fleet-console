import { Router } from "express";
import type { Response } from "express";

import {
  subscribe,
  getEventsAfter,
  type StreamEvent,
} from "../stream/event-broker.js";

const router = Router();

interface FaultConfig {
  latencyMs: number;
  duplicateRate: number;
  outOfOrder: boolean;
  disconnectAfter: number;
}

function getFaultConfig(query: Record<string, unknown>): FaultConfig {
  const latencyMs = Number(query.latencyMs ?? 0);
  const duplicateRate = Number(query.duplicateRate ?? 0);
  const disconnectAfter = Number(query.disconnectAfter ?? 0);

  return {
    latencyMs: Number.isFinite(latencyMs)
      ? Math.min(3000, Math.max(0, latencyMs))
      : 0,

    duplicateRate: Number.isFinite(duplicateRate)
      ? Math.min(1, Math.max(0, duplicateRate))
      : 0,

    outOfOrder: query.outOfOrder === "true",

    disconnectAfter:
      Number.isInteger(disconnectAfter) && disconnectAfter > 0
        ? disconnectAfter
        : 0,
  };
}

function sendEvent(res: Response, event: StreamEvent): void {
  res.write(`id: ${event.id}\n`);
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event.data)}\n\n`);
}

router.get("/", (req, res) => {
  const config = getFaultConfig(
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

    // Simulate events arriving out of order.
    let delay = config.latencyMs > 0
      ? Math.random() * config.latencyMs
      : 0;

    if (config.outOfOrder) {
      delay = event.id % 2 === 0
        ? 0
        : config.latencyMs;
    }

    const timer = setTimeout(() => {
      timers.delete(timer);

      if (disconnected) return;

      sendEvent(res, event);
      deliveredCount++;

      // Occasionally send the same event again.
      if (Math.random() < config.duplicateRate) {
        sendEvent(res, event);
      }

      // Simulate a sudden connection failure.
      if (
        config.disconnectAfter > 0 &&
        deliveredCount >= config.disconnectAfter
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

  const lastEventId = Number(req.headers["last-event-id"] ?? 0);

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