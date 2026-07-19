import { expect, test } from "@playwright/test";

test("opens the writing workspace without overlap", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByText("Lala Studio", { exact: true })).toBeVisible();
  await expect(page.locator('.nav-items button[title="Write"]')).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByTestId("quick-refine")).toContainText("Refine to final");
  await expect(page.getByTestId("studio-chat")).toHaveAttribute("data-context-turns");
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
  await expect(page.getByTestId("pregenerate-scene-image")).not.toBeChecked();
  await page.getByTestId("pregenerate-scene-image").check();
  await expect(page.getByTestId("scene-image-prompt")).toBeVisible();
  await expect(page.getByTestId("generate-reference-images")).toBeEnabled();
  await page.screenshot({
    path: `.playwright/${testInfo.project.name}-produce.png`,
    fullPage: true
  });
});

test("opens a matching generated video in the default preview modal", async ({ page }) => {
  await page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.videos = [{
      id: "demo.mp4",
      name: "demo.mp4",
      path: "/tmp/demo.mp4",
      relativePath: "Videos/demo.mp4",
      mediaUrl: "/media/videos/demo.mp4",
      size: 1024,
      updatedAt: "2026-07-17T00:00:00.000Z"
    }];
    await route.fulfill({ response, json: body });
  });
  await page.route("**/api/stories/demo", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.videoPath = "Videos/demo.mp4";
    body.status = "generated";
    await route.fulfill({ response, json: body });
  });

  await page.goto("/");
  await expect(page.getByTestId("video-preview-dialog")).toBeVisible();
  await expect(page.getByTestId("video-preview-player")).toHaveAttribute("src", "/media/videos/demo.mp4");
  await page.getByTestId("video-preview-close").click();
  await expect(page.getByTestId("video-preview-dialog")).toBeHidden();
  await expect(page.getByTestId("story-video-preview")).toBeVisible();
});

test("turns a publish chat command into a delivery contract", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("chat-input").fill("下载当前视频并发布到所有平台");
  await page.getByTestId("chat-send").click();
  await expect(page.getByTestId("delivery-card")).toBeVisible();
  await expect(page.getByTestId("delivery-card")).toContainText("LazyEdit");
  await expect(page.getByTestId("delivery-publish")).toBeVisible();
});
