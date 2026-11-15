# Frontend & UI Rules

1. **Routing (`src/routes/`)**
   - Public auth flows belong under `src/routes/_auth/` (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`).
   - Session-protected routes belong under `src/routes/_authenticated/`.
   - Run `bun run generate-routes` whenever route files are added, moved, or deleted.

2. **Data Fetching, Forms & Tables**
   - Use `@/lib/api` (`hc<AppType>`) with `@tanstack/react-query` for API calls; scope query keys by `session?.user.id` for user-specific data.
   - Use `@tanstack/react-form` with `shared/schemas.ts` Zod validators for forms.
   - Use `@tanstack/react-table` with `src/components/ui/table.tsx` for data tables.

3. **Styling & Components**
   - Prefer `src/components/ui/*` (shadcn/ui `base-nova` over `@base-ui/react`).
   - Always use semantic CSS variable tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`) so `next-themes` light/dark switching works consistently.
   - Use `@/*` path aliases for `src/*`.
