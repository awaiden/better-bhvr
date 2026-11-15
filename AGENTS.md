<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

---

# Project Guide — `better-bhvr`

Full-stack TypeScript application using **Bun**, **Hono**, **Vite+**, **React 19**, **TanStack** (Router, Query, Form, Table), **Drizzle ORM** (PostgreSQL), **Better Auth**, and **shadcn/ui** (`base-nova` + `next-themes`).

## Directory Structure

- `server/` — Hono API backend
  - `server/index.ts` — App entry point (middleware, module route mounting, global `onError`, static serving + SPA fallback, `export type AppType = typeof api`)
  - `server/auth.ts` — Better Auth configuration (`drizzleAdapter`, `rateLimit`, `role` additionalField)
  - `server/common/errors.ts` — `AppError` hierarchy (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `TooManyRequestsError`) and `errorHandler`
  - `server/middleware/` — `auth.ts` (`requireAuth`, `requireRole`, `optionalAuth`) and `rate-limit.ts`
  - `server/db/` — Drizzle client (`index.ts`), app schema (`schema.ts`), Better Auth schema (`auth-schema.ts`)
  - `server/modules/<domain>/` — Domain modules (`*.schema.ts`, `*.service.ts`, `*.routes.ts`, `*.test.ts`)
- `shared/` — Shared Zod schemas (`shared/schemas.ts`) used by both server (`zValidator`) and client (`@tanstack/react-form`)
- `src/` — React frontend (Vite + TanStack Router)
  - `src/routes/_auth/` — Public auth pages (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`)
  - `src/routes/_authenticated/` — Session-guarded pages (`/dashboard`)
  - `src/components/ui/` — shadcn/ui components (`@base-ui/react`)
  - `src/lib/` — `api.ts` (typed `hc<AppType>` client), `auth-client.ts` (Better Auth React client), `utils.ts` (`cn`)

## Architectural Rules

1. **Backend Separation of Concerns**:
   - `*.routes.ts` handles HTTP only (`zValidator("param" | "json", ...)`, status codes, calling service methods). **Never import Drizzle** in `*.routes.ts`.
   - `*.service.ts` contains all Drizzle queries and business logic, independent of Hono `Context`, throwing `AppError` subclasses on failure.
2. **Hono RPC Type Safety**:
   - Always chain `.get().post().patch().delete()` on module Hono routers and chain `.route("/<domain>", <domain>Routes)` on `api` so `export type AppType = typeof api` stays inferred.
3. **Frontend Conventions**:
   - Use `@/*` for `src/*` imports.
   - Use semantic theme tokens (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`) rather than hardcoded color palettes so light/dark modes work.
   - Use `bun run generate-routes` after adding or renaming files under `src/routes/`.

## Common Commands

- `podman compose up -d` (or `docker compose up -d`) — Start local PostgreSQL
- `bun run db:push` — Push Drizzle schema changes
- `bun run dev` — Start Vite+ dev server with Hono API
- `vp lint` — Run Oxlint + TypeScript typecheck
- `vp test run` — Run Vitest suite
- `bun run build` — Build client and server bundles
