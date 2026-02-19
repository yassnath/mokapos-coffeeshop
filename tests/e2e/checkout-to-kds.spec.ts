import { expect, test } from "@playwright/test";

test("login -> create order -> pay -> KDS receives -> mark ready", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email / Username").fill("admin@solvixpos.local");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.goto("/pos");

  const openShift = page.getByRole("button", { name: "Open" });
  if (await openShift.isVisible()) {
    await page.getByPlaceholder("Opening cash").fill("500000");
    await openShift.click();
  }

  await page
    .getByRole("button", { name: /Espresso|Latte|Cappuccino/ })
    .first()
    .click();

  await page.getByRole("button", { name: "Continue to Payment" }).click();
  await page.getByRole("button", { name: "Auto Balance" }).click();
  await page.getByRole("button", { name: /Charge/ }).click();

  await expect(page.getByText("Payment successful")).toBeVisible();

  const orderText = await page.locator("text=/Order SVX-/").first().textContent();
  const orderNumber = orderText?.replace("Order", "").trim() ?? "";

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
