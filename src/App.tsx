import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Aperture,
  BookOpenText,
  Clapperboard,
  Command,
  FileCode2,
  Globe2,
  LoaderCircle,
  Menu,
  Plus,
  Radio,
  Settings,
  X
} from "lucide-react";
import { api } from "./api";
import { LibraryPanel } from "./components/LibraryPanel";
import { ProduceWorkspace } from "./components/ProduceWorkspace";
import { PromptWorkspace } from "./components/PromptWorkspace";
import { PublishWorkspace } from "./components/PublishWorkspace";
import { RunsWorkspace } from "./components/RunsWorkspace";
import { StoryWorkspace } from "./components/StoryWorkspace";
import { VideoPreviewModal } from "./components/VideoPreviewModal";
import { WorldWorkspace } from "./components/WorldWorkspace";
import { buildConversationHistory, inferStoryAiAction } from "./story-chat";
import { isProductionMessage, isPublishMessage, planDeliveryRequest, planProductionRequest } from "./video-chat";
import type {
  AssetDefinition,
  BootstrapData,
  ChatMessage,
  DeliveryRequest,
  ModelProfile,
  ProductionRequest,
  ServiceStatus,
  StoryAiAction,
  StoryDocument,
  StorySummary,
  StudioJob,
  VideoItem,
  VideoSettings,
  WorldDatabase,
  WorldStoryPlan,
  WorkspaceView
} from "./types";

const navItems: Array<{ id: WorkspaceView; label: string; icon: typeof BookOpenText }> = [
  { id: "write", label: "Write", icon: BookOpenText },
  { id: "world", label: "World", icon: Globe2 },
  { id: "prompt", label: "Prompt", icon: FileCode2 },
  { id: "produce", label: "Produce", icon: Clapperboard },
  { id: "publish", label: "Publish", icon: Radio },
  { id: "runs", label: "Runs", icon: Aperture }
];

