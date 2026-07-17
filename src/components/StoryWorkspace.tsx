import { useMemo, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  Clapperboard,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  ListChecks,
  MessageSquareText,
  MonitorPlay,
  Play,
  Radio,
  Save,
  Send,
  Settings2,
  Sparkles,
  WandSparkles
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { buildConversationHistory } from "../story-chat";
import type {
  ChatMessage,
  DeliveryRequest,
  ModelProfile,
  ProductionRequest,
  StoryAiAction,
  StoryDocument,
  StudioJob,
  VideoItem
} from "../types";

interface Props {
  story: StoryDocument | null;
  content: string;
  dirty: boolean;
  saving: boolean;
  models: ModelProfile[];
  activeAiJob: StudioJob | null;
  activeVideoJob: StudioJob | null;
  activePublishJob: StudioJob | null;
  messages: ChatMessage[];
  productionRequest: ProductionRequest | null;
  deliveryRequest: DeliveryRequest | null;
  video: VideoItem | null;
  onContent: (content: string) => void;
  onSave: () => void;
  onAi: (action: StoryAiAction, message: string, effort?: string) => void;
  onApplyAi: (content: string) => void;
  onProductionAction: (operation: "inspect" | "prepare" | "generate") => void;
  onDeliveryAction: (operation: "inspect" | "publish") => void;
  onPreviewVideo: () => void;
}

export function StoryWorkspace({
  story,
  content,
  dirty,
  saving,
  models,
  activeAiJob,
  activeVideoJob,
  activePublishJob,
  messages,
  productionRequest,
  deliveryRequest,
  video,
  onContent,
  onSave,
  onAi,
  onApplyAi,
  onProductionAction,
  onDeliveryAction,
  onPreviewVideo
}: Props) {
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");
  const [message, setMessage] = useState("");
  const [effort, setEffort] = useState("auto");
  const quality = story?.quality;
  const route = effort === "auto" ? models.find((model) => model.route === "chat") : null;
  const isRunning = activeAiJob?.status === "running" || activeAiJob?.status === "queued";
  const videoRunning = activeVideoJob?.status === "running" || activeVideoJob?.status === "queued";
  const publishRunning = activePublishJob?.status === "running" || activePublishJob?.status === "queued";
  const wordCount = useMemo(() => (content.match(/[\u3400-\u9fff]|[A-Za-z]+/g) || []).length, [content]);
  const contextTurns = useMemo(() => buildConversationHistory(messages).length, [messages]);

  if (!story) {
    return <main className="blank-workspace">Select a story or create a new one.</main>;
  }

  const send = (action: StoryAiAction) => {
    const fallback =
      action === "refine"
        ? "把当前想法经过起草、独立批评和最终润色，整理成一篇自然、有趣、可直接保存的故事。"
        : action === "review"
        ? "检查这篇故事的问题并改得更自然。"
        : action === "final"
          ? "完成最终润色，保留故事核心。"
          : "根据当前故事继续改进。";
    onAi(action, message.trim() || fallback, effort === "auto" ? undefined : effort);
    setMessage("");
  };

  return (
    <main className="story-workspace" data-testid="story-workspace">
      <section className="editor-surface">
        <div className="document-bar">
          <div className="document-title">
            <span className={`status-dot ${story.status}`} />
            <div>
              <h1 data-testid="story-title">{story.title}</h1>
              <span>{story.storyPath}</span>
            </div>
          </div>
          <div className="document-actions">
            {video && (
              <button className="secondary-button" data-testid="story-video-preview" onClick={onPreviewVideo} title="Play generated video">
                <Play size={15} /> Watch
              </button>
            )}
            <div className="segmented compact" aria-label="Editor mode">
              <button className={editorMode === "write" ? "active" : ""} onClick={() => setEditorMode("write")}>
                <FileText size={15} /> Write
              </button>
              <button className={editorMode === "preview" ? "active" : ""} onClick={() => setEditorMode("preview")}>
                <Eye size={15} /> Preview
              </button>
            </div>
            <button className="primary-button" data-testid="story-save" disabled={!dirty || saving} onClick={onSave}>
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
              data-testid="story-editor"
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

      <aside className="writer-panel" data-testid="studio-chat" data-context-turns={contextTurns}>
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

        <div className="route-note" title="Uses the current editor and recent conversation when interpreting follow-up requests">
          <span className="live-dot" />
          {effort === "auto" ? `${route?.effort || "low"} chat · high → x-high → ultra pipeline` : `${effort} override`}
        </div>

        <div className="quick-actions">
          <button className="pipeline-action" data-testid="quick-refine" onClick={() => send("refine")} disabled={isRunning}>
            <ListChecks size={16} />
            <span><strong>Refine to final</strong><small>Draft → critic → quality gate</small></span>
          </button>
          <button data-testid="quick-review" onClick={() => send("review")} disabled={isRunning}>
            <MessageSquareText size={16} /> Critique exact lines
          </button>
          <button data-testid="quick-final" onClick={() => send("final")} disabled={isRunning}>
            <WandSparkles size={16} /> Final quality pass
          </button>
          <button data-testid="quick-draft" onClick={() => send("draft")} disabled={isRunning}>
            <Sparkles size={16} /> Rewrite from note
          </button>
        </div>

        <div className="writer-thread" data-testid="chat-thread">
          {!activeAiJob && !activeVideoJob && !activePublishJob && !messages.length && !productionRequest && !deliveryRequest && (
            <div className="writer-empty">
              <MessageSquareText size={22} />
              <strong>Ask about this story</strong>
              <p>Quick questions use low reasoning. Final and production work routes to ultra.</p>
            </div>
          )}
          {messages.map((item) => (
            <article
              key={item.id}
              className={`chat-message ${item.role} ${item.kind || "text"}`}
              data-testid={`chat-message-${item.role}`}
              data-message-id={item.id}
            >
              <div className="chat-message-label">{item.role === "user" ? "You" : "Lala Studio"}</div>
              {item.role === "assistant" ? <ReactMarkdown>{item.content}</ReactMarkdown> : <p>{item.content}</p>}
              {item.role === "assistant" && item.applyable && (
                <button className="text-button chat-apply" data-testid="apply-response" onClick={() => onApplyAi(item.content)}>
                  <WandSparkles size={14} /> Use this version
                </button>
              )}
            </article>
          ))}
          {activeAiJob && isRunning && (
            <div className={`job-message ${activeAiJob.status}`} data-testid="ai-job" data-status={activeAiJob.status}>
              <div>
                {isRunning ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                <strong>{activeAiJob.title}</strong>
              </div>
              <div className="progress-track"><span style={{ width: `${activeAiJob.progress}%` }} /></div>
              <small>{activeAiJob.message} · {activeAiJob.effort}</small>
            </div>
          )}
          {productionRequest && productionRequest.storyId === story.id && (
            <section className="production-chat-card" data-testid="production-card" data-request-id={productionRequest.id}>
              <div className="production-card-heading">
                <div className="production-card-icon"><Clapperboard size={18} /></div>
                <div><span className="eyebrow">Visible production contract</span><strong>Ready for preflight</strong></div>
              </div>
              <p>{productionRequest.summary}</p>
              <dl>
                <div><dt>References</dt><dd>{productionRequest.settings.selectedAssetIds.join(", ")}</dd></div>
                <div><dt>Paid action</dt><dd>Never automatic; one confirmation is required.</dd></div>
              </dl>
              {activeVideoJob && (
                <div className={`chat-video-job ${activeVideoJob.status}`} data-testid="chat-video-job" data-status={activeVideoJob.status}>
                  <div><strong>{activeVideoJob.title}</strong><span>{activeVideoJob.progress}%</span></div>
                  <div className="progress-track"><span style={{ width: `${activeVideoJob.progress}%` }} /></div>
                  <small>{activeVideoJob.error || activeVideoJob.message}</small>
                </div>
              )}
              <div className="production-card-actions">
                <button className="secondary-button" data-testid="production-inspect" disabled={videoRunning} onClick={() => onProductionAction("inspect")}>
                  <Settings2 size={15} /> Inspect setup
                </button>
                <button className="secondary-button" data-testid="production-prepare" disabled={videoRunning} onClick={() => onProductionAction("prepare")}>
                  <MonitorPlay size={15} /> Prepare only
                </button>
                <button className="primary-button danger-action" data-testid="production-generate" disabled={videoRunning} onClick={() => onProductionAction("generate")}>
                  <Play size={15} /> Generate once
                </button>
              </div>
            </section>
          )}
          {deliveryRequest && deliveryRequest.storyId === story.id && (
            <section className="production-chat-card delivery-chat-card" data-testid="delivery-card" data-request-id={deliveryRequest.id}>
              <div className="production-card-heading">
                <div className="production-card-icon"><Radio size={18} /></div>
                <div><span className="eyebrow">Visible delivery contract</span><strong>Download check + LazyEdit</strong></div>
              </div>
              <p>{deliveryRequest.summary}</p>
              <dl>
                <div><dt>Download</dt><dd>{deliveryRequest.existingVideoId ? `Verified candidate: ${deliveryRequest.existingVideoId}` : "Check the current Xiaoyunque result before publishing"}</dd></div>
                <div><dt>Package</dt><dd>Context correction · EN/JP/ZH · portrait fill · top-right logo</dd></div>
              </dl>
              {activePublishJob && (
                <div className={`chat-video-job ${activePublishJob.status}`} data-testid="chat-delivery-job" data-status={activePublishJob.status}>
                  <div><strong>{activePublishJob.title}</strong><span>{activePublishJob.progress}%</span></div>
                  <div className="progress-track"><span style={{ width: `${activePublishJob.progress}%` }} /></div>
                  <small>{activePublishJob.error || activePublishJob.message}</small>
                </div>
              )}
              <div className="production-card-actions">
                <button className="secondary-button" data-testid="delivery-inspect" disabled={publishRunning} onClick={() => onDeliveryAction("inspect")}>
                  <Download size={15} /> Inspect download
                </button>
                <button className="primary-button danger-action" data-testid="delivery-publish" disabled={publishRunning} onClick={() => onDeliveryAction("publish")}>
                  <Radio size={15} /> Download if needed + publish
                </button>
              </div>
            </section>
          )}
        </div>

        <div className="writer-composer">
          <textarea
            data-testid="chat-input"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask a question or describe a story change…"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send("chat");
            }}
          />
          <button className="send-button" data-testid="chat-send" onClick={() => send("chat")} disabled={isRunning || !message.trim()} title="Send">
            <Send size={17} />
          </button>
        </div>
      </aside>
    </main>
  );
}
