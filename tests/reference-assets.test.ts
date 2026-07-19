import { describe, expect, it } from "vitest";
import { buildReferenceAssetPlan, buildReferenceImageTask } from "../server/reference-assets.js";
import type { VideoSettings } from "../server/types.js";

const settings: VideoSettings = {
  mode: "short",
  model: "Seedance 2.0 Mini 体验版",
  duration: 15,
  ratio: "16:9",
  selectedAssetIds: ["word-card", "raraxia", "ayachan"],
  wordCard: { english: "harbor", japanese: "港", furigana: "みなと", chinese: "港湾" },
  preGenerateWordCard: true,
  preGenerateSceneImage: true,
  sceneImagePrompt: "A monumental palace rises from the sea into a star field",
  sceneImageAssetIds: ["raraxia", "ayachan"]
};

describe("reference-image planning", () => {
  it("creates stable cache paths and a path-specific generation contract", () => {
    const plan = buildReferenceAssetPlan({ storyId: "sky-palace", story: "Two friends guide a lost star home.", settings });
    const same = buildReferenceAssetPlan({ storyId: "sky-palace", story: "Two friends guide a lost star home.", settings });
    expect(plan.fingerprint).toBe(same.fingerprint);
    expect(plan.wordCardPath).toMatch(/generated-assets\/sky-palace\/word-card\.png$/);
    expect(plan.wordCardBasePath).toMatch(/generated-assets\/sky-palace\/word-card-base\.png$/);
    expect(plan.wordCardSpecPath).toMatch(/generated-assets\/sky-palace\/word-card-spec\.json$/);
    expect(plan.sceneImagePath).toMatch(/generated-assets\/sky-palace\/scene-reference\.png$/);
    expect(plan.sceneImageUrl).toContain("/media/generated-assets/sky-palace/scene-reference.png?v=");

    const task = buildReferenceImageTask({
      story: "Two friends guide a lost star home.",
      settings,
      assetPaths: ["/project/words-card.jpg", "/project/raraxia.jpeg", "/project/ayachan.png"],
      sceneAssetPaths: ["/project/raraxia.jpeg", "/project/ayachan.png"],
      plan
    });
    expect(task).toContain("harbor\n港\nみなと\n港湾");
    expect(task).toContain("A monumental palace rises from the sea into a star field");
    expect(task).toContain(plan.sceneImagePath!);
    expect(task).toContain("render_word_card_text.sh");
    expect(task).not.toContain("English: harbor");
  });

  it("invalidates the cache fingerprint when the visual brief changes", () => {
    const first = buildReferenceAssetPlan({ storyId: "sky-palace", story: "Story", settings });
    const second = buildReferenceAssetPlan({
      storyId: "sky-palace",
      story: "Story",
      settings: { ...settings, sceneImagePrompt: "A different scene" }
    });
    expect(first.fingerprint).not.toBe(second.fingerprint);
  });

  it("keeps generated references current when unrelated video uploads change", () => {
    const first = buildReferenceAssetPlan({ storyId: "sky-palace", story: "Story", settings });
    const second = buildReferenceAssetPlan({
      storyId: "sky-palace",
      story: "Story",
      settings: { ...settings, selectedAssetIds: [...settings.selectedAssetIds, "notebook"] }
    });
    expect(first.fingerprint).toBe(second.fingerprint);
  });
});
