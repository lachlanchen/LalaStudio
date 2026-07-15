import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Aperture,
  BookOpenText,
  Clapperboard,
  Command,
  FileCode2,
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
import type {
  AssetDefinition,
  BootstrapData,
  ModelProfile,
  ServiceStatus,
  StoryDocument,
  StorySummary,
  StudioJob,
  VideoItem,
  VideoSettings,
  WorkspaceView
} from "./types";

const navItems: Array<{ id: WorkspaceView; label: string; icon: typeof BookOpenText }> = [
  { id: "write", label: "Write", icon: BookOpenText },
  { id: "prompt", label: "Prompt", icon: FileCode2 },
  { id: "produce", label: "Produce", icon: Clapperboard },
  { id: "publish", label: "Publish", icon: Radio },
  { id: "runs", label: "Runs", icon: Aperture }
];

function App() {
  const [boot, setBoot] = useState<BootstrapData | null>(null);
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [assets, setAssets] = useState<AssetDefinition[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [view, setView] = useState<WorkspaceView>("write");
  const [story, setStory] = useState<StoryDocument | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptIssues, setPromptIssues] = useState<string[]>([]);
  const [buildingPrompt, setBuildingPrompt] = useState(false);
  const [videoSettings, setVideoSettings] = useState<VideoSettings | null>(null);
  const [activeAiJobId, setActiveAiJobId] = useState<string | null>(null);
  const [activeVideoJobId, setActiveVideoJobId] = useState<string | null>(null);
  const [activePublishJobId, setActivePublishJobId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState("");
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

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

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
      setAiResult("");
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

  const activeAiJob = jobs.find((job) => job.id === activeAiJobId) || null;
  const activeVideoJob = jobs.find((job) => job.id === activeVideoJobId) || null;
  const activePublishJob = jobs.find((job) => job.id === activePublishJobId) || null;

  useEffect(() => {
    if (activeAiJob?.status === "done" && activeAiJob.result?.content) {
      setAiResult(String(activeAiJob.result.content));
    }
  }, [activeAiJob]);

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

  const runAi = async (action: "chat" | "draft" | "review" | "final", message: string, effort?: string) => {
    try {
      const job = await api.aiJob({ action, message, story: content, duration: story?.duration || 15, effort });
      setJobs((current) => [job, ...current]);
      setActiveAiJobId(job.id);
      setSelectedRunId(job.id);
      setAiResult("");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  const runVideo = async (operation: "prepare" | "generate") => {
    if (!story || !videoSettings || !prompt) return;
    const confirmed = operation === "generate"
      ? window.confirm(`Submit one paid ${videoSettings.duration}s ${videoSettings.model} generation after visible preflight?`)
      : false;
    if (operation === "generate" && !confirmed) return;
    try {
      const job = await api.videoJob({ storyId: story.id, prompt, settings: videoSettings, operation, paidActionConfirmed: confirmed });
      setJobs((current) => [job, ...current]);
      setActiveVideoJobId(job.id);
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

  const appMain = useMemo(() => {
    if (view === "write") {
      return <StoryWorkspace story={story} content={content} dirty={dirty} saving={saving} models={models} activeAiJob={activeAiJob} aiResult={aiResult} onContent={(value) => { setContent(value); setDirty(value !== story?.content); }} onSave={saveStory} onAi={runAi} onApplyAi={() => { setContent(aiResult); setDirty(true); }} />;
    }
    if (view === "prompt" && videoSettings) {
      return <PromptWorkspace story={story} assets={assets} settings={videoSettings} prompt={prompt} issues={promptIssues} building={buildingPrompt} onBuild={buildPrompt} onPrompt={setPrompt} onCopy={() => { void navigator.clipboard.writeText(prompt); notify("Prompt copied"); }} />;
    }
    if (view === "produce" && videoSettings) {
      return <ProduceWorkspace story={story} assets={assets} settings={videoSettings} prompt={prompt} issues={promptIssues} status={status} activeJob={activeVideoJob} onSettings={setVideoSettings} onBuildPrompt={() => void buildPrompt(false)} onOpenBrowser={() => void api.openBrowser().then((result) => notify(result.detail)).catch((error) => notify(error.message))} onRun={runVideo} />;
    }
    if (view === "publish") {
      return <PublishWorkspace story={story} videos={videos} selectedVideo={selectedVideo} title={publishTitle} platforms={platforms} category={category} activeJob={activePublishJob} onVideo={setSelectedVideo} onTitle={setPublishTitle} onPlatforms={setPlatforms} onCategory={setCategory} onRun={runPublish} />;
    }
    return <RunsWorkspace jobs={jobs} selectedId={selectedRunId} onSelect={setSelectedRunId} />;
  }, [view, story, content, dirty, saving, models, activeAiJob, aiResult, videoSettings, assets, prompt, promptIssues, buildingPrompt, status, activeVideoJob, videos, selectedVideo, publishTitle, platforms, category, activePublishJob, jobs, selectedRunId, buildPrompt]);

  if (fatalError) {
    return <div className="fatal-screen"><Aperture size={30} /><h1>Lala Studio could not start</h1><p>{fatalError}</p><code>npm run dev</code></div>;
  }
  if (!boot || !videoSettings) {
    return <div className="loading-screen"><LoaderCircle className="spin" size={26} /><strong>Opening Lala Studio</strong><span>Loading stories and production services…</span></div>;
  }

  return (
    <div className="app-frame">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu size={20} /></button>
        <div className="brand-lockup">
          <img src="/media/assets/ayachan" alt="" />
          <div><strong>Lala Studio</strong><span>Story & video production</span></div>
        </div>
        <div className="project-switcher"><Command size={15} /><span>RaraXiaAndAyaChan</span></div>
        <div className="service-statuses">
          <span className={status?.codex ? "online" : "offline"}><i /> GPT-5.6-Sol</span>
          <span className={status?.xyqCdp ? "online" : "offline"}><i /> Xiaoyunque</span>
          <span className={status?.lazyEdit ? "online" : "offline"}><i /> LazyEdit</span>
        </div>
        <button className="icon-button" title="Settings" aria-label="Settings"><Settings size={17} /></button>
      </header>

      <div className="app-body">
        <nav className={`nav-rail ${mobileNav ? "open" : ""}`}>
          <div className="nav-items">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setMobileNav(false); }} title={label}>
                <Icon size={19} /><span>{label}</span>
                {id === "runs" && jobs.some((job) => job.status === "running") && <i className="nav-running" />}
              </button>
            ))}
          </div>
          <button className="new-story-nav" onClick={() => setNewStoryOpen(true)}><Plus size={18} /><span>New story</span></button>
        </nav>

        {view !== "runs" && <LibraryPanel stories={stories} selectedId={story?.id || null} query={query} onQuery={setQuery} onSelect={selectStory} onCreate={() => setNewStoryOpen(true)} />}
        {appMain}
      </div>

      {newStoryOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setNewStoryOpen(false)}>
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-story-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading"><div><span className="eyebrow">New document</span><h2 id="new-story-title">Start a story</h2></div><button className="icon-button" onClick={() => setNewStoryOpen(false)}><X size={18} /></button></div>
            <label className="field-label">Working title<input autoFocus className="text-field" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="e.g. 雨夜里的纸飞机" /></label>
            <label className="field-label">Target duration</label>
            <div className="segmented full">
              {[15, 30, 60].map((duration) => <button key={duration} className={newDuration === duration ? "active" : ""} onClick={() => setNewDuration(duration)}>{duration}s</button>)}
            </div>
            <div className="dialog-actions"><button className="secondary-button" onClick={() => setNewStoryOpen(false)}>Cancel</button><button className="primary-button" onClick={createStory} disabled={!newTitle.trim()}><Plus size={16} /> Create</button></div>
          </section>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
