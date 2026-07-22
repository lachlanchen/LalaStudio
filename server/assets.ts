import fs from "node:fs";
import path from "node:path";
import type { AssetDefinition } from "./types.js";
import { repoRoot } from "./config.js";

type LocalAssetDefinition = Omit<AssetDefinition, "mediaUrl">;

interface AssetManifest {
  assets: LocalAssetDefinition[];
}

const coreDefinitions: LocalAssetDefinition[] = [
  {
    id: "word-card",
    label: "Words card",
    role: "Physical learning card; use a fresh story word",
    relativePath: "words-card.jpg",
    required: false,
    defaultSelected: true
  },
  {
    id: "zhuangzi",
    label: "庄子机器人",
    role: "Robot identity and LazyingArt chest logo",
    relativePath: "LazyingArtRobot.png",
    required: false,
    defaultSelected: true
  },
  {
    id: "lightmind",
    label: "LightMind",
    role: "AI glasses product reference",
    relativePath: "display.png",
    required: false,
    defaultSelected: true
  },
  {
    id: "notebook",
    label: "拼皮笔记本",
    role: "Map, menu, notes, protocol, or story clue",
    relativePath: "patchwork-leather-notebook-luxury-clean-v2.png",
    required: false,
    defaultSelected: true
  },
  {
    id: "raraxia",
    label: "啦啦侠",
    role: "Primary individual Rara Xia identity reference",
    relativePath: "raraxia.jpeg",
    required: false,
    defaultSelected: true
  },
  {
    id: "ayachan",
    label: "阿芽酱",
    role: "Primary individual Aya Chan identity reference",
    relativePath: "ayachan.png",
    required: false,
    defaultSelected: true
  },
  {
    id: "sasakun",
    label: "飒飒君",
    role: "Primary individual Sasa Kun identity reference",
    relativePath: "sasakun.jpeg",
    required: false,
    defaultSelected: true
  },
  {
    id: "trio",
    label: "Trio group",
    role: "Optional group identity reference",
    relativePath: "Trio.png",
    required: false,
    defaultSelected: false
  }
];

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function validateAsset(asset: unknown, index: number): LocalAssetDefinition {
  if (!asset || typeof asset !== "object") throw new Error(`Custom asset ${index + 1} must be an object`);
  const value = asset as Partial<LocalAssetDefinition>;
  if (!value.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) {
    throw new Error(`Custom asset ${index + 1} has an invalid id`);
  }
  if (!value.label?.trim()) throw new Error(`Custom asset ${value.id} is missing a label`);
  if (!value.role?.trim()) throw new Error(`Custom asset ${value.id} is missing a role`);
  if (!value.relativePath?.trim() || path.isAbsolute(value.relativePath)) {
    throw new Error(`Custom asset ${value.id} must use a project-relative path`);
  }
  if (typeof value.required !== "boolean" || typeof value.defaultSelected !== "boolean") {
    throw new Error(`Custom asset ${value.id} must define required and defaultSelected booleans`);
  }
  return {
    id: value.id,
    label: value.label.trim(),
    role: value.role.trim(),
    relativePath: value.relativePath,
    required: value.required,
    defaultSelected: value.defaultSelected
  };
}

export function loadCustomAssetDefinitions(
  manifestPath = process.env.LALA_STUDIO_ASSET_MANIFEST || path.join(repoRoot, ".lalastudio", "assets.json"),
  projectRoot = repoRoot
): LocalAssetDefinition[] {
  if (!fs.existsSync(manifestPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Partial<AssetManifest>;
  if (!Array.isArray(parsed.assets)) throw new Error("Custom asset manifest must contain an assets array");

  const definitions = parsed.assets.map(validateAsset);
  const ids = new Set(coreDefinitions.map((asset) => asset.id));
  for (const asset of definitions) {
    if (ids.has(asset.id)) throw new Error(`Duplicate asset id: ${asset.id}`);
    ids.add(asset.id);
    const assetPath = path.resolve(projectRoot, asset.relativePath);
    if (!isInside(projectRoot, assetPath)) throw new Error(`Custom asset ${asset.id} escapes the project root`);
    if (!fs.existsSync(assetPath)) throw new Error(`Custom asset file is missing: ${asset.relativePath}`);
  }
  return definitions;
}

function definitions(): LocalAssetDefinition[] {
  return [...coreDefinitions, ...loadCustomAssetDefinitions()];
}

export function listAssets(): AssetDefinition[] {
  return definitions().map((asset) => ({
    ...asset,
    mediaUrl: `/media/assets/${asset.id}`
  }));
}

export function getAsset(id: string): AssetDefinition | undefined {
  return listAssets().find((asset) => asset.id === id);
}

export function getAssetPath(id: string): string {
  const asset = definitions().find((item) => item.id === id);
  if (!asset) throw new Error(`Unknown asset: ${id}`);
  const assetPath = path.join(repoRoot, asset.relativePath);
  if (!fs.existsSync(assetPath)) throw new Error(`Asset file is missing: ${asset.relativePath}`);
  return assetPath;
}
