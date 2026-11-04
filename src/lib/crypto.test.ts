import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret, hmacHex, safeEqual } from "./crypto";

describe("crypto", () => {
  const key = randomBytes(32);
  it("round-trips secrets", () => {
    const enc = encryptSecret("user: ada / pass: s3cret!", key);
    expect(enc.startsWith("v1.")).toBe(true);
    expect(enc).not.toContain("s3cret");
    expect(decryptSecret(enc, key)).toBe("user: ada / pass: s3cret!");
  });
  it("detects tampering", () => {
    const parts = encryptSecret("hello", key).split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."), key)).toThrow();
  });
  it("rejects the wrong key", () => {
    expect(() => decryptSecret(encryptSecret("x", key), randomBytes(32))).toThrow();
  });
  it("computes HMAC and compares safely", () => {
    const sig = hmacHex("sha512", "secret", "{}");
    expect(safeEqual(sig, hmacHex("sha512", "secret", "{}"))).toBe(true);
    expect(safeEqual(sig, "abc")).toBe(false);
  });
});
