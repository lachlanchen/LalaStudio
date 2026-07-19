import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { listAssets, getAssetPath } from "./assets.js";
import { buildAiPrompt, runCodex } from "./codex.js";
import {
  modelProfiles,
  promptsRoot,
  repoRoot,
  resolveModelProfile,
  runtimeRoot,
  studioConfig,
  studioRoot,
  storiesRoot,
  videosRoot
} from "./config.js";
import { JobStore } from "./job-store.js";
import { buildVideoPrompt, validateVideoPrompt } from "./prompt-builder.js";
import { StoryRepository } from "./story-repository.js";
import { runStoryRefinementPipeline } from "./story-refinement.js";
import type { ModelRoute, ReasoningEffort, VideoSettings } from "./types.js";
import { assertInside, safeId } from "./lib/files.js";
import {
  launchXyqBrowser,
  listVideos,
  startReferenceImageWorkflow,
  startDeliveryWorkflow,
  startPublishWorkflow,
  startVideoWorkflow,
  systemStatus
} from "./workflows.js";

const storyRepository = new StoryRepository();
export const jobs = new JobStore(runtimeRoot);

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };

const aiSchema = z.object({
  action: z.enum(["chat", "draft", "review", "final", "refine"]),
  message: z.string().min(1).max(16000),
  story: z.string().max(30000).optional(),
  duration: z.number().int().min(5).max(180).optional(),
  effort: z.enum(["low", "medium", "high", "xhigh", "max", "ultra"]).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(20_000)
  })).max(10).optional()
});

const wordCardSchema = z.object({
  english: z.string().min(1).max(32),
  japanese: z.string().min(1).max(32),
  furigana: z.string().min(1).max(48),
  chinese: z.string().min(1).max(48)
});

