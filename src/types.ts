export type WorkspaceView = "write" | "prompt" | "produce" | "publish" | "runs";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  kind?: "text" | "production" | "error";
  applyable?: boolean;
}

export interface ProductionRequest {
  id: string;
  storyId: string;
  sourceMessage: string;
  settings: VideoSettings;
  forceRegenerate: boolean;
  summary: string;
}

export interface DeliveryRequest {
  id: string;
  storyId: string;
  sourceMessage: string;
  title: string;
  platforms: string[];
  category: "lalachan" | "lalamv";
  existingVideoId: string | null;
  summary: string;
}

export interface StorySummary {
  id: string;
  title: string;
  summary: string;
  status: "draft" | "prompted" | "generated";
  duration: number | null;
  storyPath: string;
  promptPath: string | null;
  videoPath: string | null;
  updatedAt: string;
  qualityScore: number;
  issueCount: number;
}

export interface QualityCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface StoryDocument extends StorySummary {
  content: string;
  prompt: string | null;
  quality: { score: number; checks: QualityCheck[] };
  wordCard: WordCard | null;
}

export interface WordCard {
  english: string;
  japanese: string;
  furigana: string;
  chinese: string;
}

export interface AssetDefinition {
  id: string;
  label: string;
  role: string;
  relativePath: string;
  mediaUrl: string;
  required: boolean;
  defaultSelected: boolean;
}

export interface ModelProfile {
  route: "chat" | "draft" | "review" | "final" | "workflow";
  model: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max" | "ultra";
  label: string;
  description: string;
}

export interface StudioJob {
  id: string;
  type: "ai" | "video" | "publish" | "system";
  title: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  progress: number;
  message: string;
  route?: string;
  model?: string;
  effort?: string;
  logs: string[];
  result?: { content?: string; report?: string; [key: string]: unknown };
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoItem {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  size: number;
  updatedAt: string;
}

export interface ServiceStatus {
  codex: boolean;
  ffmpeg: boolean;
  xyqCdp: boolean;
  xyqNoVnc: boolean;
  lazyEdit: boolean;
  noVncUrl: string;
  cdpUrl: string;
  lazyEditApi: string;
}

export interface VideoSettings {
  mode: "short" | "agent";
  model: string;
  duration: number;
  ratio: "4:3" | "9:16" | "16:9";
  selectedAssetIds: string[];
  wordCard: WordCard;
  preGenerateWordCard: boolean;
}

export interface BootstrapData {
  stories: StorySummary[];
  assets: AssetDefinition[];
  videos: VideoItem[];
  jobs: StudioJob[];
  models: ModelProfile[];
  status: ServiceStatus;
  defaults: {
    video: VideoSettings;
    platforms: string[];
  };
}
