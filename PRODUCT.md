# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Full-stack TypeScript developers starting a new web application from a production-ready template.

## Product Purpose

Enable developers to clone and ship a full-stack web application on Bun, Hono, React, Drizzle ORM, and Better Auth without manually wiring authentication, end-to-end typed RPC, database schemas, or baseline CRUD flows. Success means a developer can go from repository setup to a working, type-safe, authenticated app with minimal boilerplate.

## Positioning

Combines end-to-end Hono RPC type safety (`hc<AppType>`), Better Auth with PostgreSQL via Drizzle ORM, TanStack (Router, Query, Form, Table), and Vite+ in a single cohesive template with modular server boundaries (`*.schema.ts`, `*.service.ts`, `*.routes.ts`).

## Operating Context

- Local development runs via `bun run dev` (`vp dev`) backed by PostgreSQL (`podman compose up -d` / `docker compose up -d`) and Drizzle Kit (`bun run db:push`).
- Verification runs via `vp lint` (Oxlint + TypeScript typecheck), `vp test run` (Vitest), and `bun run build`.
- Includes public routes (`/`, `/about`, `/status`), auth routes (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`), and an authenticated task dashboard (`/dashboard`).

## Capabilities and Constraints

- **Stack & Architecture**: Bun, Hono, Vite+, React 19, TanStack Router/Query/Form/Table, Drizzle ORM (PostgreSQL), Better Auth, and shadcn/ui (`base-nova` + `next-themes`).
- **Preserved Flows**: Email/password sign-in, sign-up, email verification, password reset, role-based access control (`user` / `admin`), and the authenticated task CRUD dashboard.
- **Backend Boundaries**: Routes handle HTTP validation and status codes only without importing Drizzle; services own Drizzle queries and business logic; `AppType` RPC inference must remain intact.
- **Theming**: Light and dark mode support via `next-themes` and semantic theme tokens.

## Brand Commitments

- Preserve the `better-bhvr` project name.

## Evidence on Hand

- Working reference implementation in `server/`, `shared/schemas.ts`, and `src/routes/` (landing RPC demo, auth flows, and authenticated task dashboard).
- No external customer testimonials, benchmarks, or pricing claims exist; future surfaces must not fabricate them.

## Product Principles

1. **Zero-boilerplate readiness**: Auth, RPC type safety, rate limiting, and database persistence work out of the box.
2. **End-to-end type safety**: Changes to Zod schemas and Hono routes propagate directly to the React client without manual codegen.
3. **Clean separation of concerns**: HTTP routing, business logic/persistence, and shared validation schemas stay strictly separated.
4. **Accessible by default**: Interactive flows and views maintain keyboard navigation and WCAG AA contrast across light and dark modes.

## Accessibility & Inclusion

- WCAG AA accessibility compliance and full light/dark theme support.
