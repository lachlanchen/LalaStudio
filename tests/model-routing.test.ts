import { describe, expect, it } from "vitest";
import { modelProfiles, resolveModelProfile } from "../server/config.js";

describe("GPT-5.6-Sol routing", () => {
  it("uses low effort for chat and ultra for final and workflow work", () => {
    expect(modelProfiles.chat.model).toBe("gpt-5.6-sol");
    expect(modelProfiles.chat.effort).toBe("low");
    expect(modelProfiles.draft.effort).toBe("high");
    expect(modelProfiles.review.effort).toBe("xhigh");
    expect(modelProfiles.final.effort).toBe("ultra");
    expect(modelProfiles.workflow.effort).toBe("ultra");
  });

  it("allows an explicit effort override without changing the default", () => {
    expect(resolveModelProfile("chat", { effort: "medium" }).effort).toBe("medium");
    expect(modelProfiles.chat.effort).toBe("low");
  });
});
