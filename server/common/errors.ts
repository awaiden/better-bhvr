import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Base application error carrying an HTTP status code and optional machine code. */
export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code?: string;

  constructor(status: ContentfulStatusCode, message: string, code?: string) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
  }
}

/** 404 Not Found application error. */
export class NotFoundError extends AppError {
  constructor(message = "Not Found", code?: string) {
    super(404, message, code);
  }
}

/** 400 Bad Request application error. */
export class BadRequestError extends AppError {
  constructor(message = "Bad Request", code?: string) {
    super(400, message, code);
  }
}

/** 401 Unauthorized application error. */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code?: string) {
    super(401, message, code);
  }
}

/** 403 Forbidden application error. */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code?: string) {
    super(403, message, code);
  }
}

/** 429 Too Many Requests application error. */
export class TooManyRequestsError extends AppError {
  constructor(message = "Too Many Requests", code?: string) {
    super(429, message, code);
  }
}

/** Centralized Hono error handler mapping AppError and HTTPException to JSON responses. */
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError || err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
};
