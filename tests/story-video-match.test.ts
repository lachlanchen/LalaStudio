import { describe, expect, it } from "vitest";
import { storyVideoMatchScore } from "../server/story-repository.js";

describe("story video matching", () => {
  const storyId = "2026-07-17-story-20260717030205";

  it("prefers the exact generated filename", () => {
    expect(storyVideoMatchScore(storyId, `${storyId}.mp4`)).toBe(0);
  });

  it("accepts processed derivatives and legacy normalized names", () => {
    expect(storyVideoMatchScore(storyId, `${storyId}-portrait.mp4`)).toBe(1);
    expect(storyVideoMatchScore(storyId, "story_20260717030205_portrait.mp4")).toBe(2);
  });

  it("rejects unrelated media and non-video files", () => {
    expect(storyVideoMatchScore(storyId, "another-story.mp4")).toBe(-1);
    expect(storyVideoMatchScore(storyId, `${storyId}.jpg`)).toBe(-1);
  });
});
