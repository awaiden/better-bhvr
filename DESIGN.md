# System & UI Design — `better-bhvr`

## Architecture Overview

```
Browser (React 19 + TanStack Router / Query / Form / Table + shadcn/ui)
  ├── /api/auth/*  ──▶ Better Auth (email/password, verification, rateLimit, RBAC role)
  └── /api/*       ──▶ Hono API (rateLimit → requireAuth / requireRole → *.routes.ts → *.service.ts)
                          └── Drizzle ORM ──▶ PostgreSQL (compose.yaml)
```

## Backend Layers

| Layer      | Location                   | Responsibility                                                                                    |
| :--------- | :------------------------- | :------------------------------------------------------------------------------------------------ |
| Entry      | `server/index.ts`          | Global `onError`, rate limiting, auth mount, chained `/api` modules, static assets + SPA fallback |
| Middleware | `server/middleware/`       | `requireAuth`, `requireRole`, `optionalAuth`, `rateLimit`                                         |
| Errors     | `server/common/errors.ts`  | `AppError` subclasses (`400`, `401`, `403`, `404`, `429`) and `errorHandler`                      |
| Modules    | `server/modules/<domain>/` | `*.schema.ts` (Zod), `*.service.ts` (Drizzle + logic), `*.routes.ts` (HTTP + `zValidator`)        |
| Database   | `server/db/`               | `postgres` client + Drizzle `schema.ts` & `auth-schema.ts`                                        |

## Authentication & RBAC

- **Provider**: Better Auth (`server/auth.ts`) backed by PostgreSQL (`user`, `session`, `account`, `verification`).
- **Roles**: `user.role` (`"user" | "admin"`, default `"user"`), enforced by `requireRole(...roles)`.
- **Admin Endpoints**: `GET /api/users` and `PATCH /api/users/:id/role` under `server/modules/users/`.
- **Origin & Rate Limiting**: `trustedOrigins` allows `localhost:*` / `127.0.0.1:*` in dev and `BETTER_AUTH_URL` / `TRUSTED_ORIGINS` in production; `rateLimit` protects `/api/*` and `/api/auth/*`.

## UI & Design Tokens

- **Component System**: shadcn/ui (`base-nova` preset, `neutral` palette, `@base-ui/react` primitives, `lucide-react` icons).
- **Typography**: `Geist Variable` (`@fontsource-variable/geist`) configured in `src/styles.css`.
- **Theming**: `next-themes` (`attribute="class"`, `defaultTheme="system"`) toggled via `ThemeToggle` in `src/routes/__root.tsx`. All views use semantic CSS tokens (`--background`, `--foreground`, `--card`, `--muted`, `--border`, `--destructive`).
- **Feedback**: `sonner` (`<Toaster />`) for mutation and auth notifications.
