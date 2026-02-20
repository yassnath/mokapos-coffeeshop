import { expect, test } from "@playwright/test";

test("login -> create order -> pay -> KDS receives -> mark ready", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email / Username").fill("admin@solvixpos.local");
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(app|admin|pos|kds|history)/, { timeout: 20_000 });

  await page.goto("/pos");

  const openingCashInput = page.getByTestId("opening-cash-input");
  if (await openingCashInput.isVisible().catch(() => false)) {
    await openingCashInput.fill("500000");
    await page.getByTestId("open-shift-btn").click();
  }

  await page.getByPlaceholder("Cari menu (Ctrl+K)").fill("Butter Croissant");
  await page.getByRole("button", { name: /Butter Croissant/i }).first().click();
  await expect(page.getByText("1 item")).toBeVisible();

  await page.getByTestId("continue-payment-btn").click();
  await page.getByTestId("auto-balance-btn").click();
  await page.getByTestId("charge-btn").click();

  const paymentDialog = page.getByRole("dialog");
  await expect(paymentDialog.getByText("Payment successful")).toBeVisible();

  const orderText = await paymentDialog.getByText(/Order\s+/).first().textContent();
  const orderNumber = orderText?.match(/Order\s+([A-Z0-9-]+)/)?.[1] ?? "";

  await page.getByRole("button", { name: "Done" }).click();

  await page.goto("/kds");
  await expect(page.getByText(orderNumber)).toBeVisible({ timeout: 20_000 });

  const orderCard = page.locator(`article:has-text("${orderNumber}")`).first();

  if (await orderCard.getByRole("button", { name: "Start" }).isVisible()) {
    await orderCard.getByRole("button", { name: "Start" }).click();
  }

  await page.waitForTimeout(500);

  const readyCard = page.locator(`article:has-text("${orderNumber}")`).first();
  if (await readyCard.getByRole("button", { name: "Mark Ready" }).isVisible()) {
    await readyCard.getByRole("button", { name: "Mark Ready" }).click();
  }

  await expect(page.getByText(orderNumber)).toBeVisible();
});
