import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type { ModelProfile } from "./types.js";
import { repoRoot, runtimeRoot, studioConfig } from "./config.js";

export interface CodexRunOptions {
  profile: ModelProfile;
  prompt: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  signal?: AbortSignal;
  log?: (line: string) => void;
}

export async function runCodex(options: CodexRunOptions): Promise<string> {
  const outputDir = path.join(runtimeRoot, "codex-output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${Date.now()}-${Math.random().toString(16).slice(2)}.md`);
  const args = [
    "exec",
    "--ephemeral",
    "-m",
    options.profile.model,
    "-c",
    `model_reasoning_effort=\"${options.profile.effort}\"`,
    "-C",
    repoRoot,
    "--sandbox",
    options.sandbox || "read-only",
    "--output-last-message",
    outputPath,
    "-"
  ];

  const result = await new Promise<void>((resolve, reject) => {
    const child = spawn(studioConfig.codexCommand, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    const handle = (chunk: Buffer) => {
      for (const line of chunk.toString("utf8").split(/\r?\n/)) {
        if (line.trim()) options.log?.(line);
      }
    };
    child.stdout.on("data", handle);
    child.stderr.on("data", handle);

    const abort = () => child.kill("SIGTERM");
    options.signal?.addEventListener("abort", abort, { once: true });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      options.signal?.removeEventListener("abort", abort);
      if (options.signal?.aborted) {
        reject(new Error("Codex run cancelled"));
      } else if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Codex exited with ${signal || code || "unknown status"}`));
      }
    });

    child.stdin.end(options.prompt);
  });

  void result;
  if (!fs.existsSync(outputPath)) throw new Error("Codex did not produce a final response");
  const output = fs.readFileSync(outputPath, "utf8").trim();
  if (!output) throw new Error("Codex produced an empty response");
  return output;
}

export function buildAiPrompt(input: {
  action: "chat" | "draft" | "review" | "final";
  message: string;
  story?: string;
  duration?: number;
}): string {
  const duration = input.duration || 15;
  const shared = `
You are the LALACHAN story room co-writer. Write in natural, speakable Chinese.

Main cast voices:
- 啦啦侠: warm, brave after a small misunderstanding, sometimes food-minded.
- 阿芽酱: observant, practical, caring, lightly teasing.
- 飒飒君: quick, curious, physical comedy.
- 庄子机器人: precise and dry, but never speaks like a system log.

Story standard:
- ${duration}s needs one clear cause-and-effect chain and a visible payoff.
- Dialogue must sound like friends talking, not slogans, reports, translations, or morals.
- Keep production constraints outside the story.
- Avoid using 突然 to connect unrelated events.
- Preserve character identity and make actions easy to stage visually.
`.trim();

  if (input.action === "chat") {
    return `${shared}\n\nAnswer the user's question directly and concisely. Do not rewrite a full story unless asked.\n\nUser:\n${input.message}`;
  }

  if (input.action === "draft") {
    return `${shared}\n\nCreate a polished ${duration}-second story from this idea. Internally critique the first draft, then return only the improved story with a title and timed scene paragraphs.\n\nIdea:\n${input.message}`;
  }

  if (input.action === "review") {
    return `${shared}\n\nCritique the exact weak lines in the draft. Return: Problems, concrete fixes, and a revised story. Focus on clarity, causality, natural dialogue, visual comedy, and shareability.\n\nDraft:\n${input.story || input.message}`;
  }

  return `${shared}\n\nProduce the final publishable ${duration}-second story. Run an independent critic pass before answering. Return only: title, clean story, natural dialogue, and a one-line visual payoff. No analysis and no prompt-engineering notes.\n\nDraft and request:\n${input.story || ""}\n\n${input.message}`;
}
