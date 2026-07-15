import { AlertTriangle, CheckCircle2, Copy, FileCheck2, RefreshCw, Save } from "lucide-react";
import type { AssetDefinition, StoryDocument, VideoSettings } from "../types";

interface Props {
  story: StoryDocument | null;
  assets: AssetDefinition[];
  settings: VideoSettings;
  prompt: string;
  issues: string[];
  building: boolean;
  onBuild: (save: boolean) => void;
  onPrompt: (prompt: string) => void;
  onCopy: () => void;
}

export function PromptWorkspace({ story, assets, settings, prompt, issues, building, onBuild, onPrompt, onCopy }: Props) {
  if (!story) return <main className="blank-workspace">Select a story before building a prompt.</main>;
  const selected = settings.selectedAssetIds
    .map((id) => assets.find((asset) => asset.id === id))
    .filter((asset): asset is AssetDefinition => Boolean(asset));

  return (
    <main className="prompt-workspace">
      <section className="prompt-editor-panel">
        <div className="workspace-heading">
          <div>
            <span className="eyebrow">Generation contract</span>
            <h1>Prompt builder</h1>
            <p>{story.title}</p>
          </div>
          <div className="heading-actions">
            <button className="secondary-button" onClick={onCopy} disabled={!prompt}>
              <Copy size={16} /> Copy
            </button>
            <button className="secondary-button" onClick={() => onBuild(false)} disabled={building}>
              <RefreshCw className={building ? "spin" : ""} size={16} /> Rebuild
            </button>
            <button className="primary-button" onClick={() => onBuild(true)} disabled={building}>
              <Save size={16} /> Save prompt
            </button>
          </div>
        </div>

        <div className={`preflight-banner ${issues.length ? "warning" : "ready"}`}>
          {issues.length ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <div>
            <strong>{issues.length ? `${issues.length} preflight issue${issues.length > 1 ? "s" : ""}` : "Prompt is ready"}</strong>
            <span>{issues.length ? issues.join(" · ") : "No local paths; identity anchors and subtitle rule are present."}</span>
          </div>
        </div>

        <textarea
          className="prompt-editor"
          value={prompt}
          onChange={(event) => onPrompt(event.target.value)}
          placeholder="Build a prompt from the saved story."
          aria-label="Xiaoyunque prompt editor"
        />
        <div className="editor-footer">
          <span>{prompt.length.toLocaleString()} characters</span>
          <span>Local paths are blocked before production</span>
        </div>
      </section>

      <aside className="prompt-inspector">
        <div className="inspector-section">
          <span className="eyebrow">Output</span>
          <h2>{settings.duration}s · {settings.ratio}</h2>
          <dl className="definition-list">
            <div><dt>Mode</dt><dd>{settings.mode === "short" ? "沉浸式短片" : "创作 Agent"}</dd></div>
            <div><dt>Model</dt><dd>{settings.model}</dd></div>
            <div><dt>Language</dt><dd>Chinese dialogue</dd></div>
          </dl>
        </div>
        <div className="inspector-section asset-map-section">
          <span className="eyebrow">Reference order</span>
          <h2>{selected.length} attachments</h2>
          <div className="reference-order">
            {selected.map((asset, index) => (
              <div key={asset.id}>
                <span>图{index + 1}</span>
                <img src={asset.mediaUrl} alt="" />
                <div><strong>{asset.label}</strong><small>{asset.role}</small></div>
              </div>
            ))}
          </div>
        </div>
        <div className="inspector-section contract-list">
          <span className="eyebrow">Checks</span>
          {[
            "Actual files upload before submit",
            "Main cast anchored individually",
            "No filename or path in composer",
            "One paid submit at most"
          ].map((item) => <div key={item}><FileCheck2 size={15} /> {item}</div>)}
        </div>
      </aside>
    </main>
  );
}
