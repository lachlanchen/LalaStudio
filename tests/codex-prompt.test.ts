import { describe, expect, it } from "vitest";
import { buildAiPrompt, buildCodexArgs } from "../server/codex.js";
import { modelProfiles } from "../server/config.js";

describe("co-writer prompt contract", () => {
  it("keeps final writing hermetic and save-ready", () => {
    const prompt = buildAiPrompt({
      action: "final",
      message: "润色当前故事",
      duration: 15,
      story: "# 草垫飞行\n\n## 故事\n\n大家滑下山坡。"
    });
    expect(prompt).toContain("Do not browse, call tools, spawn agents, or read files");
    expect(prompt).toContain("complete save-ready Markdown document");
    expect(prompt).toContain("## 对应词卡");
    expect(prompt).toContain("15 秒中文短片");
  });

  it("uses the latest assistant version for conversational follow-up edits", () => {
    const prompt = buildAiPrompt({
      action: "final",
      message: "Keep the previous version, but make the tree much higher.",
      duration: 15,
      story: "# Older editor draft\n\n## 故事\n\nThe robot grows biological bumps.",
      history: [
        { role: "assistant", content: "# Latest version\n\n## 故事\n\nThe robot has harmless marks on its shell." }
      ]
    });
    expect(prompt).toContain("# Latest version");
    expect(prompt).toMatch(/latest\s+relevant Lala Studio answer/);
    expect(prompt).toContain("Do not silently revert to an older version");
    expect(prompt).toContain("make the tree much higher");
  });

  it("keeps production workflows in one accountable executor", () => {
    const args = buildCodexArgs(
      {
        profile: modelProfiles.workflow,
        sandbox: "danger-full-access",
        singleExecutor: true
      },
      "/tmp/lala-studio-output.md"
    );

    expect(args).toContain("multi_agent");
    expect(args).toContain("apps");
    expect(args).toContain("enable_mcp_apps");
    expect(args).toContain("danger-full-access");
  });

  it("binds a selected episode to persistent world canon without turning it into exposition", () => {
    const prompt = buildAiPrompt({
      action: "draft",
      message: "写今天的故事",
      duration: 15,
      worldContext: "World: 云港万象\nSelected places: 云港小屋\nOpen threads: 正在褪色的旅印"
    });
    expect(prompt).toContain("Persistent series canon for this episode");
    expect(prompt).toContain("Selected places: 云港小屋");
    expect(prompt).toContain("Do not dump it into exposition");
  });
});
