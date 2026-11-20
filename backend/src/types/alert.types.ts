export type AlertState = "open" | "acknowledged";

export interface Alert {
  id: string;
  vehicle_id: string;
  rule: string;
  state: AlertState;
  opened_at: string;
  version: number;
}