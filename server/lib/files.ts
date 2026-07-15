import fs from "node:fs";
import path from "node:path";

export function assertInside(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Path is outside the allowed workspace");
  }
  return resolved;
}

export function safeId(value: string): string {
  const normalized = value.trim().replace(/\.md$/i, "");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/.test(normalized)) {
    throw new Error("Invalid story id");
  }
  return normalized;
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || `story-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
}

export function atomicWrite(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, content, "utf8");
  fs.renameSync(temporary, filePath);
}

export function relativeTo(root: string, filePath: string): string {
  return path.relative(root, filePath).split(path.sep).join("/");
}
