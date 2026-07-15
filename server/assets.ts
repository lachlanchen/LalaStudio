import fs from "node:fs";
import path from "node:path";
import type { AssetDefinition } from "./types.js";
import { repoRoot } from "./config.js";

const definitions: Omit<AssetDefinition, "mediaUrl">[] = [
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
    required: true,
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
    required: true,
    defaultSelected: true
  },
  {
    id: "ayachan",
    label: "阿芽酱",
    role: "Primary individual Aya Chan identity reference",
    relativePath: "ayachan.png",
    required: true,
    defaultSelected: true
  },
  {
    id: "sasakun",
    label: "飒飒君",
    role: "Primary individual Sasa Kun identity reference",
    relativePath: "sasakun.jpeg",
    required: true,
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

export function listAssets(): AssetDefinition[] {
  return definitions.map((asset) => ({
    ...asset,
    mediaUrl: `/media/assets/${asset.id}`
  }));
}

export function getAsset(id: string): AssetDefinition | undefined {
  return listAssets().find((asset) => asset.id === id);
}

export function getAssetPath(id: string): string {
  const asset = definitions.find((item) => item.id === id);
  if (!asset) throw new Error(`Unknown asset: ${id}`);
  const assetPath = path.join(repoRoot, asset.relativePath);
  if (!fs.existsSync(assetPath)) throw new Error(`Asset file is missing: ${asset.relativePath}`);
  return assetPath;
}
