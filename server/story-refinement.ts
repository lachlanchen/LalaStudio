import { buildAiPrompt } from "./codex.js";
import { analyzeStory, extractWordCard } from "./story-repository.js";
import type { ModelProfile, StoryQuality } from "./types.js";

export type RefinementStage = "draft" | "critique" | "final" | "repair";

export interface StoryRefinementInput {
  message: string;
  story?: string;
  duration: number;
}

export interface StoryRefinementResult {
  content: string;
  report: string;
  quality: StoryQuality;
  accepted: boolean;
  repaired: boolean;
  stages: Array<{
    name: RefinementStage;
    model: string;
    effort: string;
  }>;
}

interface StoryRefinementDependencies {
  profiles: {
    draft: ModelProfile;
    review: ModelProfile;
    final: ModelProfile;
  };
  run: (stage: RefinementStage, profile: ModelProfile, prompt: string) => Promise<string>;
  progress?: (value: number, message: string) => void;
}

function meaningfulStory(story?: string): string {
  if (!story?.trim() || /在这里写下故事[。.]?/.test(story)) return "";
  return story.trim();
}

function cleanDocument(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return (fenced?.[1] || trimmed).trim();
}

export function refinementQualityProblems(content: string, quality: StoryQuality): string[] {
  const problems: string[] = [];
  if (!/^#\s+\S+/m.test(content)) problems.push("missing Markdown title");
  if (!/^##\s+故事\s*$/m.test(content)) problems.push("missing 故事 section");
  if (!/^##\s+对应词卡\s*$/m.test(content)) problems.push("missing 对应词卡 section");
  if (!extractWordCard(content)) problems.push("word card is incomplete");
  for (const check of quality.checks) {
    if (check.status !== "pass") problems.push(`${check.label}: ${check.detail}`);
  }
  if (quality.score < 90) problems.push(`quality score is ${quality.score}, below 90`);
  return [...new Set(problems)];
}

export function buildPipelineCritiquePrompt(input: {
  draft: string;
  message: string;
  duration: number;
}): string {
  return `
You are an independent LALACHAN story critic. Everything required is in this prompt.
Do not browse, call tools, read files, or ask another agent.

Review this ${input.duration}-second Chinese cartoon story as a skeptical editor.
Quote exact weak wording. Check causality, duration fit, natural spoken Chinese,
distinct character voices, visible comedy, emotional warmth, and whether the ending
pays off the action. Reject slogans, report-like robot speech, forced cuteness,
prompt leakage, unnecessary characters, and events joined only by 突然.
First compare the draft with the original request: the requested protagonist,
main activity, setting, relationship, and tone must remain explicit in the story.
The "## 对应词卡" section is required document metadata outside "## 故事";
do not call it prompt leakage or ask the writer to remove it.
Check that every word-card entry is correctly written and expresses the same concept; do not privilege one language over another.

Return only these sections:
## Requirement coverage
## What works
## Problems
## Revision brief

Do not rewrite the full story. Give the final writer a concise, actionable brief.

Original request:
${input.message}

Draft:
${input.draft}
`.trim();
}

export function buildPipelineFinalPrompt(input: {
  draft: string;
  critique: string;
  message: string;
  duration: number;
}): string {
  return buildAiPrompt({
    action: "final",
    duration: input.duration,
    story: input.draft,
    message: `Use the independent critic report below as evidence. Repair the exact problems while preserving what works. Before answering, verify that the original request's protagonist, main activity, setting, relationship, and tone are still explicit; do not let a supporting character replace the requested protagonist. Return only the clean final story document.\n\nOriginal request:\n${input.message}\n\nIndependent critic report:\n${input.critique}`
  });
}

export async function runStoryRefinementPipeline(
  input: StoryRefinementInput,
  dependencies: StoryRefinementDependencies
): Promise<StoryRefinementResult> {
  const stages: StoryRefinementResult["stages"] = [];
  const source = meaningfulStory(input.story);
  const draftMessage = source
    ? `${input.message}\n\nUse this current draft as material, but rewrite weak parts rather than preserving them blindly:\n${source}`
    : input.message;

  dependencies.progress?.(8, "Drafting the story");
  const draft = cleanDocument(await dependencies.run(
    "draft",
    dependencies.profiles.draft,
    buildAiPrompt({ action: "draft", message: draftMessage, duration: input.duration })
  ));
  stages.push({ name: "draft", model: dependencies.profiles.draft.model, effort: dependencies.profiles.draft.effort });

  dependencies.progress?.(36, "Independent critic is checking exact lines");
  const critique = cleanDocument(await dependencies.run(
    "critique",
    dependencies.profiles.review,
    buildPipelineCritiquePrompt({ draft, message: input.message, duration: input.duration })
  ));
  stages.push({ name: "critique", model: dependencies.profiles.review.model, effort: dependencies.profiles.review.effort });

  dependencies.progress?.(66, "Writing the final story from the critique");
  let content = cleanDocument(await dependencies.run(
    "final",
    dependencies.profiles.final,
    buildPipelineFinalPrompt({ draft, critique, message: input.message, duration: input.duration })
  ));
  stages.push({ name: "final", model: dependencies.profiles.final.model, effort: dependencies.profiles.final.effort });

  let quality = analyzeStory(content, input.duration);
  const problems = refinementQualityProblems(content, quality);
  let repaired = false;
  if (problems.length) {
    repaired = true;
    dependencies.progress?.(84, "Quality gate requested one focused repair");
    content = cleanDocument(await dependencies.run(
      "repair",
      dependencies.profiles.final,
      buildAiPrompt({
        action: "final",
        duration: input.duration,
        story: content,
        message: `The deterministic quality gate found these remaining problems:\n- ${problems.join("\n- ")}\nRepair only these problems. Keep the story concise, natural, causal, and save-ready.`
      })
    ));
    stages.push({ name: "repair", model: dependencies.profiles.final.model, effort: dependencies.profiles.final.effort });
    quality = analyzeStory(content, input.duration);
  }

  const remainingProblems = refinementQualityProblems(content, quality);
  const accepted = remainingProblems.length === 0;
  dependencies.progress?.(
    96,
    accepted
      ? `Quality gate passed at ${quality.score}`
      : `Quality gate stopped the draft: ${remainingProblems.join("; ")}`
  );
  return { content, report: critique, quality, accepted, repaired, stages };
}
