import { useMemo, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  Eye,
  FileText,
  LoaderCircle,
  MessageSquareText,
  Save,
  Send,
  Sparkles,
  WandSparkles
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ModelProfile, StoryDocument, StudioJob } from "../types";

interface Props {
  story: StoryDocument | null;
  content: string;
  dirty: boolean;
  saving: boolean;
  models: ModelProfile[];
  activeAiJob: StudioJob | null;
  aiResult: string;
  onContent: (content: string) => void;
  onSave: () => void;
  onAi: (action: "chat" | "draft" | "review" | "final", message: string, effort?: string) => void;
  onApplyAi: () => void;
}

export function StoryWorkspace({
  story,
  content,
  dirty,
  saving,
  models,
  activeAiJob,
  aiResult,
  onContent,
  onSave,
  onAi,
  onApplyAi
}: Props) {
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");
  const [message, setMessage] = useState("");
  const [effort, setEffort] = useState("auto");
  const quality = story?.quality;
  const route = effort === "auto" ? models.find((model) => model.route === "chat") : null;
  const isRunning = activeAiJob?.status === "running" || activeAiJob?.status === "queued";
  const wordCount = useMemo(() => (content.match(/[\u3400-\u9fff]|[A-Za-z]+/g) || []).length, [content]);

  if (!story) {
    return <main className="blank-workspace">Select a story or create a new one.</main>;
  }

  const send = (action: "chat" | "draft" | "review" | "final") => {
    const fallback =
      action === "review"
        ? "检查这篇故事的问题并改得更自然。"
        : action === "final"
          ? "完成最终润色，保留故事核心。"
          : "根据当前故事继续改进。";
    onAi(action, message.trim() || fallback, effort === "auto" ? undefined : effort);
    setMessage("");
  };

  return (
    <main className="story-workspace">
      <section className="editor-surface">
        <div className="document-bar">
          <div className="document-title">
            <span className={`status-dot ${story.status}`} />
            <div>
              <h1>{story.title}</h1>
              <span>{story.storyPath}</span>
            </div>
          </div>
          <div className="document-actions">
            <div className="segmented compact" aria-label="Editor mode">
              <button className={editorMode === "write" ? "active" : ""} onClick={() => setEditorMode("write")}>
                <FileText size={15} /> Write
              </button>
              <button className={editorMode === "preview" ? "active" : ""} onClick={() => setEditorMode("preview")}>
                <Eye size={15} /> Preview
              </button>
            </div>
            <button className="primary-button" disabled={!dirty || saving} onClick={onSave}>
              {saving ? <LoaderCircle className="spin" size={16} /> : dirty ? <Save size={16} /> : <Check size={16} />}
              {saving ? "Saving" : dirty ? "Save" : "Saved"}
            </button>
          </div>
        </div>

        <div className="quality-strip">
          <div className="quality-score" data-score={quality?.score || 0}>
            <strong>{quality?.score || 0}</strong>
            <span>Story score</span>
          </div>
          <div className="quality-checks">
            {quality?.checks.map((check) => (
              <div key={check.id} className={`quality-check ${check.status}`} title={check.detail}>
                <span /> {check.label}
              </div>
            ))}
          </div>
          <span className="document-stat">{wordCount} words · {story.duration || "flex"}s</span>
        </div>

        <div className="editor-body">
          {editorMode === "write" ? (
            <textarea
              className="story-editor"
              value={content}
              onChange={(event) => onContent(event.target.value)}
              spellCheck
              aria-label="Story Markdown editor"
            />
          ) : (
            <article className="markdown-preview">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          )}
        </div>
        <div className="editor-footer">
          <span>Markdown</span>
          <span>Changes stay local until saved</span>
        </div>
      </section>

      <aside className="writer-panel">
        <div className="writer-heading">
          <div className="writer-icon"><Bot size={19} /></div>
          <div>
            <span className="eyebrow">GPT-5.6-Sol</span>
            <h2>Co-writer</h2>
          </div>
          <label className="route-select" title="Reasoning route">
            <select value={effort} onChange={(event) => setEffort(event.target.value)}>
              <option value="auto">Auto route</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="xhigh">X-high</option>
              <option value="ultra">Ultra</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        <div className="route-note">
          <span className="live-dot" />
          {effort === "auto" ? `${route?.effort || "low"} for chat; ultra for final` : `${effort} override`}
        </div>

        <div className="quick-actions">
          <button onClick={() => send("review")} disabled={isRunning}>
            <MessageSquareText size={16} /> Critique exact lines
          </button>
          <button onClick={() => send("final")} disabled={isRunning}>
            <WandSparkles size={16} /> Final quality pass
          </button>
          <button onClick={() => send("draft")} disabled={isRunning}>
            <Sparkles size={16} /> Rewrite from note
          </button>
        </div>

        <div className="writer-thread">
          {!activeAiJob && !aiResult && (
            <div className="writer-empty">
              <MessageSquareText size={22} />
              <strong>Ask about this story</strong>
              <p>Quick questions use low reasoning. Final and production work routes to ultra.</p>
            </div>
          )}
          {activeAiJob && (
            <div className={`job-message ${activeAiJob.status}`}>
              <div>
                {isRunning ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                <strong>{activeAiJob.title}</strong>
              </div>
              <div className="progress-track"><span style={{ width: `${activeAiJob.progress}%` }} /></div>
              <small>{activeAiJob.message} · {activeAiJob.effort}</small>
            </div>
          )}
          {aiResult && (
            <div className="ai-result">
              <ReactMarkdown>{aiResult}</ReactMarkdown>
              <button className="secondary-button full" onClick={onApplyAi}>
                <WandSparkles size={15} /> Replace editor with result
              </button>
            </div>
          )}
        </div>

        <div className="writer-composer">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Describe a change, joke, or scene…"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send("chat");
            }}
          />
          <button className="send-button" onClick={() => send("chat")} disabled={isRunning || !message.trim()} title="Send">
            <Send size={17} />
          </button>
        </div>
      </aside>
    </main>
  );
}
