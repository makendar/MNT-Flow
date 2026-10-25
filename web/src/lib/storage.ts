import { randomBytes } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

// Local demo storage adapter: private files under ./storage (outside /public, never served statically).
// Production: replace with private object storage (S3 / Azure Blob) + short-lived signed URLs; keep the same 2 functions.

const ROOT = path.join(process.cwd(), "storage", "uploads");

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  txt: ["text/plain"],
  csv: ["text/csv", "application/vnd.ms-excel", "text/plain"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

const MAGIC: Record<string, number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  png: [0x89, 0x50, 0x4e, 0x47],
  jpg: [0xff, 0xd8, 0xff],
  jpeg: [0xff, 0xd8, 0xff],
  xlsx: [0x50, 0x4b, 0x03, 0x04],
  docx: [0x50, 0x4b, 0x03, 0x04],
};

/** Returns an error message, or null if the file is acceptable. */
export function validateUpload(name: string, mime: string, buf: Buffer): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED[ext]) return `File type .${ext || "?"} is not allowed. Allowed: ${Object.keys(ALLOWED).join(", ")}.`;
  if (buf.length === 0) return "The file is empty.";
  if (buf.length > MAX_UPLOAD_BYTES) return "File exceeds the 5 MB limit.";
  if (mime && !ALLOWED[ext].includes(mime)) return `File content type (${mime}) does not match the .${ext} extension.`;
  const sig = MAGIC[ext];
  if (sig && !sig.every((b, i) => buf[i] === b)) return `File content does not look like a valid .${ext} file.`;
  return null;
}

export function safeFileName(name: string): string {
  return name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "file";
}

export async function saveFile(orgId: string, buf: Buffer): Promise<string> {
  const key = randomBytes(16).toString("hex");
  const dir = path.join(ROOT, orgId.replace(/[^\w-]/g, ""));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), buf);
  return key;
}

export async function readStoredFile(orgId: string, key: string): Promise<Buffer> {
  if (!/^[a-f0-9]{32}$/.test(key)) throw new Error("Invalid storage key");
  return readFile(path.join(ROOT, orgId.replace(/[^\w-]/g, ""), key));
}
