import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { isServerlessHost } from "@/lib/supabase/server";

const ROOT = path.join(process.cwd(), ".data");
const UPLOADS = path.join(ROOT, "uploads");

function assertLocalDemoFilesystem() {
  if (isServerlessHost()) {
    throw new Error(
      "Local demo file storage is not available on Vercel. Configure Supabase environment variables for uploads.",
    );
  }
}

function ensureUploadsDir() {
  assertLocalDemoFilesystem();
  mkdirSync(UPLOADS, { recursive: true });
}

export function demoUploadsRoot() {
  ensureUploadsDir();
  return UPLOADS;
}

export function resolveDemoUploadPath(relativePath: string) {
  const normalized = relativePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  if (!normalized || normalized.includes("..")) {
    throw new Error("Invalid document path");
  }
  return path.join(UPLOADS, ...normalized.split("/"));
}

export async function saveDemoUpload(
  relativePath: string,
  data: ArrayBuffer | Buffer,
  contentType: string,
) {
  const absolute = resolveDemoUploadPath(relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  writeFileSync(absolute, buffer);
  writeFileSync(`${absolute}.meta.json`, JSON.stringify({ contentType }));
  return relativePath.replace(/\\/g, "/");
}

export function readDemoUpload(relativePath: string) {
  const absolute = resolveDemoUploadPath(relativePath);
  if (!existsSync(absolute)) return null;
  const buffer = readFileSync(absolute);
  let contentType = "application/octet-stream";
  const metaPath = `${absolute}.meta.json`;
  if (existsSync(metaPath)) {
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf8")) as {
        contentType?: string;
      };
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      // ignore corrupt meta
    }
  }
  return { buffer, contentType };
}

export function deleteDemoUploads(relativePaths: string[]) {
  for (const relativePath of relativePaths) {
    try {
      const absolute = resolveDemoUploadPath(relativePath);
      if (existsSync(absolute)) unlinkSync(absolute);
      if (existsSync(`${absolute}.meta.json`)) {
        unlinkSync(`${absolute}.meta.json`);
      }
    } catch {
      // best-effort cleanup
    }
  }
}

export function demoDataDir() {
  assertLocalDemoFilesystem();
  mkdirSync(ROOT, { recursive: true });
  return ROOT;
}
