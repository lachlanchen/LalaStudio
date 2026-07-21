import { describe, expect, it } from "vitest";
import { WorldRepository } from "../server/world-repository.js";

describe("LALACHAN world database", () => {
  const repository = new WorldRepository();
  const world = repository.get();

  it("keeps canonical records and media versions reviewable", () => {
    expect(world.schemaVersion).toBe(1);
    expect(world.characters.map((item) => item.id)).toEqual(expect.arrayContaining(["raraxia", "ayachan", "sasakun", "zhuangzi"]));
    expect(world.places.map((item) => item.id)).toEqual(expect.arrayContaining(["cloud-harbor-home", "star-bridge-market", "sky-palace-route"]));
    expect(world.media.every((item) => /^[a-f0-9]{64}$/.test(item.sha256))).toBe(true);
    expect(new Set(world.media.map((item) => item.id)).size).toBe(world.media.length);
  });

  it("builds focused context from an episode link", () => {
    const context = repository.contextForStory("2026-07-18-story-20260718095036");
    expect(context).toContain("月影森林");
    expect(context).toContain("拼皮旅印笔记本");
    expect(context).toContain("正在褪色的旅印");
    expect(context).toContain("啦啦侠和阿芽酱彼此在意");
  });

  it("keeps video-prompt continuity short and path-free", () => {
    const context = repository.promptContinuityForStory("2026-07-19-story-20260719120341");
    expect(context).toContain("云海天城");
    expect(context).not.toMatch(/\/(?:home|Users|mnt|tmp)\//);
    expect(context.length).toBeLessThan(900);
  });
});
