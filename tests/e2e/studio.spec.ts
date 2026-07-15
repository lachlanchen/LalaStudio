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

test("turns a visible chat request into a production contract", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("chat-input").fill("请把当前故事生成15秒、4:3的视频，使用最便宜的 Mini 体验版");
  await page.getByTestId("chat-send").click();
  await expect(page.getByTestId("chat-message-user").last()).toContainText("生成15秒");
  await expect(page.getByTestId("production-card")).toBeVisible();
  await expect(page.getByTestId("production-card")).toContainText("15s · 4:3");
  await expect(page.getByTestId("production-generate")).toBeVisible();
});

test("opens production controls", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.locator('.nav-items button[title="Produce"]').click();
  await expect(page.getByText("Video settings", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Video model")).toHaveValue("Seedance 2.0 Mini 体验版");
  await expect(page.getByTestId("pregenerate-word-card")).toBeChecked();
  await page.screenshot({
    path: `.playwright/${testInfo.project.name}-produce.png`,
    fullPage: true
  });
});

test("turns a publish chat command into a delivery contract", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("chat-input").fill("下载当前视频并发布到所有平台");
  await page.getByTestId("chat-send").click();
  await expect(page.getByTestId("delivery-card")).toBeVisible();
  await expect(page.getByTestId("delivery-card")).toContainText("LazyEdit");
  await expect(page.getByTestId("delivery-publish")).toBeVisible();
});
