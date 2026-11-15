import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { describe, expect, it, vi } from "vite-plus/test";

vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/better_bhvr";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-with-at-least-32-characters";
});

import {
  type AuthVariables,
  optionalAuth,
  type OptionalAuthVariables,
  requireRole,
  type UserRole,
} from "./auth";
import { auth } from "../auth";

function createTestApp(userRole?: UserRole, allowedRoles: UserRole[] = ["admin"]) {
  const app = new Hono<{ Variables: AuthVariables }>();

  if (userRole !== undefined) {
    app.use(
      "*",
      createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
        c.set("user", {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
          image: null,
          role: userRole,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        });
        await next();
      }),
    );
  }

  app.get("/protected", requireRole(...allowedRoles), (c) => c.json({ ok: true }));

  return app;
}

describe("requireRole middleware", () => {
  it("returns 401 when user is not set on context", async () => {
    const app = createTestApp(undefined, ["admin"]);

    const res = await app.request("/protected");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when user role is not in allowed roles", async () => {
    const app = createTestApp("user", ["admin"]);

    const res = await app.request("/protected");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("calls next() when user role matches an allowed role", async () => {
    const app = createTestApp("admin", ["admin"]);

    const res = await app.request("/protected");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("supports multiple allowed roles", async () => {
    const app = createTestApp("user", ["user", "admin"]);

    const res = await app.request("/protected");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("optionalAuth middleware", () => {
  it("sets user and session to null when no session exists", async () => {
    const spy = vi.spyOn(auth.api, "getSession").mockResolvedValueOnce(null);
    const app = new Hono<{ Variables: OptionalAuthVariables }>();
    app.get("/public", optionalAuth, (c) =>
      c.json({ user: c.get("user"), session: c.get("session") }),
    );

    const res = await app.request("/public");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null, session: null });
    spy.mockRestore();
  });

  it("sets user and session when a valid session exists", async () => {
    const mockUser = {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      role: "user" as UserRole,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const mockSession = {
      id: "session-1",
      userId: "user-1",
      token: "token-1",
      expiresAt: new Date("2026-02-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      ipAddress: null,
      userAgent: null,
    };
    const spy = vi
      .spyOn(auth.api, "getSession")
      .mockResolvedValueOnce({ user: mockUser, session: mockSession });

    const app = new Hono<{ Variables: OptionalAuthVariables }>();
    app.get("/public", optionalAuth, (c) =>
      c.json({ userId: c.get("user")?.id ?? null, sessionId: c.get("session")?.id ?? null }),
    );

    const res = await app.request("/public");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "user-1", sessionId: "session-1" });
    spy.mockRestore();
  });
});
