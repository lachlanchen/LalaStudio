import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import type { ModelProfile, ModelRoute, ReasoningEffort } from "./types.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export const studioRoot = path.resolve(here, "..");
dotenv.config({ path: path.join(studioRoot, ".env"), quiet: true });
const parentProject = path.resolve(studioRoot, "..");
const cwdProject = process.cwd();
const isProjectRoot = (candidate: string) =>
  fs.existsSync(path.join(candidate, "references")) && fs.existsSync(path.join(candidate, "scripts"));

export const repoRoot = process.env.LALA_STUDIO_PROJECT_ROOT
  ? path.resolve(process.env.LALA_STUDIO_PROJECT_ROOT)
  : isProjectRoot(parentProject)
    ? parentProject
    : isProjectRoot(cwdProject)
      ? cwdProject
      : studioRoot;
export const runtimeRoot = path.join(repoRoot, ".lalastudio");
export const storiesRoot = path.join(repoRoot, "references", "stories");
export const promptsRoot = path.join(repoRoot, "references", "prompts");
export const videosRoot = path.join(repoRoot, "Videos");

dotenv.config({ path: path.join(repoRoot, ".env"), quiet: true });

fs.mkdirSync(runtimeRoot, { recursive: true });

const model = process.env.LALA_STUDIO_MODEL || "gpt-5.6-sol";

const routeDefaults: Record<ModelRoute, Omit<ModelProfile, "route" | "model">> = {
  chat: {
    effort: "low",
    label: "Quick chat",
    description: "Fast questions, notes, and small wording changes."
  },
  draft: {
    effort: "high",
    label: "Story draft",
    description: "Structured drafting with character and duration awareness."
  },
  review: {
    effort: "xhigh",
    label: "Critic pass",
    description: "Line-level critique, causality checks, and rewrite guidance."
  },
  final: {
    effort: "ultra",
    label: "Final story",
    description: "Highest-quality final writing and independent validation."
  },
  workflow: {
    effort: "ultra",
    label: "Production agent",
    description: "Adaptive browser and publishing work with evidence checks."
  }
};

export const modelProfiles = Object.fromEntries(
  Object.entries(routeDefaults).map(([route, profile]) => [
    route,
    { route, model, ...profile }
  ])
) as Record<ModelRoute, ModelProfile>;

export function resolveModelProfile(
  route: ModelRoute,
  override?: { model?: string; effort?: ReasoningEffort }
): ModelProfile {
  const base = modelProfiles[route];
  return {
    ...base,
    model: override?.model || base.model,
    effort: override?.effort || base.effort
  };
}

export const studioConfig = {
  host: process.env.LALA_STUDIO_HOST || "127.0.0.1",
  port: Number(process.env.LALA_STUDIO_PORT || 4312),
  cdpUrl:
    process.env.LALA_STUDIO_XYQ_CDP_URL ||
    process.env.XYQ_CHROME_DEBUG_URL ||
    process.env.XYQ_CDP_URL ||
    "http://127.0.0.1:9344",
  noVncUrl:
    process.env.LALA_STUDIO_XYQ_NOVNC_URL ||
    process.env.XYQ_NOVNC_URL ||
    "http://127.0.0.1:6099/vnc_lite.html?host=127.0.0.1&port=6099&autoconnect=1&scale=1",
  lazyEditRoot:
    process.env.LAZYEDIT_ROOT || path.join(os.homedir(), "DiskMech", "Projects", "lazyedit"),
  lazyEditApi: process.env.LAZYEDIT_API || "http://127.0.0.1:18787",
  codexCommand: process.env.CODEX_COMMAND || "codex"
};
