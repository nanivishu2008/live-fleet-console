const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface FaultConfigPayload {
  latencyMs?: number;
  duplicates?: boolean;
  duplicateRate?: number;
  outOfOrder?: boolean;
  disconnect?: boolean;
  disconnectAfter?: number;
}

export async function fetchFaultsConfig() {
  const response = await fetch(`${API_URL}/v1/config/faults`);
  if (!response.ok) {
    throw new Error("Failed to fetch fault configuration");
  }
  return response.json();
}

export async function updateFaultsConfig(payload: FaultConfigPayload) {
  const response = await fetch(`${API_URL}/v1/config/faults`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to update fault configuration");
  }
  return response.json();
}
