import type { ProductionRequest, VideoSettings } from "./types.js";

const PRODUCTION_INTENT = [
  /(?:生成|制作|开始|创建|做成|提交).{0,24}(?:视频|短片|影片|电影|mv)/i,
  /(?:视频|短片|影片|电影|mv).{0,24}(?:生成|制作|开始|创建|提交)/i,
  /(?:generate|create|make|submit|render).{0,40}(?:video|film|movie|mv)/i
];

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
  const settings: VideoSettings = {
    ...input.current,
    mode,
    model: parseModel(input.message, input.current.model),
    duration,
    ratio: parseRatio(input.message, input.current.ratio)
  };
  const summary = `${settings.duration}s · ${settings.ratio} · ${settings.mode === "short" ? "沉浸式短片" : "创作 Agent"} · ${settings.model} · ${settings.selectedAssetIds.length} 张参考图`;
  return {
    id: `production-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    storyId: input.storyId,
    sourceMessage: input.message.trim(),
    settings,
    summary
  };
}
