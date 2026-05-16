import { createClient } from "redis";
import type { RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on("error", (err) => {
    // Log silently or safely; don't crash
    console.error("Redis cache error:", err.message);
  });
  // Non-blocking connect
  redisClient.connect().catch(() => {});
}

// Simple in-memory fallback for test/local
const memoryCache = new Map<string, { value: string; expiry: number }>();

export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      if (redisClient?.isReady) {
        return await redisClient.get(key);
      }
      const entry = memoryCache.get(key);
      if (entry) {
        if (Date.now() > entry.expiry) {
          memoryCache.delete(key);
          return null;
        }
        return entry.value;
      }
      return null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: string, ttlSeconds: number = 60): Promise<void> {
    try {
      if (redisClient?.isReady) {
        await redisClient.set(key, value, { EX: ttlSeconds });
        return;
      }
      memoryCache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
    } catch {
      // Ignore cache set errors
    }
  },

  async del(key: string): Promise<void> {
    try {
      if (redisClient?.isReady) {
        await redisClient.del(key);
        return;
      }
      memoryCache.delete(key);
    } catch {
      // Ignore
    }
  },

  async invalidateTenant(tenantId: number): Promise<void> {
    try {
      const pattern = `tenant:${tenantId}:*`;
      if (redisClient?.isReady) {
        // Ideally use scan, but for now we can rely on keys or just use a short TTL
        // For production scale, storing keys in a set per tenant or scanning is better.
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
        return;
      }
      for (const key of memoryCache.keys()) {
        if (key.startsWith(`tenant:${tenantId}:`)) {
          memoryCache.delete(key);
        }
      }
    } catch {
      // Ignore
    }
  }
};