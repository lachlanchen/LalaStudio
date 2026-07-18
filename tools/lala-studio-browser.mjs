#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

function parse(argv) {
  const [command = "status", ...rest] = argv;
  const options = { _: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value.startsWith("--")) {
      options._.push(value);
      continue;
    }
    const name = value.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) options[name] = true;
    else {
      options[name] = next;
      index += 1;
    }
  }
  return { command, options };
}

function required(options, name) {
  const value = options[name];
  if (!value || value === true) throw new Error(`Missing --${name}`);
  return String(value);
}

function numeric(options, name, fallback) {
  if (options[name] === undefined) return fallback;
  const value = Number(options[name]);
  if (!Number.isFinite(value)) throw new Error(`--${name} must be a number`);
  return value;
}

const { command, options } = parse(process.argv.slice(2));
const cdpUrl = String(options["cdp-url"] || process.env.LALA_STUDIO_BROWSER_CDP_URL || "http://127.0.0.1:9466");
const appUrl = String(options["app-url"] || process.env.LALA_STUDIO_APP_URL || "http://127.0.0.1:4412");
const evidenceDir = path.resolve(String(options["evidence-dir"] || process.env.LALA_STUDIO_EVIDENCE_DIR || ".runtime/browser-evidence"));
const waitMs = numeric(options, "wait-seconds", 1200) * 1000;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function screenshot(page, label) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const file = path.join(evidenceDir, `${stamp()}-${label.replace(/[^a-z0-9_-]+/gi, "-")}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function connectPage() {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  if (!context) throw new Error(`Chrome at ${cdpUrl} has no browser context`);
  const targetOrigin = new URL(appUrl).origin;
  const pages = context.pages();
  const matches = pages.filter((candidate) => {
    try { return new URL(candidate.url()).origin === targetOrigin; } catch { return false; }
  });
  let page = matches[0] || pages.find((candidate) => candidate.url() === "about:blank") || null;
  if (!page) page = await context.newPage();
  for (const duplicate of matches.slice(1)) await duplicate.close();
  if (!page.url().startsWith(targetOrigin)) await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.bringToFront();
  await page.getByTestId("lala-studio-app").waitFor({ state: "visible", timeout: 60_000 });
  return { browser, page };
}

async function readStatus(page) {
  const status = await page.getByTestId("lala-studio-app").evaluate((root) => ({
    view: root.getAttribute("data-active-view"),
    story: document.querySelector('[data-testid="story-title"]')?.textContent?.trim()
      || document.querySelector(".workspace-heading h1")?.textContent?.trim()
      || null,
    quality: document.querySelector(".quality-score")?.getAttribute("data-score") || null,
    userMessages: document.querySelectorAll('[data-testid="chat-message-user"]').length,
    assistantMessages: document.querySelectorAll('[data-testid="chat-message-assistant"]').length,
    contextTurns: Number(document.querySelector('[data-testid="studio-chat"]')?.getAttribute("data-context-turns") || 0),
    productionCard: Boolean(document.querySelector('[data-testid="production-card"]')),
    deliveryCard: Boolean(document.querySelector('[data-testid="delivery-card"]')),
    aiJob: document.querySelector('[data-testid="ai-job"]')?.getAttribute("data-status") || null,
    videoJob: document.querySelector('[data-testid="chat-video-job"]')?.getAttribute("data-status")
      || document.querySelector('[data-testid="production-job"]')?.getAttribute("data-status")
      || null,
    deliveryJob: document.querySelector('[data-testid="chat-delivery-job"]')?.getAttribute("data-status")
      || root.getAttribute("data-delivery-job-status")
      || null
  }));
  return { url: page.url(), title: await page.title(), ...status };
}

async function ensureView(page, view) {
  if (!["write", "prompt", "produce", "publish", "runs"].includes(view)) throw new Error(`Unsupported view: ${view}`);
  const app = page.getByTestId("lala-studio-app");
  if (await app.getAttribute("data-active-view") === view) return;
  await page.getByTestId(`nav-${view}`).click();
  await page.waitForFunction((expected) => document.querySelector('[data-testid="lala-studio-app"]')?.getAttribute("data-active-view") === expected, view);
}

async function selectStory(page, match) {
  await ensureView(page, "write");
  const search = page.getByTestId("story-search");
  await search.fill(match);
  const rows = page.getByTestId("story-row");
  await rows.first().waitFor({ state: "visible", timeout: 20_000 });
  const count = await rows.count();
  let chosen = null;
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const title = await row.getAttribute("data-story-title");
    const id = await row.getAttribute("data-story-id");
    if (`${title || ""} ${id || ""}`.toLowerCase().includes(match.toLowerCase())) {
      chosen = row;
      break;
    }
  }
  chosen ||= rows.first();
  const storyId = await chosen.getAttribute("data-story-id");
  await chosen.click();
  await page.locator(`[data-testid="story-row"][data-story-id="${storyId}"]`).waitFor({ state: "visible" });
  await page.waitForFunction((id) => document.querySelector(`[data-testid="story-row"][data-story-id="${id}"]`)?.classList.contains("selected"), storyId);
  return { storyId, title: await page.getByTestId("story-title").innerText() };
}

async function createStory(page, title, duration) {
  if (![15, 30, 60].includes(duration)) throw new Error("Story duration must be 15, 30, or 60 seconds");
  await ensureView(page, "write");
  await page.getByTestId("new-story-open").click();
  await page.getByTestId("new-story-dialog").waitFor({ state: "visible", timeout: 20_000 });
  await page.getByTestId("new-story-title-input").fill(title);
  await page.getByTestId(`new-story-duration-${duration}`).click();
  await page.getByTestId("new-story-create").click();
  await page.getByTestId("new-story-dialog").waitFor({ state: "hidden", timeout: 30_000 });
  await page.waitForFunction((expected) => document.querySelector('[data-testid="story-title"]')?.textContent?.trim() === expected, title, { timeout: 30_000 });
  const selected = page.locator('[data-testid="story-row"].selected');
  return {
    storyId: await selected.getAttribute("data-story-id"),
    title: await page.getByTestId("story-title").innerText(),
    duration
  };
}

async function sendChat(page, message, action = "chat") {
  if (!["chat", "draft", "review", "final", "refine"].includes(action)) throw new Error(`Unsupported chat action: ${action}`);
  await ensureView(page, "write");
  const previousAssistantCount = await page.getByTestId("chat-message-assistant").count();
  const productionCards = page.getByTestId("production-card");
  const previousProductionId = await productionCards.count() > 0
    ? await productionCards.first().getAttribute("data-request-id")
    : null;
  const deliveryCards = page.getByTestId("delivery-card");
  const previousDeliveryId = await deliveryCards.count() > 0
    ? await deliveryCards.first().getAttribute("data-request-id")
    : null;
  await page.getByTestId("chat-input").fill(message);
  const button = action === "chat" ? "chat-send" : `quick-${action}`;
  await page.getByTestId(button).click();
  if (action === "chat") {
    const delivery = /(?:发布|发表|投放|上传).{0,40}(?:视频|短片|影片|电影|mv|平台|小红书|抖音|视频号|油管|youtube|instagram)|(?:视频|短片|影片|电影|mv).{0,40}(?:发布|发表|投放|上传)|(?:publish|post|upload).{0,48}(?:video|film|movie|mv|platform|youtube|instagram|douyin|shipinhao)/i.test(message);
    if (delivery) {
      await page.waitForFunction((previous) => {
        const card = document.querySelector('[data-testid="delivery-card"]');
        return Boolean(card && card.getAttribute("data-request-id") !== previous);
      }, previousDeliveryId, { timeout: 30_000 });
      return { kind: "delivery" };
    }
    const production = /(?:生成|制作|准备|配置|开始|创建|做成|提交).{0,24}(?:视频|短片|影片|电影|mv)|(?:视频|短片|影片|电影|mv).{0,24}(?:生成|制作|准备|配置|开始|创建|提交)|(?:generate|create|make|prepare|configure|submit|render).{0,40}(?:video|film|movie|mv)/i.test(message);
    if (production) {
      await page.waitForFunction((previous) => {
        const card = document.querySelector('[data-testid="production-card"]');
        return Boolean(card && card.getAttribute("data-request-id") !== previous);
      }, previousProductionId, { timeout: 30_000 });
      return { kind: "production" };
    }
  }
  await page.waitForFunction((previous) => {
    const root = document.querySelector('[data-testid="lala-studio-app"]');
    const state = root?.getAttribute("data-ai-job-status");
    return document.querySelectorAll('[data-testid="chat-message-assistant"]').length > previous
      || state === "done" || state === "failed" || state === "cancelled";
  }, previousAssistantCount, { timeout: waitMs });
  await ensureView(page, "write");
  await page.waitForFunction((previous) => document.querySelectorAll('[data-testid="chat-message-assistant"]').length > previous, previousAssistantCount, { timeout: 30_000 });
  const response = await page.getByTestId("chat-message-assistant").last().innerText();
  return { kind: "assistant", response };
}

async function deliveryAction(page, operation, confirmPublish) {
  if (!["inspect", "publish"].includes(operation)) throw new Error(`Unsupported delivery operation: ${operation}`);
  await ensureView(page, "write");
  if (operation === "inspect") {
    await page.getByTestId("delivery-inspect").click();
    await page.locator(".publish-workspace").waitFor({ state: "visible", timeout: 30_000 });
    return { status: "inspected" };
  }
  if (!confirmPublish) throw new Error("Publishing requires --confirm-publish");
  page.once("dialog", async (dialog) => {
    if (dialog.type() !== "confirm") throw new Error(`Unexpected dialog: ${dialog.type()}`);
    await dialog.accept();
  });
  await page.getByTestId("delivery-publish").click();
  await page.waitForFunction(() => {
    const state = document.querySelector('[data-testid="lala-studio-app"]')?.getAttribute("data-delivery-job-status");
    return state === "done" || state === "failed" || state === "cancelled";
  }, undefined, { timeout: waitMs });
  await ensureView(page, "write");
  const job = page.getByTestId("chat-delivery-job");
  await job.waitFor({ state: "visible", timeout: 30_000 });
  const state = await job.getAttribute("data-status");
  const detail = (await job.innerText()).trim();
  if (state !== "done") throw new Error(`Delivery job ${state}: ${detail}`);
  return { status: state, detail };
}

async function applyLast(page) {
  await ensureView(page, "write");
  const applyButtons = page.getByTestId("apply-response");
  if (await applyButtons.count() === 0) throw new Error("No assistant response is available to apply");
  await applyButtons.last().click();
  await page.getByTestId("story-save").waitFor({ state: "visible" });
  if (await page.getByTestId("story-save").isDisabled()) throw new Error("Applying the assistant response did not change the editor");
}

async function saveStory(page) {
  const save = page.getByTestId("story-save");
  if (!(await save.isDisabled())) await save.click();
  await page.waitForFunction(() => document.querySelector('[data-testid="story-save"]')?.textContent?.includes("Saved"), undefined, { timeout: 30_000 });
}

async function cancelActiveRun(page) {
  await ensureView(page, "runs");
  const running = page.locator('[data-testid="run-row"][data-status="running"], [data-testid="run-row"][data-status="queued"]').first();
  await running.waitFor({ state: "visible", timeout: 20_000 });
  const jobId = await running.getAttribute("data-job-id");
  await running.click();
  await page.getByTestId("cancel-job").click();
  await page.waitForFunction((id) => {
    const row = document.querySelector(`[data-testid="run-row"][data-job-id="${id}"]`);
    const state = row?.getAttribute("data-status");
    return state === "cancelled" || state === "failed";
  }, jobId, { timeout: 30_000 });
  return { jobId, status: await page.locator(`[data-testid="run-row"][data-job-id="${jobId}"]`).getAttribute("data-status") };
}

async function productionAction(page, operation, confirmPaid) {
  if (!["inspect", "prepare", "generate"].includes(operation)) throw new Error(`Unsupported production operation: ${operation}`);
  await ensureView(page, "produce");
  await page.getByTestId("produce-workspace").waitFor({ state: "visible", timeout: 60_000 });
  if (operation === "inspect") {
    return { status: "inspected" };
  }
  if (operation === "generate" && !confirmPaid) {
    throw new Error("Paid generation requires --confirm-paid");
  }
  if (operation === "generate") {
    page.once("dialog", async (dialog) => {
      if (dialog.type() !== "confirm") throw new Error(`Unexpected dialog: ${dialog.type()}`);
      await dialog.accept();
    });
  }
  const testId = operation === "prepare" ? "prepare-video" : "generate-video";
  const actionButton = page.getByTestId(testId);
  await actionButton.waitFor({ state: "visible", timeout: 30_000 });
  if (await actionButton.isDisabled()) throw new Error(`Production action is disabled: ${testId}`);
  await actionButton.click();
  await page.waitForFunction(() => {
    const state = document.querySelector('[data-testid="lala-studio-app"]')?.getAttribute("data-video-job-status");
    return state === "done" || state === "failed" || state === "cancelled";
  }, undefined, { timeout: waitMs });
  const state = await page.getByTestId("lala-studio-app").getAttribute("data-video-job-status");
  const job = page.getByTestId("production-job");
  const detail = await job.count() ? (await job.innerText()).trim() : `Video job ${state}`;
  if (state !== "done") throw new Error(`Video job ${state}: ${detail}`);
  return { status: state, detail };
}

function usage() {
  process.stdout.write(`Lala Studio direct browser controller\n\n` +
    `Commands:\n` +
    `  open\n` +
    `  status\n` +
    `  screenshot [--label NAME]\n` +
    `  reload\n` +
    `  navigate --view write|prompt|produce|publish|runs\n` +
    `  create-story --title TEXT [--duration 15|30|60]\n` +
    `  select-story --match TEXT\n` +
    `  chat --message TEXT [--action chat|draft|review|final|refine] [--wait-seconds N]\n` +
    `  story-pipeline --title TEXT --message TEXT [--duration 15|30|60]\n` +
    `  apply-last\n` +
    `  save\n` +
    `  cancel-active\n` +
    `  production [--message TEXT] --operation inspect|prepare|generate [--confirm-paid]\n` +
    `  delivery [--message TEXT] --operation inspect|publish [--confirm-publish]\n` +
    `  run --story-match TEXT --story-message TEXT [--action final] --production-message TEXT --operation inspect|prepare|generate [--confirm-paid]\n\n` +
    `All commands manipulate visible DOM controls through the dedicated Chrome CDP session.\n`);
}

if (["help", "--help", "-h"].includes(command) || options.help) {
  usage();
  process.exit(0);
}

let browser;
let page;
try {
  const connection = await connectPage();
  browser = connection.browser;
  page = connection.page;
  let result = {};
  if (command === "open") result = await readStatus(page);
  else if (command === "status") result = await readStatus(page);
  else if (command === "screenshot") result = { screenshot: await screenshot(page, String(options.label || "manual")), ...(await readStatus(page)) };
  else if (command === "reload") {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("lala-studio-app").waitFor({ state: "visible", timeout: 60_000 });
    result = await readStatus(page);
  }
  else if (command === "navigate") {
    await ensureView(page, required(options, "view"));
    result = await readStatus(page);
  }
  else if (command === "create-story") result = await createStory(page, required(options, "title"), numeric(options, "duration", 15));
  else if (command === "select-story") result = await selectStory(page, required(options, "match"));
  else if (command === "chat") result = await sendChat(page, required(options, "message"), String(options.action || "chat"));
  else if (command === "story-pipeline") {
    const created = await createStory(page, required(options, "title"), numeric(options, "duration", 15));
    const refined = await sendChat(page, required(options, "message"), "refine");
    await applyLast(page);
    await saveStory(page);
    result = { created, refined, saved: true };
  }
  else if (command === "apply-last") {
    await applyLast(page);
    result = { applied: true };
  } else if (command === "save") {
    await saveStory(page);
    result = { saved: true };
  } else if (command === "cancel-active") {
    result = await cancelActiveRun(page);
  } else if (command === "production") {
    if (options.message) await sendChat(page, String(options.message), "chat");
    result = await productionAction(page, String(options.operation || "inspect"), Boolean(options["confirm-paid"]));
  } else if (command === "delivery") {
    if (options.message) await sendChat(page, String(options.message), "chat");
    result = await deliveryAction(page, String(options.operation || "inspect"), Boolean(options["confirm-publish"]));
  } else if (command === "run") {
    const selected = await selectStory(page, required(options, "story-match"));
    const storyResult = await sendChat(page, required(options, "story-message"), String(options.action || "final"));
    await applyLast(page);
    await saveStory(page);
    await sendChat(page, required(options, "production-message"), "chat");
    const production = await productionAction(page, String(options.operation || "inspect"), Boolean(options["confirm-paid"]));
    result = { selected, storyResult, production };
  } else {
    usage();
    throw new Error(`Unknown command: ${command}`);
  }
  const evidence = await screenshot(page, command);
  process.stdout.write(`${JSON.stringify({ ok: true, command, evidence, result, status: await readStatus(page) }, null, 2)}\n`);
} catch (error) {
  const failureEvidence = page ? await screenshot(page, `${command}-failed`).catch(() => null) : null;
  process.stderr.write(`${JSON.stringify({ ok: false, command, error: error instanceof Error ? error.message : String(error), evidence: failureEvidence }, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
