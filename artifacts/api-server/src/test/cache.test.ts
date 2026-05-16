import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { cache } from "../lib/cache.js";

describe("Cache Module", () => {
  it("✅ get and set work correctly", async () => {
    const key = "test:hit:key";
    const val = JSON.stringify({ ok: true });

    // MISS
    expect(await cache.get(key)).toBeNull();

    // SET
    await cache.set(key, val, 1); // 1 second TTL

    // HIT
    expect(await cache.get(key)).toBe(val);
  });

  it("✅ TTL expiry works correctly", async () => {
    const key = "test:ttl:key";
    await cache.set(key, "temp", 1); // 1 second TTL

    // Fast forward is tricky with real timers in tests, let's wait 1.1s
    await new Promise((r) => setTimeout(r, 1100));

    expect(await cache.get(key)).toBeNull();
  });

  it("✅ tenant invalidation clears matching keys", async () => {
    const tenantId = 9999;
    const key1 = `tenant:${tenantId}:products`;
    const key2 = `tenant:${tenantId}:storefront:slug=test:q=:c=`;
    const keyOther = `tenant:8888:products`;

    await cache.set(key1, "1");
    await cache.set(key2, "2");
    await cache.set(keyOther, "3");

    await cache.invalidateTenant(tenantId);

    expect(await cache.get(key1)).toBeNull();
    expect(await cache.get(key2)).toBeNull();
    expect(await cache.get(keyOther)).toBe("3"); // untouched
  });

  it("✅ delete clears specific key", async () => {
    const key = "test:del:key";
    await cache.set(key, "data");
    await cache.del(key);
    expect(await cache.get(key)).toBeNull();
  });
});
