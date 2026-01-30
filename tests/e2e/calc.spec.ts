import { test, expect } from "@playwright/test";

test("Beräkna, spara och ladda scenario", async ({ page }) => {
  // först logga in (om du använder auth i e2e, annars kan du
  // antingen stänga av middleware i testmiljö eller logga in manuellt här)
  await page.goto("/login");
  await page.getByLabel("username").fill("demo");
  await page.getByLabel("password").fill("demo123");
  await page.getByLabel("login-button").click();

  await expect(page).toHaveURL("/");

  // nu ska kalkylatorn synas på startsidan
  await page.getByLabel("trucks").fill("5");
  await page.getByLabel("hoursPerDay").fill("10");
  await page.getByLabel("costPerHour").fill("200");

  await page.getByRole("button", { name: "Beräkna" }).click();

  await expect(page.getByText("Dagkostnad:")).toBeVisible();
  await expect(page.getByText("10000")).toBeVisible();

  await page.getByLabel("scenario-name").fill("E2E Test");
  await page.getByRole("button", { name: "Spara" }).click();

  await expect(page.getByText("E2E Test")).toBeVisible();

  const loadBtn = page.locator('button[aria-label^="load-"]').first();
  await loadBtn.click();

  await expect(page.getByLabel("trucks")).toHaveValue("5");
  await expect(page.getByLabel("hoursPerDay")).toHaveValue("10");
  await expect(page.getByLabel("costPerHour")).toHaveValue("200");
});