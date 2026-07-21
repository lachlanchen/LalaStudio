export type WorkspaceView = "write" | "world" | "prompt" | "produce" | "publish" | "runs";
export type StoryAiAction = "chat" | "draft" | "review" | "final" | "refine";

export interface AiConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  kind?: "text" | "critique" | "production" | "error";
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
  type: "ai" | "image" | "video" | "publish" | "system";
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
  mediaUrl: string;
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
  preGenerateSceneImage: boolean;
  sceneImagePrompt: string;
  sceneImageAssetIds: string[];
}

export type WorldEntityStatus = "active" | "resting" | "retired";
export type WorldArcStatus = "open" | "paused" | "resolved";
export type WorldMediaKind = "character-reference" | "prop-reference" | "scene-reference" | "word-card" | "video";

export interface WorldCharacter {
  id: string;
  name: string;
  role: string;
  personality: string;
  voice: string;
  visualRules: string[];
  relationshipNotes: string[];
  defaultOutfitId: string;
  assetIds: string[];
  status: WorldEntityStatus;
}

export interface WorldPlace {
  id: string;
  name: string;
  role: string;
  summary: string;
  visualAnchors: string[];
  recurringUses: string[];
  connectedPlaceIds: string[];
  status: WorldEntityStatus;
}

export interface WorldTool {
  id: string;
  name: string;
  ownerIds: string[];
  purpose: string;
  rule: string;
  limitation: string;
  assetIds: string[];
  status: WorldEntityStatus;
}

export interface WorldOutfit {
  id: string;
  name: string;
  characterIds: string[];
  use: string;
  visualRules: string[];
  assetIds: string[];
  version: number;
  status: WorldEntityStatus;
}

export interface WorldArc {
  id: string;
  name: string;
  premise: string;
  audienceQuestion: string;
  knownClues: string[];
  nextBeat: string;
  status: WorldArcStatus;
}

export interface WorldTopic {
  id: string;
  name: string;
  promise: string;
}

export interface WorldEpisode {
  storyId: string;
  title: string;
  duration: number;
  characterIds: string[];
  placeIds: string[];
  toolIds: string[];
  outfitIds: string[];
  arcIds: string[];
  topicIds: string[];
  hook: string;
  continuityNote: string;
  status: "planned" | "written" | "generated" | "published";
  createdAt: string;
  updatedAt: string;
}

export interface WorldMediaVersion {
  id: string;
  label: string;
  kind: WorldMediaKind;
  version: number;
  relativePath: string;
  sha256: string;
  sourceStoryId: string | null;
  sourceEntityIds: string[];
  supersedes: string | null;
  tracked: boolean;
  createdAt: string;
}

export interface WorldDatabase {
  schemaVersion: number;
  revision: number;
  id: string;
  name: string;
  tagline: string;
  premise: string;
  updatedAt: string;
  storyEngine: {
    episodePromise: string;
    connectionRule: string;
    hookRule: string;
    continuityRules: string[];
  };
  characters: WorldCharacter[];
  places: WorldPlace[];
  tools: WorldTool[];
  outfits: WorldOutfit[];
  arcs: WorldArc[];
  topics: WorldTopic[];
  episodes: WorldEpisode[];
  media: WorldMediaVersion[];
}

export interface WorldStoryPlan {
  title: string;
  duration: number;
  idea: string;
  characterIds: string[];
  placeIds: string[];
  toolIds: string[];
  outfitIds: string[];
  arcIds: string[];
  topicIds: string[];
  hook: string;
}

export interface BootstrapData {
  stories: StorySummary[];
  assets: AssetDefinition[];
  videos: VideoItem[];
  jobs: StudioJob[];
  models: ModelProfile[];
  status: ServiceStatus;
  world: WorldDatabase;
  defaults: {
    video: VideoSettings;
    platforms: string[];
  };
}
