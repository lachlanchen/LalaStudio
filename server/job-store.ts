import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ModelProfile, StudioJob } from "./types.js";
import { atomicWrite } from "./lib/files.js";

type JobRunner = (helpers: {
  log: (line: string) => void;
  progress: (value: number, message: string) => void;
  signal: AbortSignal;
}) => Promise<unknown>;

export class JobStore {
  private readonly jobs = new Map<string, StudioJob>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly filePath: string;

  constructor(runtimeRoot: string) {
    this.filePath = path.join(runtimeRoot, "jobs.json");
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as StudioJob[];
      for (const job of parsed) {
        if (job.status === "running" || job.status === "queued") {
          job.status = "failed";
          job.error = "Studio restarted before the job completed";
          job.message = "Interrupted";
        }
        this.jobs.set(job.id, job);
      }
    } catch {
      // A corrupt local runtime file should not prevent the studio from starting.
    }
  }

  private persist(): void {
    const jobs = this.list().slice(0, 120);
    atomicWrite(this.filePath, `${JSON.stringify(jobs, null, 2)}\n`);
  }

  list(): StudioJob[] {
    return [...this.jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): StudioJob | undefined {
    return this.jobs.get(id);
  }

  create(input: {
    type: StudioJob["type"];
    title: string;
    profile?: ModelProfile;
  }): StudioJob {
    const now = new Date().toISOString();
    const job: StudioJob = {
      id: randomUUID(),
      type: input.type,
      title: input.title,
      status: "queued",
      progress: 0,
      message: "Queued",
      route: input.profile?.route,
      model: input.profile?.model,
      effort: input.profile?.effort,
      logs: [],
      createdAt: now,
      updatedAt: now
    };
    this.jobs.set(job.id, job);
    this.persist();
    return job;
  }

  update(id: string, patch: Partial<StudioJob>): StudioJob {
    const current = this.jobs.get(id);
    if (!current) throw new Error("Job not found");
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.jobs.set(id, next);
    this.persist();
    return next;
  }

  appendLog(id: string, line: string): void {
    const current = this.jobs.get(id);
    if (!current) return;
    const clean = line.replace(/\u001b\[[0-9;]*m/g, "").trimEnd();
    if (!clean) return;
    current.logs = [...current.logs, clean].slice(-240);
    current.updatedAt = new Date().toISOString();
    this.persist();
  }

  run(job: StudioJob, runner: JobRunner): void {
    const controller = new AbortController();
    this.controllers.set(job.id, controller);
    this.update(job.id, { status: "running", progress: 3, message: "Starting" });

    void runner({
      log: (line) => this.appendLog(job.id, line),
      progress: (value, message) =>
        this.update(job.id, { progress: Math.max(0, Math.min(100, value)), message }),
      signal: controller.signal
    })
      .then((result) => {
        this.update(job.id, {
          status: "done",
          progress: 100,
          message: "Completed",
          result
        });
      })
      .catch((error: unknown) => {
        const cancelled = controller.signal.aborted;
        this.update(job.id, {
          status: cancelled ? "cancelled" : "failed",
          message: cancelled ? "Cancelled" : "Failed",
          error: error instanceof Error ? error.message : String(error)
        });
      })
      .finally(() => this.controllers.delete(job.id));
  }

  cancel(id: string): StudioJob {
    this.controllers.get(id)?.abort();
    return this.update(id, { status: "cancelled", message: "Cancellation requested" });
  }
}
