#!/usr/bin/env node
import fs from "node:fs";
import { Command } from "commander";

const program = new Command();

program
  .name("lala-studio")
  .description("CLI for the LALACHAN story and video production studio")
  .version("0.1.0")
  .option("--api <url>", "Studio API URL", process.env.LALA_STUDIO_API || "http://127.0.0.1:4312");

async function request<T>(method: string, route: string, body?: unknown): Promise<T> {
  const api = program.opts<{ api: string }>().api.replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${api}${route}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error(`Lala Studio is not reachable at ${api}. Start it with: npm run dev`);
  }
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `${method} ${route} failed`);
  return payload;
}

interface CliBootstrap {
  defaults: { video: unknown };
}

interface CliStory {
  content: string;
  wordCard?: unknown;
}

async function defaultVideoSettings(storyId: string): Promise<Record<string, unknown>> {
  const [bootstrap, story] = await Promise.all([
    request<CliBootstrap>("GET", "/api/bootstrap"),
    request<CliStory>("GET", `/api/stories/${encodeURIComponent(storyId)}`)
  ]);
  const settings = bootstrap.defaults.video as Record<string, unknown>;
  return story.wordCard ? { ...settings, wordCard: story.wordCard } : settings;
}

function print(value: unknown, json = false) {
  if (json || typeof value !== "string") console.log(JSON.stringify(value, null, 2));
  else console.log(value);
}

program
  .command("status")
  .description("Show Codex, Xiaoyunque, and LazyEdit connectivity")
  .action(async () => print(await request("GET", "/api/status")));

const story = program.command("story").description("Manage story documents");
story
  .command("list")
  .option("--json", "Print JSON")
  .action(async (options) => {
    const payload = await request<{ stories: Array<{ id: string; title: string; status: string; qualityScore: number }> }>("GET", "/api/stories");
    if (options.json) return print(payload, true);
    for (const item of payload.stories) {
      console.log(`${item.id}\t${item.status}\t${item.qualityScore}\t${item.title}`);
    }
  });
story
  .command("show <id>")
  .action(async (id) => {
    const payload = await request<{ content: string }>("GET", `/api/stories/${encodeURIComponent(id)}`);
    print(payload.content);
  });
story
  .command("create <title>")
  .option("--duration <seconds>", "Target duration", "15")
  .option("--file <path>", "Use Markdown content from a file")
  .action(async (title, options) => {
    const content = options.file ? fs.readFileSync(options.file, "utf8") : undefined;
    print(await request("POST", "/api/stories", { title, duration: Number(options.duration), content }));
  });
story
  .command("save <id> <file>")
  .action(async (id, file) => {
    print(await request("PUT", `/api/stories/${encodeURIComponent(id)}`, { content: fs.readFileSync(file, "utf8") }));
  });

const ai = program.command("ai").description("Run GPT-5.6-Sol story tasks");
for (const action of ["chat", "draft", "review", "final", "refine"] as const) {
  ai.command(`${action} <message>`)
    .option("--story <file>", "Story Markdown file")
    .option("--story-id <id>", "Load a story from the Studio library")
    .option("--duration <seconds>", "Target duration", "15")
    .option("--effort <level>", "Override reasoning effort")
    .action(async (message, options) => {
      if (options.story && options.storyId) throw new Error("Use either --story or --story-id, not both");
      const storedStory = options.storyId
        ? await request<{ content: string }>("GET", `/api/stories/${encodeURIComponent(options.storyId)}`)
        : undefined;
      const storyContent = options.story ? fs.readFileSync(options.story, "utf8") : storedStory?.content;
      const job = await request<{ id: string }>("POST", "/api/ai/jobs", {
        action,
        message,
        story: storyContent,
        duration: Number(options.duration),
        effort: options.effort
      });
      console.log(job.id);
    });
}

const jobs = program.command("job").description("Inspect background work");
jobs.command("list").action(async () => print(await request("GET", "/api/jobs")));
jobs
  .command("show <id>")
  .action(async (id) => print(await request("GET", `/api/jobs/${encodeURIComponent(id)}`)));
jobs
  .command("watch <id>")
  .option("--interval <seconds>", "Polling interval", "2")
  .action(async (id, options) => {
    for (;;) {
      const job = await request<{ status: string; progress: number; message: string; result?: unknown; error?: string }>(
        "GET",
        `/api/jobs/${encodeURIComponent(id)}`
      );
      process.stdout.write(`\r${job.status.padEnd(10)} ${String(job.progress).padStart(3)}% ${job.message.padEnd(48)}`);
      if (["done", "failed", "cancelled"].includes(job.status)) {
        process.stdout.write("\n");
        print(job.result || job.error || job);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, Number(options.interval) * 1000));
    }
  });

program
  .command("browser-open")
  .description("Open the shared Xiaoyunque browser profile")
  .action(async () => print(await request("POST", "/api/browser/open", {})));

program
  .command("prompt-build <storyId>")
  .option("--settings <json>", "Video settings JSON file; defaults to Studio settings")
  .option("--save", "Save under references/prompts")
  .action(async (storyId, options) => {
    const settings = options.settings ? JSON.parse(fs.readFileSync(options.settings, "utf8")) : await defaultVideoSettings(storyId);
    const payload = await request<{ prompt: string; issues: string[] }>("POST", "/api/prompts/build", {
      storyId,
      settings,
      save: Boolean(options.save)
    });
    print(payload.prompt);
    if (payload.issues.length) console.error(`Issues: ${payload.issues.join("; ")}`);
  });

program
  .command("video <operation> <storyId>")
  .description("Prepare or generate a Xiaoyunque video")
  .option("--prompt <file>", "Prepared Xiaoyunque prompt; otherwise build it from the story")
  .option("--settings <json>", "Video settings JSON file; defaults to Studio settings")
  .option("--effort <level>", "Workflow reasoning effort")
  .option("--confirm-paid", "Confirm one paid generation submit")
  .action(async (operation, storyId, options) => {
    if (!["prepare", "generate"].includes(operation)) throw new Error("operation must be prepare or generate");
    const settings = options.settings ? JSON.parse(fs.readFileSync(options.settings, "utf8")) : await defaultVideoSettings(storyId);
    const built = options.prompt
      ? undefined
      : await request<{ prompt: string; issues: string[] }>("POST", "/api/prompts/build", { storyId, settings });
    if (built?.issues.length) throw new Error(`Prompt preflight failed: ${built.issues.join("; ")}`);
    const job = await request<{ id: string }>("POST", "/api/video/jobs", {
      storyId,
      prompt: options.prompt ? fs.readFileSync(options.prompt, "utf8") : built!.prompt,
      settings,
      operation,
      effort: options.effort,
      paidActionConfirmed: Boolean(options.confirmPaid)
    });
    console.log(job.id);
  });

program
  .command("publish <videoId>")
  .requiredOption("--story <id>", "Story id used as subtitle and metadata context")
  .requiredOption("--title <title>", "Viewer-facing title")
  .option("--platforms <list>", "Comma-separated platforms", "shipinhao,youtube,instagram,douyin")
  .option("--category <name>", "lalachan or lalamv", "lalachan")
  .option("--confirm", "Queue a real publish; otherwise build a preview")
  .action(async (videoId, options) => {
    const job = await request<{ id: string }>("POST", "/api/publish/jobs", {
      storyId: options.story,
      videoId,
      title: options.title,
      platforms: options.platforms.split(",").map((value: string) => value.trim()).filter(Boolean),
      category: options.category,
      publishConfirmed: Boolean(options.confirm)
    });
    console.log(job.id);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
