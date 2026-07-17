import type { AiConversationTurn, ChatMessage, StoryAiAction } from "./types.js";

const reviewIntent = /(?:批评|点评|审稿|检查|找出|指出).{0,12}(?:问题|毛病|不足|奇怪|不自然)|(?:what(?:'s| is) wrong|critique|review|diagnose)/i;
const pipelineIntent = /(?:写|创作|生成|准备|设计).{0,12}(?:今天|新的|一个|这篇)?.{0,8}(?:故事|剧情|脚本)|(?:write|create|draft|generate).{0,18}(?:story|script)/i;
const revisionIntent = /(?:改|修改|修正|润色|重写|调整|补充|加入|增加|删掉|删除|去掉|保留|换成|缩短|延长|更(?:高|低|长|短|快|慢|美|漂亮|可爱|自然|有趣|紧张|温暖|浪漫|清楚|合理))|(?:make|change|revise|rewrite|fix|polish|add|remove|keep|shorten|lengthen|expand)\b/i;

export function inferStoryAiAction(message: string): StoryAiAction {
  const normalized = message.trim();
  if (reviewIntent.test(normalized)) return "review";
  if (pipelineIntent.test(normalized)) return "refine";
  if (revisionIntent.test(normalized)) return "final";
  return "chat";
}

export function buildConversationHistory(messages: ChatMessage[]): AiConversationTurn[] {
  const eligible = messages.filter((message) =>
    message.kind !== "production"
    && message.kind !== "error"
    && message.content.trim().length > 0
  );
  const selected: AiConversationTurn[] = [];
  let characters = 0;
  for (let index = eligible.length - 1; index >= 0 && selected.length < 10; index -= 1) {
    const message = eligible[index];
    const content = message.content.trim().slice(0, 8_000);
    if (characters + content.length > 20_000 && selected.length > 0) break;
    selected.unshift({ role: message.role, content });
    characters += content.length;
  }
  return selected;
}
