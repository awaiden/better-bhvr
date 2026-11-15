import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { errorHandler, NotFoundError } from "../../common/errors";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
}));

const mockAuthState = vi.hoisted(() => ({
  user: null as {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin";
  } | null,
}));

vi.mock("../../db", () => ({
  db: mockDb,
  user: {
    id: "user.id",
    name: "user.name",
    email: "user.email",
    emailVerified: "user.email_verified",
    role: "user.role",
    createdAt: "user.created_at",
    updatedAt: "user.updated_at",
  },
}));

vi.mock("../../middleware/auth", async () => {
  const { createMiddleware } = await import("hono/factory");
  return {
    requireAuth: createMiddleware(async (c, next) => {
      if (!mockAuthState.user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      c.set("user", mockAuthState.user);
      c.set("session", { id: "sess-1", userId: mockAuthState.user.id });
      await next();
    }),
    requireRole: (...roles: Array<"user" | "admin">) =>
      createMiddleware(async (c, next) => {
        const user = c.get("user") as { role: "user" | "admin" } | undefined;
        if (!user) {
          return c.json({ error: "Unauthorized" }, 401);
        }
        if (!roles.includes(user.role)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        await next();
      }),
  };
});

import { adminUserRoutes, userRoutes } from "./users.routes";
import { updateUserRoleSchema, userIdParamSchema, userRoleSchema } from "./users.schema";
import { usersService } from "./users.service";

const sampleUser = {
  id: "u1",
  name: "Alice",
  email: "alice@example.com",
  emailVerified: true,
  role: "user" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("users.schema", () => {
  describe("userRoleSchema", () => {
    it("accepts 'user' and 'admin'", () => {
      expect(userRoleSchema.parse("user")).toBe("user");
      expect(userRoleSchema.parse("admin")).toBe("admin");
    });

    it("rejects invalid roles", () => {
      expect(userRoleSchema.safeParse("superadmin").success).toBe(false);
      expect(userRoleSchema.safeParse("").success).toBe(false);
      expect(userRoleSchema.safeParse(123).success).toBe(false);
    });
  });

  describe("userIdParamSchema", () => {
    it("accepts and trims non-empty user IDs", () => {
      expect(userIdParamSchema.parse({ id: "user-123" })).toEqual({ id: "user-123" });
      expect(userIdParamSchema.parse({ id: "  user-123  " })).toEqual({ id: "user-123" });
    });

    it("rejects empty or whitespace-only user IDs", () => {
      expect(userIdParamSchema.safeParse({ id: "" }).success).toBe(false);
      expect(userIdParamSchema.safeParse({ id: "   " }).success).toBe(false);
    });
  });

  describe("updateUserRoleSchema", () => {
    it("accepts valid role payloads", () => {
      expect(updateUserRoleSchema.parse({ role: "admin" })).toEqual({ role: "admin" });
      expect(updateUserRoleSchema.parse({ role: "user" })).toEqual({ role: "user" });
    });

    it("rejects missing or invalid role payloads", () => {
      expect(updateUserRoleSchema.safeParse({}).success).toBe(false);
      expect(updateUserRoleSchema.safeParse({ role: "moderator" }).success).toBe(false);
    });
  });
});

describe("usersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listUsers selects public user fields ordered by createdAt desc", async () => {
    const rows = [sampleUser];
    const orderBy = vi.fn().mockResolvedValue(rows);
    const from = vi.fn().mockReturnValue({ orderBy });
    mockDb.select.mockReturnValue({ from });

    const result = await usersService.listUsers();

    expect(result).toEqual(rows);
    expect(mockDb.select).toHaveBeenCalledWith({
      id: "user.id",
      name: "user.name",
      email: "user.email",
      emailVerified: "user.email_verified",
      role: "user.role",
      createdAt: "user.created_at",
      updatedAt: "user.updated_at",
    });
    expect(from).toHaveBeenCalledOnce();
    expect(orderBy).toHaveBeenCalledOnce();
  });

  it("updateRole updates role and returns updated user when found", async () => {
    const updated = { ...sampleUser, role: "admin" as const };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    const result = await usersService.updateRole("u1", "admin");

    expect(result).toEqual(updated);
    expect(set).toHaveBeenCalledWith({ role: "admin" });
    expect(where).toHaveBeenCalledOnce();
    expect(returning).toHaveBeenCalledWith({
      id: "user.id",
      name: "user.name",
      email: "user.email",
      emailVerified: "user.email_verified",
      role: "user.role",
      createdAt: "user.created_at",
      updatedAt: "user.updated_at",
    });
  });

  it("updateRole throws NotFoundError when no row is returned", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    await expect(usersService.updateRole("missing-id", "admin")).rejects.toThrow(
      new NotFoundError("User not found"),
    );
  });
});

