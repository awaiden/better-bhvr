import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/better_bhvr";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-with-at-least-32-characters";
});

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./db", () => ({
  db: mockDb,
  tasks: {
    id: "tasks.id",
    title: "tasks.title",
    completed: "tasks.completed",
    userId: "tasks.user_id",
    createdAt: "tasks.created_at",
  },
  user: {
    id: "user.id",
    name: "user.name",
    email: "user.email",
    emailVerified: "user.email_verified",
    image: "user.image",
    role: "user.role",
    createdAt: "user.created_at",
    updatedAt: "user.updated_at",
  },
}));

import { auth } from "./auth";
import { NotFoundError } from "./common/errors";
import app from "./index";
import { tasksService } from "./modules/tasks/tasks.service";

const now = new Date("2026-01-01T00:00:00.000Z");

const testSession: typeof auth.$Infer.Session = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    emailVerified: true,
    image: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
  },
  session: {
    id: "session-1",
    userId: "user-1",
    token: "test-token",
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    ipAddress: null,
    userAgent: null,
    createdAt: now,
    updatedAt: now,
  },
};

const adminSession: typeof auth.$Infer.Session = {
  user: {
    ...testSession.user,
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
  },
  session: {
    ...testSession.session,
    id: "session-admin-1",
    userId: "admin-1",
    token: "admin-token",
  },
};

function jsonRequest(path: string, method: string, body?: unknown) {
  return app.request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("Public endpoints and fallback", () => {
  it("GET /api/health returns 200 ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("GET /api/hello returns 200 greeting", async () => {
    const res = await app.request("/api/hello");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Hello from Hono!" });
  });

  it("GET /api/does-not-exist returns 404 Not Found", async () => {
    const res = await app.request("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not Found" });
  });

  it("GET /api/health includes rate-limit headers", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(Number(res.headers.get("X-RateLimit-Remaining"))).toBeGreaterThanOrEqual(0);
    expect(Number(res.headers.get("X-RateLimit-Reset"))).toBeGreaterThan(0);
  });
});

