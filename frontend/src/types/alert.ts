export type AlertState = "open" | "acknowledged";

export interface Alert {
  id: string;
  vehicle_id: string;
  rule: string;
  state: AlertState;
  opened_at: string;
  version: number;
}

export interface AlertsResponse {
  success: boolean;
  total: number;
  items: Alert[];
  next_cursor: string | null;
}

export interface AcknowledgeAlertResponse {
  success: boolean;
  message: string;
  data: Alert;
}