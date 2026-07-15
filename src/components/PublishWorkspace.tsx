import { Check, Film, Image as ImageIcon, LoaderCircle, Radio, Send, ShieldCheck } from "lucide-react";
import type { StoryDocument, StudioJob, VideoItem } from "../types";

interface Props {
  story: StoryDocument | null;
  videos: VideoItem[];
  selectedVideo: string;
  title: string;
  platforms: string[];
  category: "lalachan" | "lalamv";
  activeJob: StudioJob | null;
  onVideo: (id: string) => void;
  onTitle: (title: string) => void;
  onPlatforms: (platforms: string[]) => void;
  onCategory: (category: "lalachan" | "lalamv") => void;
  onRun: (publish: boolean) => void;
}

const platformOptions = [
  ["shipinhao", "Shipinhao"],
  ["youtube", "YouTube"],
  ["instagram", "Instagram"],
  ["douyin", "Douyin"]
] as const;

export function PublishWorkspace({ story, videos, selectedVideo, title, platforms, category, activeJob, onVideo, onTitle, onPlatforms, onCategory, onRun }: Props) {
  const selected = videos.find((video) => video.id === selectedVideo);
  const busy = activeJob?.status === "running" || activeJob?.status === "queued";
  if (!story) return <main className="blank-workspace">Select the matching story before publishing.</main>;

  const togglePlatform = (platform: string) =>
    onPlatforms(platforms.includes(platform) ? platforms.filter((item) => item !== platform) : [...platforms, platform]);

  return (
    <main className="publish-workspace">
      <section className="publish-main">
        <div className="workspace-heading">
          <div><span className="eyebrow">LazyEdit + AutoPublish</span><h1>Publish package</h1><p>One command handles context correction, blur-fill, subtitles, logo, and queueing.</p></div>
        </div>

        <div className="publish-flow">
          {[
            [ImageIcon, "Portrait fill", "LALACHAN placement"],
            [Film, "Subtitles", "EN · JP · ZH"],
            [ShieldCheck, "Logo", "Top-right"],
            [Radio, "Platforms", `${platforms.length} selected`]
          ].map(([Icon, label, value], index) => (
            <div key={String(label)}>
              <span>{index + 1}</span>
              <Icon size={18} />
              <strong>{String(label)}</strong>
              <small>{String(value)}</small>
            </div>
          ))}
        </div>

        <div className="video-table-heading"><strong>Choose a generated video</strong><span>{videos.length} files in Videos/</span></div>
        <div className="video-list">
          {videos.slice(0, 32).map((video) => (
            <button key={video.id} className={selectedVideo === video.id ? "selected" : ""} onClick={() => onVideo(video.id)}>
              <Film size={17} />
              <div><strong>{video.name}</strong><span>{new Date(video.updatedAt).toLocaleString()}</span></div>
              <small>{(video.size / 1024 / 1024).toFixed(1)} MB</small>
              {selectedVideo === video.id && <Check size={17} />}
            </button>
          ))}
        </div>

        {activeJob && (
          <div className={`production-job ${activeJob.status}`}>
            <div className="job-title-line">
              {busy ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}
              <div><strong>{activeJob.title}</strong><span>{activeJob.message}</span></div><b>{activeJob.progress}%</b>
            </div>
            <div className="progress-track"><span style={{ width: `${activeJob.progress}%` }} /></div>
            {activeJob.logs.length > 0 && <pre>{activeJob.logs.slice(-8).join("\n")}</pre>}
          </div>
        )}
      </section>

      <aside className="publish-controls">
        <span className="eyebrow">Package settings</span>
        <h2>Ready to queue</h2>
        <label className="field-label" htmlFor="publish-title">Public title</label>
        <input id="publish-title" className="text-field" value={title} onChange={(event) => onTitle(event.target.value)} />

        <label className="field-label">Category</label>
        <div className="segmented full">
          <button className={category === "lalachan" ? "active" : ""} onClick={() => onCategory("lalachan")}>LALACHAN</button>
          <button className={category === "lalamv" ? "active" : ""} onClick={() => onCategory("lalamv")}>LalaMV</button>
        </div>

        <label className="field-label">Platforms</label>
        <div className="platform-selector">
          {platformOptions.map(([value, label]) => (
            <label key={value}>
              <input type="checkbox" checked={platforms.includes(value)} onChange={() => togglePlatform(value)} />
              <span><i />{label}</span>
            </label>
          ))}
        </div>

        <div className="publish-summary">
          <div><span>Video</span><strong>{selected?.name || "Not selected"}</strong></div>
          <div><span>Context</span><strong>{story.storyPath}</strong></div>
          <div><span>Subtitle source</span><strong>Polished ASR + story</strong></div>
        </div>

        <button className="secondary-button full" disabled={!selected || busy} onClick={() => onRun(false)}>
          <ShieldCheck size={16} /> Build and inspect preview
        </button>
        <button className="primary-button full" disabled={!selected || !platforms.length || busy} onClick={() => onRun(true)}>
          <Send size={16} /> Process and queue
        </button>
        <p className="fine-print">A real publish requires a second confirmation. Metadata is derived from the selected story, not copied from it.</p>
      </aside>
    </main>
  );
}
