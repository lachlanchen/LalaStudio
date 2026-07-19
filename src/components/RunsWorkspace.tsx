import { Bot, CheckCircle2, CircleX, Clock3, Film, Image, LoaderCircle, Radio, Square } from "lucide-react";
import type { StudioJob } from "../types";

interface Props {
  jobs: StudioJob[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCancel: (id: string) => void;
}

const jobIcons = { ai: Bot, image: Image, video: Film, publish: Radio, system: Clock3 };

export function RunsWorkspace({ jobs, selectedId, onSelect, onCancel }: Props) {
  const selected = jobs.find((job) => job.id === selectedId) || jobs[0];
  return (
    <main className="runs-workspace" data-testid="runs-workspace">
      <section className="runs-list-panel">
        <div className="workspace-heading"><div><span className="eyebrow">Background work</span><h1>Runs</h1><p>AI, browser, and publishing jobs share one timeline.</p></div></div>
        <div className="runs-table-head"><span>Run</span><span>Status</span><span>Route</span><span>Updated</span></div>
        <div className="runs-table">
          {jobs.map((job) => {
            const Icon = jobIcons[job.type];
            return (
              <button key={job.id} data-testid="run-row" data-job-id={job.id} data-status={job.status} className={selected?.id === job.id ? "selected" : ""} onClick={() => onSelect(job.id)}>
                <div><Icon size={17} /><span><strong>{job.title}</strong><small>{job.id.slice(0, 8)}</small></span></div>
                <span className={`job-status ${job.status}`}>
                  {job.status === "running" ? <LoaderCircle className="spin" size={13} /> : job.status === "done" ? <CheckCircle2 size={13} /> : job.status === "failed" ? <CircleX size={13} /> : <Clock3 size={13} />}
                  {job.status}
                </span>
                <span>{job.effort || job.type}</span>
                <time>{new Date(job.updatedAt).toLocaleTimeString()}</time>
              </button>
            );
          })}
          {!jobs.length && <div className="empty-list">No jobs yet.</div>}
        </div>
      </section>
      <aside className="run-detail-panel" data-testid="run-detail" data-status={selected?.status || "none"}>
        {selected ? (
          <>
            <span className="eyebrow">Run detail</span>
            <h2>{selected.title}</h2>
            <div className={`run-state ${selected.status}`}><strong>{selected.progress}%</strong><span>{selected.message}</span></div>
            <dl className="definition-list">
              <div><dt>Type</dt><dd>{selected.type}</dd></div>
              <div><dt>Model</dt><dd>{selected.model || "Local workflow"}</dd></div>
              <div><dt>Reasoning</dt><dd>{selected.effort || "n/a"}</dd></div>
              <div><dt>Started</dt><dd>{new Date(selected.createdAt).toLocaleString()}</dd></div>
            </dl>
            {selected.error && <div className="error-box">{selected.error}</div>}
            {(selected.status === "running" || selected.status === "queued") && (
              <button className="secondary-button full cancel-job" data-testid="cancel-job" onClick={() => onCancel(selected.id)}>
                <Square size={14} /> Cancel run
              </button>
            )}
            <pre className="run-log">{selected.logs.length ? selected.logs.join("\n") : "Waiting for logs…"}</pre>
          </>
        ) : <div className="writer-empty">Select a run.</div>}
      </aside>
    </main>
  );
}
