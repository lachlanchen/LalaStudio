import { expect, test } from "@playwright/test";

test("opens the writing workspace without overlap", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText("Lala Studio", { exact: true })).toBeVisible();
  await expect(page.locator('.nav-items button[title="Write"]')).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await page.screenshot({
    path: `.playwright/${testInfo.project.name}-write.png`,
    fullPage: true
  });
});

test("opens production controls", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.locator('.nav-items button[title="Produce"]').click();
  await expect(page.getByText("Video settings", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Video model")).toHaveValue("Seedance 2.0 Mini 体验版");
  await page.screenshot({
    path: `.playwright/${testInfo.project.name}-produce.png`,
    fullPage: true
  });
});
