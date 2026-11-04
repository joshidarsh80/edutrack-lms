import { expect, test } from "@playwright/test";

test("public landing page presents course discovery and sign-up paths", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /make room for what’s next/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /see all courses/i })).toHaveAttribute("href", "/courses");
  await expect(page.getByRole("link", { name: /get started/i }).first()).toHaveAttribute("href", "/register");
  if (process.env.PREVIEW_SCREENSHOT_PATH) await page.screenshot({ path: process.env.PREVIEW_SCREENSHOT_PATH, fullPage: true });
});

test("registration page exposes the supported student and instructor roles", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: /make room for what’s next/i })).toBeVisible();
  await expect(page.getByLabel("I’m joining as").locator("option")).toHaveText(["Student", "Instructor"]);
});
