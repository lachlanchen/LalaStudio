import { describe, expect, it } from "vitest";
import { listAssets } from "../server/assets.js";
import { buildVideoPrompt, validateVideoPrompt } from "../server/prompt-builder.js";

const settings = {
  mode: "short" as const,
  model: "Seedance 2.0 Mini 体验版",
  duration: 15,
  ratio: "4:3" as const,
  selectedAssetIds: listAssets().filter((asset) => asset.defaultSelected).map((asset) => asset.id),
  wordCard: {
    english: "together",
    japanese: "一緒",
    furigana: "いっしょ",
    chinese: "一起"
  },
  preGenerateWordCard: true
};

describe("Xiaoyunque prompt builder", () => {
  it("numbers the selected references and never leaks upload paths", () => {
    const prompt = buildVideoPrompt({
      story: "# 雨后的火锅\n\n啦啦侠、阿芽酱、飒飒君和庄子一起收好雨伞。阿芽酱说：“开饭啦！”最后大家笑了。\n\n## 对应词卡\n- English: Rain",
      assets: listAssets(),
      settings
    });

    expect(prompt).toContain("图1：Words card");
    expect(prompt).toContain("庄子机器人严格参考图2");
    expect(prompt).toContain("阿芽酱严格参考图6");
    expect(prompt).toContain("English: together");
    expect(prompt).toContain("Japanese: 一緒");
    expect(prompt).toContain("不要字幕");
    expect(prompt).not.toContain("Trio group");
    expect(prompt).not.toContain("English: Rain");
    expect(prompt).not.toMatch(/\/(?:home|Users|mnt|tmp)\//);
    expect(validateVideoPrompt(prompt)).toEqual([]);
  });

  it("rejects prompts that leak local paths", () => {
    const issues = validateVideoPrompt("啦啦侠、阿芽酱、飒飒君。不要字幕。/home/user/private.png");
    expect(issues).toContain("Prompt contains a local filesystem path");
  });
});
