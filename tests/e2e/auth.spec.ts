import { test, expect } from "@playwright/test";

test("Godkänd inloggning", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("username").fill("demo");
  await page.getByLabel("password").fill("demo123");
  await page.getByLabel("login-button").click();

  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("logout-button")).toBeVisible();
});

test("Fel användarnamn eller lösenord visar feltext", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("username").fill("demo");
  await page.getByLabel("password").fill("fel");
  await page.getByLabel("login-button").click();

  await expect(page).toHaveURL("/login");
await expect(page.getByTestId("login-error")).toHaveText("Fel användarnamn eller lösenord.");});

test("Logga ut leder tillbaka till inloggningssidan", async ({ page }) => {
  // login
  await page.goto("/login");
  await page.getByLabel("username").fill("demo");
  await page.getByLabel("password").fill("demo123");
  await page.getByLabel("login-button").click();
  await expect(page).toHaveURL("/");

  // logout
  await page.getByLabel("logout-button").click();
  await expect(page).toHaveURL("/login");

  // skydd: gå till start igen ska redirecta till login
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});