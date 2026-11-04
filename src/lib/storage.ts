import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type Bucket = "kyc" | "attachments" | "contact";

const SIGNATURES: { mime: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/webp", ext: "webp", test: (b) => b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  { mime: "application/pdf", ext: "pdf", test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
];

export class UploadError extends Error {}

/**
 * Validate an uploaded file by size and *content* (magic bytes), not by the
 * client-supplied MIME type, then store it in a private bucket.
 */
export async function uploadFile(
  bucket: Bucket,
  folder: string,
  file: File,
  maxBytes = 10 * 1024 * 1024,
): Promise<{ path: string; mime: string; size: number; name: string }> {
  if (!file || file.size === 0) throw new UploadError("No file selected.");
  if (file.size > maxBytes) throw new UploadError(`File is too large (max ${Math.round(maxBytes / 1024 / 1024)}MB).`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(bytes));
  if (!sig) throw new UploadError("Only JPG, PNG, WEBP or PDF files are allowed.");

  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
  const path = `${safeFolder}/${randomUUID()}.${sig.ext}`;
  const { error } = await createAdminClient().storage.from(bucket).upload(path, bytes, {
    contentType: sig.mime,
    upsert: false,
  });
  if (error) throw new UploadError(`Upload failed: ${error.message}`);
  const name = file.name.replace(/[^\w.\- ]/g, "_").slice(0, 120) || `upload.${sig.ext}`;
  return { path, mime: sig.mime, size: file.size, name };
}

export async function signedUrl(bucket: Bucket, path: string, expiresIn = 300) {
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export function fileFrom(form: FormData, key: string): File | null {
  const f = form.get(key);
  return f instanceof File && f.size > 0 ? f : null;
}
