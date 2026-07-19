import { describe, expect, it } from "vitest";
import { buildVideoExecutorTask } from "../server/workflows.js";

describe("visible Xiaoyunque production contract", () => {
  it("requires noVNC and a Codex-generated word card before upload", () => {
    const task = buildVideoExecutorTask({
      storyId: "story-1",
      promptPath: "/tmp/prompt.md",
      assetIds: ["word-card", "raraxia"],
      assetPaths: ["/tmp/words-card.jpg", "/tmp/raraxia.jpeg"],
      settings: {
        mode: "short",
        model: "Seedance 2.0 Mini 体验版",
        duration: 15,
        ratio: "4:3",
        selectedAssetIds: ["word-card", "raraxia"],
        wordCard: { english: "glide", japanese: "滑る", furigana: "すべる", chinese: "滑行" },
        preGenerateWordCard: true,
        preGenerateSceneImage: true,
        sceneImagePrompt: "A realistic mountain city above the clouds",
        sceneImageAssetIds: ["raraxia"]
      },
      operation: "prepare",
      runDir: "/tmp/run"
    });
    expect(task).toContain("noVNC desktop");
    expect(task).toContain("Codex image generation");
    expect(task).toContain("generated-word-card.png");
    expect(task).toContain("glide\n滑る\nすべる\n滑行");
    expect(task).toContain("deterministic renderer");
    expect(task).toContain("render_word_card_text.sh");
    expect(task).toContain("Do not add language names, field labels, colons, bullets, numbering");
    expect(task).not.toContain("English: glide");
    expect(task).toContain("generated-scene-reference.png");
    expect(task).toContain("A realistic mountain city above the clouds");
    expect(task).toContain("3. /tmp/run/generated-scene-reference.png");
    expect(task).toContain("check whether this exact story result is already downloaded");
  });
});
