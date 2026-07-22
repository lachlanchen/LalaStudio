import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadCustomAssetDefinitions } from "../server/assets.js";

const temporaryRoots: string[] = [];

function temporaryRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lala-studio-assets-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("custom asset manifest", () => {
  it("loads project-local custom references", () => {
    const root = temporaryRoot();
    fs.mkdirSync(path.join(root, "references"));
    fs.writeFileSync(path.join(root, "references", "guest.png"), "image");
    const manifest = path.join(root, "assets.json");
    fs.writeFileSync(manifest, JSON.stringify({
      assets: [{
        id: "guest-pair",
        label: "Guest pair",
        role: "Episode identity reference",
        relativePath: "references/guest.png",
        required: true,
        defaultSelected: true
      }]
    }));

    expect(loadCustomAssetDefinitions(manifest, root)).toEqual([
      expect.objectContaining({ id: "guest-pair", relativePath: "references/guest.png" })
    ]);
  });

  it("rejects paths outside the project root", () => {
    const root = temporaryRoot();
    const outside = path.join(path.dirname(root), "outside.png");
    fs.writeFileSync(outside, "image");
    const manifest = path.join(root, "assets.json");
    fs.writeFileSync(manifest, JSON.stringify({
      assets: [{
        id: "outside",
        label: "Outside",
        role: "Invalid reference",
        relativePath: "../outside.png",
        required: false,
        defaultSelected: false
      }]
    }));

    expect(() => loadCustomAssetDefinitions(manifest, root)).toThrow("escapes the project root");
    fs.rmSync(outside, { force: true });
  });
});
