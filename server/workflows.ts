import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import type { StudioJob, VideoSettings } from "./types.js";
import { repoRoot, runtimeRoot, studioConfig } from "./config.js";
import { getAssetPath } from "./assets.js";
import { runCodex } from "./codex.js";
import { resolveModelProfile } from "./config.js";
import type { JobStore } from "./job-store.js";
import { atomicWrite } from "./lib/files.js";

function commandAvailable(command: string): boolean {
  return spawnSync("bash", ["-lc", `command -v ${command}`], { encoding: "utf8" }).status === 0;
}

async function fetchOk(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function systemStatus() {
  const [xyqCdp, lazyEdit] = await Promise.all([
    fetchOk(`${studioConfig.cdpUrl}/json/version`),
    fetchOk(`${studioConfig.lazyEditApi}/api/videos`)
  ]);
  return {
    codex: commandAvailable(studioConfig.codexCommand),
    ffmpeg: commandAvailable("ffmpeg"),
    xyqCdp,
    lazyEdit,
    noVncUrl: studioConfig.noVncUrl,
    cdpUrl: studioConfig.cdpUrl,
    lazyEditApi: studioConfig.lazyEditApi
  };
}

export function launchXyqBrowser(): { started: boolean; detail: string } {
  const launcher = path.join(repoRoot, "scripts", "xyq_chrome", "launch_chrome.sh");
  if (!fs.existsSync(launcher)) throw new Error("Xiaoyunque browser launcher is missing");
  const parsed = new URL(studioConfig.cdpUrl);
  const child = spawn(launcher, ["https://xyq.jianying.com/home?tab_name=integrated-agent"], {
    cwd: repoRoot,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PORT: parsed.port || "9344" }
  });
  child.unref();
  return { started: true, detail: `Browser launched on CDP ${studioConfig.cdpUrl}` };
}

export function startVideoWorkflow(input: {
  jobs: JobStore;
  storyId: string;
  prompt: string;
  settings: VideoSettings;
  operation: "prepare" | "generate";
  paidActionConfirmed: boolean;
}): StudioJob {
  if (input.operation === "generate" && !input.paidActionConfirmed) {
    throw new Error("Paid generation requires explicit confirmation");
  }
  const profile = resolveModelProfile("workflow");
  const job = input.jobs.create({
    type: "video",
    title: `${input.operation === "prepare" ? "Prepare" : "Generate"} ${input.storyId}`,
    profile
  });
  const runDir = path.join(runtimeRoot, "video-runs", job.id);
  fs.mkdirSync(runDir, { recursive: true });
  const promptPath = path.join(runDir, "xyq-prompt.md");
  atomicWrite(promptPath, `${input.prompt.trim()}\n`);
  const assetPaths = input.settings.selectedAssetIds.map(getAssetPath);

  input.jobs.run(job, async ({ log, progress, signal }) => {
    progress(8, "Handing the production contract to Codex");
    const action = input.operation === "prepare"
      ? "Prepare the visible Xiaoyunque composer completely, but do not click the paid submit/generate button."
      : "Submit exactly once after preflight passes, monitor to completion, download the MP4, verify it, and copy it to Videos/.";
    const task = `
Use the local lalachan-xyq-browser-video skill and the repository browser/CDP scripts.

Task: ${action}

Contract:
- Reuse the logged-in shared Xiaoyunque Chrome profile and current usable thread. Do not use the Xiaoyunque API.
- Story id: ${input.storyId}
- Prompt file: ${promptPath}
- Upload these actual files in this exact order:\n${assetPaths.map((asset, index) => `  ${index + 1}. ${asset}`).join("\n")}
- Mode: ${input.settings.mode === "short" ? "沉浸式短片" : "创作 Agent"}
- Model: ${input.settings.model}
- Duration: ${input.settings.duration}s
- Ratio: ${input.settings.ratio}
- Confirm every attachment visibly. Do not paste paths into the composer.
- Keep the same current thread when recovering from a transient page error.
- Never click submit twice. If credits, login, CAPTCHA, or attachment proof blocks the task, stop with evidence.
- Save preflight and final screenshots under ${runDir}.

Return a concise completion report with page/thread URL, visible settings, attachment count, screenshots, and downloaded MP4 path when applicable.
`.trim();
    const result = await runCodex({
      profile,
      prompt: task,
      sandbox: "danger-full-access",
      signal,
      log
    });
    progress(96, "Validating the production report");
    return { report: result, runDir, promptPath };
  });
  return job;
}

