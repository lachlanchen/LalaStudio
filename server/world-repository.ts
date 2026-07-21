import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  StoryDocument,
  WorldDatabase,
  WorldEpisode,
  WorldMediaKind,
  WorldMediaVersion,
  WorldStoryPlan
} from "./types.js";
import { repoRoot, worldRoot } from "./config.js";
import { assertInside, atomicWrite, relativeTo, safeId, slugify } from "./lib/files.js";
import type { StoryRepository } from "./story-repository.js";

const databasePath = path.join(worldRoot, "lalachan-world.json");
const entityCollections = ["characters", "places", "tools", "outfits", "arcs", "topics"] as const;
export type WorldEntityCollection = (typeof entityCollections)[number];

function starterWorld(): WorldDatabase {
  const now = new Date().toISOString();
  const characters = [
    ["raraxia", "啦啦侠", "热心行动派", "热情、勇敢、偶尔馋嘴。", "说话直接、短、带一点憨厚。", "daily-raraxia-v1"],
    ["ayachan", "阿芽酱", "观察细致的情感中心", "温柔、细心、有主见。", "自然、简洁、有生活感。", "daily-ayachan-v1"],
    ["sasakun", "飒飒君", "速度与好奇心担当", "灵活、爱尝试，笑点来自动作。", "短促、兴奋、像朋友随口说话。", "daily-sasakun-v1"],
    ["zhuangzi", "庄子机器人", "可靠的第四位伙伴", "冷静、实用、偶尔一本正经地好笑。", "像朋友一样说普通话，不报系统日志。", "zhuangzi-shell-v1"]
  ].map(([id, name, role, personality, voice, defaultOutfitId]) => ({
    id, name, role, personality, voice,
    visualRules: [`保持 ${id} 单人参考图的身份、脸和体型`],
    relationshipNotes: ["四位伙伴互相帮助，也允许自己被别人照顾"],
    defaultOutfitId,
    assetIds: [id],
    status: "active" as const
  }));
  return {
    schemaVersion: 1,
    revision: 1,
    id: "cloud-harbor-world",
    name: "云港万象",
    tagline: "四个伙伴从一间云边小屋出发，把每次迷路都变成下一条路。",
    premise: "云港连接日常生活、森林、云海与远方。四个伙伴从熟悉的家出发，每集解决一个具体问题，也会留下一条通往下一次旅程的小线索。",
    updatedAt: now,
    storyEngine: {
      episodePromise: "每集先让观众看懂一个具体愿望或麻烦，再用人物行动完成笑点和温暖结局。",
      connectionRule: "每集复用至少一个熟悉地点、工具、衣服或人物关系。",
      hookRule: "本集问题先解决，结尾只留一个具体可见的小问题。",
      continuityRules: ["四位主角身份稳定", "对白自然简短", "工具有用途也有限制", "先看懂，再可爱"]
    },
    characters,
    places: [
      {
        id: "cloud-harbor-home", name: "云港小屋", role: "共同生活的家",
        summary: "有厨房、工作桌、临云露台和风门月台的温暖木屋。",
        visualAnchors: ["温暖木材", "临云露台", "四人长桌"],
        recurringUses: ["做饭", "修东西", "出发与归来"], connectedPlaceIds: ["star-bridge-market"], status: "active"
      },
      {
        id: "star-bridge-market", name: "星桥集市", role: "食物、手艺和消息的交汇处",
        summary: "沿发光石桥铺开的市场，桥下有小星沿云河漂过。",
        visualAnchors: ["发光石桥", "木摊", "云河"],
        recurringUses: ["找食材", "遇见邻居", "发现线索"], connectedPlaceIds: ["cloud-harbor-home"], status: "active"
      }
    ],
    tools: [
      { id: "patchwork-notebook", name: "拼皮旅印笔记本", ownerIds: characters.map((item) => item.id), purpose: "保存地图和旅印", rule: "保留已经发现的线索，不凭空给答案。", limitation: "页面可能受风雨和褪色影响。", assetIds: ["notebook"], status: "active" },
      { id: "zhuangzi-toolbay", name: "庄子工具舱", ownerIds: ["zhuangzi"], purpose: "展开一个清楚实用的小工具", rule: "每集最多突出一个主要功能。", limitation: "需要伙伴判断何时使用。", assetIds: ["zhuangzi"], status: "active" }
    ],
    outfits: characters.map((character) => ({
      id: character.defaultOutfitId,
      name: `${character.name}日常外观 v1`,
      characterIds: [character.id],
      use: "日常与普通旅行",
      visualRules: character.visualRules,
      assetIds: character.assetIds,
      version: 1,
      status: "active" as const
    })),
    arcs: [{ id: "fading-journey-marks", name: "正在褪色的旅印", premise: "旧旅印开始褪色。", audienceQuestion: "哪条回家路会先消失？", knownClues: [], nextBeat: "一只蓝尾纸鸟带来陌生灯塔的线索。", status: "open" }],
    topics: [
      { id: "friendship", name: "四人伙伴关系", promise: "每个人都能帮忙，也都可以被照顾。" },
      { id: "mystery", name: "下一扇门", promise: "结尾留下一个清楚的下一集问题。" }
    ],
    episodes: [],
    media: []
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function validateDatabase(value: unknown): WorldDatabase {
  if (!value || typeof value !== "object") throw new Error("World database must be an object");
  const world = value as Partial<WorldDatabase>;
  if (world.schemaVersion !== 1) throw new Error("Unsupported world database schema");
  if (!world.id || !world.name || !world.storyEngine) throw new Error("World database is missing identity or story-engine fields");
  for (const key of [...entityCollections, "episodes", "media"] as const) {
    if (!Array.isArray(world[key])) throw new Error(`World database field ${key} must be an array`);
  }
  const allIds = new Set<string>();
  for (const key of entityCollections) {
    for (const entity of world[key] as Array<{ id?: string }>) {
      if (!entity.id || !/^[a-z0-9][a-z0-9-]*$/.test(entity.id)) throw new Error(`Invalid ${key} id`);
      const scoped = `${key}:${entity.id}`;
      if (allIds.has(scoped)) throw new Error(`Duplicate ${key} id: ${entity.id}`);
      allIds.add(scoped);
    }
  }
  return world as WorldDatabase;
}

function activeNames<T extends { id: string; name: string }>(ids: string[], items: T[]): string[] {
  return ids.map((id) => items.find((item) => item.id === id)?.name).filter((name): name is string => Boolean(name));
}

export class WorldRepository {
  constructor() {
    fs.mkdirSync(worldRoot, { recursive: true });
    if (!fs.existsSync(databasePath)) atomicWrite(databasePath, `${JSON.stringify(starterWorld(), null, 2)}\n`);
    this.get();
  }

  get(): WorldDatabase {
    return clone(validateDatabase(JSON.parse(fs.readFileSync(databasePath, "utf8"))));
  }

  save(input: WorldDatabase): WorldDatabase {
    const current = this.get();
    const next = validateDatabase(clone(input));
    next.schemaVersion = 1;
    next.revision = current.revision + 1;
    next.updatedAt = new Date().toISOString();
    atomicWrite(databasePath, `${JSON.stringify(next, null, 2)}\n`);
    return this.get();
  }

  updateEntity(collection: WorldEntityCollection, idValue: string, patch: Record<string, unknown>): WorldDatabase {
    if (!entityCollections.includes(collection)) throw new Error("Unsupported world entity collection");
    const id = safeId(idValue);
    const world = this.get();
    const items = world[collection] as unknown as Array<Record<string, unknown> & { id: string }>;
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) throw new Error(`World entity not found: ${collection}/${id}`);
    items[index] = { ...items[index], ...patch, id };
    return this.save(world);
  }

  addEntity(collection: WorldEntityCollection, entity: Record<string, unknown> & { id: string }): WorldDatabase {
    if (!entityCollections.includes(collection)) throw new Error("Unsupported world entity collection");
    const world = this.get();
    const id = safeId(entity.id);
    const items = world[collection] as unknown as Array<Record<string, unknown> & { id: string }>;
    if (items.some((item) => item.id === id)) throw new Error(`World entity already exists: ${collection}/${id}`);
    items.push({ ...entity, id });
    return this.save(world);
  }

  linkEpisode(story: StoryDocument, plan: Omit<WorldStoryPlan, "title" | "idea">): WorldDatabase {
    const world = this.get();
    const now = new Date().toISOString();
    const current = world.episodes.find((episode) => episode.storyId === story.id);
    const episode: WorldEpisode = {
      storyId: story.id,
      title: story.title,
      duration: plan.duration,
      characterIds: plan.characterIds,
      placeIds: plan.placeIds,
      toolIds: plan.toolIds,
      outfitIds: plan.outfitIds,
      arcIds: plan.arcIds,
      topicIds: plan.topicIds,
      hook: plan.hook,
      continuityNote: current?.continuityNote || "",
      status: story.videoPath ? "generated" : story.content.includes("在这里写下故事") ? "planned" : "written",
      createdAt: current?.createdAt || now,
      updatedAt: now
    };
    world.episodes = [...world.episodes.filter((item) => item.storyId !== story.id), episode];
    return this.save(world);
  }

  markStory(story: StoryDocument): WorldDatabase {
    const world = this.get();
    const episode = world.episodes.find((item) => item.storyId === story.id);
    if (!episode) return world;
    episode.title = story.title;
    episode.duration = story.duration || episode.duration;
    episode.status = story.videoPath ? "generated" : "written";
    episode.updatedAt = new Date().toISOString();
    return this.save(world);
  }

  createStoryFromPlan(plan: WorldStoryPlan, stories: StoryRepository): { story: StoryDocument; world: WorldDatabase } {
    const idea = plan.idea.trim() || "从选定的世界地点与连续线索出发，写一个具体、自然、有清楚结尾的故事。";
    const story = stories.create({
      title: plan.title,
      duration: plan.duration,
      content: `# ${plan.title}\n\n${plan.duration} 秒中文短片。\n\n## 故事\n\n${idea}\n`
    });
    const world = this.linkEpisode(story, {
      duration: plan.duration,
      characterIds: plan.characterIds,
      placeIds: plan.placeIds,
      toolIds: plan.toolIds,
      outfitIds: plan.outfitIds,
      arcIds: plan.arcIds,
      topicIds: plan.topicIds,
      hook: plan.hook
    });
    return { story, world };
  }

  contextForStory(storyId?: string): string {
    const world = this.get();
    const episode = storyId ? world.episodes.find((item) => item.storyId === storyId) : undefined;
    const characterIds = episode?.characterIds.length ? episode.characterIds : world.characters.filter((item) => item.status === "active").map((item) => item.id);
    const characters = world.characters.filter((item) => characterIds.includes(item.id));
    const places = world.places.filter((item) => episode?.placeIds.includes(item.id));
    const tools = world.tools.filter((item) => episode?.toolIds.includes(item.id));
    const outfits = world.outfits.filter((item) => episode?.outfitIds.includes(item.id));
    const arcs = world.arcs.filter((item) => episode?.arcIds.includes(item.id));
    const topics = world.topics.filter((item) => episode?.topicIds.includes(item.id));

    const lines = [
      `World: ${world.name} — ${world.tagline}`,
      `Series premise: ${world.premise}`,
      `Episode rule: ${world.storyEngine.episodePromise}`,
      `Connection rule: ${world.storyEngine.connectionRule}`,
      `Hook rule: ${world.storyEngine.hookRule}`,
      `Cast: ${characters.map((item) => `${item.name}（${item.personality}；说话：${item.voice}）`).join("；")}`
    ];
    if (places.length) lines.push(`Selected places: ${places.map((item) => `${item.name}（${item.summary}；视觉锚点：${item.visualAnchors.join("、")}）`).join("；")}`);
    if (tools.length) lines.push(`Selected tools: ${tools.map((item) => `${item.name}（${item.rule}；限制：${item.limitation}）`).join("；")}`);
    if (outfits.length) lines.push(`Selected outfits: ${outfits.map((item) => `${item.name}（${item.visualRules.join("；")}）`).join("；")}`);
    if (arcs.length) lines.push(`Open threads: ${arcs.map((item) => `${item.name}（已知线索：${item.knownClues.join("、")}；下一步：${item.nextBeat}）`).join("；")}`);
    if (topics.length) lines.push(`Episode topics: ${topics.map((item) => `${item.name}（${item.promise}）`).join("；")}`);
    if (episode?.hook.trim()) lines.push(`Requested end hook: ${episode.hook.trim()}`);
    lines.push(`Continuity constraints: ${world.storyEngine.continuityRules.join("；")}`);
    return lines.join("\n");
  }

  promptContinuityForStory(storyId: string): string {
    const world = this.get();
    const episode = world.episodes.find((item) => item.storyId === storyId);
    if (!episode) return "";
    const places = activeNames(episode.placeIds, world.places);
    const tools = activeNames(episode.toolIds, world.tools);
    const outfits = activeNames(episode.outfitIds, world.outfits);
    const arcs = activeNames(episode.arcIds, world.arcs);
    return [
      places.length ? `固定地点：${places.join("、")}。` : "",
      tools.length ? `本集道具：${tools.join("、")}，遵守既定用途和限制。` : "",
      outfits.length ? `服装连续性：${outfits.join("、")}。` : "",
      arcs.length && episode.hook ? `连续线索：${arcs.join("、")}；只在结尾用一个清楚画面表现“${episode.hook}”。` : ""
    ].filter(Boolean).join("\n");
  }

  registerArtifacts(input: {
    storyId: string;
    wordCardPath?: string | null;
    sceneImagePath?: string | null;
    videoPath?: string | null;
  }): WorldDatabase {
    let world = this.get();
    const sources: Array<{ path: string | null | undefined; kind: WorldMediaKind; role: string; tracked: boolean }> = [
      { path: input.wordCardPath, kind: "word-card", role: "word-card", tracked: true },
      { path: input.sceneImagePath, kind: "scene-reference", role: "scene-reference", tracked: true },
      { path: input.videoPath, kind: "video", role: "episode-video", tracked: false }
    ];
    for (const source of sources) {
      if (!source.path || !fs.existsSync(source.path) || !fs.statSync(source.path).isFile()) continue;
      const digest = sha256(source.path);
      if (world.media.some((item) => item.sha256 === digest && item.sourceStoryId === input.storyId && item.kind === source.kind)) continue;
      const related = world.media.filter((item) => item.sourceStoryId === input.storyId && item.kind === source.kind);
      const version = Math.max(0, ...related.map((item) => item.version)) + 1;
      const previous = related.sort((a, b) => b.version - a.version)[0] || null;
      let relativePath = relativeTo(repoRoot, source.path);
      if (source.tracked) {
        const extension = path.extname(source.path).toLowerCase() || ".png";
        const directory = assertInside(worldRoot, path.join(worldRoot, "media", safeId(input.storyId)));
        fs.mkdirSync(directory, { recursive: true });
        const target = assertInside(directory, path.join(directory, `${source.role}-v${String(version).padStart(3, "0")}${extension}`));
        fs.copyFileSync(source.path, target);
        relativePath = relativeTo(repoRoot, target);
      }
      const id = safeId(`${input.storyId}-${source.role}-v${String(version).padStart(3, "0")}`);
      const media: WorldMediaVersion = {
        id,
        label: `${input.storyId} ${source.role} v${version}`,
        kind: source.kind,
        version,
        relativePath,
        sha256: digest,
        sourceStoryId: input.storyId,
        sourceEntityIds: [],
        supersedes: previous?.id || null,
        tracked: source.tracked,
        createdAt: new Date().toISOString()
      };
      world.media.push(media);
    }
    const episode = world.episodes.find((item) => item.storyId === input.storyId);
    if (episode && input.videoPath && fs.existsSync(input.videoPath)) {
      episode.status = "generated";
      episode.updatedAt = new Date().toISOString();
    }
    return this.save(world);
  }

  latestMediaForStory(storyId: string): WorldMediaVersion[] {
    const world = this.get();
    const byKind = new Map<WorldMediaKind, WorldMediaVersion>();
    for (const item of world.media.filter((entry) => entry.sourceStoryId === storyId)) {
      const current = byKind.get(item.kind);
      if (!current || item.version > current.version) byKind.set(item.kind, item);
    }
    return [...byKind.values()];
  }

  defaultPlan(title = "今日故事", duration = 15): WorldStoryPlan {
    const world = this.get();
    const openArc = world.arcs.find((item) => item.status === "open");
    return {
      title,
      duration,
      idea: "",
      characterIds: world.characters.filter((item) => item.status === "active").map((item) => item.id),
      placeIds: ["cloud-harbor-home"],
      toolIds: ["patchwork-notebook"],
      outfitIds: ["daily-raraxia-v1", "daily-ayachan-v1", "daily-sasakun-v1", "zhuangzi-shell-v1"],
      arcIds: openArc ? [openArc.id] : [],
      topicIds: ["friendship", "mystery"],
      hook: openArc?.nextBeat || ""
    };
  }

  nextEntityId(name: string): string {
    return slugify(name) || `entry-${Date.now()}`;
  }
}
