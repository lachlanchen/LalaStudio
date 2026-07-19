import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { VideoSettings } from "./types.js";
import { runtimeRoot, studioRoot } from "./config.js";
import { atomicWrite, safeId } from "./lib/files.js";

export interface ReferenceAssetPlan {
  storyId: string;
  directory: string;
  manifestPath: string;
  fingerprint: string;
  wordCardPath: string | null;
  wordCardBasePath: string | null;
  wordCardSpecPath: string | null;
  sceneImagePath: string | null;
  wordCardUrl: string | null;
  sceneImageUrl: string | null;
}

interface ReferenceAssetManifest {
  fingerprint: string;
  createdAt: string;
  wordCard: boolean;
  sceneImage: boolean;
}

function shellQuote(value: string | null): string {
  if (!value) return "''";
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function buildReferenceAssetPlan(input: {
  storyId: string;
  story: string;
  settings: VideoSettings;
}): ReferenceAssetPlan {
  const storyId = safeId(input.storyId);
  const directory = path.join(runtimeRoot, "generated-assets", storyId);
  const wantsWordCard = input.settings.preGenerateWordCard && input.settings.selectedAssetIds.includes("word-card");
  const wantsSceneImage = input.settings.preGenerateSceneImage;
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({
      story: input.story.trim(),
      ratio: input.settings.ratio,
      sceneImageAssetIds: input.settings.sceneImageAssetIds,
      wordCard: wantsWordCard ? input.settings.wordCard : null,
      sceneImagePrompt: wantsSceneImage ? input.settings.sceneImagePrompt.trim() : ""
    }))
    .digest("hex")
    .slice(0, 16);
  const mediaBase = `/media/generated-assets/${encodeURIComponent(storyId)}`;

  return {
    storyId,
    directory,
    manifestPath: path.join(directory, "manifest.json"),
    fingerprint,
    wordCardPath: wantsWordCard ? path.join(directory, "word-card.png") : null,
    wordCardBasePath: wantsWordCard ? path.join(directory, "word-card-base.png") : null,
    wordCardSpecPath: wantsWordCard ? path.join(directory, "word-card-spec.json") : null,
    sceneImagePath: wantsSceneImage ? path.join(directory, "scene-reference.png") : null,
    wordCardUrl: wantsWordCard ? `${mediaBase}/word-card.png?v=${fingerprint}` : null,
    sceneImageUrl: wantsSceneImage ? `${mediaBase}/scene-reference.png?v=${fingerprint}` : null
  };
}

export function probeImage(filePath: string | null): { width: number; height: number; size: number } | null {
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile() || fs.statSync(filePath).size < 10_000) return null;
  const result = spawnSync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "json",
    filePath
  ], { encoding: "utf8", timeout: 30_000 });
  if (result.status !== 0) return null;
  try {
    const parsed = JSON.parse(result.stdout) as { streams?: Array<{ width?: number; height?: number }> };
    const image = parsed.streams?.[0];
    if (!image?.width || !image.height) return null;
    return { width: image.width, height: image.height, size: fs.statSync(filePath).size };
  } catch {
    return null;
  }
}

export function referenceAssetsAreCurrent(plan: ReferenceAssetPlan): boolean {
  if (!fs.existsSync(plan.manifestPath)) return false;
  try {
    const manifest = JSON.parse(fs.readFileSync(plan.manifestPath, "utf8")) as ReferenceAssetManifest;
    if (manifest.fingerprint !== plan.fingerprint) return false;
    if (plan.wordCardPath && !probeImage(plan.wordCardPath)) return false;
    if (plan.sceneImagePath && !probeImage(plan.sceneImagePath)) return false;
    return Boolean(plan.wordCardPath || plan.sceneImagePath);
  } catch {
    return false;
  }
}

