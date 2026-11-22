import type {
  AlertState,
  AlertsResponse,
  AcknowledgeAlertResponse,
} from "../types/alert";

const API_URL = import.meta.env.VITE_API_URL;

interface FetchAlertsParams {
  state?: AlertState | "all";
  limit?: number;
  cursor?: string;
}

export class AlertApiError extends Error {
  status: number;
  currentVersion?: number;

  constructor(
    message: string,
    status: number,
    currentVersion?: number
  ) {
    super(message);

    this.name = "AlertApiError";
    this.status = status;
    this.currentVersion = currentVersion;
  }
}

// Fetch alerts
export async function fetchAlerts(
  params: FetchAlertsParams = {}
): Promise<AlertsResponse> {
  const searchParams = new URLSearchParams();

  searchParams.set("limit", String(params.limit ?? 50));

  if (params.state && params.state !== "all") {
    searchParams.set("state", params.state);
  }

  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }

  const response = await fetch(
    `${API_URL}/v1/alerts?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new AlertApiError(
      "Failed to fetch alerts",
      response.status
    );
  }

  return response.json() as Promise<AlertsResponse>;
}

// Acknowledge an alert
export async function acknowledgeAlert(
  alertId: string,
  version: number
): Promise<AcknowledgeAlertResponse> {
  const response = await fetch(
    `${API_URL}/v1/alerts/${encodeURIComponent(alertId)}/ack`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({ version }),
    }
  );

  const result = await response.json() as {
    success: boolean;
    message: string;
    data?: AcknowledgeAlertResponse["data"];
    current_version?: number;
  };

  if (!response.ok) {
    throw new AlertApiError(
      result.message || "Failed to acknowledge alert",
      response.status,
      result.current_version
    );
  }

  return result as AcknowledgeAlertResponse;
}