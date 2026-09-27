import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "./crypto";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "a".repeat(64);
});

describe("encrypt/decrypt", () => {
  it("round-trips a plaintext string", () => {
    const ciphertext = encrypt("hello world");
    expect(decrypt(ciphertext)).toBe("hello world");
  });

  it("rejects a payload with the wrong number of segments", () => {
    expect(() => decrypt("only:two")).toThrow("Malformed encrypted payload");
    expect(() => decrypt("a:b:c:d")).toThrow("Malformed encrypted payload");
  });

  it("rejects a payload with an empty segment, even at the right segment count", () => {
    expect(() => decrypt("::deadbeef")).toThrow("Malformed encrypted payload");
    expect(() => decrypt("aaaa:bbbb:")).toThrow("Malformed encrypted payload");
  });
});
