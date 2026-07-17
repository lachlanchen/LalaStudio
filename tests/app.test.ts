import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";

describe("Studio API", () => {
  const app = createApp();

  it("serves a health response", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body).toMatchObject({ ok: true, service: "Lala Studio" });
  });

  it("exposes model and production defaults", async () => {
    const response = await request(app).get("/api/bootstrap").expect(200);
    expect(response.body.models).toEqual(expect.arrayContaining([
      expect.objectContaining({ route: "chat", model: "gpt-5.6-sol", effort: "low" }),
      expect.objectContaining({ route: "workflow", model: "gpt-5.6-sol", effort: "ultra" })
    ]));
    expect(response.body.defaults.video).toMatchObject({ duration: 15, ratio: "4:3", preGenerateWordCard: true });
    expect(response.body.defaults.video.selectedAssetIds).not.toContain("trio");
    expect(response.body.status.noVncUrl).toContain("scale=1");
    expect(response.body.status.noVncUrl).not.toContain("resize=remote");
    for (const video of response.body.videos) {
      expect(video.mediaUrl).toBe(`/media/videos/${encodeURIComponent(video.name)}`);
    }
  }, 15_000);

  it("rejects invalid or missing video media paths", async () => {
    await request(app).get("/media/videos/not-a-video.txt").expect(404);
    await request(app).get("/media/videos/missing-preview.mp4").expect(404);
  });

  it("blocks unconfirmed paid generation before a workflow starts", async () => {
    const bootstrap = await request(app).get("/api/bootstrap").expect(200);
    const settings = bootstrap.body.defaults.video;
    const response = await request(app)
      .post("/api/video/jobs")
      .send({
        storyId: "unconfirmed-example",
        settings,
        prompt: "啦啦侠、阿芽酱和飒飒君一起出发。不要字幕。",
        operation: "generate",
        paidActionConfirmed: false
      })
      .expect(409);
    expect(response.body.error).toContain("explicit confirmation");
  }, 15_000);
});
