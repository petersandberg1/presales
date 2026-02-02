import { test, expect } from "@playwright/test";

test("Successful login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("username").fill("demo");
  await page.getByLabel("password").fill("demo123");
  await page.getByLabel("login-button").click();

  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("logout-button")).toBeVisible();
});

test("Invalid username or password shows error message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("username").fill("demo");
  await page.getByLabel("password").fill("wrong");
  await page.getByLabel("login-button").click();

  await expect(page).toHaveURL("/login");
  await expect(page.getByTestId("login-error")).toHaveText(
    "Invalid username or password."
  );
});

test("Logout redirects to login page", async ({ page }) => {
  // Login
  await page.goto("/login");
  await page.getByLabel("username").fill("demo");
  await page.getByLabel("password").fill("demo123");
  await page.getByLabel("login-button").click();
  await expect(page).toHaveURL("/");

  // Logout
  await page.getByLabel("logout-button").click();
  await expect(page).toHaveURL("/login");

  // Verify protection: navigating to home should redirect to login
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});
