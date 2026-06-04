import { encrypt, decrypt } from "../lib/encryption.js";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("encryption", () => {
  const validKey = "1234567890123456789012345678901234567890123456789012345678901234"; // 64 hex chars (32 bytes)
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should encrypt and decrypt successfully with valid key", () => {
    process.env.ENCRYPTION_KEY = validKey;
    const plaintext = "hello world";
    const encrypted = encrypt(plaintext);
    expect(encrypted).toMatch(/^enc:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should return plaintext if encrypt is called and ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;
    const plaintext = "hello world";
    const encrypted = encrypt(plaintext);
    expect(encrypted).toBe(plaintext);
  });

  it("should return plaintext if decrypt is called with non-encrypted string", () => {
    const plaintext = "hello world";
    const decrypted = decrypt(plaintext);
    expect(decrypted).toBe(plaintext);
  });

  it("should throw error if encrypt is called with invalid key length", () => {
    process.env.ENCRYPTION_KEY = "invalid";
    expect(() => encrypt("hello world")).toThrow("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  });

  it("should throw error if decrypt is called and ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;
    const encryptedValue = "enc:1234:5678:90ab"; // mocked encrypted string
    expect(() => decrypt(encryptedValue)).toThrow("ENCRYPTION_KEY is required to decrypt encrypted values");
  });

  it("should throw error if decrypt is called with invalid format", () => {
    process.env.ENCRYPTION_KEY = validKey;
    const encryptedValue = "enc:1234:5678"; // missing 4th part
    expect(() => decrypt(encryptedValue)).toThrow("Invalid encrypted value format");
  });
});
