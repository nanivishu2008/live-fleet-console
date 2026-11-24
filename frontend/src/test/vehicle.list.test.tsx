import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VehicleList from "../components/fleet/VehicleList";
import { useFleetStore } from "../store/fleet.store";
import { useSelectionStore } from "../store/selection.store";
import type { Vehicle } from "../types/vehicle";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * estimateSize(),
        size: estimateSize(),
      })),
    getTotalSize: () => count * estimateSize(),
    scrollToIndex: vi.fn(),
  }),
}));

describe("VehicleList - keyboard navigation and ARIA roles", () => {
  const mockVehicles: Vehicle[] = [
    {
      vehicle_id: "VG-00001",
      status: "moving",
      soc_pct: 90,
      battery_temp_c: 25,
      speed_kmh: 40,
      lat: 13.08,
      lng: 80.27,
      updated_at: new Date().toISOString(),
    },
    {
      vehicle_id: "VG-00002",
      status: "charging",
      soc_pct: 45,
      battery_temp_c: 32,
      speed_kmh: 0,
      lat: 13.09,
      lng: 80.28,
      updated_at: new Date(Date.now() - 120000).toISOString(), // > 90s ago
    },
  ];

  beforeEach(() => {
    useSelectionStore.setState({ selectedVehicleId: null });
    useFleetStore.setState({
      vehicles: mockVehicles,
      loading: false,
      error: null,
      staleVehicleIds: new Set(["VG-00002"]),
    });
  });

  it("renders listbox with options and correct ARIA attributes", () => {
    render(<VehicleList />);

    const listbox = screen.getByRole("listbox", { name: "Vehicle fleet list" });
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options.length).toBe(2);
    expect(options[0]).toHaveAttribute("aria-selected", "false");
  });

  it("displays stale badge when vehicle has not sent telemetry for >90s", () => {
    render(<VehicleList />);

    expect(screen.getByText("Stale")).toBeInTheDocument();
  });

  it("supports keyboard navigation with ArrowDown and Enter to select", async () => {
    const user = userEvent.setup();
    render(<VehicleList />);

    const options = screen.getAllByRole("option");

    // Focus first option and press Enter
    options[0].focus();
    await user.keyboard("{Enter}");

    expect(useSelectionStore.getState().selectedVehicleId).toBe("VG-00001");

    // Press ArrowDown to select next vehicle
    await user.keyboard("{ArrowDown}");
    expect(useSelectionStore.getState().selectedVehicleId).toBe("VG-00002");
  });
});
