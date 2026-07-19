import type { AssetDefinition, VideoSettings } from "./types.js";

function storyBody(markdown: string): string {
  const kept: string[] = [];
  let skip = false;
  for (const line of markdown.replace(/^#\s+.+$/m, "").split(/\r?\n/)) {
    if (/^##\s+(?:Prompt Notes|提示词说明|生成说明|对应词卡|Word Card)(?:\s|$)/i.test(line.trim())) {
      skip = true;
      continue;
    }
    if (skip && /^##\s+/.test(line.trim())) skip = false;
    if (!skip) kept.push(line);
  }
  return kept.join("\n").trim();
}

export function buildVideoPrompt(input: {
  story: string;
  assets: AssetDefinition[];
  settings: VideoSettings;
}): string {
  const selected = input.settings.selectedAssetIds
    .map((id) => input.assets.find((asset) => asset.id === id))
    .filter((asset): asset is AssetDefinition => Boolean(asset));

  const references = selected.map((asset, index) => `- 图${index + 1}：${asset.label}。${asset.role}。`);
  const labels = new Map(selected.map((asset, index) => [asset.id, `图${index + 1}`]));
  const sceneImageLabel = input.settings.preGenerateSceneImage ? `图${selected.length + 1}` : null;
  if (sceneImageLabel) {
    references.push(`- ${sceneImageLabel}：本集预生成场景关键帧。保持它的世界设计、建筑、光线、空间尺度和构图方向。`);
  }
  const identityLines = [
    labels.has("raraxia") ? `啦啦侠严格参考${labels.get("raraxia")}，保持同一张脸、体型和服装。` : "",
    labels.has("ayachan") ? `阿芽酱严格参考${labels.get("ayachan")}，保持同一张脸、体型和服装。` : "",
    labels.has("sasakun") ? `飒飒君严格参考${labels.get("sasakun")}，保持同一张脸、体型和服装。` : "",
    labels.has("zhuangzi") ? `庄子机器人严格参考${labels.get("zhuangzi")}，胸前保留 LazyingArt 标志。` : ""
  ].filter(Boolean);

  const wordCard = labels.has("word-card")
    ? `\n场景里的${labels.get("word-card")}是已经制作好的实体学习卡。本集卡片只显示下面四行正文：\n${input.settings.wordCard.english}\n${input.settings.wordCard.japanese}\n${input.settings.wordCard.furigana}\n${input.settings.wordCard.chinese}\n不要在卡片上添加语言名称、字段标签、冒号、项目符号或编号。保持上传图片中的文字准确清楚。卡片只是场景中的真实道具，不是字幕。`
    : "";

  return `# 小云雀生成提示词

请生成 ${input.settings.duration} 秒、${input.settings.ratio}、中文对白的温暖可爱短片。创作模式为${input.settings.mode === "short" ? "沉浸式短片" : "创作 Agent"}，目标模型为 ${input.settings.model}。

## 参考图

${references.join("\n")}

${identityLines.join("\n")}
${wordCard}
${sceneImageLabel ? `\n${sceneImageLabel}是本集场景参考，不替代人物身份图。人物外观仍以各自单人参考图为准。` : ""}

## 故事

${storyBody(input.story)}

人物说话要像朋友正常聊天，动作清楚，事件有明确因果。不要字幕，不要生成说明文字或下三分之一文字。不要把文件名或本地路径画进视频。
`;
}

export function validateVideoPrompt(prompt: string): string[] {
  const issues: string[] = [];
  if (/\/(?:home|Users|mnt|tmp)\//.test(prompt)) issues.push("Prompt contains a local filesystem path");
  if (!/不要字幕/.test(prompt)) issues.push("Prompt does not explicitly disable generated subtitles");
  if (prompt.length > 6500) issues.push("Prompt is likely overpacked");
  return issues;
}
