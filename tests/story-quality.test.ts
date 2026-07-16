import { describe, expect, it } from "vitest";
import { analyzeStory, extractWordCard } from "../server/story-repository.js";

describe("story quality checks", () => {
  it("accepts a clear, speakable scene with a visible ending", () => {
    const quality = analyzeStory(`
# 雨后的热汤

阿芽酱端着热汤走进来，发现啦啦侠把四个杯子摆得整整齐齐。

阿芽酱：“你怎么知道我冷？”

啦啦侠：“因为你刚才把围巾裹了三圈。”

飒飒君笑着把椅子推过来，庄子关好窗。最后四个人围着热汤笑了。
`, 15);
    expect(quality.score).toBeGreaterThanOrEqual(90);
    expect(quality.checks.find((check) => check.id === "natural")?.status).toBe("pass");
  });

  it("flags report-like AI wording", () => {
    const quality = analyzeStory("啦啦侠：“系统提示。” 阿芽酱：“执行方案完成。” 最后大家发现真正的意义。", 15);
    expect(quality.checks.find((check) => check.id === "natural")?.status).toBe("fail");
    expect(quality.score).toBeLessThan(90);
  });

  it("flags dialogue density that leaves no room for 15-second action", () => {
    const quality = analyzeStory(`
# 太多台词

啦啦侠：“一。” 阿芽酱：“二。” 飒飒君：“三。” 庄子：“四。”
啦啦侠：“五。” 阿芽酱：“六。” 最后大家笑了。
`, 15);
    expect(quality.checks.find((check) => check.id === "dialogue")?.status).toBe("warn");
  });

  it("extracts a fresh multilingual word card from the story", () => {
    expect(extractWordCard("## 对应词卡\n- English: Crab\n- Japanese: 蟹\n- Furigana: かに\n- 中文：螃蟹")).toEqual({
      english: "Crab",
      japanese: "蟹",
      furigana: "かに",
      chinese: "螃蟹"
    });
  });
});
