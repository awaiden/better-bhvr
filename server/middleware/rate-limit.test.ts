import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { rateLimit } from "./rate-limit";

describe("rateLimit middleware", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within limit and sets X-RateLimit-* headers", async () => {
    const app = new Hono();
    app.use("*", rateLimit({ windowMs: 60_000, max: 3 }));
    app.get("/test", (c) => c.json({ ok: true }));

    const res1 = await app.request("/test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(res1.status).toBe(200);
    expect(await res1.json()).toEqual({ ok: true });
    expect(res1.headers.get("X-RateLimit-Limit")).toBe("3");
    expect(res1.headers.get("X-RateLimit-Remaining")).toBe("2");
    expect(res1.headers.get("X-RateLimit-Reset")).toBe(
      String(Math.ceil((Date.now() + 60_000) / 1000)),
    );

    const res2 = await app.request("/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(res2.status).toBe(200);
    expect(res2.headers.get("X-RateLimit-Remaining")).toBe("1");

    const res3 = await app.request("/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(res3.status).toBe(200);
    expect(res3.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("returns 429 JSON with Retry-After header when exceeding max", async () => {
    const app = new Hono();
    app.use("*", rateLimit({ windowMs: 30_000, max: 2, message: "Slow down" }));
    app.get("/test", (c) => c.json({ ok: true }));

    await app.request("/test", { headers: { "x-real-ip": "10.0.0.1" } });
    await app.request("/test", { headers: { "x-real-ip": "10.0.0.1" } });

    vi.advanceTimersByTime(5_000);

    const blocked = await app.request("/test", { headers: { "x-real-ip": "10.0.0.1" } });
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "Slow down" });
    expect(blocked.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(blocked.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(blocked.headers.get("Retry-After")).toBe("25");
  });

  it("resets counter after window expires", async () => {
    const app = new Hono();
    app.use("*", rateLimit({ windowMs: 10_000, max: 1 }));
    app.get("/test", (c) => c.json({ ok: true }));

    const first = await app.request("/test");
    expect(first.status).toBe(200);

    const blocked = await app.request("/test");
    expect(blocked.status).toBe(429);

    vi.advanceTimersByTime(10_000);

    const afterReset = await app.request("/test");
    expect(afterReset.status).toBe(200);
    expect(afterReset.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("tracks distinct keys independently and supports custom keyGenerator", async () => {
    const app = new Hono();
    app.use(
      "*",
      rateLimit({
        windowMs: 60_000,
        max: 1,
        keyGenerator: (c) => c.req.header("x-api-key") ?? "anon",
      }),
    );
    app.get("/test", (c) => c.json({ ok: true }));

    const resA1 = await app.request("/test", { headers: { "x-api-key": "key-a" } });
    expect(resA1.status).toBe(200);

    const resA2 = await app.request("/test", { headers: { "x-api-key": "key-a" } });
    expect(resA2.status).toBe(429);
    expect(await resA2.json()).toEqual({ error: "Too Many Requests" });

    const resB1 = await app.request("/test", { headers: { "x-api-key": "key-b" } });
    expect(resB1.status).toBe(200);
  });

  it("isolates state between separate rateLimit() instances", async () => {
    const app1 = new Hono();
    app1.use("*", rateLimit({ max: 1 }));
    app1.get("/test", (c) => c.json({ ok: true }));

    const app2 = new Hono();
    app2.use("*", rateLimit({ max: 1 }));
    app2.get("/test", (c) => c.json({ ok: true }));

    expect((await app1.request("/test")).status).toBe(200);
    expect((await app1.request("/test")).status).toBe(429);
    expect((await app2.request("/test")).status).toBe(200);
  });

  it("ignores spoofed proxy headers when trustProxy is false and falls back to socket IP", async () => {
    const app = new Hono();
    app.use("*", rateLimit({ windowMs: 60_000, max: 1, trustProxy: false }));
    app.get("/test", (c) => c.json({ ok: true }));

    const first = await app.request("/test", {
      headers: { "x-forwarded-for": "1.1.1.1" },
    });
    expect(first.status).toBe(200);

    const spoofed = await app.request("/test", {
      headers: { "x-forwarded-for": "2.2.2.2", "x-real-ip": "3.3.3.3" },
    });
    expect(spoofed.status).toBe(429);

    // Distinct Bun server.requestIP addresses are tracked independently even with trustProxy: false
    const bunClientA = await app.request(
      "/test",
      { headers: { "x-forwarded-for": "9.9.9.9" } },
      { server: { requestIP: () => ({ address: "192.0.2.10" }) } },
    );
    expect(bunClientA.status).toBe(200);

    const bunClientB = await app.request(
      "/test",
      { headers: { "x-forwarded-for": "9.9.9.9" } },
      { server: { requestIP: () => ({ address: "192.0.2.11" }) } },
    );
    expect(bunClientB.status).toBe(200);
  });

  it("uses proxy headers by default to track distinct clients", async () => {
    const app = new Hono();
    app.use("*", rateLimit({ windowMs: 60_000, max: 1 }));
    app.get("/test", (c) => c.json({ ok: true }));

    const clientA = await app.request("/test", {
      headers: { "x-forwarded-for": "1.1.1.1, 10.0.0.1" },
    });
    expect(clientA.status).toBe(200);

    const clientB = await app.request("/test", {
      headers: { "x-forwarded-for": "2.2.2.2" },
    });
    expect(clientB.status).toBe(200);

    const clientARetry = await app.request("/test", {
      headers: { "x-forwarded-for": "1.1.1.1" },
    });
    expect(clientARetry.status).toBe(429);
  });

  it("bounds store size to maxEntries by evicting the oldest entry", async () => {
    const app = new Hono();
    app.use(
      "*",
      rateLimit({
        windowMs: 60_000,
        max: 1,
        maxEntries: 2,
        keyGenerator: (c) => c.req.header("x-key") ?? "unknown",
      }),
    );
    app.get("/test", (c) => c.json({ ok: true }));

    expect((await app.request("/test", { headers: { "x-key": "k1" } })).status).toBe(200);
    expect((await app.request("/test", { headers: { "x-key": "k2" } })).status).toBe(200);
    // Inserting k3 evicts oldest key k1 so store stays bounded at 2 entries
    expect((await app.request("/test", { headers: { "x-key": "k3" } })).status).toBe(200);

    // k2 is still tracked (blocked), while k1 was evicted
    expect((await app.request("/test", { headers: { "x-key": "k2" } })).status).toBe(429);
    expect((await app.request("/test", { headers: { "x-key": "k1" } })).status).toBe(200);
  });
});
