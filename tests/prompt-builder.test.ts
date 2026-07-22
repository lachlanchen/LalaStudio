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
  preGenerateWordCard: true,
  preGenerateSceneImage: true,
  sceneImagePrompt: "A luminous city rising through the clouds",
  sceneImageAssetIds: ["raraxia", "ayachan"]
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
    expect(prompt).toContain("together\n一緒\nいっしょ\n一起");
    expect(prompt).toContain("不要在卡片上添加语言名称、字段标签、冒号、项目符号或编号");
    expect(prompt).not.toContain("English: together");
    expect(prompt).not.toContain("Japanese: 一緒");
    expect(prompt).toContain("不要字幕");
    expect(prompt).toContain("不要新增故事中没有出现的路人、村民或其他手办");
    expect(prompt).not.toContain("Trio group");
    expect(prompt).toMatch(/图\d+：本集预生成场景关键帧/);
    expect(prompt).not.toContain("English: Rain");
    expect(prompt).not.toMatch(/\/(?:home|Users|mnt|tmp)\//);
    expect(validateVideoPrompt(prompt)).toEqual([]);
  });

  it("rejects prompts that leak local paths", () => {
    const issues = validateVideoPrompt("啦啦侠、阿芽酱、飒飒君。不要字幕。/home/user/private.png");
    expect(issues).toContain("Prompt contains a local filesystem path");
  });

  it("accepts an episode with only the characters selected for that story", () => {
    const twoCharacterPrompt = buildVideoPrompt({
      story: "# 星星的港湾\n\n啦啦侠接住小星，阿芽酱骑鹤靠近帮助他。",
      assets: listAssets(),
      settings: { ...settings, selectedAssetIds: ["word-card", "raraxia", "ayachan"] }
    });
    expect(twoCharacterPrompt).not.toContain("飒飒君严格参考");
    expect(validateVideoPrompt(twoCharacterPrompt)).toEqual([]);
  });

  it("adds only the compact selected continuity contract", () => {
    const prompt = buildVideoPrompt({
      story: "# 借走的路\n\n蓝尾纸鸟叼走地图，伙伴们追到星桥。",
      assets: listAssets(),
      settings,
      worldContinuity: "固定地点：云港小屋、星桥集市。\n连续线索：正在褪色的旅印；只在结尾出现蓝灯塔。"
    });
    expect(prompt).toContain("## 世界连续性");
    expect(prompt).toContain("固定地点：云港小屋、星桥集市");
    expect(validateVideoPrompt(prompt)).toEqual([]);
  });
});
