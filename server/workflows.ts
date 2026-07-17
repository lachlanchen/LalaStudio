import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import type { StudioJob, VideoSettings } from "./types.js";
import { repoRoot, runtimeRoot, studioConfig, studioRoot, videosRoot } from "./config.js";
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
  const [xyqCdp, xyqNoVnc, lazyEdit] = await Promise.all([
    fetchOk(`${studioConfig.cdpUrl}/json/version`),
    fetchOk(studioConfig.noVncUrl),
    // The video list performs media preview probing and is not a health endpoint.
    fetchOk(`${studioConfig.lazyEditApi}/api/ui-settings/publish_options`)
  ]);
  return {
    codex: commandAvailable(studioConfig.codexCommand),
    ffmpeg: commandAvailable("ffmpeg"),
    xyqCdp,
    xyqNoVnc,
    lazyEdit,
    noVncUrl: studioConfig.noVncUrl,
    cdpUrl: studioConfig.cdpUrl,
    lazyEditApi: studioConfig.lazyEditApi
  };
}

export function ensureXyqBrowserVisible(): { started: boolean; detail: string; noVncUrl: string } {
  const launcher = path.join(studioRoot, "scripts", "launch_xyq_novnc.sh");
  if (!fs.existsSync(launcher)) throw new Error("Xiaoyunque noVNC launcher is missing");
  const parsed = new URL(studioConfig.cdpUrl);
  const noVnc = new URL(studioConfig.noVncUrl);
  const result = spawnSync(launcher, ["start"], {
    cwd: studioRoot,
    encoding: "utf8",
    timeout: 60_000,
    env: {
      ...process.env,
      XYQ_CDP_PORT: parsed.port || "9344",
      XYQ_NOVNC_PORT: noVnc.port || "6099"
    }
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "Xiaoyunque noVNC launcher failed").trim());
  }
  return {
    started: true,
    detail: `Xiaoyunque is visible at ${studioConfig.noVncUrl} and controllable at ${studioConfig.cdpUrl}`,
    noVncUrl: studioConfig.noVncUrl
  };
}

export const launchXyqBrowser = ensureXyqBrowserVisible;

function fullyDecodes(filePath: string): boolean {
  const result = spawnSync("ffmpeg", [
    "-nostdin",
    "-v", "error",
    "-xerror",
    "-i", filePath,
    "-map", "0:v:0",
    "-map", "0:a:0?",
    "-f", "null",
    "-"
  ], { encoding: "utf8", timeout: 600_000 });
  return result.status === 0 && !(result.stderr || "").trim();
}

export function probeVideo(filePath: string, expectedDuration?: number): { duration: number; width: number; height: number; size: number; hasAudio: true } | null {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1024) return null;
  const result = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,size",
    "-show_entries", "stream=codec_type,width,height",
    "-of", "json",
    filePath
  ], { encoding: "utf8" });
  if (result.status !== 0) return null;
  try {
    const parsed = JSON.parse(result.stdout) as {
      format?: { duration?: string; size?: string };
      streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
    };
    const duration = Number(parsed.format?.duration || 0);
    const video = parsed.streams?.find((stream) => stream.codec_type === "video");
    const hasAudio = parsed.streams?.some((stream) => stream.codec_type === "audio") || false;
    if (!duration || !video?.width || !video.height || !hasAudio) return null;
    if (expectedDuration && Math.abs(duration - expectedDuration) > 5) return null;
    if (!fullyDecodes(filePath)) return null;
    return { duration, width: video.width, height: video.height, size: Number(parsed.format?.size || fs.statSync(filePath).size), hasAudio: true };
  } catch {
    return null;
  }
}

