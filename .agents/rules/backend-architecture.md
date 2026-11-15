# Backend Architecture Rules

1. **Domain Modules (`server/modules/<domain>/`)**
   - `*.schema.ts`: Zod schemas for params, query, and payloads (or re-export from `shared/schemas.ts`).
   - `*.service.ts`: Pure TypeScript service functions/classes owning all Drizzle queries and business logic. Must not import `hono` `Context`; throw `AppError` subclasses (`NotFoundError`, `ForbiddenError`, `BadRequestError`, etc.) from `server/common/errors.ts`.
   - `*.routes.ts`: Hono controller layer using `zValidator("param" | "json", ...)` and calling the service. Must not import `drizzle-orm` or `server/db`.

2. **Hono RPC Preservation**
   - Define routes using method chaining (`new Hono().get(...).post(...)`) and mount them onto `api` via chained `.route("/<path>", <module>Routes)` so `export type AppType = typeof api` remains inferred.

3. **Auth, RBAC & Rate Limiting**
   - Protect routes with `requireAuth` and `requireRole(...roles)` from `server/middleware/auth.ts`; use `optionalAuth` for public routes that personalize when a session exists.
   - Apply `rateLimit` from `server/middleware/rate-limit.ts` to `/api/*` routes.

4. **Error Handling**
   - Let `app.onError(errorHandler)` handle `AppError` and unexpected errors uniformly. Do not duplicate `try/catch` or manual `404` JSON responses in route handlers.
