# CLAUDE.md

Read [AGENTS.md](./AGENTS.md) and [DESIGN.md](./DESIGN.md) for project architecture, conventions, and verification commands.

Key rules:

- Use `vp` (Vite+) commands (`vp lint`, `vp test run`, `bun run build`) instead of raw `eslint`/`jest`.
- Keep Hono backend modules layered (`server/modules/<domain>/*.{schema,service,routes}.ts`) with method chaining to preserve `AppType`.
- Keep Drizzle queries inside `*.service.ts`, never in `*.routes.ts`.