export function buildVideoExecutorTask(input: {
  storyId: string;
  promptPath: string;
  assetIds: string[];
  assetPaths: string[];
  settings: VideoSettings;
  operation: "prepare" | "generate";
  runDir: string;
}): string {
  const action = input.operation === "prepare"
    ? "Prepare the visible Xiaoyunque composer completely, but do not click the paid submit/generate button."
    : "Submit exactly once after preflight passes, monitor to completion, download the MP4, verify it, and copy it to Videos/.";
  const cardIndex = input.assetIds.indexOf("word-card");
  const generatedCardPath = path.join(input.runDir, "generated-word-card.png");
  const uploadPaths = input.assetPaths.map((assetPath, index) =>
    index === cardIndex && input.settings.preGenerateWordCard ? generatedCardPath : assetPath
  );
  const wordCardStage = cardIndex >= 0 && input.settings.preGenerateWordCard
    ? `Before opening the Xiaoyunque upload menu, use Codex image generation with the source reference ${input.assetPaths[cardIndex]} to create ${generatedCardPath}. Match the reference card's physical product design and layout. First verify that all four values below express the same intended word and are correctly written in their respective language or script. The card face must contain only this four-line block, clearly and once:

${input.settings.wordCard.english}
${input.settings.wordCard.japanese}
${input.settings.wordCard.furigana}
${input.settings.wordCard.chinese}

Do not render language names, field labels, colons, bullets, or numbering. Inspect the generated PNG and compare every rendered line character-by-character with the requested block. If any language is inaccurate, unreadable, missing, duplicated, or labeled, regenerate before any paid action. Upload the verified generated PNG as attachment ${cardIndex + 1} instead of the base reference.`
    : "No Codex word-card pre-generation is required for this run.";

  return `
Use the local lalachan-xyq-browser-video and imagegen skills plus the repository browser/CDP scripts.

Work as one accountable executor. Do not spawn collaborators and do not use remote connector/app tools. Use the local shell, repository scripts, the configured CDP endpoint, and Codex image generation directly. Inspect evidence after each browser step and adapt the next step to the current page state.

Task: ${action}

Visibility contract:
- Xiaoyunque must be open in the logged-in noVNC desktop at ${studioConfig.noVncUrl} before browser work begins.
- Reuse the shared profile and configured CDP endpoint ${studioConfig.cdpUrl}; bring the Xiaoyunque tab to the front so the operator can watch it in noVNC.
- Do not inherit an unrelated hidden desktop and do not open duplicate Xiaoyunque tabs.

Codex word-card stage:
- ${wordCardStage}

Production contract:
- Reuse the logged-in shared Xiaoyunque Chrome profile and current usable thread. Do not use the Xiaoyunque API.
- Story id: ${input.storyId}
- Prompt file: ${input.promptPath}
- Upload these actual files in this exact order:\n${uploadPaths.map((asset, index) => `  ${index + 1}. ${asset}`).join("\n")}
- Mode: ${input.settings.mode === "short" ? "沉浸式短片" : "创作 Agent"}
- Model: ${input.settings.model}
- Duration: ${input.settings.duration}s
- Ratio: ${input.settings.ratio}
- Confirm every attachment visibly. Do not paste paths into the composer.
- Keep the same current thread when recovering from a transient page error.
- Never click submit twice. If credits, login, CAPTCHA, word-card generation, noVNC visibility, or attachment proof blocks the task, stop with evidence.
- Before submitting, check whether this exact story result is already downloaded in Videos/. If a valid matching MP4 exists, do not spend credits again; report and reuse it.
- When monitoring/downloading, pass the watcher --expected-duration ${input.settings.duration} and reject any unrelated media outside the normal five-second tolerance.
- A matching ffprobe header is not sufficient: decode the complete video and audio streams with ffmpeg before accepting or copying a result.
- Save preflight and final screenshots under ${input.runDir}.

Return a concise completion report with noVNC URL, page/thread URL, visible settings, attachment count, generated word-card path when applicable, screenshots, and downloaded MP4 path when applicable.
`.trim();
}

