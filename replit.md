# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `lib/supabase` (`@workspace/supabase`)

Shared Supabase client package. Exports `supabase` (a `SupabaseClient`) and TypeScript types (`Hotel`, `Neighborhood`) for use in server-side scripts.

- `src/index.ts` — creates client from `SUPABASE_URL` + `SUPABASE_ANON_KEY` env vars
- Used by `@workspace/scripts` for data queries/tests
- **Mobile app** uses its own client at `artifacts/mobile/lib/supabase.ts` (reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` inlined by Metro bundler)

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

- `test-supabase.ts` — live connection test against `stay_neighborhoods` and `v_stay_neighborhoods_with_hotels`

## The Lucky Trip — Mobile App (`artifacts/mobile`)

Expo React Native app (SDK 54) with dark glassmorphism aesthetic for Rio de Janeiro travel content.

### Design System
- Colors: Cream `#F5F0E8`, Terracotta `#C4704A`, Gold `#C9A84C`, Dark Brown `#2C1810`
- Typography: Playfair Display (400/600/700) + Inter (400/500/600/700)
- Background: always `#0A0502` / `#100A06` fullscreen
- `boxShadow` everywhere (not `shadow*`); `pointerEvents` in style not as prop
- Web insets: 67px top, 34px bottom; native uses `useSafeAreaInsets()`

### Key Files
- `components/RioMapView.tsx` — platform-aware interactive map: web=Leaflet.js iframe (CartoDB dark tiles, no API key), native=react-native-maps; 11 clickable neighborhood markers + 3 visual-only; postMessage communication with parent
- `components/RioMapViewNative.tsx` — native MapView implementation with Marker components (lazy-loaded by RioMapView)
- `lib/supabase.ts` — mobile Supabase client (`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`); exports `Hotel` and `Neighborhood` types
- `hooks/useNeighborhoods.ts` — fetches `v_stay_neighborhoods_with_hotels` (active, ordered)
- `hooks/useHotel.ts` — fetches a single hotel by UUID from the view

### Supabase Tables Used
- `stay_neighborhoods` — neighborhood details (name, slug, identity_phrase, my_view, how_to_live, best_for_*, nightlife, gastronomy, scenery, walkable, safety_solo_woman, etc.)
- `v_stay_neighborhoods_with_hotels` — view joining neighborhoods + their hotels array; 26 hotels across 11 neighborhoods for Rio de Janeiro

### Route Structure
- `(tabs)/` — 5-tab navigator
- `ondeFicar/[id].tsx` — hotel list screen with live Supabase data, interactive RioMapView, floating NeighborhoodCard on selection, filtered hotel list
- `ondeFicar/hotel/[hotelId].tsx` — hotel detail screen (full my_view, how_to_enjoy, reserve_url, Google Maps link)
- `ondeFicar/bairro/[slug].tsx` — neighborhood editorial detail (my_view, how_to_live, stat pills, Ver hospedagens CTA)
- `oQueFazer/[id].tsx`, `comerBem/[id].tsx` — activities + dining screens (mock data)

### Environment Variables (Mobile)
- `EXPO_PUBLIC_SUPABASE_URL` — passed via dev script from `$SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — passed via dev script from `$SUPABASE_ANON_KEY`
