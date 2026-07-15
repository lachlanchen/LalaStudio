import { describe, expect, it } from "vitest";
import { isProductionMessage, planProductionRequest } from "../src/video-chat.js";
import type { VideoSettings } from "../src/types.js";

const defaults: VideoSettings = {
  mode: "short",
  model: "Seedance 2.0 Mini 体验版",
  duration: 15,
  ratio: "4:3",
  selectedAssetIds: ["word-card", "zhuangzi", "lightmind", "notebook", "raraxia", "ayachan", "sasakun"],
  wordCard: { english: "glide", japanese: "滑る", furigana: "すべる", chinese: "滑行" }
};

describe("video chat planning", () => {
  it("separates story discussion from production requests", () => {
    expect(isProductionMessage("检查这篇故事的对白是否自然")).toBe(false);
    expect(isProductionMessage("请把这个故事生成15秒视频")).toBe(true);
    expect(isProductionMessage("Generate a 30 second video from this story")).toBe(true);
  });

  it("keeps current safe defaults when the request is concise", () => {
    const request = planProductionRequest({
      storyId: "story-1",
      message: "请生成这个视频",
      current: defaults,
      storyDuration: 15
    });
    expect(request.settings).toEqual(defaults);
    expect(request.summary).toContain("15s · 4:3");
    expect(request.settings.selectedAssetIds).not.toContain("trio");
  });

  it("extracts explicit duration, ratio, mode, and low-credit model", () => {
    const request = planProductionRequest({
      storyId: "story-2",
      message: "做成45秒、9:16的创作 Agent 视频，使用最便宜的 Mini 体验版",
      current: defaults
    });
    expect(request.settings.duration).toBe(45);
    expect(request.settings.ratio).toBe("9:16");
    expect(request.settings.mode).toBe("agent");
    expect(request.settings.model).toBe("Seedance 2.0 Mini 体验版");
  });
});
