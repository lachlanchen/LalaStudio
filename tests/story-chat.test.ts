import { describe, expect, it } from "vitest";
import { buildConversationHistory, inferStoryAiAction } from "../src/story-chat.js";
import type { ChatMessage } from "../src/types.js";

describe("human-style story chat", () => {
  it("routes ordinary editing language to a save-ready revision", () => {
    expect(inferStoryAiAction("make the tree very high and beautiful")).toBe("final");
    expect(inferStoryAiAction("把上一版改得更温暖一点")).toBe("final");
    expect(inferStoryAiAction("请写一个今天的新故事")).toBe("refine");
    expect(inferStoryAiAction("找出这篇故事不自然的问题")).toBe("review");
    expect(inferStoryAiAction("这个词是什么意思？")).toBe("chat");
  });

  it("keeps recent writing context and excludes workflow/error chatter", () => {
    const message = (role: ChatMessage["role"], content: string, kind: ChatMessage["kind"] = "text"): ChatMessage => ({
      id: `${role}-${content}`,
      role,
      content,
      kind,
      createdAt: "2026-07-17T00:00:00.000Z"
    });
    const history = buildConversationHistory([
      message("user", "write it"),
      message("assistant", "latest story"),
      message("assistant", "publish contract", "production"),
      message("assistant", "failed", "error")
    ]);
    expect(history).toEqual([
      { role: "user", content: "write it" },
      { role: "assistant", content: "latest story" }
    ]);
  });
});
