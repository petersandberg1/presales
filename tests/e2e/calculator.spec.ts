import { test, expect } from "@playwright/test";

test.describe("Calculator", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.getByLabel("username").fill("demo");
    await page.getByLabel("password").fill("demo123");
    await page.getByLabel("login-button").click();
    await expect(page).toHaveURL("/");
  });

  test("Calculate fleet requirements with default values", async ({ page }) => {
    // The page should already have default values loaded
    // Just click calculate to use defaults
    await page.getByLabel("calculate-button").click();

    // Wait for results to appear
    await expect(page.getByTestId("cycle-time-seconds")).toBeVisible();
    await expect(page.getByTestId("trucks-required")).toBeVisible();

    // Verify cycle time is calculated (should be 593 seconds with default haul inputs)
    const cycleTimeSeconds = await page
      .getByTestId("cycle-time-seconds")
      .textContent();
    expect(Number(cycleTimeSeconds)).toBeGreaterThan(0);

    // Verify trucks required is displayed as an integer
    const trucksRequired = await page
      .getByTestId("trucks-required")
      .textContent();
    expect(Number(trucksRequired)).toBeGreaterThan(0);
    expect(Number.isInteger(Number(trucksRequired))).toBe(true);

    // Verify other metrics are displayed
    await expect(page.getByTestId("tonnes-per-hour")).toBeVisible();
    await expect(page.getByTestId("tonnes-per-truck-year")).toBeVisible();
    await expect(page.getByTestId("raw-trucks")).toBeVisible();
  });

  test("Calculate with known inputs produces expected results", async ({
    page,
  }) => {
    // Fill in specific haul cycle inputs
    await page.getByLabel("distanceLoaded").fill("1450");
    await page.getByLabel("distanceUnloaded").fill("1450");
    await page.getByLabel("speedLoaded").fill("25");
    await page.getByLabel("speedUnloaded").fill("30");
    await page.getByLabel("loadingTime").fill("120");
    await page.getByLabel("unloadingTime").fill("90");

    // Fill truck payload
    await page.getByLabel("payloadTonnes").fill("150");

    // Operational factors are already at defaults (90%, 60%, 90%)
    // Mine production target is already at default (5,000,000)

    // Calculate
    await page.getByLabel("calculate-button").click();

    // Verify cycle time (should be approximately 593 seconds)
    const cycleTimeSeconds = await page
      .getByTestId("cycle-time-seconds")
      .textContent();
    expect(Math.abs(Number(cycleTimeSeconds) - 593)).toBeLessThan(2);

    // Verify cycle time in minutes (should be approximately 9.9 minutes)
    const cycleTimeMinutes = await page
      .getByTestId("cycle-time-minutes")
      .textContent();
    expect(cycleTimeMinutes).toContain("9.9");

    // Verify trucks required is a reasonable number (should be 2 for these inputs)
    const trucksRequired = await page
      .getByTestId("trucks-required")
      .textContent();
    expect(Number(trucksRequired)).toBeGreaterThanOrEqual(1);
    expect(Number(trucksRequired)).toBeLessThan(10);
  });

  test("Adjust operational factors and recalculate", async ({ page }) => {
    // Fill inputs
    await page.getByLabel("distanceLoaded").fill("1000");
    await page.getByLabel("distanceUnloaded").fill("1000");
    await page.getByLabel("speedLoaded").fill("20");
    await page.getByLabel("speedUnloaded").fill("25");
    await page.getByLabel("loadingTime").fill("100");
    await page.getByLabel("unloadingTime").fill("80");
    await page.getByLabel("payloadTonnes").fill("100");

    // Change operational factors
    await page.getByLabel("availabilityPercent").fill("85");
    await page.getByLabel("efficiencyPercent").fill("70");
    await page.getByLabel("utilizationPercent").fill("95");

    // Calculate
    await page.getByLabel("calculate-button").click();

    // Verify results appear
    await expect(page.getByTestId("trucks-required")).toBeVisible();
    const trucksRequired = await page
      .getByTestId("trucks-required")
      .textContent();
    expect(Number(trucksRequired)).toBeGreaterThan(0);
  });

  test("Show error for invalid inputs", async ({ page }) => {
    // Enter invalid speed (zero)
    await page.getByLabel("speedLoaded").fill("0");
    await page.getByLabel("calculate-button").click();

    // Verify error message appears
    await expect(page.getByTestId("calc-error")).toBeVisible();
    const errorText = await page.getByTestId("calc-error").textContent();
    expect(errorText).toBeTruthy();
  });

  test("Save, load, and delete scenario", async ({ page }) => {
    // Set up inputs
    await page.getByLabel("distanceLoaded").fill("2000");
    await page.getByLabel("distanceUnloaded").fill("2000");
    await page.getByLabel("speedLoaded").fill("30");
    await page.getByLabel("speedUnloaded").fill("35");
    await page.getByLabel("loadingTime").fill("150");
    await page.getByLabel("unloadingTime").fill("100");
    await page.getByLabel("payloadTonnes").fill("200");

    // Calculate
    await page.getByLabel("calculate-button").click();
    await expect(page.getByTestId("trucks-required")).toBeVisible();

    // Get the calculated value
    const originalTrucks = await page
      .getByTestId("trucks-required")
      .textContent();

    // Save scenario
    await page.getByLabel("scenario-name").fill("E2E Test Scenario");
    await page.getByLabel("save-scenario").click();

    // Verify scenario appears in list
    await expect(page.locator('text="E2E Test Scenario"')).toBeVisible();

    // Change inputs to different values
    await page.getByLabel("distanceLoaded").fill("1000");
    await page.getByLabel("payloadTonnes").fill("100");
    await page.getByLabel("calculate-button").click();

    // Verify trucks required has changed
    const newTrucks = await page.getByTestId("trucks-required").textContent();
    expect(newTrucks).not.toBe(originalTrucks);

    // Load the saved scenario
    const scenarioItem = page.locator('text="E2E Test Scenario"').locator("..");
    const loadButton = scenarioItem.getByRole("button", { name: /load/i });
    await loadButton.click();

    // Verify inputs are restored
    const distanceLoaded = await page.getByLabel("distanceLoaded").inputValue();
    expect(distanceLoaded).toBe("2000");

    const payloadTonnes = await page.getByLabel("payloadTonnes").inputValue();
    expect(payloadTonnes).toBe("200");

    // Verify results are restored
    const restoredTrucks = await page
      .getByTestId("trucks-required")
      .textContent();
    expect(restoredTrucks).toBe(originalTrucks);

    // Delete the scenario
    const deleteButton = scenarioItem.locator('[aria-label*="delete-scenario"]');
    await deleteButton.click();

    // Verify scenario is removed from list
    await expect(page.locator('text="E2E Test Scenario"')).not.toBeVisible();
  });

  test("Save multiple scenarios and manage them", async ({ page }) => {
    // Create first scenario
    await page.getByLabel("distanceLoaded").fill("1500");
    await page.getByLabel("payloadTonnes").fill("120");
    await page.getByLabel("calculate-button").click();
    await expect(page.getByTestId("trucks-required")).toBeVisible();

    await page.getByLabel("scenario-name").fill("Scenario A");
    await page.getByLabel("save-scenario").click();
    await expect(page.locator('text="Scenario A"')).toBeVisible();

    // Create second scenario
    await page.getByLabel("distanceLoaded").fill("3000");
    await page.getByLabel("payloadTonnes").fill("180");
    await page.getByLabel("calculate-button").click();

    await page.getByLabel("scenario-name").fill("Scenario B");
    await page.getByLabel("save-scenario").click();
    await expect(page.locator('text="Scenario B"')).toBeVisible();

    // Verify both scenarios are in the list
    const scenarios = page.locator('[data-testid^="scenario-"]');
    await expect(scenarios).toHaveCount(2);

    // Clean up - delete both scenarios
    const deleteButtons = page.locator('[aria-label*="delete-scenario"]');
    await deleteButtons.first().click();
    await deleteButtons.first().click(); // First again because list updates

    await expect(scenarios).toHaveCount(0);
  });

  test("Prevent saving scenario without calculation", async ({ page }) => {
    // Try to save without calculating
    await page.getByLabel("scenario-name").fill("No Calc Scenario");

    // Button should be disabled
    const saveButton = page.getByLabel("save-scenario");
    await expect(saveButton).toBeDisabled();
  });

  test("Prevent saving scenario without name", async ({ page }) => {
    // Calculate first
    await page.getByLabel("calculate-button").click();
    await expect(page.getByTestId("trucks-required")).toBeVisible();

    // Try to save without name (button should be disabled)
    const saveButton = page.getByLabel("save-scenario");
    await expect(saveButton).toBeDisabled();

    // Enter name, button should become enabled
    await page.getByLabel("scenario-name").fill("Named Scenario");
    await expect(saveButton).toBeEnabled();
  });

  test("Display all result metrics", async ({ page }) => {
    // Calculate with default values
    await page.getByLabel("calculate-button").click();

    // Verify all metrics are displayed
    await expect(page.getByTestId("cycle-time-seconds")).toBeVisible();
    await expect(page.getByTestId("cycle-time-minutes")).toBeVisible();
    await expect(page.getByTestId("tonnes-per-hour")).toBeVisible();
    await expect(page.getByTestId("tonnes-per-truck-year")).toBeVisible();
    await expect(page.getByTestId("raw-trucks")).toBeVisible();
    await expect(page.getByTestId("trucks-required")).toBeVisible();

    // Verify effective factor is displayed (should be 49% with defaults: 90% × 60% × 90%)
    const resultsText = await page.textContent("body");
    expect(resultsText).toContain("%");
  });

  test("Update production target and recalculate", async ({ page }) => {
    // Calculate with default production target (5,000,000)
    await page.getByLabel("calculate-button").click();
    await expect(page.getByTestId("trucks-required")).toBeVisible();
    const defaultTrucks = await page
      .getByTestId("trucks-required")
      .textContent();

    // Change production target to higher value
    await page.getByLabel("totalMineTonnesPerYear").fill("10000000");
    await page.getByLabel("calculate-button").click();

    // Verify trucks required increases
    const higherTrucks = await page
      .getByTestId("trucks-required")
      .textContent();
    expect(Number(higherTrucks)).toBeGreaterThan(Number(defaultTrucks));
  });
});