function loadLocalState<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [boot, setBoot] = useState<BootstrapData | null>(null);
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [assets, setAssets] = useState<AssetDefinition[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [world, setWorld] = useState<WorldDatabase | null>(null);
  const [view, setView] = useState<WorkspaceView>("write");
  const [story, setStory] = useState<StoryDocument | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingWorld, setSavingWorld] = useState(false);
  const [query, setQuery] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptIssues, setPromptIssues] = useState<string[]>([]);
  const [buildingPrompt, setBuildingPrompt] = useState(false);
  const [videoSettings, setVideoSettings] = useState<VideoSettings | null>(null);
  const [activeAiJobId, setActiveAiJobId] = useState<string | null>(null);
  const [activeVideoJobId, setActiveVideoJobId] = useState<string | null>(null);
  const [activePublishJobId, setActivePublishJobId] = useState<string | null>(null);
  const [chatByStory, setChatByStory] = useState<Record<string, ChatMessage[]>>(() => loadLocalState("lala-studio-chat-v1", {}));
  const [productionRequest, setProductionRequest] = useState<ProductionRequest | null>(() => loadLocalState("lala-studio-production-v1", null));
  const [deliveryRequest, setDeliveryRequest] = useState<DeliveryRequest | null>(() => loadLocalState("lala-studio-delivery-v1", null));
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [publishTitle, setPublishTitle] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [category, setCategory] = useState<"lalachan" | "lalamv">("lalachan");
  const [newStoryOpen, setNewStoryOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState(15);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const aiJobContext = useRef(new Map<string, { storyId: string; action: StoryAiAction }>());
  const deliveredAiJobs = useRef(new Set<string>());
  const refreshedVideoJobs = useRef(new Set<string>());
  const refreshedPublishJobs = useRef(new Set<string>());
  const autoPreviewedVideos = useRef(new Set<string>());

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  const appendChat = useCallback((storyId: string, message: Omit<ChatMessage, "id" | "createdAt">) => {
    const next: ChatMessage = {
      ...message,
      id: `message-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString()
    };
    setChatByStory((current) => ({ ...current, [storyId]: [...(current[storyId] || []), next] }));
  }, []);

  const selectStory = useCallback(async (id: string) => {
    try {
      const next = await api.story(id);
      setStory(next);
      setContent(next.content);
      setPrompt(next.prompt || "");
      setPromptIssues([]);
      setPublishTitle(next.title.replace(/^\d{4}-\d{2}-\d{2}\s*/, ""));
      if (next.wordCard) {
        setVideoSettings((current) => current ? { ...current, wordCard: next.wordCard! } : current);
      }
      setDirty(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    void api.bootstrap()
      .then((data) => {
        setBoot(data);
        setStories(data.stories);
        setAssets(data.assets);
        setVideos(data.videos);
        setJobs(data.jobs);
        setModels(data.models);
        setStatus(data.status);
        setWorld(data.world);
        setVideoSettings(data.defaults.video);
        setPlatforms(data.defaults.platforms);
        setSelectedVideo(data.videos[0]?.id || "");
        setSelectedRunId(data.jobs[0]?.id || null);
        if (data.stories[0]) void selectStory(data.stories[0].id);
      })
      .catch((error) => setFatalError(error instanceof Error ? error.message : String(error)));
  }, [selectStory]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void api.jobs().then(({ jobs: next }) => setJobs(next)).catch(() => undefined);
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const refresh = () => void api.status().then(setStatus).catch(() => undefined);
    refresh();
    const timer = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("lala-studio-chat-v1", JSON.stringify(chatByStory));
  }, [chatByStory]);

  useEffect(() => {
    if (productionRequest) window.localStorage.setItem("lala-studio-production-v1", JSON.stringify(productionRequest));
    else window.localStorage.removeItem("lala-studio-production-v1");
  }, [productionRequest]);

  useEffect(() => {
    if (deliveryRequest) window.localStorage.setItem("lala-studio-delivery-v1", JSON.stringify(deliveryRequest));
    else window.localStorage.removeItem("lala-studio-delivery-v1");
  }, [deliveryRequest]);

  const activeAiJob = jobs.find((job) => job.id === activeAiJobId) || null;
  const activeVideoJob = jobs.find((job) => job.id === activeVideoJobId) || null;
  const activePublishJob = jobs.find((job) => job.id === activePublishJobId) || null;
  const activeReferenceJob = story
    ? jobs.find((job) => job.type === "image" && (
        job.result?.storyId === story.id || job.title === `Generate references ${story.id}`
      )) || null
    : null;
  const storyVideo = useMemo(() => {
    const expected = story?.videoPath?.split("/").pop();
    return expected ? videos.find((video) => video.id === expected || video.name === expected) || null : null;
  }, [story?.videoPath, videos]);
  const previewVideo = previewVideoId ? videos.find((video) => video.id === previewVideoId) || null : null;

  useEffect(() => {
    if (!storyVideo || autoPreviewedVideos.current.has(storyVideo.id)) return;
    autoPreviewedVideos.current.add(storyVideo.id);
    setPreviewVideoId(storyVideo.id);
  }, [storyVideo]);

  useEffect(() => {
    if (!activeVideoJob || !["done", "failed", "cancelled"].includes(activeVideoJob.status)) return;
    if (refreshedVideoJobs.current.has(activeVideoJob.id)) return;
    refreshedVideoJobs.current.add(activeVideoJob.id);
    const storyId = productionRequest?.storyId || story?.id;
    void Promise.all([
      api.videos(),
      storyId ? api.story(storyId).catch(() => null) : Promise.resolve(null)
    ]).then(([{ videos: next }, refreshedStory]) => {
      setVideos(next);
      if (!storyId) return;
      if (refreshedStory) {
        setStory((current) => current?.id === refreshedStory.id ? refreshedStory : current);
        setStories((current) => current.map((item) => item.id === refreshedStory.id ? refreshedStory : item));
      }
      const expected = refreshedStory?.videoPath?.split("/").pop() || `${storyId}.mp4`;
      const match = next.find((video) => video.id === expected || video.name === expected);
      if (match) setSelectedVideo(match.id);
    }).catch(() => undefined);
  }, [activeVideoJob, productionRequest?.storyId, story?.id]);

  useEffect(() => {
    if (!activePublishJob || !["done", "failed", "cancelled"].includes(activePublishJob.status)) return;
    if (refreshedPublishJobs.current.has(activePublishJob.id)) return;
    refreshedPublishJobs.current.add(activePublishJob.id);
    const currentStory = story;
    void api.videos().then(({ videos: next }) => {
      setVideos(next);
      if (currentStory && deliveryRequest?.storyId === currentStory.id) {
        const expected = currentStory.videoPath?.split("/").pop();
        const match = next.find((video) => video.id === expected || video.name === expected);
        if (match) setSelectedVideo(match.id);
      }
    }).catch(() => undefined);
  }, [activePublishJob, deliveryRequest, story]);

  useEffect(() => {
    const finished = [activeVideoJob, activeReferenceJob].some((job) => job && ["done", "failed", "cancelled"].includes(job.status));
    if (finished) void api.world().then(setWorld).catch(() => undefined);
  }, [activeVideoJob?.status, activeReferenceJob?.status]);

  useEffect(() => {
    if (!activeAiJob || !["done", "failed", "cancelled"].includes(activeAiJob.status)) return;
    if (deliveredAiJobs.current.has(activeAiJob.id)) return;
    deliveredAiJobs.current.add(activeAiJob.id);
    const context = aiJobContext.current.get(activeAiJob.id);
    const storyId = context?.storyId || story?.id;
    if (!storyId) return;
    if (activeAiJob.status === "done" && activeAiJob.result?.content) {
      if (context?.action === "refine" && activeAiJob.result.report) {
        const quality = activeAiJob.result.quality as { score?: number } | undefined;
        const accepted = activeAiJob.result.accepted !== false;
        appendChat(storyId, {
          role: "assistant",
          content: `${String(activeAiJob.result.report)}\n\n**Quality gate:** ${accepted ? `accepted${quality?.score ? ` · ${quality.score}/100` : ""}` : "not accepted"}`,
          kind: "critique"
        });
      }
      const accepted = context?.action !== "refine" || activeAiJob.result.accepted !== false;
      appendChat(storyId, {
        role: "assistant",
        content: accepted
          ? String(activeAiJob.result.content)
          : `The quality gate did not accept this candidate. Review the critic notes before retrying.\n\n${String(activeAiJob.result.content)}`,
        kind: accepted ? "text" : "error",
        applyable: accepted && (context?.action === "draft" || context?.action === "final" || context?.action === "refine")
      });
      return;
    }
    appendChat(storyId, {
      role: "assistant",
      content: `The co-writer could not finish: ${activeAiJob.error || activeAiJob.message}`,
      kind: "error"
    });
  }, [activeAiJob, appendChat, story?.id]);

  const buildPrompt = useCallback(async (save = false) => {
    if (!story || !videoSettings) return;
    setBuildingPrompt(true);
    try {
      const result = await api.buildPrompt(story.id, videoSettings, save);
      setPrompt(result.prompt);
      setPromptIssues(result.issues);
      if (result.savedStory) {
        setStory(result.savedStory);
        setStories((current) => current.map((item) => item.id === result.savedStory!.id ? result.savedStory! : item));
      }
      notify(save ? "Prompt saved" : "Prompt rebuilt");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    } finally {
      setBuildingPrompt(false);
    }
  }, [story, videoSettings]);

  useEffect(() => {
    if (story && videoSettings && !story.prompt && !prompt) void buildPrompt(false);
  }, [story?.id, videoSettings, buildPrompt, prompt, story]);

  const saveStory = async () => {
    if (!story) return;
    setSaving(true);
    try {
      const saved = await api.saveStory(story.id, content);
      setStory(saved);
      setContent(saved.content);
      setStories((current) => current.map((item) => item.id === saved.id ? saved : item));
      if (saved.wordCard) {
        setVideoSettings((current) => current ? { ...current, wordCard: saved.wordCard! } : current);
      }
      setDirty(false);
      notify("Story saved");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const createStory = async () => {
    if (!newTitle.trim()) return;
    try {
      const created = await api.createStory(newTitle.trim(), newDuration);
      setStories((current) => [created, ...current]);
      setNewStoryOpen(false);
      setNewTitle("");
      await selectStory(created.id);
      setView("write");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  const runAi = async (requestedAction: StoryAiAction, message: string, effort?: string) => {
    if (!story || !videoSettings) return;
    if (requestedAction === "chat" && isPublishMessage(message)) {
      const expected = story.videoPath?.split("/").pop() || null;
      const existing = expected ? videos.find((video) => video.id === expected || video.name === expected) : null;
      const request = planDeliveryRequest({
        storyId: story.id,
        message,
        title: story.title.replace(/^\d{4}-\d{2}-\d{2}\s*/, ""),
        defaultPlatforms: boot?.defaults.platforms || ["shipinhao", "youtube", "instagram", "douyin"],
        existingVideoId: existing?.id || null
      });
      setDeliveryRequest(request);
      setProductionRequest(null);
      setPlatforms(request.platforms);
      setCategory(request.category);
      setPublishTitle(request.title);
      if (request.existingVideoId) setSelectedVideo(request.existingVideoId);
      appendChat(story.id, { role: "user", content: message, kind: "text" });
      appendChat(story.id, {
        role: "assistant",
        kind: "production",
        content: `我已建立可检查的发布合同：${request.summary}。Studio 会先验证下载；缺少文件时只下载当前已完成结果，不重新生成，然后把故事作为上下文交给 LazyEdit。`
      });
      return;
    }
    if (requestedAction === "chat" && isProductionMessage(message)) {
      const request = planProductionRequest({
        storyId: story.id,
        message,
        current: videoSettings,
        storyDuration: story.duration
      });
      setProductionRequest(request);
      setDeliveryRequest(null);
      setVideoSettings(request.settings);
      appendChat(story.id, { role: "user", content: message, kind: "text" });
      appendChat(story.id, {
        role: "assistant",
        kind: "production",
        content: `我已把当前故事整理成可检查的生产合同：${request.summary}。先检查配置；只有点击“Generate once”并确认后，才会提交一次付费生成。`
      });
      return;
    }
    const action = requestedAction === "chat" ? inferStoryAiAction(message) : requestedAction;
    const history = buildConversationHistory(chatByStory[story.id] || []);
    appendChat(story.id, { role: "user", content: message, kind: "text" });
    try {
      const job = await api.aiJob({ action, message, story: content, duration: story?.duration || 15, effort, history, storyId: story.id });
      setJobs((current) => [job, ...current]);
      setActiveAiJobId(job.id);
      aiJobContext.current.set(job.id, { storyId: story.id, action });
      setSelectedRunId(job.id);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      appendChat(story.id, { role: "assistant", content: `The co-writer could not start: ${detail}`, kind: "error" });
      notify(detail);
    }
  };

  const startVideoJob = async (operation: "prepare" | "generate", settings: VideoSettings, nextPrompt: string, forceRegenerate = false) => {
    if (!story) return;
    const confirmed = operation === "generate"
      ? window.confirm(`Submit one paid ${settings.duration}s ${settings.model} generation after visible preflight?`)
      : false;
    if (operation === "generate" && !confirmed) return;
    const job = await api.videoJob({ storyId: story.id, prompt: nextPrompt, settings, operation, paidActionConfirmed: confirmed, forceRegenerate });
    setJobs((current) => [job, ...current]);
    setActiveVideoJobId(job.id);
    setSelectedRunId(job.id);
  };

  const runVideo = async (operation: "prepare" | "generate") => {
    if (!story || !videoSettings || !prompt) return;
    try {
      await startVideoJob(operation, videoSettings, prompt);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  const runReferenceImages = async () => {
    if (!story || !videoSettings) return;
    try {
      const job = await api.referenceImageJob({ storyId: story.id, settings: videoSettings });
      setJobs((current) => [job, ...current]);
      setSelectedRunId(job.id);
      setView("produce");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  const runChatProduction = async (operation: "inspect" | "prepare" | "generate") => {
    if (!story || !productionRequest || productionRequest.storyId !== story.id) return;
    setBuildingPrompt(true);
    try {
      const result = await api.buildPrompt(story.id, productionRequest.settings, false);
      setVideoSettings(productionRequest.settings);
      setPrompt(result.prompt);
      setPromptIssues(result.issues);
      if (result.issues.length) throw new Error(`Prompt preflight failed: ${result.issues.join("; ")}`);
      if (operation === "inspect") {
        setView("produce");
        notify("Production setup is ready for inspection");
        return;
      }
      await startVideoJob(operation, productionRequest.settings, result.prompt, productionRequest.forceRegenerate);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      appendChat(story.id, { role: "assistant", content: `Video preparation stopped: ${detail}`, kind: "error" });
      notify(detail);
    } finally {
      setBuildingPrompt(false);
    }
  };

  const runChatDelivery = async (operation: "inspect" | "publish") => {
    if (!story || !deliveryRequest || deliveryRequest.storyId !== story.id) return;
    if (operation === "inspect") {
      if (deliveryRequest.existingVideoId) setSelectedVideo(deliveryRequest.existingVideoId);
      setPlatforms(deliveryRequest.platforms);
      setCategory(deliveryRequest.category);
      setPublishTitle(deliveryRequest.title);
      setView("publish");
      notify(deliveryRequest.existingVideoId ? "Downloaded video selected for inspection" : "No local video yet; publish will download the current completed result first");
      return;
    }
    if (!window.confirm(`Download if needed, then process and queue to ${deliveryRequest.platforms.length} platforms?`)) return;
    try {
      const job = await api.deliveryJob({
        storyId: story.id,
        title: deliveryRequest.title,
        platforms: deliveryRequest.platforms,
        category: deliveryRequest.category,
        publishConfirmed: true
      });
      setJobs((current) => [job, ...current]);
      setActivePublishJobId(job.id);
      setSelectedRunId(job.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  const runPublish = async (publish: boolean) => {
    if (!story || !selectedVideo) return;
    if (publish && !window.confirm(`Process and queue this video to ${platforms.length} platforms?`)) return;
    try {
      const job = await api.publishJob({
        storyId: story.id,
        videoId: selectedVideo,
        title: publishTitle,
        platforms,
        category,
        publishConfirmed: publish
      });
      setJobs((current) => [job, ...current]);
      setActivePublishJobId(job.id);
      setSelectedRunId(job.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  const cancelJob = async (id: string) => {
    try {
      const cancelled = await api.cancelJob(id);
      setJobs((current) => current.map((job) => job.id === id ? cancelled : job));
      notify("Cancellation requested");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  const updateWorldEntity = async (collection: "characters" | "places" | "tools" | "outfits" | "arcs" | "topics", id: string, patch: Record<string, unknown>) => {
    setSavingWorld(true);
    try {
      setWorld(await api.updateWorldEntity(collection, id, patch));
      notify("World record saved as a new revision");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setSavingWorld(false);
    }
  };

  const addWorldEntity = async (collection: "characters" | "places" | "tools" | "outfits" | "arcs" | "topics", entity: Record<string, unknown>) => {
    setSavingWorld(true);
    try {
      setWorld(await api.addWorldEntity(collection, entity));
      notify("World record created");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setSavingWorld(false);
    }
  };

  const createConnectedStory = async (plan: WorldStoryPlan) => {
    setSavingWorld(true);
    try {
      const result = await api.createWorldStory(plan);
      setWorld(result.world);
      setStories((current) => [result.story, ...current.filter((item) => item.id !== result.story.id)]);
      await selectStory(result.story.id);
      setView("write");
      notify("Connected story created; world context is now active in the writer");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setSavingWorld(false);
    }
  };

  const appMain = useMemo(() => {
    if (view === "write") {
      return <StoryWorkspace story={story} content={content} dirty={dirty} saving={saving} models={models} activeAiJob={activeAiJob} activeVideoJob={activeVideoJob} activePublishJob={activePublishJob} messages={story ? chatByStory[story.id] || [] : []} productionRequest={productionRequest} deliveryRequest={deliveryRequest} video={storyVideo} onContent={(value) => { setContent(value); setDirty(value !== story?.content); }} onSave={saveStory} onAi={runAi} onApplyAi={(value) => { setContent(value); setDirty(value !== story?.content); }} onProductionAction={runChatProduction} onDeliveryAction={runChatDelivery} onPreviewVideo={() => storyVideo && setPreviewVideoId(storyVideo.id)} />;
    }
    if (view === "world" && world) {
      return <WorldWorkspace world={world} story={story} saving={savingWorld} onUpdateEntity={updateWorldEntity} onAddEntity={addWorldEntity} onCreateStory={createConnectedStory} />;
    }
    if (view === "prompt" && videoSettings) {
      return <PromptWorkspace story={story} assets={assets} settings={videoSettings} prompt={prompt} issues={promptIssues} building={buildingPrompt} onBuild={buildPrompt} onPrompt={setPrompt} onCopy={() => { void navigator.clipboard.writeText(prompt); notify("Prompt copied"); }} />;
    }
    if (view === "produce" && videoSettings) {
      return <ProduceWorkspace story={story} assets={assets} settings={videoSettings} prompt={prompt} issues={promptIssues} status={status} activeJob={activeVideoJob} referenceJob={activeReferenceJob} onSettings={setVideoSettings} onBuildPrompt={() => void buildPrompt(false)} onOpenBrowser={() => void api.openBrowser().then((result) => notify(result.detail)).catch((error) => notify(error.message))} onGenerateReferences={() => void runReferenceImages()} onRun={runVideo} />;
    }
    if (view === "publish") {
      return <PublishWorkspace story={story} videos={videos} selectedVideo={selectedVideo} title={publishTitle} platforms={platforms} category={category} activeJob={activePublishJob} onVideo={setSelectedVideo} onTitle={setPublishTitle} onPlatforms={setPlatforms} onCategory={setCategory} onRun={runPublish} onPreview={(video) => setPreviewVideoId(video.id)} />;
    }
    return <RunsWorkspace jobs={jobs} selectedId={selectedRunId} onSelect={setSelectedRunId} onCancel={cancelJob} />;
  }, [view, story, storyVideo, content, dirty, saving, savingWorld, world, models, activeAiJob, activeVideoJob, activePublishJob, activeReferenceJob, chatByStory, productionRequest, deliveryRequest, videoSettings, assets, prompt, promptIssues, buildingPrompt, status, videos, selectedVideo, publishTitle, platforms, category, jobs, selectedRunId, buildPrompt]);

  if (fatalError) {
    return <div className="fatal-screen"><Aperture size={30} /><h1>Lala Studio could not start</h1><p>{fatalError}</p><code>npm run dev</code></div>;
  }
  if (!boot || !videoSettings || !world) {
    return <div className="loading-screen"><LoaderCircle className="spin" size={26} /><strong>Opening Lala Studio</strong><span>Loading stories and production services…</span></div>;
  }

  return (
    <div
      className="app-frame"
      data-testid="lala-studio-app"
      data-active-view={view}
      data-ai-job-status={activeAiJob?.status || "idle"}
      data-ai-job-id={activeAiJob?.id || ""}
      data-video-job-status={activeVideoJob?.status || "idle"}
      data-video-job-id={activeVideoJob?.id || ""}
      data-image-job-status={activeReferenceJob?.status || "idle"}
      data-image-job-id={activeReferenceJob?.id || ""}
      data-delivery-job-status={activePublishJob?.status || "idle"}
      data-delivery-job-id={activePublishJob?.id || ""}
    >
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu size={20} /></button>
        <div className="brand-lockup">
          <img src="/media/assets/ayachan" alt="" />
          <div><strong>Lala Studio</strong><span>Story & video production</span></div>
        </div>
        <div className="project-switcher"><Command size={15} /><span>RaraXiaAndAyaChan</span></div>
        <div className="service-statuses">
          <span className={status?.codex ? "online" : "offline"}><i /> GPT-5.6-Sol</span>
          <span className={status?.xyqCdp && status?.xyqNoVnc ? "online" : "offline"}><i /> Xiaoyunque noVNC</span>
          <span className={status?.lazyEdit ? "online" : "offline"}><i /> LazyEdit</span>
        </div>
        <button className="icon-button" title="Settings" aria-label="Settings"><Settings size={17} /></button>
      </header>

      <div className="app-body">
        <nav className={`nav-rail ${mobileNav ? "open" : ""}`}>
          <div className="nav-items">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} data-testid={`nav-${id}`} className={view === id ? "active" : ""} onClick={() => { setView(id); setMobileNav(false); }} title={label}>
                <Icon size={19} /><span>{label}</span>
                {id === "runs" && jobs.some((job) => job.status === "running") && <i className="nav-running" />}
              </button>
            ))}
          </div>
          <button className="new-story-nav" data-testid="new-story-open" onClick={() => setNewStoryOpen(true)}><Plus size={18} /><span>New story</span></button>
        </nav>

        {view !== "runs" && view !== "world" && <LibraryPanel stories={stories} selectedId={story?.id || null} query={query} onQuery={setQuery} onSelect={selectStory} onCreate={() => setNewStoryOpen(true)} />}
        {appMain}
      </div>

      {newStoryOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setNewStoryOpen(false)}>
          <section className="dialog" data-testid="new-story-dialog" role="dialog" aria-modal="true" aria-labelledby="new-story-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading"><div><span className="eyebrow">New document</span><h2 id="new-story-title">Start a story</h2></div><button className="icon-button" onClick={() => setNewStoryOpen(false)}><X size={18} /></button></div>
            <label className="field-label">Working title<input autoFocus className="text-field" data-testid="new-story-title-input" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="e.g. 雨夜里的纸飞机" /></label>
            <label className="field-label">Target duration</label>
            <div className="segmented full">
              {[15, 30, 60].map((duration) => <button key={duration} data-testid={`new-story-duration-${duration}`} className={newDuration === duration ? "active" : ""} onClick={() => setNewDuration(duration)}>{duration}s</button>)}
            </div>
            <div className="dialog-actions"><button className="secondary-button" onClick={() => setNewStoryOpen(false)}>Cancel</button><button className="primary-button" data-testid="new-story-create" onClick={createStory} disabled={!newTitle.trim()}><Plus size={16} /> Create</button></div>
          </section>
        </div>
      )}

      <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideoId(null)} />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
