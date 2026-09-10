# Panyor Hall of Residence — Hostel Management Platform

Official hostel management system for **Panyor Hall of Residence, Rajiv Gandhi
University (RGU), Rono Hills, Doimukh, Arunachal Pradesh**.

Residents apply online, wardens approve, and the whole hostel runs from one
place: rooms & double-occupancy allotment, mess counter with proxy pickup,
sports-equipment issue/return, complaint triage, notice board, reports, and a
full audit trail — behind a 9-role RBAC matrix with multi-role accounts
(e.g. `STUDENT + PRESIDENT`).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS v4 |
| UI | shadcn/ui (Base UI primitives), Lucide icons |
| Auth | Better Auth (email/password, Drizzle adapter, 7-day sessions) |
| Database | PostgreSQL (Supabase) via Drizzle ORM + postgres.js |
| Storage | Supabase Storage (avatars, attachments) |
| Exports | xlsx, jsPDF + autotable, CSV |
| PWA | Web manifest, generated icons, offline-tolerant service worker |

## Quick start

```bash
pnpm install
cp .env.example .env   # then fill in values (see below)
pnpm drizzle-kit migrate
pnpm db:seed:reference # complaint/equipment categories + mess menu
pnpm db:seed           # super admin account
pnpm dev               # http://localhost:3000
```

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL pooler connection string |
| `BETTER_AUTH_SECRET` | Auth signing secret |
| `BETTER_AUTH_URL` | Public app URL (default `http://localhost:3000`) |
| `TRUSTED_ORIGINS` | Extra comma-separated origins (e.g. LAN URL) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO metadata |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project + anon key |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` | Bootstrap super admin |

Never commit `.env`. Run `scripts/supabase-storage.sql` once in the Supabase
SQL editor to create the four storage buckets + policies (photo upload is
optional and never blocks registration if buckets are missing).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Develop / production build / serve |
| `pnpm typecheck` / `lint` | `tsc --noEmit` / eslint (0 errors enforced) |
| `pnpm db:generate` / `db:migrate` | Generate / apply Drizzle migrations (`drizzle/`) |
| `pnpm db:seed` | Idempotent super-admin bootstrap (re-runnable) |
| `pnpm db:seed:reference` | Idempotent reference data (categories, mess menu) |
| `node scripts/generate-icons.mjs` | Regenerate all PWA icons + navbar mark from one SVG |
| `node scripts/generate-favicon.mjs` | Rebuild `app/favicon.ico` from the same mark |

> `drizzle-kit push` is broken in drizzle-kit 0.31.x (introspection crash);
> always use `generate` + `migrate`.

## Roles & permissions

`STUDENT · CARETAKER · MESS_EMPLOYEE · MESS_COMMITTEE · SPORTS_COMMITTEE ·
PRESIDENT · DEPUTY_WARDEN · WARDEN · SUPER_ADMIN`

- Permissions live in `lib/permissions/rbac.ts` and are enforced **server-side**
  (`lib/auth/server.ts`: `requirePermission` / `requireAnyPermission`), with
  matching `can()` gates in the UI. The System → RBAC Matrix page renders the
  live grid.
- One person, one account, many roles: extra roles live in `user_roles` and
  are granted from System → Administrator Accounts or a student's profile
  drawer (`RoleManager`). Primary roles and `SUPER_ADMIN` are protected.
- New signups start `STUDENT + PENDING` and wait on `/pending` until approved
  at `/admin/students` (approve / reject / suspend are separately permissioned).

## App map

- `/` — public landing (auto-redirects signed-in users to their portal)
- `/signup`, `/login`, `/pending` — 3-step admission wizard (real RGU
  departments → programmes), branded auth, approval waiting room with sign-out
- `/student` — resident portal: home, equipment (+ requests), complaints
  (+ filing), mess (+ proxy delegation), notices
- `/admin` — operations cockpit + students, rooms, equipment, complaints,
  mess, notices, reports/exports (Excel · PDF letterhead · CSV · print),
  audit log, system/RBAC/admin accounts
- `/api/*` — permission-guarded JSON APIs (see route files for shapes)

## Cross-cutting details

- **Data**: every screen reads/writes PostgreSQL; no mock data remains
  (`db/store.ts`, `mock-data.ts`, and `lib/services/*` were deleted).
- **Fetching**: client pages use `hooks/use-api.ts` (`{ data, error, loading, reload }`).
- **PWA**: manifest + icons in `public/icons`, `public/sw.js` (production-only
  registration, never caches `/_next` or auth; v-cache bumps on changes),
  install prompt, and on-device meal-reminder notifications
  (`lib/notifications/local.ts`, no push server needed).
- **Brand**: `components/shared/brand.tsx` (`BrandMark`) is the only logo;
  all imagery regenerates from `scripts/generate-icons.mjs`.
- **SEO**: full metadata + OG/Twitter cards, theme-color viewport, robots
  disallow + empty sitemap (intentional — every screen is auth-gated).