describe("Unauthenticated requests return 401", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth.api, "getSession").mockResolvedValue(null);
  });

  it("GET /api/me returns 401", async () => {
    const res = await app.request("/api/me");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET /api/tasks returns 401", async () => {
    const res = await app.request("/api/tasks");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("POST /api/tasks returns 401", async () => {
    const res = await jsonRequest("/api/tasks", "POST", { title: "Test" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("PATCH /api/tasks/1 returns 401", async () => {
    const res = await jsonRequest("/api/tasks/1", "PATCH", { completed: true });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("DELETE /api/tasks/1 returns 401", async () => {
    const res = await app.request("/api/tasks/1", { method: "DELETE" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("GET /api/users returns 401", async () => {
    const res = await app.request("/api/users");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("PATCH /api/users/user-1/role returns 401", async () => {
    const res = await jsonRequest("/api/users/user-1/role", "PATCH", { role: "admin" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});

describe("Authenticated request validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth.api, "getSession").mockResolvedValue(testSession);
  });

  it.each(["abc", "0", "-1"])(
    "PATCH /api/tasks/%s returns 400 for invalid id param",
    async (id) => {
      const res = await jsonRequest(`/api/tasks/${id}`, "PATCH", {
        completed: true,
      });
      expect(res.status).toBe(400);
    },
  );

  it("DELETE /api/tasks/1.5 returns 400 for non-integer id param", async () => {
    const res = await app.request("/api/tasks/1.5", { method: "DELETE" });
    expect(res.status).toBe(400);
  });

  it("POST /api/tasks rejects empty title and empty object with 400", async () => {
    const emptyTitleRes = await jsonRequest("/api/tasks", "POST", { title: "" });
    expect(emptyTitleRes.status).toBe(400);

    const emptyBodyRes = await jsonRequest("/api/tasks", "POST", {});
    expect(emptyBodyRes.status).toBe(400);
  });

  it("PATCH /api/tasks/1 rejects empty body with 400", async () => {
    const res = await jsonRequest("/api/tasks/1", "PATCH", {});
    expect(res.status).toBe(400);
  });
});

describe("Authenticated route + onError + service integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(auth.api, "getSession").mockResolvedValue(testSession);
  });

  it("GET /api/me returns 200 with { user }", async () => {
    const res = await app.request("/api/me");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; email: string } };
    expect(body.user.id).toBe(testSession.user.id);
    expect(body.user.email).toBe(testSession.user.email);
  });

  it("GET /api/tasks returns 200 with user tasks", async () => {
    const rows = [
      {
        id: 1,
        title: "Task 1",
        completed: false,
        userId: testSession.user.id,
        createdAt: now,
      },
    ];
    const orderBy = vi.fn().mockResolvedValue(rows);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    mockDb.select.mockReturnValue({ from });

    const res = await app.request("/api/tasks");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tasks: Array<{ id: number; title: string }> };
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0]?.title).toBe("Task 1");
  });

  it("POST /api/tasks returns 201 with created task", async () => {
    const created = {
      id: 1,
      title: "New task",
      completed: false,
      userId: testSession.user.id,
      createdAt: now,
    };
    const returning = vi.fn().mockResolvedValue([created]);
    const values = vi.fn().mockReturnValue({ returning });
    mockDb.insert.mockReturnValue({ values });

    const res = await jsonRequest("/api/tasks", "POST", { title: "New task" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { task: { id: number; title: string } };
    expect(body.task.id).toBe(1);
    expect(body.task.title).toBe("New task");
  });

  it("PATCH /api/tasks/1 returns 200 with updated task", async () => {
    const updated = {
      id: 1,
      title: "New task",
      completed: true,
      userId: testSession.user.id,
      createdAt: now,
    };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    const res = await jsonRequest("/api/tasks/1", "PATCH", { completed: true });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { task: { id: number; completed: boolean } };
    expect(body.task.id).toBe(1);
    expect(body.task.completed).toBe(true);
  });

  it("DELETE /api/tasks/1 returns 200 with { ok: true }", async () => {
    const deleted = {
      id: 1,
      title: "New task",
      completed: true,
      userId: testSession.user.id,
      createdAt: now,
    };
    const returning = vi.fn().mockResolvedValue([deleted]);
    const where = vi.fn().mockReturnValue({ returning });
    mockDb.delete.mockReturnValue({ where });

    const res = await app.request("/api/tasks/1", { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("PATCH /api/tasks/999 returns 404 { error: 'Task not found' } via app.onError", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    const res = await jsonRequest("/api/tasks/999", "PATCH", { completed: true });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Task not found" });
  });

  it("DELETE /api/tasks/999 returns 404 { error: 'Task not found' } via app.onError", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    mockDb.delete.mockReturnValue({ where });

    const res = await app.request("/api/tasks/999", { method: "DELETE" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Task not found" });
  });
});

describe("tasksService NotFoundError unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("update throws NotFoundError when update returns empty results", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    await expect(tasksService.update("user-1", 999, { completed: true })).rejects.toThrow(
      new NotFoundError("Task not found"),
    );
  });

  it("remove throws NotFoundError when delete returns empty results", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    mockDb.delete.mockReturnValue({ where });

    await expect(tasksService.remove("user-1", 999)).rejects.toThrow(
      new NotFoundError("Task not found"),
    );
  });
});

describe("Admin user routes (/api/users)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("GET /api/users returns 403 when authenticated as user", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(testSession);

    const res = await app.request("/api/users");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("PATCH /api/users/user-1/role returns 403 when authenticated as user", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(testSession);

    const res = await jsonRequest("/api/users/user-1/role", "PATCH", { role: "admin" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("GET /api/users returns 200 with users when authenticated as admin", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(adminSession);
    const rows = [
      {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        emailVerified: true,
        role: "user",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const orderBy = vi.fn().mockResolvedValue(rows);
    const from = vi.fn().mockReturnValue({ orderBy });
    mockDb.select.mockReturnValue({ from });

    const res = await app.request("/api/users");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: Array<{ id: string; role: string }> };
    expect(body.users).toHaveLength(1);
    expect(body.users[0]?.id).toBe("user-1");
  });

  it("PATCH /api/users/user-1/role returns 200 with updated user when authenticated as admin", async () => {
    vi.spyOn(auth.api, "getSession").mockResolvedValue(adminSession);
    const updated = {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    const res = await jsonRequest("/api/users/user-1/role", "PATCH", { role: "admin" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; role: string } };
    expect(body.user.id).toBe("user-1");
    expect(body.user.role).toBe("admin");
  });
});
