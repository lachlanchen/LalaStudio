import {
  CheckCircle2,
  ExternalLink,
  Image,
  LoaderCircle,
  MonitorPlay,
  Play,
  Sparkles,
  Settings2,
  UploadCloud
} from "lucide-react";
import type { AssetDefinition, ServiceStatus, StoryDocument, StudioJob, VideoSettings } from "../types";

interface Props {
  story: StoryDocument | null;
  assets: AssetDefinition[];
  settings: VideoSettings;
  prompt: string;
  issues: string[];
  status: ServiceStatus | null;
  activeJob: StudioJob | null;
  referenceJob: StudioJob | null;
  onSettings: (settings: VideoSettings) => void;
  onBuildPrompt: () => void;
  onOpenBrowser: () => void;
  onGenerateReferences: () => void;
  onRun: (operation: "prepare" | "generate") => void;
}

const models = [
  "Seedance 2.0 Mini 体验版",
  "Seedance 2.0 Fast 非VIP",
  "Seedance 2.0",
  "Seedance 2.0 Fast VIP"
];

export function ProduceWorkspace({ story, assets, settings, prompt, issues, status, activeJob, referenceJob, onSettings, onBuildPrompt, onOpenBrowser, onGenerateReferences, onRun }: Props) {
  if (!story) return <main className="blank-workspace">Select a story before production.</main>;
  const busy = [activeJob, referenceJob].some((job) => job?.status === "running" || job?.status === "queued");
  const selectedAssets = assets.filter((asset) => settings.selectedAssetIds.includes(asset.id));
  const defaultSceneAssetIds = settings.selectedAssetIds.filter((id) => id !== "word-card");
  const sceneImageAssetIds = settings.sceneImageAssetIds.length ? settings.sceneImageAssetIds : defaultSceneAssetIds;
  const referenceResult = referenceJob?.status === "done" ? referenceJob.result : activeJob?.status === "done" ? activeJob.result : undefined;
  const wordCardUrl = typeof referenceResult?.wordCardUrl === "string" ? referenceResult.wordCardUrl : null;
  const sceneImageUrl = typeof referenceResult?.sceneImageUrl === "string" ? referenceResult.sceneImageUrl : null;
  const displayedJob = referenceJob && ["queued", "running", "failed"].includes(referenceJob.status) ? referenceJob : activeJob;

  const toggleAsset = (asset: AssetDefinition) => {
    if (asset.required && settings.selectedAssetIds.includes(asset.id)) return;
    const selectedAssetIds = settings.selectedAssetIds.includes(asset.id)
      ? settings.selectedAssetIds.filter((id) => id !== asset.id)
      : [...settings.selectedAssetIds, asset.id];
    onSettings({ ...settings, selectedAssetIds });
  };

  const toggleSceneAsset = (assetId: string) => {
    const sceneImageAssetIds = (settings.sceneImageAssetIds.length ? settings.sceneImageAssetIds : defaultSceneAssetIds).includes(assetId)
      ? (settings.sceneImageAssetIds.length ? settings.sceneImageAssetIds : defaultSceneAssetIds).filter((id) => id !== assetId)
      : [...(settings.sceneImageAssetIds.length ? settings.sceneImageAssetIds : defaultSceneAssetIds), assetId];
    onSettings({ ...settings, sceneImageAssetIds });
  };

  return (
    <main className="produce-workspace" data-testid="produce-workspace">
      <section className="production-preview">
        <div className="workspace-heading">
          <div>
            <span className="eyebrow">Xiaoyunque production</span>
            <h1>{story.title}</h1>
            <p>Prepare without cost, then submit once after visible preflight.</p>
          </div>
          <button className="secondary-button" data-testid="open-xyq-browser" onClick={onOpenBrowser}>
            <ExternalLink size={16} /> Open browser
          </button>
        </div>

        <div className="scene-stage" data-testid="scene-stage" data-ratio={settings.ratio.replace(":", "-")}>
          {sceneImageUrl ? <img className="stage-reference-image" src={sceneImageUrl} alt="Generated scene reference" /> : <div className="stage-backdrop" />}
          <div className="character-line">
            {selectedAssets
              .filter((asset) => ["raraxia", "ayachan", "sasakun", "zhuangzi"].includes(asset.id))
              .map((asset) => <img key={asset.id} src={asset.mediaUrl} alt={asset.label} title={asset.label} />)}
          </div>
          <div className="stage-overlay">
            <span>{settings.ratio}</span>
            <strong>{settings.duration}s</strong>
          </div>
        </div>

        <div className="service-row">
          <div className={status?.xyqCdp ? "online" : "offline"}><span /> Browser CDP</div>
          <div className={status?.xyqNoVnc ? "online" : "offline"}><span /> Visible noVNC</div>
          <div className={status?.codex ? "online" : "offline"}><span /> Production agent</div>
          <div className={prompt && !issues.length ? "online" : "offline"}><span /> Prompt preflight</div>
          {status?.noVncUrl && <a href={status.noVncUrl} target="_blank" rel="noreferrer">noVNC <ExternalLink size={13} /></a>}
        </div>

        {(wordCardUrl || sceneImageUrl) && (
          <div className="generated-reference-strip" data-testid="generated-reference-strip">
            <div><strong>Generated references</strong><span>Verified local PNGs used by the upload workflow</span></div>
            {wordCardUrl && <a href={wordCardUrl} target="_blank" rel="noreferrer"><img src={wordCardUrl} alt="Generated word card" /><span>Word card</span></a>}
            {sceneImageUrl && <a href={sceneImageUrl} target="_blank" rel="noreferrer"><img src={sceneImageUrl} alt="Generated scene reference" /><span>Scene keyframe</span></a>}
          </div>
        )}

        {displayedJob ? (
          <div className={`production-job ${displayedJob.status}`} data-testid="production-job" data-status={displayedJob.status}>
            <div className="job-title-line">
              {displayedJob.status === "running" || displayedJob.status === "queued" ? <LoaderCircle className="spin" size={18} /> : <CheckCircle2 size={18} />}
              <div><strong>{displayedJob.title}</strong><span>{displayedJob.message}</span></div>
              <b>{displayedJob.progress}%</b>
            </div>
            <div className="progress-track"><span style={{ width: `${displayedJob.progress}%` }} /></div>
            {displayedJob.logs.length > 0 && <pre>{displayedJob.logs.slice(-7).join("\n")}</pre>}
          </div>
        ) : (
          <div className="production-note">
            <MonitorPlay size={20} />
            <div><strong>No active render</strong><span>Preparation uploads references and fills the prompt without clicking generate.</span></div>
          </div>
        )}
      </section>

      <aside className="production-controls">
        <div className="control-heading"><Settings2 size={18} /><div><span className="eyebrow">Preflight</span><h2>Video settings</h2></div></div>
        <label className="field-label">Creation mode</label>
        <div className="segmented full">
          <button data-testid="mode-short" className={settings.mode === "short" ? "active" : ""} onClick={() => onSettings({ ...settings, mode: "short" })}>Short film</button>
          <button data-testid="mode-agent" className={settings.mode === "agent" ? "active" : ""} onClick={() => onSettings({ ...settings, mode: "agent" })}>Agent</button>
        </div>

        <label className="field-label" htmlFor="video-model">Video model</label>
        <select id="video-model" data-testid="video-model" className="select-field" value={settings.model} onChange={(event) => onSettings({ ...settings, model: event.target.value })}>
          {models.map((model) => <option key={model}>{model}</option>)}
        </select>
        <div className="cost-note"><span /> Mini 体验版 is the default lowest-credit route.</div>

        <label className="field-label">Duration <b>{settings.duration}s</b></label>
        <input
          className="range-field"
          data-testid="video-duration"
          type="range"
          min="10"
          max={settings.mode === "short" ? 30 : 90}
          step="1"
          value={settings.duration}
          onChange={(event) => onSettings({ ...settings, duration: Number(event.target.value) })}
        />

        <label className="field-label">Aspect ratio</label>
        <div className="segmented full">
          {(["4:3", "9:16", "16:9"] as const).map((ratio) => (
            <button key={ratio} data-testid={`ratio-${ratio.replace(":", "-")}`} className={settings.ratio === ratio ? "active" : ""} onClick={() => onSettings({ ...settings, ratio })}>{ratio}</button>
          ))}
        </div>

        <div className="control-divider" />
        <div className="control-title"><Image size={16} /><strong>References</strong><span>{selectedAssets.length}</span></div>
        <div className="asset-selector">
          {assets.map((asset) => {
            const selected = settings.selectedAssetIds.includes(asset.id);
            return (
              <button key={asset.id} data-testid="asset-toggle" data-asset-id={asset.id} data-selected={selected ? "true" : "false"} className={selected ? "selected" : ""} onClick={() => toggleAsset(asset)} title={asset.role}>
                <img src={asset.mediaUrl} alt="" />
                <span>{asset.label}</span>
                <i>{asset.required ? "Required" : selected ? "On" : "Off"}</i>
              </button>
            );
          })}
        </div>

        {settings.selectedAssetIds.includes("word-card") && (
          <div className="word-card-fields">
            <label className="word-card-generation">
              <input
                data-testid="pregenerate-word-card"
                type="checkbox"
                checked={settings.preGenerateWordCard}
                onChange={(event) => onSettings({ ...settings, preGenerateWordCard: event.target.checked })}
              />
              <span><strong>Generate card with Codex first</strong><small>Use the reference design, verify the exact word, then upload the generated PNG.</small></span>
            </label>
            <label>English<input value={settings.wordCard.english} onChange={(event) => onSettings({ ...settings, wordCard: { ...settings.wordCard, english: event.target.value } })} /></label>
            <label>Japanese<input value={settings.wordCard.japanese} onChange={(event) => onSettings({ ...settings, wordCard: { ...settings.wordCard, japanese: event.target.value } })} /></label>
            <label>Furigana<input value={settings.wordCard.furigana} onChange={(event) => onSettings({ ...settings, wordCard: { ...settings.wordCard, furigana: event.target.value } })} /></label>
            <label>Chinese<input value={settings.wordCard.chinese} onChange={(event) => onSettings({ ...settings, wordCard: { ...settings.wordCard, chinese: event.target.value } })} /></label>
          </div>
        )}

        <div className="scene-reference-fields">
          <label className="scene-reference-generation">
            <input
              data-testid="pregenerate-scene-image"
              type="checkbox"
              checked={settings.preGenerateSceneImage}
              onChange={(event) => onSettings({ ...settings, preGenerateSceneImage: event.target.checked })}
            />
            <span><strong>Generate scene keyframe first</strong><small>Use selected references and a visual brief, then upload the verified PNG with the video prompt.</small></span>
          </label>
          {settings.preGenerateSceneImage && (
            <>
              <label>Scene source references</label>
              <div className="scene-source-selector">
                {assets.filter((asset) => asset.id !== "word-card").map((asset) => {
                  const selected = sceneImageAssetIds.includes(asset.id);
                  return (
                    <button key={asset.id} type="button" data-testid="scene-source-toggle" data-asset-id={asset.id} data-selected={selected ? "true" : "false"} className={selected ? "selected" : ""} onClick={() => toggleSceneAsset(asset.id)} title={asset.label}>
                      <img src={asset.mediaUrl} alt="" /><span>{asset.label}</span>
                    </button>
                  );
                })}
              </div>
              <label>Scene visual brief
                <textarea
                  data-testid="scene-image-prompt"
                  value={settings.sceneImagePrompt}
                  placeholder="Describe one cinematic establishing frame: world, scale, lighting, characters, and visible action."
                  onChange={(event) => onSettings({ ...settings, sceneImagePrompt: event.target.value })}
                />
              </label>
            </>
          )}
        </div>

        <div className="control-actions">
          <button className="secondary-button full" data-testid="generate-reference-images" onClick={onGenerateReferences} disabled={busy || (!settings.preGenerateSceneImage && !(settings.preGenerateWordCard && settings.selectedAssetIds.includes("word-card")))}>
            <Sparkles size={16} /> Generate reference images
          </button>
          <button className="secondary-button full" data-testid="rebuild-prompt" onClick={onBuildPrompt} disabled={busy}>
            <UploadCloud size={16} /> Rebuild prompt
          </button>
          <button className="secondary-button full" data-testid="prepare-video" onClick={() => onRun("prepare")} disabled={busy || !prompt || issues.length > 0}>
            <MonitorPlay size={16} /> Prepare, no submit
          </button>
          <button className="primary-button full danger-action" data-testid="generate-video" onClick={() => onRun("generate")} disabled={busy || !prompt || issues.length > 0}>
            <Play size={16} /> Generate once
          </button>
        </div>
      </aside>
    </main>
  );
}
