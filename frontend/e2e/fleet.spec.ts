import { test, expect } from "@playwright/test";

test.describe("Live Fleet Console E2E Integration", () => {
  test("filter -> select vehicle -> acknowledge alert with faults enabled", async ({ page, request }) => {
    // 1. Enable faults on backend to test resilient operation under latency and duplicates
    const faultResponse = await request.post("http://localhost:5000/v1/config/faults", {
      data: {
        latencyMs: 500,
        duplicates: true,
        outOfOrder: true,
      },
    });
    expect(faultResponse.ok()).toBeTruthy();

    // 2. Navigate to the dashboard
    await page.goto("http://localhost:5173");
    await expect(page.locator("h1")).toContainText("Live Fleet Console");

    // Verify summary statistics load
    await expect(page.getByText(/TOTAL VEHICLES/i)).toBeVisible({ timeout: 10000 });

    // 3. Apply Filter: Filter by status "moving"
    const statusSelect = page.locator("select");
    await statusSelect.selectOption("moving");

    // Verify URL reflects the status filter
    await expect(page).toHaveURL(/status=moving/);

    // 4. Select a vehicle from the virtualized list
    const firstVehicleRow = page.locator('[role="option"]').first();
    await expect(firstVehicleRow).toBeVisible();

    // Click vehicle row
    await firstVehicleRow.click();

    // Verify URL reflects selected vehicle
    await expect(page).toHaveURL(/selected=VG-/);

    // Verify Telemetry History Panel auto-opens and updates for selected vehicle
    await expect(page.getByText("Vehicle Telemetry Dynamics")).toBeVisible();
    await expect(page.getByText("Battery State of Charge")).toBeVisible();

    // 5. Acknowledge an open alert in the Alerts panel
    const openAlertItem = page.locator("article").first();
    await expect(openAlertItem).toBeVisible({ timeout: 10000 });

    const ackButton = openAlertItem.getByRole("button", { name: "Acknowledge" });
    if (await ackButton.isVisible()) {
      await ackButton.click();

      // Verify optimistic update and confirmation message
      await expect(
        page.getByText(/acknowledged successfully/i)
      ).toBeVisible({ timeout: 8000 });
    }

    // Reset faults after test
    await request.post("http://localhost:5000/v1/config/faults", {
      data: {
        latencyMs: 0,
        duplicates: false,
        outOfOrder: false,
        disconnect: false,
      },
    });
  });
});