describe("userRoutes", () => {
  const createMeApp = () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.route("/me", userRoutes);
    return app;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthState.user = {
      id: "u1",
      email: "alice@example.com",
      name: "Alice",
      role: "user",
    };
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuthState.user = null;
    const app = createMeApp();

    const res = await app.request("/me");
    expect(res.status).toBe(401);
  });

  it("returns 200 with current user when authenticated", async () => {
    const app = createMeApp();

    const res = await app.request("/me");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: mockAuthState.user });
  });
});

describe("adminUserRoutes", () => {
  const createAdminApp = () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.route("/admin/users", adminUserRoutes);
    return app;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthState.user = {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
    };
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuthState.user = null;
    const app = createAdminApp();

    const listRes = await app.request("/admin/users");
    expect(listRes.status).toBe(401);

    const patchRes = await app.request("/admin/users/u1/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    expect(patchRes.status).toBe(401);
  });

  it("returns 403 for 'user' role", async () => {
    mockAuthState.user = {
      id: "u1",
      email: "alice@example.com",
      name: "Alice",
      role: "user",
    };
    const app = createAdminApp();

    const listRes = await app.request("/admin/users");
    expect(listRes.status).toBe(403);
    expect(await listRes.json()).toEqual({ error: "Forbidden" });

    const patchRes = await app.request("/admin/users/u1/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    expect(patchRes.status).toBe(403);
    expect(await patchRes.json()).toEqual({ error: "Forbidden" });
  });

  it("GET / returns 200 with users for 'admin' role", async () => {
    const users = [
      {
        ...sampleUser,
        createdAt: sampleUser.createdAt.toISOString(),
        updatedAt: sampleUser.updatedAt.toISOString(),
      },
    ];
    vi.spyOn(usersService, "listUsers").mockResolvedValueOnce([sampleUser]);
    const app = createAdminApp();

    const res = await app.request("/admin/users");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ users });
  });

  it("PATCH /:id/role returns 200 with updated user for 'admin' role", async () => {
    const updatedUser = { ...sampleUser, role: "admin" as const };
    const spy = vi.spyOn(usersService, "updateRole").mockResolvedValueOnce(updatedUser);
    const app = createAdminApp();

    const res = await app.request("/admin/users/u1/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith("u1", "admin");
    expect(await res.json()).toEqual({
      user: {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
    });
  });

  it("PATCH /:id/role returns 400 on invalid json payload", async () => {
    const app = createAdminApp();

    const res = await app.request("/admin/users/u1/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "owner" }),
    });

    expect(res.status).toBe(400);
  });

  it("PATCH /:id/role returns 400 on invalid id param", async () => {
    const app = createAdminApp();

    const res = await app.request("/admin/users/%20/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });

    expect(res.status).toBe(400);
  });

  it("PATCH /:id/role returns 404 when user is not found", async () => {
    vi.spyOn(usersService, "updateRole").mockRejectedValueOnce(new NotFoundError("User not found"));
    const app = createAdminApp();

    const res = await app.request("/admin/users/nonexistent/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "User not found" });
  });
});
