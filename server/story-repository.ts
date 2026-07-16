import fs from "node:fs";
import path from "node:path";
import type { StoryDocument, StoryQuality, StorySummary, WordCard } from "./types.js";
import { promptsRoot, repoRoot, storiesRoot, videosRoot } from "./config.js";
import { assertInside, atomicWrite, relativeTo, safeId, slugify } from "./lib/files.js";

function firstHeading(content: string, fallback: string): string {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

function summarize(content: string): string {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("#") &&
        !line.startsWith("```") &&
        !line.startsWith("-") &&
        !/^\d+\.\s/.test(line)
    );
  return (lines[0] || "No summary yet").replace(/[*_`>]/g, "").slice(0, 150);
}

function inferDuration(content: string): number | null {
  const match = content.match(/(?:约|大约|时长[:：]?\s*)?(10|15|20|25|28|30|45|60|68|76|90)\s*(?:秒|s\b)/i);
  return match ? Number(match[1]) : null;
}

export function extractWordCard(content: string): WordCard | null {
  const field = (name: string) =>
    content.match(new RegExp(`^\\s*[-*]?\\s*${name}\\s*[:：]\\s*(.+?)\\s*$`, "im"))?.[1]?.trim();
  const english = field("English");
  const japanese = field("Japanese");
  const furigana = field("Furigana");
  const chinese = field("(?:中文|Chinese)");
  return english && japanese && furigana && chinese ? { english, japanese, furigana, chinese } : null;
}

function findRelatedFile(root: string, id: string, extension: string): string | null {
  if (!fs.existsSync(root)) return null;
  const files = fs
    .readdirSync(root)
    .filter((name) => name.endsWith(extension) && (name === `${id}${extension}` || name.startsWith(`${id}-`)))
    .sort((a, b) => a.length - b.length);
  return files[0] ? path.join(root, files[0]) : null;
}

function findVideo(id: string): string | null {
  if (!fs.existsSync(videosRoot)) return null;
  const normalized = id.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, "_");
  const candidates = fs
    .readdirSync(videosRoot)
    .filter((name) => name.toLowerCase().endsWith(".mp4"))
    .filter((name) => name.toLowerCase().includes(normalized.toLowerCase()))
    .sort();
  return candidates[0] ? path.join(videosRoot, candidates[0]) : null;
}

export function analyzeStory(content: string, duration = inferDuration(content) || 15): StoryQuality {
  const dialogueCount = (content.match(/[：:]\s*[“「]/g) || []).length;
  const suddenCount = (content.match(/突然/g) || []).length;
  const reportTerms = content.match(/结论[:：]|系统提示|版本可能|真正的意义|本质上|执行方案/g) || [];
  const characterCount = ["啦啦侠", "阿芽酱", "飒飒君", "庄子"].filter((name) => content.includes(name)).length;
  const chineseLength = (content.match(/[\u3400-\u9fff]/g) || []).length;
  const dialogueUpperBound = duration <= 15 ? 4 : duration <= 30 ? 7 : 12;
  const upperBound = duration <= 15 ? 260 : duration <= 30 ? 520 : 1100;
  const dialogueStatus = dialogueCount < 2 || dialogueCount > dialogueUpperBound ? "warn" : "pass";
  const checks: StoryQuality["checks"] = [
    {
      id: "dialogue",
      label: "Speakable dialogue",
      status: dialogueStatus,
      detail: dialogueCount < 2
        ? "Add two short lines that sound natural aloud"
        : dialogueCount > dialogueUpperBound
          ? `${dialogueCount} dialogue beats exceed the ${dialogueUpperBound}-beat limit for about ${duration}s`
          : `${dialogueCount} dialogue beats`
    },
    {
      id: "causality",
      label: "Clear causality",
      status: suddenCount <= 1 ? "pass" : "warn",
      detail: suddenCount <= 1 ? "Events are not glued together by repeated 突然" : `${suddenCount} uses of 突然 need review`
    },
    {
      id: "voice",
      label: "Character identity",
      status: characterCount >= 2 ? "pass" : "warn",
      detail: `${characterCount} core characters named`
    },
    {
      id: "natural",
      label: "Natural wording",
      status: reportTerms.length === 0 ? "pass" : "fail",
      detail: reportTerms.length === 0 ? "No report-like trigger phrases" : `Review: ${[...new Set(reportTerms)].join("、")}`
    },
    {
      id: "duration",
      label: "Duration fit",
      status: chineseLength <= upperBound ? "pass" : "warn",
      detail: `${chineseLength} Chinese characters for about ${duration}s`
    },
    {
      id: "payoff",
      label: "Visible payoff",
      status: /最后|结尾|笑|抱|反转|发现|赢|救|逃|成功/.test(content) ? "pass" : "warn",
      detail: /最后|结尾|笑|抱|反转|发现|赢|救|逃|成功/.test(content)
        ? "A visible ending beat is present"
        : "Make the final image or joke explicit"
    }
  ];
  const deductions = checks.reduce((total, check) => total + (check.status === "fail" ? 18 : check.status === "warn" ? 8 : 0), 0);
  return { score: Math.max(25, 100 - deductions), checks };
}

export class StoryRepository {
  list(): StorySummary[] {
    if (!fs.existsSync(storiesRoot)) return [];
    return fs
      .readdirSync(storiesRoot)
      .filter((name) => name.endsWith(".md"))
      .map((name) => this.summaryFromFile(path.join(storiesRoot, name)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private summaryFromFile(filePath: string): StorySummary {
    const content = fs.readFileSync(filePath, "utf8");
    const id = path.basename(filePath, ".md");
    const promptPath = findRelatedFile(promptsRoot, id, ".md");
    const videoPath = findVideo(id);
    const quality = analyzeStory(content);
    const stat = fs.statSync(filePath);
    return {
      id,
      title: firstHeading(content, id),
      summary: summarize(content),
      status: videoPath ? "generated" : promptPath ? "prompted" : "draft",
      duration: inferDuration(content),
      storyPath: relativeTo(repoRoot, filePath),
      promptPath: promptPath ? relativeTo(repoRoot, promptPath) : null,
      videoPath: videoPath ? relativeTo(repoRoot, videoPath) : null,
      updatedAt: stat.mtime.toISOString(),
      qualityScore: quality.score,
      issueCount: quality.checks.filter((check) => check.status !== "pass").length
    };
  }

  get(idValue: string): StoryDocument {
    const id = safeId(idValue);
    const filePath = assertInside(storiesRoot, path.join(storiesRoot, `${id}.md`));
    if (!fs.existsSync(filePath)) throw new Error("Story not found");
    const summary = this.summaryFromFile(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const prompt = summary.promptPath
      ? fs.readFileSync(assertInside(repoRoot, path.join(repoRoot, summary.promptPath)), "utf8")
      : null;
    return {
      ...summary,
      content,
      prompt,
      quality: analyzeStory(content, summary.duration || 15),
      wordCard: extractWordCard(content)
    };
  }

  create(input: { title: string; content?: string; duration?: number }): StoryDocument {
    const date = new Date().toISOString().slice(0, 10);
    let id = `${date}-${slugify(input.title)}`;
    let suffix = 2;
    while (fs.existsSync(path.join(storiesRoot, `${id}.md`))) id = `${date}-${slugify(input.title)}-${suffix++}`;
    const content =
      input.content?.trim() ||
      `# ${input.title.trim()}\n\n${input.duration || 15} 秒中文短片。\n\n## 故事\n\n在这里写下故事。\n`;
    atomicWrite(path.join(storiesRoot, `${id}.md`), `${content.trim()}\n`);
    return this.get(id);
  }

  save(idValue: string, content: string): StoryDocument {
    const id = safeId(idValue);
    const filePath = assertInside(storiesRoot, path.join(storiesRoot, `${id}.md`));
    if (!fs.existsSync(filePath)) throw new Error("Story not found");
    atomicWrite(filePath, `${content.trim()}\n`);
    return this.get(id);
  }

  savePrompt(idValue: string, prompt: string): StoryDocument {
    const id = safeId(idValue);
    const story = this.get(id);
    const filePath = assertInside(promptsRoot, path.join(promptsRoot, `${id}-studio.md`));
    atomicWrite(filePath, `${prompt.trim()}\n`);
    void story;
    return this.get(id);
  }
}
