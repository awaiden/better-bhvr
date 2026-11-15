import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { errorHandler, NotFoundError } from "../../common/errors";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

const mockAuthState = vi.hoisted(() => ({
  user: null as { id: string; email: string; name: string } | null,
}));

vi.mock("../../db", () => ({
  db: mockDb,
  tasks: {
    id: "tasks.id",
    title: "tasks.title",
    completed: "tasks.completed",
    userId: "tasks.user_id",
    createdAt: "tasks.created_at",
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
  };
});

import { taskIdParamSchema } from "./tasks.schema";
import { tasksService } from "./tasks.service";
import { taskRoutes } from "./tasks.routes";

describe("taskIdParamSchema", () => {
  it("coerces positive integer strings to numbers", () => {
    expect(taskIdParamSchema.parse({ id: "42" })).toEqual({ id: 42 });
    expect(taskIdParamSchema.parse({ id: 7 })).toEqual({ id: 7 });
  });

  it("rejects zero, negative, non-integer, and non-numeric values", () => {
    expect(taskIdParamSchema.safeParse({ id: "0" }).success).toBe(false);
    expect(taskIdParamSchema.safeParse({ id: "-3" }).success).toBe(false);
    expect(taskIdParamSchema.safeParse({ id: "1.5" }).success).toBe(false);
    expect(taskIdParamSchema.safeParse({ id: "abc" }).success).toBe(false);
  });
});

describe("tasksService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listByUser returns tasks ordered by createdAt desc", async () => {
    const rows = [{ id: 1, title: "Task 1", completed: false, userId: "u1" }];
    const orderBy = vi.fn().mockResolvedValue(rows);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    mockDb.select.mockReturnValue({ from });

    const result = await tasksService.listByUser("u1");

    expect(result).toEqual(rows);
    expect(mockDb.select).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
    expect(orderBy).toHaveBeenCalledOnce();
  });

  it("create inserts task for user and returns created row", async () => {
    const created = { id: 2, title: "New task", completed: false, userId: "u1" };
    const returning = vi.fn().mockResolvedValue([created]);
    const values = vi.fn().mockReturnValue({ returning });
    mockDb.insert.mockReturnValue({ values });

    const result = await tasksService.create("u1", { title: "New task" });

    expect(result).toEqual(created);
    expect(values).toHaveBeenCalledWith({ title: "New task", userId: "u1" });
    expect(returning).toHaveBeenCalledOnce();
  });

  it("update returns updated task when found", async () => {
    const updated = { id: 3, title: "Updated", completed: true, userId: "u1" };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    const result = await tasksService.update("u1", 3, { completed: true });

    expect(result).toEqual(updated);
    expect(set).toHaveBeenCalledWith({ completed: true });
    expect(where).toHaveBeenCalledOnce();
  });

  it("update throws NotFoundError when no row is returned", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    await expect(tasksService.update("u1", 999, { completed: true })).rejects.toThrow(
      new NotFoundError("Task not found"),
    );
  });

  it("remove returns deleted task when found", async () => {
    const deleted = { id: 4, title: "Gone", completed: false, userId: "u1" };
    const returning = vi.fn().mockResolvedValue([deleted]);
    const where = vi.fn().mockReturnValue({ returning });
    mockDb.delete.mockReturnValue({ where });

    const result = await tasksService.remove("u1", 4);

    expect(result).toEqual(deleted);
    expect(where).toHaveBeenCalledOnce();
  });

  it("remove throws NotFoundError when no row is returned", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    mockDb.delete.mockReturnValue({ where });

    await expect(tasksService.remove("u1", 999)).rejects.toThrow(
      new NotFoundError("Task not found"),
    );
  });
});

describe("taskRoutes", () => {
  const createApp = () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.route("/tasks", taskRoutes);
    return app;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuthState.user = { id: "u1", email: "u1@example.com", name: "User 1" };
  });

  it("rejects unauthenticated requests with 401", async () => {
    mockAuthState.user = null;
    const app = createApp();

    const res = await app.request("/tasks");
    expect(res.status).toBe(401);
  });

  it("GET /tasks returns user tasks", async () => {
    const listSpy = vi
      .spyOn(tasksService, "listByUser")
      .mockResolvedValue([
        { id: 1, title: "A", completed: false, userId: "u1", createdAt: new Date(0) },
      ]);
    const app = createApp();

    const res = await app.request("/tasks");
    expect(res.status).toBe(200);
    expect(listSpy).toHaveBeenCalledWith("u1");
    const body = (await res.json()) as { tasks: Array<{ id: number; title: string }> };
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0]?.title).toBe("A");
  });

  it("POST /tasks validates payload and returns 201", async () => {
    const createSpy = vi.spyOn(tasksService, "create").mockResolvedValue({
      id: 10,
      title: "Write tests",
      completed: false,
      userId: "u1",
      createdAt: new Date(0),
    });
    const app = createApp();

    const badRes = await app.request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });
    expect(badRes.status).toBe(400);

    const res = await app.request("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Write tests" }),
    });
    expect(res.status).toBe(201);
    expect(createSpy).toHaveBeenCalledWith("u1", { title: "Write tests" });
  });

  it("PATCH /tasks/:id validates param & body and maps NotFoundError to 404", async () => {
    const updateSpy = vi
      .spyOn(tasksService, "update")
      .mockRejectedValueOnce(new NotFoundError("Task not found"))
      .mockResolvedValueOnce({
        id: 5,
        title: "Updated",
        completed: true,
        userId: "u1",
        createdAt: new Date(0),
      });
    const app = createApp();

    const badParam = await app.request("/tasks/abc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    expect(badParam.status).toBe(400);

    const badBody = await app.request("/tasks/5", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(badBody.status).toBe(400);

    const notFound = await app.request("/tasks/999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    expect(notFound.status).toBe(404);
    expect(await notFound.json()).toEqual({ error: "Task not found" });

    const ok = await app.request("/tasks/5", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    expect(ok.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith("u1", 5, { completed: true });
  });

  it("DELETE /tasks/:id validates param and returns { ok: true } or 404", async () => {
    const removeSpy = vi
      .spyOn(tasksService, "remove")
      .mockRejectedValueOnce(new NotFoundError("Task not found"))
      .mockResolvedValueOnce({
        id: 5,
        title: "Done",
        completed: true,
        userId: "u1",
        createdAt: new Date(0),
      });
    const app = createApp();

    const badParam = await app.request("/tasks/0", { method: "DELETE" });
    expect(badParam.status).toBe(400);

    const notFound = await app.request("/tasks/999", { method: "DELETE" });
    expect(notFound.status).toBe(404);
    expect(await notFound.json()).toEqual({ error: "Task not found" });

    const ok = await app.request("/tasks/5", { method: "DELETE" });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true });
    expect(removeSpy).toHaveBeenCalledWith("u1", 5);
  });
});