export function startVideoWorkflow(input: {
  jobs: JobStore;
  storyId: string;
  prompt: string;
  settings: VideoSettings;
  operation: "prepare" | "generate";
  paidActionConfirmed: boolean;
  existingVideoPath?: string | null;
  forceRegenerate?: boolean;
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
    if (input.operation === "generate" && input.existingVideoPath && !input.forceRegenerate) {
      const existing = probeVideo(input.existingVideoPath, input.settings.duration);
      if (existing) {
        log(`Existing download verified: ${input.existingVideoPath} (${existing.duration.toFixed(2)}s, ${existing.width}x${existing.height})`);
        progress(98, "Reusing the verified downloaded video; no paid generation was submitted");
        return { reused: true, videoPath: input.existingVideoPath, probe: existing, runDir, promptPath };
      }
    }
    progress(4, "Opening Xiaoyunque in the visible noVNC desktop");
    const browser = ensureXyqBrowserVisible();
    log(browser.detail);
    progress(8, "Handing the visible production contract to Codex");
    const task = buildVideoExecutorTask({
      storyId: input.storyId,
      promptPath,
      assetIds: input.settings.selectedAssetIds,
      assetPaths,
      settings: input.settings,
      operation: input.operation,
      runDir
    });
    const result = await runCodex({
      profile,
      prompt: task,
      sandbox: "danger-full-access",
      singleExecutor: true,
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

async function runLazyEditPublish(input: {
  videoPath: string;
  storyPath: string;
  title: string;
  platforms: string[];
  category: "lalachan" | "lalamv";
  publishConfirmed: boolean;
  signal: AbortSignal;
  log: (line: string) => void;
}): Promise<void> {
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
  await runProcess("conda", args, { cwd: studioConfig.lazyEditRoot, signal: input.signal, log: input.log });
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
    await runLazyEditPublish({ ...input, signal, log });
    progress(98, input.publishConfirmed ? "Publish queue accepted" : "Preview is ready for inspection");
    return { published: input.publishConfirmed, platforms: input.platforms, title: input.title };
  });
  return job;
}

export function startDeliveryWorkflow(input: {
  jobs: JobStore;
  storyId: string;
  storyPath: string;
  existingVideoPath?: string | null;
  expectedDuration?: number | null;
  title: string;
  platforms: string[];
  category: "lalachan" | "lalamv";
  publishConfirmed: boolean;
}): StudioJob {
  if (!input.publishConfirmed) throw new Error("Delivery requires explicit publish confirmation");
  if (!fs.existsSync(input.storyPath)) throw new Error("Story context file not found");
  if (!fs.existsSync(studioConfig.lazyEditRoot)) throw new Error("LazyEdit repository not found");
  const profile = resolveModelProfile("workflow");
  const job = input.jobs.create({ type: "publish", title: `Deliver ${input.title}`, profile });
  const runDir = path.join(runtimeRoot, "delivery-runs", job.id);
  fs.mkdirSync(runDir, { recursive: true });

  input.jobs.run(job, async ({ log, progress, signal }) => {
    const expected = input.expectedDuration || undefined;
    let videoPath = input.existingVideoPath || null;
    let probe = videoPath ? probeVideo(videoPath, expected) : null;
    if (videoPath && probe) {
      log(`Downloaded video verified: ${videoPath} (${probe.duration.toFixed(2)}s, ${probe.width}x${probe.height})`);
      progress(24, "Verified the existing downloaded video");
    } else {
      progress(4, "Opening the completed Xiaoyunque result in noVNC");
      const browser = ensureXyqBrowserVisible();
      log(browser.detail);
      const targetPath = path.join(videosRoot, `${input.storyId}.mp4`);
      progress(10, "Asking Codex to download and verify the current result");
      const report = await runCodex({
        profile,
        sandbox: "danger-full-access",
        singleExecutor: true,
        signal,
        log,
        prompt: `
Use the local lalachan-xyq-browser-video skill and repository browser scripts. Work in the logged-in Xiaoyunque browser visible at ${studioConfig.noVncUrl} through CDP ${studioConfig.cdpUrl}. Bring the existing current Xiaoyunque result thread to the front.

Download-only task:
- Story id: ${input.storyId}
- Story context: ${input.storyPath}
- Do not submit, regenerate, retry generation, or spend credits.
- First check whether a matching valid MP4 already exists at ${targetPath}. If it does, verify and reuse it.
- Otherwise download the already-completed result that matches this story, verify the browser result identity, and save/copy it exactly to ${targetPath}.
- Expected duration: ${expected || "use the story/result duration"} seconds, with the normal five-second tolerance.
- Verify duration, dimensions, audio stream, file size, and final path. Decode the complete video and audio streams with ffmpeg; do not accept a header-only ffprobe match. Save a result screenshot under ${runDir}.
- If the completed result cannot be proven, stop with evidence instead of downloading unrelated media.

Return the exact verified MP4 path and probe evidence.
`.trim()
      });
      log(report);
      probe = probeVideo(targetPath, expected);
      videoPath = probe ? targetPath : null;
      if (!videoPath || !probe) throw new Error(`Codex finished without the verified requested MP4 at ${targetPath}`);
      log(`Downloaded video verified: ${videoPath} (${probe.duration.toFixed(2)}s, ${probe.width}x${probe.height})`);
    }

    progress(35, "Sending the verified video to the normal LazyEdit workflow");
    await runLazyEditPublish({
      videoPath,
      storyPath: input.storyPath,
      title: input.title,
      platforms: input.platforms,
      category: input.category,
      publishConfirmed: true,
      signal,
      log
    });
    progress(98, "LazyEdit and AutoPublish reached their terminal workflow state");
    return { videoPath, probe, platforms: input.platforms, category: input.category, published: true };
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
        mediaUrl: `/media/videos/${encodeURIComponent(name)}`,
        size: stat.size,
        updatedAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
