import { describe, expect, it, vi } from "vitest";
import { modelProfiles } from "../server/config.js";
import {
  buildPipelineCritiquePrompt,
  runStoryRefinementPipeline
} from "../server/story-refinement.js";

const acceptedStory = `# 一盘刚刚好的寿司

15 秒中文短片。

## 故事

阿芽酱把米饭铺好，啦啦侠在旁边切黄瓜。

阿芽酱：“别切太厚，一口会塞不下。”

啦啦侠：“放心，我先拿自己试过了。”

飒飒君把卷帘一拉，寿司卷得笔直。庄子把最后一块轻轻推到盘子中央，四个人看着整齐的寿司笑了。

## 对应词卡

- English: Sushi
- Japanese: 寿司
- Furigana: すし
- 中文：寿司`;

describe("story refinement pipeline", () => {
  it("runs draft, independent critique, and final writing in order", async () => {
    const run = vi.fn(async (stage: string) => {
      if (stage === "draft") return "# Draft\n\n15 秒中文短片。\n\n## 故事\n\n阿芽酱做寿司。";
      if (stage === "critique") return "## What works\n动作清楚。\n\n## Problems\n笑点不足。\n\n## Revision brief\n增加一个动作笑点。";
      return acceptedStory;
    });

    const result = await runStoryRefinementPipeline(
      { message: "阿芽酱做寿司，朋友们帮忙。", duration: 15 },
      {
        profiles: { draft: modelProfiles.draft, review: modelProfiles.review, final: modelProfiles.final },
        run
      }
    );

    expect(run.mock.calls.map(([stage]) => stage)).toEqual(["draft", "critique", "final"]);
    expect(result.accepted).toBe(true);
    expect(result.repaired).toBe(false);
    expect(result.quality.score).toBeGreaterThanOrEqual(90);
    expect(result.content).toBe(acceptedStory);
    expect(result.stages.map((stage) => stage.effort)).toEqual(["high", "xhigh", "ultra"]);
  });

  it("allows one repair when the deterministic gate rejects the first final", async () => {
    const run = vi.fn(async (stage: string) => {
      if (stage === "draft") return "# Draft\n\n阿芽酱做寿司。";
      if (stage === "critique") return "## Problems\n不要写系统口吻。";
      if (stage === "final") return "# Bad\n\n## 故事\n\n庄子：“系统提示：执行方案完成。”";
      return acceptedStory;
    });

    const result = await runStoryRefinementPipeline(
      { message: "写寿司故事", duration: 15 },
      {
        profiles: { draft: modelProfiles.draft, review: modelProfiles.review, final: modelProfiles.final },
        run
      }
    );

    expect(run.mock.calls.map(([stage]) => stage)).toEqual(["draft", "critique", "final", "repair"]);
    expect(result.repaired).toBe(true);
    expect(result.accepted).toBe(true);
  });

  it("asks the critic for evidence instead of another full rewrite", () => {
    const prompt = buildPipelineCritiquePrompt({
      draft: "# 寿司\n\n阿芽酱做寿司。",
      message: "写一个朋友帮忙做寿司的故事",
      duration: 15
    });

    expect(prompt).toContain("independent LALACHAN story critic");
    expect(prompt).toContain("Quote exact weak wording");
    expect(prompt).toContain("Do not rewrite the full story");
    expect(prompt).toContain("required document metadata");
    expect(prompt).toContain("## Requirement coverage");
  });
});
