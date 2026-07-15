import type { BootstrapData, StoryDocument, StudioJob, VideoSettings } from "./types";

async function request<T>(route: string, options?: RequestInit): Promise<T> {
  const response = await fetch(route, {
    ...options,
    headers: options?.body ? { "content-type": "application/json", ...options.headers } : options?.headers
  });
  const payload = (await response.json()) as T & { error?: string; details?: unknown };
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload;
}

export const api = {
  bootstrap: () => request<BootstrapData>("/api/bootstrap"),
  status: () => request<BootstrapData["status"]>("/api/status"),
  story: (id: string) => request<StoryDocument>(`/api/stories/${encodeURIComponent(id)}`),
  saveStory: (id: string, content: string) =>
    request<StoryDocument>(`/api/stories/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ content })
    }),
  createStory: (title: string, duration: number) =>
    request<StoryDocument>("/api/stories", {
      method: "POST",
      body: JSON.stringify({ title, duration })
    }),
  aiJob: (input: {
    action: "chat" | "draft" | "review" | "final";
    message: string;
    story?: string;
    duration?: number;
    effort?: string;
  }) =>
    request<StudioJob>("/api/ai/jobs", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  buildPrompt: (storyId: string, settings: VideoSettings, save = false) =>
    request<{ prompt: string; issues: string[]; savedStory?: StoryDocument }>("/api/prompts/build", {
      method: "POST",
      body: JSON.stringify({ storyId, settings, save })
    }),
  videoJob: (input: {
    storyId: string;
    prompt: string;
    settings: VideoSettings;
    operation: "prepare" | "generate";
    paidActionConfirmed: boolean;
    forceRegenerate?: boolean;
  }) =>
    request<StudioJob>("/api/video/jobs", { method: "POST", body: JSON.stringify(input) }),
  publishJob: (input: {
    storyId: string;
    videoId: string;
    title: string;
    platforms: string[];
    category: "lalachan" | "lalamv";
    publishConfirmed: boolean;
  }) => request<StudioJob>("/api/publish/jobs", { method: "POST", body: JSON.stringify(input) }),
  deliveryJob: (input: {
    storyId: string;
    title: string;
    platforms: string[];
    category: "lalachan" | "lalamv";
    publishConfirmed: true;
  }) => request<StudioJob>("/api/delivery/jobs", { method: "POST", body: JSON.stringify(input) }),
  videos: () => request<{ videos: BootstrapData["videos"] }>("/api/videos"),
  jobs: () => request<{ jobs: StudioJob[] }>("/api/jobs"),
  job: (id: string) => request<StudioJob>(`/api/jobs/${encodeURIComponent(id)}`),
  cancelJob: (id: string) => request<StudioJob>(`/api/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST", body: "{}" }),
  openBrowser: () => request<{ started: boolean; detail: string }>("/api/browser/open", { method: "POST", body: "{}" })
};