export function clearReferenceAssets(plan: ReferenceAssetPlan): void {
  for (const filePath of [plan.wordCardPath, plan.wordCardBasePath, plan.wordCardSpecPath, plan.sceneImagePath, plan.manifestPath]) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

export function validateReferenceAssets(plan: ReferenceAssetPlan): {
  wordCard: ReturnType<typeof probeImage>;
  sceneImage: ReturnType<typeof probeImage>;
} {
  const wordCard = probeImage(plan.wordCardPath);
  const sceneImage = probeImage(plan.sceneImagePath);
  if (plan.wordCardPath && !wordCard) throw new Error("Codex did not produce a valid word-card PNG");
  if (plan.sceneImagePath && !sceneImage) throw new Error("Codex did not produce a valid scene-reference PNG");
  if (!plan.wordCardPath && !plan.sceneImagePath) throw new Error("No reference image type is enabled");
  return { wordCard, sceneImage };
}

export function commitReferenceAssetManifest(plan: ReferenceAssetPlan): void {
  fs.mkdirSync(plan.directory, { recursive: true });
  const manifest: ReferenceAssetManifest = {
    fingerprint: plan.fingerprint,
    createdAt: new Date().toISOString(),
    wordCard: Boolean(plan.wordCardPath),
    sceneImage: Boolean(plan.sceneImagePath)
  };
  atomicWrite(plan.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function writeWordCardSpec(plan: ReferenceAssetPlan, settings: VideoSettings): void {
  if (!plan.wordCardSpecPath) return;
  atomicWrite(plan.wordCardSpecPath, `${JSON.stringify(settings.wordCard, null, 2)}\n`);
}

export function buildReferenceImageTask(input: {
  story: string;
  settings: VideoSettings;
  assetPaths: string[];
  sceneAssetPaths?: string[];
  plan: ReferenceAssetPlan;
}): string {
  const referenceList = input.assetPaths.map((assetPath, index) => `  ${index + 1}. ${assetPath}`).join("\n");
  const sceneReferenceList = (input.sceneAssetPaths || input.assetPaths).map((assetPath, index) => `  ${index + 1}. ${assetPath}`).join("\n");
  const wordCardTask = input.plan.wordCardPath
    ? `Generate a fresh blank physical word-card base PNG at exactly: ${input.plan.wordCardBasePath}
Use the selected words-card reference image as the product-design reference. Preserve its believable physical object, screen, frame, stand, materials, and product proportions. Keep the card front-facing and centered. The inner display must be blank, clean, pale, and free of writing; do not ask the image model to spell the final multilingual text.

Then run this deterministic renderer exactly once:
${shellQuote(path.join(studioRoot, "scripts", "render_word_card_text.sh"))} ${shellQuote(input.plan.wordCardBasePath)} ${shellQuote(input.plan.wordCardPath)} ${shellQuote(input.plan.wordCardSpecPath)}

The renderer, not the image model, places this canonical four-line block:

${input.settings.wordCard.english}
${input.settings.wordCard.japanese}
${input.settings.wordCard.furigana}
${input.settings.wordCard.chinese}

Do not add language names, field labels, colons, bullets, numbering, captions, or extra text. Inspect the final rendered PNG and compare all four lines character by character with the JSON spec. If the frame or screen geometry causes clipping, regenerate the blank base with the same straight-on composition and rerun the deterministic renderer.`
    : "Do not generate a word card for this run.";
  const sceneBrief = input.settings.sceneImagePrompt.trim() || "Create one cinematic keyframe that clearly establishes the story world, characters, action, lighting, and scale.";
  const sceneTask = input.plan.sceneImagePath
    ? `Generate a polished scene-reference PNG at exactly: ${input.plan.sceneImagePath}
Use the relevant selected images as visual identity and product references. Preserve recognizable character species, faces, proportions, clothing, and product design. The environment may be realistic or stylized according to the brief, but the composition must be clear enough to guide a later video model. This image is a cinematic keyframe, not a poster: no title, caption, watermark, UI, local path, or prompt text in the pixels.

Episode visual brief:
${sceneBrief}

Use only these scene-keyframe source references:
${sceneReferenceList}

Story context:
${input.story.trim().slice(0, 12_000)}`
    : "Do not generate a scene reference for this run.";

  return `
Use the local imagegen skill to create Lala Studio's reusable reference images before browser video production. Work directly with image generation and local files; do not open Xiaoyunque, do not submit a video, and do not spawn collaborators.

Selected source references:
${referenceList}

${wordCardTask}

${sceneTask}

For each requested output, create its parent directory, use the supplied local reference images with the image-generation tool, copy the final generated bitmap to the exact output path, and inspect it visually before accepting it. Do not merely write a prompt or claim that an image was generated. Finish only when every requested PNG exists and is visually usable. Return the final output paths and a short verification note.
`.trim();
}