function runProcess(
  command: string,
  args: string[],
  options: { cwd: string; signal: AbortSignal; log: (line: string) => void }
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    const handle = (chunk: Buffer) => chunk.toString("utf8").split(/\r?\n/).filter(Boolean).forEach(options.log);
    child.stdout.on("data", handle);
    child.stderr.on("data", handle);
    const abort = () => child.kill("SIGTERM");
    options.signal.addEventListener("abort", abort, { once: true });
    child.once("error", reject);
    child.once("exit", (code) => {
      options.signal.removeEventListener("abort", abort);
      if (options.signal.aborted) reject(new Error("Publish cancelled"));
      else if (code === 0) resolve(0);
      else reject(new Error(`LazyEdit exited with code ${code}`));
    });
  });
}

export function startPublishWorkflow(input: {
  jobs: JobStore;
  videoPath: string;
  storyPath: string;
  title: string;
  platforms: string[];
  category: "lalachan" | "lalamv";
  publishConfirmed: boolean;
}): StudioJob {
  const allowedPlatforms = new Set(["shipinhao", "youtube", "instagram", "douyin"]);
  if (!input.platforms.length || input.platforms.some((platform) => !allowedPlatforms.has(platform))) {
    throw new Error("Unsupported publish platform");
  }
  if (!fs.existsSync(input.videoPath)) throw new Error("Video file not found");
  if (!fs.existsSync(input.storyPath)) throw new Error("Story context file not found");
  if (!fs.existsSync(studioConfig.lazyEditRoot)) throw new Error("LazyEdit repository not found");

  const job = input.jobs.create({ type: "publish", title: `Publish ${input.title}` });
  input.jobs.run(job, async ({ log, progress, signal }) => {
    progress(8, input.publishConfirmed ? "Starting verified publish workflow" : "Building a local preview only");
    const args = [
      "run",
      "-n",
      "lazyedit",
      "python",
      "scripts/lazyedit_publish.py",
      "--api-url",
      studioConfig.lazyEditApi,
      "--video",
      input.videoPath,
      "--title",
      input.title,
      "--source",
      "lalachan",
      "--platforms",
      input.platforms.join(","),
      "--publish-category",
      input.category,
      "--use-current-settings",
      "--prompt-file",
      input.storyPath,
      "--correct-subtitles",
      "--process",
      input.publishConfirmed ? "--publish" : "--no-publish",
      "--burn-subtitles",
      "--portrait-blur-fill",
      "--portrait-blur-mode",
      "lalachan",
      "--logo",
      "--logo-position",
      "top-right",
      "--guided-monitor",
      "--wait",
      "--poll-seconds",
      "8",
      "--process-timeout",
      "3600",
      "--publish-timeout",
      "7200",
      "--json"
    ];
    await runProcess("conda", args, { cwd: studioConfig.lazyEditRoot, signal, log });
    progress(98, input.publishConfirmed ? "Publish queue accepted" : "Preview is ready for inspection");
    return { published: input.publishConfirmed, platforms: input.platforms, title: input.title };
  });
  return job;
}

export function listVideos() {
  const root = path.join(repoRoot, "Videos");
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((name) => name.toLowerCase().endsWith(".mp4"))
    .map((name) => {
      const filePath = path.join(root, name);
      const stat = fs.statSync(filePath);
      return {
        id: name,
        name,
        path: filePath,
        relativePath: path.relative(repoRoot, filePath).split(path.sep).join("/"),
        size: stat.size,
        updatedAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
