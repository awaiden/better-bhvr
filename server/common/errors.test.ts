import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  errorHandler,
} from "./errors";

describe("AppError and subclasses", () => {
  it("constructs AppError with status, message, and optional code", () => {
    const err = new AppError(409, "Conflict", "CONFLICT");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(409);
    expect(err.message).toBe("Conflict");
    expect(err.code).toBe("CONFLICT");
    expect(err.name).toBe("AppError");
  });

  it("constructs NotFoundError with 404 status", () => {
    const err = new NotFoundError("Task not found");
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(404);
    expect(err.message).toBe("Task not found");
    expect(err.name).toBe("NotFoundError");
  });

  it("constructs BadRequestError with 400 status", () => {
    const err = new BadRequestError("Invalid input");
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Invalid input");
    expect(err.name).toBe("BadRequestError");
  });

  it("constructs UnauthorizedError with 401 status", () => {
    const err = new UnauthorizedError("Unauthorized");
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
    expect(err.message).toBe("Unauthorized");
    expect(err.name).toBe("UnauthorizedError");
  });

  it("constructs ForbiddenError with 403 status and default message", () => {
    const err = new ForbiddenError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(403);
    expect(err.message).toBe("Forbidden");
    expect(err.name).toBe("ForbiddenError");

    const custom = new ForbiddenError("Admin only", "FORBIDDEN");
    expect(custom.status).toBe(403);
    expect(custom.message).toBe("Admin only");
    expect(custom.code).toBe("FORBIDDEN");
  });

  it("constructs TooManyRequestsError with 429 status and default message", () => {
    const err = new TooManyRequestsError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(429);
    expect(err.message).toBe("Too Many Requests");
    expect(err.name).toBe("TooManyRequestsError");

    const custom = new TooManyRequestsError("Slow down", "RATE_LIMITED");
    expect(custom.status).toBe(429);
    expect(custom.message).toBe("Slow down");
    expect(custom.code).toBe("RATE_LIMITED");
  });
});

describe("errorHandler", () => {
  const createTestApp = () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get("/not-found", () => {
      throw new NotFoundError("Task not found");
    });
    app.get("/bad-request", () => {
      throw new BadRequestError("Bad payload");
    });
    app.get("/unauthorized", () => {
      throw new UnauthorizedError("Missing session");
    });
    app.get("/forbidden", () => {
      throw new ForbiddenError("Access denied");
    });
    app.get("/too-many-requests", () => {
      throw new TooManyRequestsError("Rate limit exceeded");
    });
    app.get("/http-exception", () => {
      throw new HTTPException(403, { message: "Forbidden" });
    });
    app.get("/unexpected", () => {
      throw new Error("Database connection lost");
    });
    return app;
  };

  it("handles AppError subclasses with their status and message", async () => {
    const app = createTestApp();

    const notFoundRes = await app.request("/not-found");
    expect(notFoundRes.status).toBe(404);
    expect(await notFoundRes.json()).toEqual({ error: "Task not found" });

    const badRequestRes = await app.request("/bad-request");
    expect(badRequestRes.status).toBe(400);
    expect(await badRequestRes.json()).toEqual({ error: "Bad payload" });

    const unauthorizedRes = await app.request("/unauthorized");
    expect(unauthorizedRes.status).toBe(401);
    expect(await unauthorizedRes.json()).toEqual({ error: "Missing session" });

    const forbiddenRes = await app.request("/forbidden");
    expect(forbiddenRes.status).toBe(403);
    expect(await forbiddenRes.json()).toEqual({ error: "Access denied" });

    const tooManyRes = await app.request("/too-many-requests");
    expect(tooManyRes.status).toBe(429);
    expect(await tooManyRes.json()).toEqual({ error: "Rate limit exceeded" });
  });

  it("handles Hono HTTPException with its status and message", async () => {
    const app = createTestApp();
    const res = await app.request("/http-exception");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("logs and returns 500 Internal Server Error for unexpected errors", async () => {
    const app = createTestApp();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await app.request("/unexpected");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal Server Error" });
    expect(consoleSpy).toHaveBeenCalledOnce();

    consoleSpy.mockRestore();
  });
});
