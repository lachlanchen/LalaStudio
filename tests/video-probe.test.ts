import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { probeVideo } from "../server/workflows.js";

const ffmpegAvailable = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("video result validation", () => {
  it.skipIf(!ffmpegAvailable)("rejects a truncated MP4 whose header still reports the target duration", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lala-studio-video-probe-"));
    temporaryDirectories.push(directory);
    const validPath = path.join(directory, "valid.mp4");
    const truncatedPath = path.join(directory, "truncated.mp4");

    const generated = spawnSync("ffmpeg", [
      "-y",
      "-v", "error",
      "-f", "lavfi",
      "-i", "testsrc=size=320x240:rate=24:duration=2",
      "-f", "lavfi",
      "-i", "sine=frequency=440:sample_rate=48000:duration=2",
      "-c:v", "mpeg4",
      "-q:v", "5",
      "-c:a", "aac",
      "-movflags", "+faststart",
      "-shortest",
      validPath
    ], { encoding: "utf8" });
    expect(generated.status, generated.stderr).toBe(0);
    expect(probeVideo(validPath, 2)).toMatchObject({ width: 320, height: 240, hasAudio: true });

    const full = fs.readFileSync(validPath);
    fs.writeFileSync(truncatedPath, full.subarray(0, Math.floor(full.length * 0.65)));

    const headerProbe = spawnSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      truncatedPath
    ], { encoding: "utf8" });
    expect(headerProbe.status).toBe(0);
    expect(Number(headerProbe.stdout.trim())).toBeGreaterThan(1.9);
    expect(probeVideo(truncatedPath, 2)).toBeNull();
  }, 30_000);
});
