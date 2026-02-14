# Copilot Instructions - forigen-casa

## Project Overview

Next.js + Supabase MVP for in-office attendance capture system (no offline support). Uses Row Level Security (RLS) and Edge Functions for critical flows.

**Stack**: Next.js 15.5, React 18, TypeScript, Supabase (Postgres + Auth), Tailwind CSS, Deno (Edge Functions)

## Build, Test, and Lint

```bash
# Frontend (in web/ directory)
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint

# Edge Functions (from project root)
supabase functions deploy alta_rapida_asistencia
supabase functions deploy search_curp
supabase functions deploy link_beneficiario_sede
```

No test suite configured.

## Architecture

### Authentication & Authorization

- **Auth Flow**: Supabase Auth handles authentication. Custom `app_user` table maps auth users to roles and sedes.
- **Roles**: `admin`, `supervisor_central`, `coordinador_sede`, `facilitador`
- **RLS Enforcement**: All tables have RLS enabled. Admin/supervisor see all data; coordinador/facilitador only see their assigned `sede`.
- **Session Management**: `UserContext` (client) centralizes user state. `middleware.ts` refreshes session cookies on every request and redirects unauthenticated users to `/login`.
- **Protected Routes**: Use `<Protected>` component wrapper to enforce authentication. Use `<Role allow={['admin', 'supervisor_central']}>` for role-based rendering.

### Database Design

- **Core Tables**: `sede`, `programa`, `actividad`, `beneficiario`, `asistencia`, `app_user`
- **Denormalized RLS**: `sede_id` is redundantly stored in `actividad` and `asistencia` (auto-populated via triggers) to simplify RLS policies.
- **Helper Functions**: `is_admin_or_supervisor()`, `user_sede_id()`, `user_role()` are used within RLS policies. These are `SECURITY DEFINER` to avoid recursion.
- **CURP Handling**: Normalized to uppercase via trigger. Nullable (for provisional beneficiarios without CURP). Unique index when not NULL.
- **Dates/Times**: Stored as local (no timezone) per MVP requirements.

### Edge Functions

Three critical flows run via Deno Edge Functions (use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS):

1. **`alta_rapida_asistencia`**: Registers attendance for an activity. Creates beneficiario if not exists (by CURP or provisional), links to sede, records attendance (idempotent).
2. **`search_curp`**: Global CURP search returning minimal beneficiario data.
3. **`link_beneficiario_sede`**: Links existing beneficiario to a sede.

### Frontend Structure

- **App Router**: Next.js 15 app directory structure (`src/app/`)
- **Client State**: `UserContext` provides `user`, `appUser` (role, sede), and `loading` state to all components. Avoids duplicate auth queries.
- **Supabase Clients**:
  - `supabaseClient.ts`: Browser client with `@supabase/ssr`
  - `supabaseServer.ts`: Server-side client for SSR/middleware
- **Middleware**: Protects all routes except `/login` and static files. Refreshes session on every request (critical for Vercel serverless).

## Key Conventions

### Code Style

- **Indent**: 2 spaces (enforced by `.editorconfig`)
- **Line Endings**: LF
- **TypeScript**: Strict mode enabled

### Naming Patterns

- Database tables/columns: `snake_case`
- TypeScript/React: `camelCase` for variables, `PascalCase` for components
- Edge Function names: `snake_case` matching directory names

### Supabase Patterns

- **RLS First**: Never query tables directly without considering RLS. Admin/supervisor queries use helper functions; coordinador/facilitador queries automatically filter by `sede_id`.
- **Avoid RLS Recursion**: Helper functions (`user_role()`, etc.) are `SECURITY DEFINER` and query `app_user` table. Do NOT add RLS policies to `app_user` that call these same functions.
- **Triggers for Consistency**: Use triggers (`trg_actividad_set_sede`, `trg_asistencia_set_sede`, `trg_curp_upper`) to maintain data consistency. Don't rely on client-side logic for critical constraints.
- **Service Role in Edge Functions**: Edge Functions use service role key to bypass RLS. Be explicit about security checks within the function logic.

### React/Next.js Patterns

- **"use client" Directives**: Required for components using hooks (`useState`, `useEffect`, `useRouter`, `UserContext`). Server components by default.
- **UserContext Usage**: Import `useAuth()` hook instead of directly calling `supabase.auth.getUser()` to avoid duplicate queries:
  ```tsx
  import { useAuth } from "../context/UserContext";
  const { user, appUser, loading } = useAuth();
  ```
- **Protected Pages**: Wrap page content with `<Protected>` component, not entire layout (layout should render shell/navbar).
- **Role-Based Rendering**: Use `<Role allow={['role1', 'role2']}>` for conditional UI. Check role in `appUser.role` when logic needed.

### Environment Variables

- Required for build: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Edge Functions need: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (injected by Supabase CLI)
- See `web/.env.example` for template

### Styling

- **Tailwind Config**: Custom design system with brand colors, animations, and component classes (`.glass`, `.btn-xs`, `.scrollbar-thin`, etc.)
- **Color Palette**: `brand` (primary indigo), `secondary` (blue), `accent` (orange), `success`, `warning`, `error`, `gray`
- **Custom Font**: Inter (system fallback)
- **Animation**: Extensive custom keyframes for fade-in, slide, scale effects

### Performance & Stability

- **Transaction Pooler**: Use Supabase port 6543 (not 5432) for serverless (Vercel) to avoid connection exhaustion.
- **UserContext**: Centralizes auth state to reduce duplicate queries (prevents 3x load on dashboard).
- **No Polling**: Removed interval-based version checks to reduce network overhead.
- **Indexing**: Critical columns (`app_user.auth_user_id`, foreign keys) have indexes. Check `SUGERENCIAS_INFRAESTRUCTURA.md` for performance checklist.

## Database Schema Notes

- **Sedes**: Pre-seeded in `seed.sql`. Each has `slug` for URL routing and `nombre` for display.
- **Programs vs Projects**: UI uses "Proyectos" but DB table is `programa` (routes redirect `/programas` → `/proyectos`).
- **No Evidence/Reports**: MVP excludes file uploads and reporting features (noted in README).

## Deployment

- **Frontend**: Vercel (import `web/` directory)
- **Backend**: Supabase (US-West region preferred)
- **First Deploy**:
  1. Create Supabase project, run `schema.sql` → `seed.sql`
  2. Deploy edge functions via Supabase CLI
  3. Create admin user in Supabase Auth, run SQL to assign role
  4. Deploy Next.js app to Vercel with env vars

## Common Tasks

### Adding a new role-protected page
1. Create page in `src/app/yourpage/page.tsx`
2. Wrap content with `<Protected>` for auth
3. Use `<Role allow={['admin']}>` for role-specific sections
4. Import `useAuth()` if you need user/role data in logic

### Modifying RLS policies
1. Edit `supabase/schema.sql`
2. Test locally if possible
3. Apply via Supabase SQL Editor (or migration file)
4. **Critical**: Avoid recursion—don't call `user_role()` from tables that `user_role()` queries

### Adding a new Edge Function
1. Create directory under `edge/` with `index.ts`
2. Use Deno imports (esm.sh for npm packages)
3. Deploy: `supabase functions deploy <name>`
4. Access from frontend via `supabase.functions.invoke('<name>')`
