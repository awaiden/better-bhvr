# better-bhvr

Full-stack TypeScript template built with **Bun**, **Hono**, **Vite+**, **React 19**, **TanStack** (Router, Query, Form, Table), **Drizzle ORM** (PostgreSQL), **Better Auth**, and **shadcn/ui** (`next-themes` + `sonner`).

## Features

- **Modular Hono Backend (`server/`)**: Domain modules (`server/modules/tasks`, `server/modules/users`), centralized `AppError` handling (`server/common/errors.ts`), Zod request/param validation, rate limiting, and RBAC (`requireAuth`, `requireRole`, `optionalAuth`).
- **End-to-End Typed RPC**: `export type AppType = typeof api` consumed by `hc<AppType>` in `src/lib/api.ts`.
- **Authentication (`server/auth.ts` & `src/routes/_auth/`)**: Better Auth with PostgreSQL Drizzle adapter, email & password sign-in/sign-up, email verification, and password reset.
- **Protected Dashboard (`src/routes/_authenticated/dashboard.tsx`)**: Authenticated task CRUD with TanStack Query, TanStack Form + Zod, and TanStack Table.
- **UI & Theming**: Tailwind CSS v4, shadcn/ui (`base-nova`), `next-themes` light/dark toggle, and `sonner` toasts.

## Getting Started

1. **Install dependencies**

   ```bash
   bun install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Set `BETTER_AUTH_SECRET` to a random 32+ character string (e.g. `openssl rand -base64 32`).

3. **Start PostgreSQL and push the schema**

   ```bash
   podman compose up -d   # or: docker compose up -d
   bun run db:push
   ```

4. **Run the development server**

   ```bash
   bun run dev
   ```

## Scripts

- `bun run dev` — Start Vite+ dev server with Hono API
- `bun run build` — Build client and server bundles into `dist/`
- `bun run start` — Run the production server (`dist/index.js`)
- `vp lint` — Run Oxlint + TypeScript typecheck
- `vp test run` — Run Vitest test suite
- `bun run db:generate` / `bun run db:migrate` / `bun run db:push` / `bun run db:studio` — Drizzle Kit commands
