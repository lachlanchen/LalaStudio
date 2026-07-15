export type ReasoningEffort = "low" | "medium" | "high" | "xhigh" | "max" | "ultra";

export type ModelRoute = "chat" | "draft" | "review" | "final" | "workflow";

export interface ModelProfile {
  route: ModelRoute;
  model: string;
  effort: ReasoningEffort;
  label: string;
  description: string;
}

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface StudioJob {
  id: string;
  type: "ai" | "video" | "publish" | "system";
  title: string;
  status: JobStatus;
  progress: number;
  message: string;
  route?: ModelRoute;
  model?: string;
  effort?: ReasoningEffort;
  logs: string[];
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
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

export interface StoryDocument extends StorySummary {
  content: string;
  prompt: string | null;
  quality: StoryQuality;
  wordCard: WordCard | null;
}

export interface WordCard {
  english: string;
  japanese: string;
  furigana: string;
  chinese: string;
}

export interface StoryQuality {
  score: number;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "warn" | "fail";
    detail: string;
  }>;
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

export interface VideoSettings {
  mode: "short" | "agent";
  model: string;
  duration: number;
  ratio: "4:3" | "9:16" | "16:9";
  selectedAssetIds: string[];
  wordCard: WordCard;
  preGenerateWordCard: boolean;
}
