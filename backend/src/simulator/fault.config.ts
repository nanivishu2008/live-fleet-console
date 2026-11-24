export interface FaultsConfig {
  latencyMs: number;
  duplicates: boolean;
  duplicateRate: number;
  outOfOrder: boolean;
  disconnect: boolean;
  disconnectAfter: number;
}

export const activeFaults: FaultsConfig = {
  latencyMs: 0,
  duplicates: false,
  duplicateRate: 0,
  outOfOrder: false,
  disconnect: false,
  disconnectAfter: 0,
};

export function updateFaults(newConfig: Partial<FaultsConfig>): FaultsConfig {
  if (typeof newConfig.latencyMs === "number") {
    activeFaults.latencyMs = Math.min(3000, Math.max(0, newConfig.latencyMs));
  } else if (typeof (newConfig as any).latency === "number") {
    activeFaults.latencyMs = Math.min(3000, Math.max(0, (newConfig as any).latency));
  } else if ((newConfig as any).latency === true) {
    activeFaults.latencyMs = 3000;
  } else if ((newConfig as any).latency === false) {
    activeFaults.latencyMs = 0;
  }

  if (typeof newConfig.duplicates === "boolean") {
    activeFaults.duplicates = newConfig.duplicates;
    activeFaults.duplicateRate = newConfig.duplicates ? 0.3 : 0;
  } else if (typeof newConfig.duplicateRate === "number") {
    activeFaults.duplicateRate = Math.min(1, Math.max(0, newConfig.duplicateRate));
    activeFaults.duplicates = activeFaults.duplicateRate > 0;
  }

  if (typeof newConfig.outOfOrder === "boolean") {
    activeFaults.outOfOrder = newConfig.outOfOrder;
  }

  if (typeof newConfig.disconnect === "boolean") {
    activeFaults.disconnect = newConfig.disconnect;
    activeFaults.disconnectAfter = newConfig.disconnect ? 100 : 0;
  } else if (typeof newConfig.disconnectAfter === "number") {
    activeFaults.disconnectAfter = Math.max(0, newConfig.disconnectAfter);
    activeFaults.disconnect = activeFaults.disconnectAfter > 0;
  }

  return { ...activeFaults };
}
