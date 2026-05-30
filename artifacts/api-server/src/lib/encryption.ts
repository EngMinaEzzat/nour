import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer | null {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return null;
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return buf;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns the original value if ENCRYPTION_KEY is not configured (graceful degradation).
 * Output format: `enc:<iv_hex>:<tag_hex>:<ciphertext_hex>`
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a value encrypted by `encrypt()`.
 * If the value does not start with `enc:`, it is treated as plaintext (backward compatibility).
 */
export function decrypt(value: string): string {
  if (!value.startsWith("enc:")) return value;

  const key = getEncryptionKey();
  if (!key) {
    throw new Error("ENCRYPTION_KEY is required to decrypt encrypted values");
  }

  const parts = value.split(":");
  if (parts.length !== 4) throw new Error("Invalid encrypted value format");

  const iv = Buffer.from(parts[1], "hex");
  const tag = Buffer.from(parts[2], "hex");
  const encrypted = Buffer.from(parts[3], "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
