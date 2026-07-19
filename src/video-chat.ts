import type { DeliveryRequest, ProductionRequest, VideoSettings } from "./types.js";

const PRODUCTION_INTENT = [
  /(?:生成|制作|准备|配置|开始|创建|做成|提交).{0,24}(?:视频|短片|影片|电影|mv)/i,
  /(?:视频|短片|影片|电影|mv).{0,24}(?:生成|制作|准备|配置|开始|创建|提交)/i,
  /(?:generate|create|make|prepare|configure|submit|render).{0,40}(?:video|film|movie|mv)/i
];

const PUBLISH_INTENT = [
  /(?:发布|发表|投放|上传).{0,40}(?:视频|短片|影片|电影|mv|平台|小红书|抖音|视频号|油管|youtube|instagram)/i,
  /(?:视频|短片|影片|电影|mv).{0,40}(?:发布|发表|投放|上传)/i,
  /(?:publish|post|upload).{0,48}(?:video|film|movie|mv|platform|youtube|instagram|douyin|shipinhao)/i
];

export function isPublishMessage(message: string): boolean {
  const clean = message.trim();
  return clean.length > 0 && PUBLISH_INTENT.some((pattern) => pattern.test(clean));
}

export function isProductionMessage(message: string): boolean {
  const clean = message.trim();
  return clean.length > 0 && PRODUCTION_INTENT.some((pattern) => pattern.test(clean));
}

function parseDuration(message: string, fallback: number): number {
  const match = message.match(/(?:^|\D)(\d{1,3})\s*(?:s(?:ec(?:ond)?s?)?|秒)(?:\D|$)/i);
  if (!match) return fallback;
  return Math.max(5, Math.min(180, Number(match[1])));
}

function parseRatio(message: string, fallback: VideoSettings["ratio"]): VideoSettings["ratio"] {
  if (/(?:9\s*[:：x×]\s*16|竖屏|portrait)/i.test(message)) return "9:16";
  if (/(?:16\s*[:：x×]\s*9|横屏|landscape)/i.test(message)) return "16:9";
  if (/(?:4\s*[:：x×]\s*3|四比三)/i.test(message)) return "4:3";
  return fallback;
}

function parseModel(message: string, fallback: string): string {
  if (/(?:mini|体验版|最便宜|最低积分|cheapest|lowest[- ]?credit)/i.test(message)) {
    return "Seedance 2.0 Mini 体验版";
  }
  if (/(?:fast).{0,8}(?:非\s*vip|no\s*vip|non[- ]?vip)/i.test(message)) {
    return "Seedance 2.0 Fast 非VIP";
  }
  if (/(?:seedance\s*2\.0\s*fast)/i.test(message)) return "Seedance 2.0 Fast 非VIP";
  if (/(?:seedance\s*2\.0)(?!\s*(?:fast|mini))/i.test(message)) return "Seedance 2.0";
  return fallback;
}

export function planProductionRequest(input: {
  storyId: string;
  message: string;
  current: VideoSettings;
  storyDuration?: number | null;
}): ProductionRequest {
  const duration = parseDuration(input.message, input.storyDuration || input.current.duration);
  const explicitAgent = /(?:创作\s*agent|agent\s*(?:模式|mode)|智能长视频|长视频)/i.test(input.message);
  const explicitShort = /(?:沉浸式短片|短片模式|short\s*film|duanpian)/i.test(input.message);
  const mode: VideoSettings["mode"] = explicitAgent ? "agent" : explicitShort ? "short" : duration > 30 ? "agent" : input.current.mode;
  const requestsSceneImage = /(?:先|预先|提前|预生成|生成).{0,16}(?:场景图|场景参考图|概念图|关键帧|scene\s+(?:image|reference)|keyframe|concept\s+art)/i.test(input.message);
  const settings: VideoSettings = {
    ...input.current,
    mode,
    model: parseModel(input.message, input.current.model),
    duration,
    ratio: parseRatio(input.message, input.current.ratio),
    preGenerateSceneImage: requestsSceneImage || input.current.preGenerateSceneImage,
    sceneImagePrompt: requestsSceneImage ? input.message.trim() : input.current.sceneImagePrompt,
    sceneImageAssetIds: input.current.sceneImageAssetIds
  };
  const generatedSceneCount = settings.preGenerateSceneImage ? 1 : 0;
  const summary = `${settings.duration}s · ${settings.ratio} · ${settings.mode === "short" ? "沉浸式短片" : "创作 Agent"} · ${settings.model} · ${settings.selectedAssetIds.length + generatedSceneCount} 张参考图${generatedSceneCount ? "（含预生成场景图）" : ""}`;
  return {
    id: `production-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    storyId: input.storyId,
    sourceMessage: input.message.trim(),
    settings,
    forceRegenerate: /(?:重新生成|重做|再生成|regenerate|rerun|new\s+version)/i.test(input.message),
    summary
  };
}

export function planDeliveryRequest(input: {
  storyId: string;
  message: string;
  title: string;
  defaultPlatforms: string[];
  existingVideoId?: string | null;
}): DeliveryRequest {
  const requested = [
    ["shipinhao", /(?:视频号|shipinhao|sph)/i],
    ["youtube", /(?:youtube|油管|y2b)/i],
    ["instagram", /(?:instagram|\bins\b)/i],
    ["douyin", /(?:抖音|douyin)/i]
  ] as const;
  const explicit = requested.filter(([, pattern]) => pattern.test(input.message)).map(([platform]) => platform);
  const allRequested = /(?:全部|所有|四个|全平台|all\s+platforms?)/i.test(input.message);
  const platforms = allRequested || explicit.length === 0 ? [...input.defaultPlatforms] : explicit;
  const category: DeliveryRequest["category"] = /(?:lalamv|音乐\s*mv|music\s*video)/i.test(input.message)
    ? "lalamv"
    : "lalachan";
  const existingVideoId = input.existingVideoId || null;
  const downloadState = existingVideoId ? `已找到下载文件 ${existingVideoId}` : "发布前先从当前小云雀结果下载并验证";
  return {
    id: `delivery-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    storyId: input.storyId,
    sourceMessage: input.message.trim(),
    title: input.title.trim(),
    platforms,
    category,
    existingVideoId,
    summary: `${downloadState} · LazyEdit · ${platforms.join(" / ")} · ${category}`
  };
}
