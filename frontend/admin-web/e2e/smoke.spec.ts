import { expect, test } from "@playwright/test";

test("opens the landing page and reaches login", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /enter|launch|sign in|get started/i }).first().click();
  await expect(page.getByText(/welcome back/i)).toBeVisible();
});
