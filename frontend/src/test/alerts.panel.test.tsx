import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AlertsPanel from "../components/alerts/AlertsPanel";
import * as alertsApi from "../services/alerts.api";
import type { Alert } from "../types/alert";

vi.mock("../services/alerts.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/alerts.api")>();
  return {
    ...actual,
    fetchAlerts: vi.fn(),
    acknowledgeAlert: vi.fn(),
  };
});

describe("AlertsPanel - optimistic update, rollback, and 409 handling", () => {
  const mockAlert: Alert = {
    id: "ALT-00001",
    vehicle_id: "VG-00001",
    rule: "battery_temperature_high",
    state: "open",
    opened_at: "2026-11-24T09:00:00.000Z",
    version: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(alertsApi.fetchAlerts).mockResolvedValue({
      success: true,
      total: 1,
      items: [mockAlert],
      next_cursor: null,
    });
  });

  it("renders alerts and handles optimistic acknowledge on success", async () => {
    const user = userEvent.setup();

    vi.mocked(alertsApi.acknowledgeAlert).mockResolvedValue({
      success: true,
      message: "Alert acknowledged",
      data: { ...mockAlert, state: "acknowledged", version: 2 },
    });

    render(<AlertsPanel />);

    expect(await screen.findByText("battery_temperature_high")).toBeInTheDocument();

    const ackButton = screen.getByRole("button", { name: "Acknowledge" });
    await user.click(ackButton);

    await waitFor(() => {
      expect(screen.getByText(/acknowledged successfully/i)).toBeInTheDocument();
    });
  });

  it("rolls back optimistic state on API network error", async () => {
    const user = userEvent.setup();

    vi.mocked(alertsApi.acknowledgeAlert).mockRejectedValue(
      new Error("Network connection dropped")
    );

    render(<AlertsPanel />);

    expect(await screen.findByText("battery_temperature_high")).toBeInTheDocument();

    const ackButton = screen.getByRole("button", { name: "Acknowledge" });
    await user.click(ackButton);

    await waitFor(() => {
      expect(screen.getByText(/Network connection dropped/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Acknowledge" })).toBeInTheDocument();
    });
  });

  it("handles HTTP 409 conflict when another operator acknowledges the alert first", async () => {
    const user = userEvent.setup();

    vi.mocked(alertsApi.acknowledgeAlert).mockRejectedValue(
      new alertsApi.AlertApiError("Alert has been modified. Please refresh.", 409, 2)
    );

    render(<AlertsPanel />);

    expect(await screen.findByText("battery_temperature_high")).toBeInTheDocument();

    const ackButton = screen.getByRole("button", { name: "Acknowledge" });
    await user.click(ackButton);

    await waitFor(() => {
      expect(screen.getByText(/Conflict \(HTTP 409\)/i)).toBeInTheDocument();
    });

    expect(alertsApi.fetchAlerts).toHaveBeenCalledTimes(2);
  });
});