const videoSettingsSchema = z.object({
  mode: z.enum(["short", "agent"]),
  model: z.string().min(1).max(120),
  duration: z.number().int().min(5).max(180),
  ratio: z.enum(["4:3", "9:16", "16:9"]),
  selectedAssetIds: z.array(z.string()).min(1).max(12),
  wordCard: wordCardSchema,
  preGenerateWordCard: z.boolean().default(true),
  preGenerateSceneImage: z.boolean().default(false),
  sceneImagePrompt: z.string().max(6000).default(""),
  sceneImageAssetIds: z.array(z.string()).max(12).default([])
});

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "Lala Studio", version: "0.1.0" });
  });

  app.get(
    "/api/bootstrap",
    asyncRoute(async (_req, res) => {
      res.json({
        stories: storyRepository.list(),
        assets: listAssets(),
        videos: listVideos().slice(0, 80),
        jobs: jobs.list().slice(0, 40),
        models: Object.values(modelProfiles),
        status: await systemStatus(),
        defaults: {
          video: {
            mode: "short",
            model: "Seedance 2.0 Mini 体验版",
            duration: 15,
            ratio: "4:3",
            selectedAssetIds: listAssets().filter((asset) => asset.defaultSelected).map((asset) => asset.id),
            wordCard: { english: "together", japanese: "一緒", furigana: "いっしょ", chinese: "一起" },
            preGenerateWordCard: true,
            preGenerateSceneImage: false,
            sceneImagePrompt: "",
            sceneImageAssetIds: []
          },
          platforms: ["shipinhao", "youtube", "instagram", "douyin"]
        }
      });
    })
  );

  app.get(
    "/api/status",
    asyncRoute(async (_req, res) => {
      res.json(await systemStatus());
    })
  );
  app.post("/api/browser/open", (_req, res) => res.status(202).json(launchXyqBrowser()));

  app.get("/api/stories", (_req, res) => res.json({ stories: storyRepository.list() }));
  app.get("/api/stories/:id", (req, res) => res.json(storyRepository.get(req.params.id)));
  app.post("/api/stories", (req, res) => {
    const parsed = z
      .object({ title: z.string().min(1).max(160), content: z.string().max(40000).optional(), duration: z.number().int().min(5).max(180).optional() })
      .parse(req.body);
    res.status(201).json(storyRepository.create(parsed));
  });
  app.put("/api/stories/:id", (req, res) => {
    const parsed = z.object({ content: z.string().min(1).max(40000) }).parse(req.body);
    res.json(storyRepository.save(req.params.id, parsed.content));
  });

  app.get("/api/assets", (_req, res) => res.json({ assets: listAssets() }));
  app.get("/media/assets/:id", (req, res) => {
    const filePath = getAssetPath(req.params.id);
    res.sendFile(filePath);
  });

  app.get("/api/videos", (_req, res) => res.json({ videos: listVideos() }));
  app.get("/media/generated-assets/:storyId/:file", (req, res) => {
    const storyId = safeId(req.params.storyId);
    const file = req.params.file;
    if (!new Set(["word-card.png", "scene-reference.png"]).has(file)) {
      return res.status(404).json({ error: "Generated reference image not found" });
    }
    const generatedRoot = path.join(runtimeRoot, "generated-assets");
    const filePath = assertInside(generatedRoot, path.join(generatedRoot, storyId, file));
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).json({ error: "Generated reference image not found" });
    }
    res.sendFile(filePath, { dotfiles: "allow" });
  });
  app.get("/media/videos/:id", (req, res) => {
    const id = req.params.id;
    if (id !== path.basename(id) || !id.toLowerCase().endsWith(".mp4")) {
      return res.status(404).json({ error: "Video not found" });
    }
    const filePath = assertInside(videosRoot, path.join(videosRoot, id));
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).json({ error: "Video not found" });
    }
    res.sendFile(filePath);
  });

  app.post("/api/ai/jobs", (req, res) => {
    const input = aiSchema.parse(req.body);
    const routeMap: Record<typeof input.action, ModelRoute> = {
      chat: "chat",
      draft: "draft",
      review: "review",
      final: "final",
      refine: "final"
    };
    const profile = input.action === "refine"
      ? modelProfiles.final
      : resolveModelProfile(routeMap[input.action], {
          effort: input.effort as ReasoningEffort | undefined
        });
    const title = input.action === "refine" ? "Story refinement pipeline" : profile.label;
    const job = jobs.create({ type: "ai", title: `${title}: ${input.message.slice(0, 54)}`, profile });
    jobs.run(job, async ({ log, progress, signal }) => {
      if (input.action === "refine") {
        return runStoryRefinementPipeline(
          {
            message: input.message,
            story: input.story,
            duration: input.duration || 15,
            history: input.history
          },
          {
            profiles: {
              draft: modelProfiles.draft,
              review: modelProfiles.review,
              final: modelProfiles.final
            },
            progress,
            run: (stage, stageProfile, prompt) => runCodex({
              profile: stageProfile,
              prompt,
              sandbox: "read-only",
              ignoreRepositoryRules: true,
              singleExecutor: true,
              signal,
              log: (line) => log(`[${stage}] ${line}`)
            })
          }
        );
      }
      const standardAction = input.action;
      progress(12, `Running ${profile.model} at ${profile.effort}`);
      const output = await runCodex({
        profile,
        prompt: buildAiPrompt({
          action: standardAction,
          message: input.message,
          story: input.story,
          duration: input.duration,
          history: input.history
        }),
        sandbox: "read-only",
        ignoreRepositoryRules: true,
        singleExecutor: true,
        signal,
        log
      });
      progress(95, "Final response received");
      return { content: output };
    });
    res.status(202).json(job);
  });

  app.post("/api/prompts/build", (req, res) => {
    const parsed = z
      .object({ storyId: z.string().min(1), settings: videoSettingsSchema, save: z.boolean().optional() })
      .parse(req.body);
    const story = storyRepository.get(parsed.storyId);
    const prompt = buildVideoPrompt({ story: story.content, assets: listAssets(), settings: parsed.settings as VideoSettings });
    const issues = validateVideoPrompt(prompt);
    const saved = parsed.save && issues.length === 0 ? storyRepository.savePrompt(parsed.storyId, prompt) : null;
    res.json({ prompt, issues, savedStory: saved });
  });

  app.post("/api/video/jobs", (req, res) => {
    const parsed = z
      .object({
        storyId: z.string().min(1),
        prompt: z.string().min(1).max(50000),
        settings: videoSettingsSchema,
        operation: z.enum(["prepare", "generate"]),
        paidActionConfirmed: z.boolean().default(false),
        forceRegenerate: z.boolean().default(false)
      })
      .parse(req.body);
    if (parsed.operation === "generate" && !parsed.paidActionConfirmed) {
      return res.status(409).json({ error: "Paid generation requires explicit confirmation" });
    }
    const issues = validateVideoPrompt(parsed.prompt);
    if (issues.length) return res.status(400).json({ error: "Prompt preflight failed", issues });
    const story = storyRepository.get(parsed.storyId);
    const existingVideoPath = story.videoPath
      ? assertInside(repoRoot, path.join(repoRoot, story.videoPath))
      : null;
    const job = startVideoWorkflow({
      jobs,
      storyId: parsed.storyId,
      story: story.content,
      prompt: parsed.prompt,
      settings: parsed.settings as VideoSettings,
      operation: parsed.operation,
      paidActionConfirmed: parsed.paidActionConfirmed,
      existingVideoPath,
      forceRegenerate: parsed.forceRegenerate
    });
    res.status(202).json(job);
  });

  app.post("/api/reference-image/jobs", (req, res) => {
    const parsed = z
      .object({ storyId: z.string().min(1), settings: videoSettingsSchema })
      .parse(req.body);
    const story = storyRepository.get(parsed.storyId);
    const job = startReferenceImageWorkflow({
      jobs,
      storyId: parsed.storyId,
      story: story.content,
      settings: parsed.settings as VideoSettings
    });
    res.status(202).json(job);
  });

  app.post("/api/publish/jobs", (req, res) => {
    const parsed = z
      .object({
        storyId: z.string().min(1),
        videoId: z.string().min(1),
        title: z.string().min(1).max(180),
        platforms: z.array(z.enum(["shipinhao", "youtube", "instagram", "douyin"])).min(1),
        category: z.enum(["lalachan", "lalamv"]).default("lalachan"),
        publishConfirmed: z.boolean().default(false)
      })
      .parse(req.body);
    const storyId = safeId(parsed.storyId);
    storyRepository.get(storyId);
    const videoPath = assertInside(videosRoot, path.join(videosRoot, path.basename(parsed.videoId)));
    const storyPath = assertInside(storiesRoot, path.join(storiesRoot, `${storyId}.md`));
    const job = startPublishWorkflow({
      jobs,
      videoPath,
      storyPath,
      title: parsed.title,
      platforms: parsed.platforms,
      category: parsed.category,
      publishConfirmed: parsed.publishConfirmed
    });
    res.status(202).json(job);
  });

  app.post("/api/delivery/jobs", (req, res) => {
    const parsed = z
      .object({
        storyId: z.string().min(1),
        title: z.string().min(1).max(180),
        platforms: z.array(z.enum(["shipinhao", "youtube", "instagram", "douyin"])).min(1),
        category: z.enum(["lalachan", "lalamv"]).default("lalachan"),
        publishConfirmed: z.literal(true)
      })
      .parse(req.body);
    const storyId = safeId(parsed.storyId);
    const story = storyRepository.get(storyId);
    const storyPath = assertInside(storiesRoot, path.join(storiesRoot, `${storyId}.md`));
    const existingVideoPath = story.videoPath
      ? assertInside(repoRoot, path.join(repoRoot, story.videoPath))
      : null;
    const job = startDeliveryWorkflow({
      jobs,
      storyId,
      storyPath,
      existingVideoPath,
      expectedDuration: story.duration,
      title: parsed.title,
      platforms: parsed.platforms,
      category: parsed.category,
      publishConfirmed: parsed.publishConfirmed
    });
    res.status(202).json(job);
  });

  app.get("/api/jobs", (_req, res) => res.json({ jobs: jobs.list() }));
  app.get("/api/jobs/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });
  app.post("/api/jobs/:id/cancel", (req, res) => res.json(jobs.cancel(req.params.id)));

  const dist = path.join(studioRoot, "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("*splat", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = error instanceof z.ZodError ? 400 : 500;
    const message = error instanceof Error ? error.message : "Unknown server error";
    res.status(status).json({ error: message, details: error instanceof z.ZodError ? error.issues : undefined });
  });

  return app;
}
