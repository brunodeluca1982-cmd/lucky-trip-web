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

### Design System — Image-Driven (updated)
- **Zero brown** — all brown/cream colors fully removed from the entire codebase
- TEXT: white `#FFFFFF` (primary), `rgba(255,255,255,0.80)` (secondary), `rgba(255,255,255,0.45)` (muted)
- ACCENT: gold `#D4AF37` — sparingly (badges, icons, tab active state, key CTAs)
- OVERLAYS: pure black `rgba(0,0,0,x)` — never colored overlays
- GLASS CARDS: `rgba(255,255,255,0.08–0.14)` background + `rgba(255,255,255,0.15)` border
- BACKGROUNDS: real destination/hero images with dark black overlay; `constants/colors.ts` `background = "transparent"`
- Tab bar: light blur (iOS) / white (web/Android); active tint `#D4AF37`; inactive `rgba(255,255,255,0.45)`
- Typography: Playfair Display (400/600/700) + Inter (400/500/600/700)
- `boxShadow` everywhere (not `shadow*`); `pointerEvents` in style not as prop
- Web insets: 67px top, 34px bottom; native uses `useSafeAreaInsets()`
- Screens with ImageBackground: `perfil.tsx` (`rio-aerial-clean.png`), `lucky.tsx` (`lapa.png`)

### IMAGE RULE — Unified Entity Image Resolution
Two resolvers form the complete image system. Every entity MUST use one of them — no bare `require()` for entities.

#### 1. `getNeighborhoodImage(name)` — `data/neighborhoodImages.ts`
Single source of truth for neighborhood → image. Returns Wikipedia Commons URI (Tier 2) or local asset (Tier 3).

Files using this resolver:
- `data/lugares.ts` — all 32+ LUGARES_LUCKY entries
- `data/mockData.ts` — destaques, oQueFazer, oQueFazerPorMomento, segredos, curadoPara
- `data/agoraContent.ts` — AGORA_CONTENT, FALLBACK_CONTENT, DESTAQUE_PRINCIPAL
- `app/essencial/[id].tsx` — CLASSICOS_RIO cards
- All 4 bairro detail pages (via `getNeighborhoodHero()` in `utils/neighborhoodHero.ts`)

#### 2. `getImageForEntity(type, name, localizacao?, supabaseUrl?)` — `utils/getImageForEntity.ts`
4-tier resolver for restaurants, hotels, cities, activities, and any future entities.
- **Tier 1**: Supabase `photo_url` / `image_url` (always wins when present)
- **Tier 2**: Curated Wikipedia Commons permalink (entity-specific map in the resolver)
- **Tier 3**: `getNeighborhoodImage(localizacao)` — contextually correct, never random
- **Tier 4**: Local asset fallback bundled in the app

Module-level cache (`Map`) ensures same entity → same image on every render.

Files using this resolver:
- `data/mockData.ts` — `restaurantes`, `hoteis`, all non-Rio `destinos` (Lisboa, Buenos Aires, Paris, etc.)
- `app/comerBem/[id].tsx` — restaurant card image with full Supabase → entity → neighborhood → local chain
- `app/comerBem/bairro/[bairroNome].tsx` — same

Exempt (use bundled hero assets directly — permanent brand images):
- `destinos` Rio, Santorini, Kyoto entries → `hero-rio.png`, `hero-santorini.png`, `hero-kyoto.png`
- `influencers` avatars → placeholder until Supabase real photos available
- `roteiros` covers → editorial-only, manually curated

Neighborhood map (defined in `data/neighborhoodImages.ts`):
- Ipanema / Leblon / Arpoador → `ipanema.png`
- Corcovado / Santa Teresa / Cosme Velho → `cristo.png`
- Botafogo / Urca → `pao-acucar.png`
- Lapa / Centro → `lapa.png`
- Jardim Botânico / Lagoa → `secret2.png`
- Floresta da Tijuca / Barra da Tijuca / São Conrado → `secret1.png`
- Copacabana / Leme → `hero-rio.png`

### Key Files
- `components/OndeFicarMap.tsx` — premium editorial aerial map for the Onde Ficar screen; uses `assets/images/rio-aerial-clean.png` (2340×1440 aerial photo, left-aligned); 11 invisible Pressable hotspots with editorial text labels; spring zoom/pan animation on neighborhood tap; dim overlay; floating "← Voltar" and badge pills
- `components/MapZoneOverlay.tsx` — zone-based interactive map used by `oQueFazer` and `comerBem` screens (portrait satellite image + 7 zone hotspots); DO NOT modify
- `lib/supabase.ts` — mobile Supabase client (`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`); exports `Hotel` and `Neighborhood` types
- `hooks/useNeighborhoods.ts` — fetches `v_stay_neighborhoods_with_hotels` (active, ordered)
- `hooks/useHotel.ts` — fetches a single hotel by UUID from the view
- `assets/images/rio-aerial-clean.png` — clean Rio aerial photo (5.75MB, 2340×1440) used by OndeFicarMap

### Supabase Tables Used
- `stay_neighborhoods` — neighborhood details (name, slug, identity_phrase, my_view, how_to_live, best_for_*, nightlife, gastronomy, scenery, walkable, safety_solo_woman, etc.)
- `v_stay_neighborhoods_with_hotels` — view joining neighborhoods + their hotels array; 26 hotels across 11 neighborhoods for Rio de Janeiro
- `restaurantes` — integer PK (`id`). Confirmed columns: `id, nome, bairro, especialidade, categoria, photo_url, meu_olhar, google_maps_url, instagram, perfil_publico, ativo, ordem_bairro`. NOT in table: `tipo_de_cozinha, preco_nivel`. Legacy string IDs (e.g., "colombo") must be guarded with `isNaN(Number(id))` before querying.
- `o_que_fazer_rio` — UUID PK. Confirmed columns: `id, nome, bairro, categoria, tags_ia, momento_ideal, vibe, energia, duracao_media`. Use `select("*")` for safety.
- `lucky_list_rio` — UUID PK. 22 items. Confirmed working columns (use `select("*")`): `id, nome, bairro, tipo, photo_url, tags_ia, momento_ideal`. NOT in table: `ai_tags, melhor_horario, energia, vibe`.

**CRITICAL**: Always use `select("*")` in mobile client for these tables — any explicit column that doesn't exist causes a 400 error that silently returns null (no data rendered). The edge function confirmed which columns exist.

### AI Architecture — Canonical Rules

**STRICT RULE: Supabase is the source of truth for all AI. Replit never "thinks" — it only orchestrates.**

#### AI Provider
- **Default**: Gemini 2.0 Flash (`GEMINI_API_KEY` in Supabase secrets)
- **Fallback adapter**: OpenAI GPT-4o-mini (only if `GEMINI_API_KEY` absent)
- **To switch**: Change `callAI()` in `lucky-concierge/index.ts` — all call sites unchanged

#### Roteiro Planner (`supabase/functions/generate-itinerary`)
Called by `roteiro/index.tsx` via `supabase.functions.invoke("generate-itinerary")`. Client-side fallback: `utils/buildItinerary.ts` + `utils/buildRoteiro.ts`.

**7 pipeline steps:**
1. **Enrich**: Read `o_que_fazer_rio`, `lucky_list_rio`, `restaurantes` from Supabase by saved item IDs
2. **Neighborhood meta**: Attach `stay_neighborhoods` (walkable, safety_solo_woman, better_for)
3. **Classify periodo**: Hard signals from `momento_ideal`, tags, energia, duracao — beach→tarde, restaurant→almoco, nightlife→noite, high-energy→manha
4. **3b – Preference score**: `inspirations` × tag affinity; `budget` × especialidade/perfil_publico signals; `travelVibe` × perfil_publico — soft re-ranking before clustering (never hard-excludes)
5. **Geographic cluster**: Sub-zones (sul_beach/sul_inland/sul_bridge/centro/oeste/norte) + travel minutes matrix
6. **Build draft**: Slot assignments with morning load-balancer; nearest-neighbor proximity sort within periods
7. **Gemini refinement**: Receives fully-built draft — may ONLY reorder within each período; cannot add/remove/move items
8. **Validate**: Re-attach any dropped items

**Preferences used (all four):** `vibe` (pace), `inspirations` (tag affinity), `budget` (sofisticado/essencial/conforto), `travelVibe` (companion type)

#### Lucky Concierge (`supabase/functions/lucky-concierge`)
Called by `lucky.tsx` via direct fetch. Intent routing → Supabase table queries → Gemini (no invented data).

**FROZEN (never touch):** `create-checkout`, `stripe-webhook`, `stripe.ts`, `subscription.tsx`, `post-purchase.tsx`

### Transport Guide — "Como chegar" (`transporte_rio`)

- **Supabase table `transporte_rio`**: 9 transport options for Rio (GIG/SDU airports, Uber/99, taxi, BRT, metrô, VLT, ferry, car rental). Columns: `id, modo (enum), nome, descricao, custo_estimado, tempo_estimado, dica_lucky, disponibilidade, ordem, ativo`. RLS: public read enabled.
- **Screen**: `app/comoChegar/[cityId].tsx` — dark premium design, groups by transport mode, gold dica_lucky tips. Registered in `_layout.tsx` as `comoChegar/[cityId]`.
- **Hook**: `hooks/useTransporte.ts` — fetches `transporte_rio` from Supabase filtering `ativo = true`, ordered by `ordem`.
- **Entry point**: "Como chegar" button in `cidade/[id].tsx` navigates to `/comoChegar/rio`.

### Photo Enrichment

- **`enrich-entity-photos` edge function**: batch enriches `photo_url` columns via Google Places API → caches to `place_photos` → writes back to entity tables. Coverage: 26/26 hotels, 20/22 lucky list, 42/42 activities, 33/35 restaurants.
- **`v_stay_neighborhoods_with_hotels` view**: includes `photo_url`, `google_maps_url`, `lat`, `lng` in hotel JSON. `Hotel` type in `lib/supabase.ts` has `photo_url: string | null`.
- **Photo priority chain**: entity `photo_url` → `place_photos` cache → Google Places API → neighborhood image fallback.
- **`stay_hotels` IMPORTANT**: `slug_trigger` was DROPPED (broken). `active` column (not `ativo`).
- **`ondeFicar/hotel/[hotelId].tsx`**: hero image now reads `hotel.photo_url` as primary source via `getImageForEntity` 4th param.

### AI — Gemini 2.0 Flash

- Both `lucky-concierge` and `generate-itinerary` edge functions use Gemini 2.0 Flash (model: `gemini-2.0-flash`). OpenAI fallback adapter retained in `lucky-concierge`.
- `generate-itinerary` Step 3b: soft preference re-ranking using `inspirations`, `budget`, and `travelVibe` signals before final assembly.

**Dead (not called by anyone):** `supabase/functions/lucky-trip-ai` — kept for reference, do not redeploy

---

### Itinerary Generation (Gemini + Supabase)

`POST /api/friend/generate-itinerary` — endpoint in `artifacts/api-server/src/routes/friend-itinerary.ts`

- Body: `{ "guide_slug": "rio-carol-dieckmann" }`
- Reads `friend_guides` + `friend_guide_places` from Supabase (anon key)
- Sends structured prompt to Gemini (`gemini-2.5-flash`) requesting 3-day itinerary in JSON
- Validates all returned `place_id`s against real Supabase IDs (rejects invented ones)
- Deletes any existing `friend_guide_itinerary_items` for that guide, then inserts new rows
- Uses `SUPABASE_SERVICE_ROLE_KEY` for writes (bypasses RLS), `AI_INTEGRATIONS_GEMINI_BASE_URL/API_KEY` for Gemini
- Returns: `{ ok, guide_slug, guide_id, days_generated, items_saved, itinerary }`

To regenerate the Carol Dieckmann itinerary:
```bash
curl -X POST https://$REPLIT_DEV_DOMAIN/api/friend/generate-itinerary \
  -H "Content-Type: application/json" \
  -d '{"guide_slug": "rio-carol-dieckmann"}'
```

### Route Structure
- `(tabs)/` — 5-tab navigator
- `friend/[slug].tsx` — friend editorial profile page: hero (fallback to local image when photo_url null), "AMIGO DA LUCKY TRIP" eyebrow, Playfair name, guide cards from `v_friend_guides_cards`; navigates to `friend/guide/[slug]`
- `friend/guide/[slug].tsx` — friend curated guide: header with tagline/title/subtitle/stats, collapsible intro_text, places organized by `curation_dimension` (hotel→"Onde Ficar", gastronomy→"Onde Comer", nightlife→"Para a Noite"); each place card shows name, bairro, category chip, highlight star, and `meu_olhar` personal note; data from `v_friend_guides_cards` + `friend_guide_places`
- `ondeFicar/[id].tsx` — hotels map screen (RioMapView); tap neighborhood → navigates directly to bairro page; all hotels always visible in scrollable list below; no floating card
- `ondeFicar/hotel/[hotelId].tsx` — hotel detail screen (full my_view, how_to_enjoy, reserve_url, Google Maps link)
- `ondeFicar/bairro/[slug].tsx` — neighborhood detail: hero + "Ver X hotéis" + "Por dentro do bairro" toggle; collapsible editorial; hotel list
- `comerBem/[id].tsx` — restaurants map screen (RioMapView); tap neighborhood → navigates to comerBem/bairro/; all restaurants always shown below
- `comerBem/bairro/[bairroNome].tsx` — neighborhood restaurants: hero + action buttons + collapsible editorial + filtered Supabase restaurants
- `oQueFazer/[id].tsx` — activities map screen (RioMapView); tap neighborhood → navigates to oQueFazer/bairro/; all activities shown below
- `oQueFazer/bairro/[bairroNome].tsx` — neighborhood activities: hero + action buttons + collapsible editorial + filtered mock data
- `luckyList/[id].tsx` — Lucky List map screen; tap neighborhood → navigates to luckyList/bairro/; gold branding preserved
- `luckyList/bairro/[bairroNome].tsx` — neighborhood Lucky picks: hero + gold action buttons + collapsible editorial + filtered picks

### Neighborhood Flow (all 4 sections)
Map tap → navigate directly to bairro page (no floating card). Bairro pages have:
1. Hero image (destino.image, 46% screen height)
2. Neighborhood name + identity_phrase (if Supabase neighborhood found)
3. Two CTA buttons: primary "Ver X [items]" (scroll to list) + ghost "Por dentro do bairro" (toggle editorial)
4. Collapsible editorial: my_view + how_to_live tips + stat pills (only shown when button pressed)
5. Filtered items list for that neighborhood

### Environment Variables (Mobile)
- `EXPO_PUBLIC_SUPABASE_URL` — passed via dev script from `$SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — passed via dev script from `$SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_PLACES_KEY` — optional; enables Google Places Autocomplete in ReplaceSheet search (degrades gracefully when missing)

### Save + Trip System (Roteiro Base)

**Data model** (local, AsyncStorage-backed):
- `SavedItem` — `{ id, categoria, titulo, localizacao (=bairro), image }` — stored at `@luckytrip/saved_v1`
- `Viagem` — `{ id, nome, destino, created_at }` — one auto-created default viagem per device
- `ViagemItem` — `{ viagem_id, item_id, tipo, bairro }` — derived in-memory from saved list

**Context**: `context/GuiaContext.tsx` — exposes `{ saved, save, unsave, isSaved, viagem, viagemItens, isPremium, deviceId, markPremium, paywallVisible, paywallType, showPaywall, hidePaywall }`. Persists `saved` to AsyncStorage on every change. Loads on mount. `isPremium` loaded from `@luckytrip/lucky_premium_v2` (AsyncStorage fast path) + Supabase `access_levels` table (authoritative).

**Save gating**: non-premium users get 1 free save; 2nd+ attempt fires the depth paywall modal. The `save()` function returns `boolean` (false if gated).

**Grouping logic**: `utils/buildRoteiro.ts` — pure `buildRoteiro(items: SavedItem[]): DiaRoteiro[]`
- Groups by `localizacao` (bairro) → each bairro = one day
- Within each bairro: atividades (oQueFazer + lucky) → 1st half→Manhã / 2nd half→Tarde; restaurantes → 1st→Almoço / rest→Noite; hotels excluded from timetable
- Hotel-only bairros are skipped entirely
- Day numbers are sequential in bairro insertion order

**Display**: `viagem.tsx` — `RoteiroSection` renders below the saved chips; shows `DIA N — Bairro` cards with Manhã/Almoço/Tarde/Noite periodo blocks. Only appears when at least one atividade or restaurante is saved.

**Save entry points**:
- `lugar/[cityId]/[placeId].tsx` — bookmark button on detail screen (all categories)
- `luckyList/[id].tsx` — "Salvar" button on each lucky pick card (toggles Salvar↔Salvo with gold fill)
- `luckyList/bairro/[bairroNome].tsx` — same "Salvar" button in neighborhood lucky picks view

### Roteiro AI Flow (roteiro/index.tsx)

**Entry routing**:
- Home CTA "Criar roteiro" → `/roteiro` (full flow, 2 pages)
- Viagem "Criar roteiro com IA" → `/roteiro` (no saved) or `/roteiro?contextual=1` (has saved items, skips destination field)

**Journey phases** — all use dark cinematic background (ipanema.png + dark gradient overlay):
- `journey`: 2-page `TripFlow` component (full-page scrollable, no modal)
  - `FlowPage1`: destination search (optional via contextual param) + arrival/departure date fields + inline calendar
  - `FlowPage2`: 6-card inspiration image grid + vibe pills + budget pills → triggers generation
- `loading`: animated loading card (glassmorphism)
- `result`: itinerary with hotel card + day timeline + share/edit

**Inspiration types** (utils/buildItinerary.ts): `gastronomy | culture | beach | adventure | lucky | natureza | festa`

**INSPIRATIONS_DATA** (FlowPage2 image cards):
- natureza→rio-aerial-clean.png, gastronomy→restaurante1.png, culture→cristo.png
- adventure→pao-acucar.png, beach→ipanema.png, festa→lapa.png

**ReplaceSheet**: Supabase curated suggestions + Google Places Autocomplete (600ms debounce, 3+ chars query, requires `EXPO_PUBLIC_GOOGLE_PLACES_KEY`).

### Premium Paywall System

**GuiaContext** (`context/GuiaContext.tsx`) is the authoritative premium state hub:
- `isPremium` — loaded from AsyncStorage `@luckytrip/lucky_premium_v2` (fast path) then Supabase `access_levels` table (authoritative; `plan_type` in `["premium","vip"]` + `access_until` in future)
- `deviceId` — persistent UUID from `utils/deviceId.ts`
- `markPremium()` — sets `isPremium=true` + writes to AsyncStorage (called on post-purchase)
- `showPaywall(type)` / `hidePaywall()` — controls global `PaywallModal`

**PaywallModal** (`components/PaywallModal.tsx`):
- Global modal rendered in `(tabs)/_layout.tsx` above all tab content
- 3 types: `"discovery"` (Lucky List locked items), `"lucky"` (AI limit), `"depth"` (save 2nd+ place)
- All CTAs navigate to `/subscription`; "Prefere ajuda humana?" (lucky type) goes to Lucky screen

**Subscription screen** (`app/(tabs)/subscription.tsx`, hidden from tab bar):
- Annual plan (highlighted, "Mais escolhido" + "Economize 40%", R$19,90/mês / R$97/ano)
- Monthly plan (R$29,90/mês)
- Weekly link at bottom (R$9,90)
- CTA calls `POST /api/stripe/checkout` (Bearer JWT auth) — server builds absolute success_url from REPLIT_DOMAINS fallback
- "Já sou assinante — Restaurar acesso" link calls `GET /api/stripe/sync-subscription` to heal missed provisioning

**Post-purchase screen** (`app/(tabs)/post-purchase.tsx`, hidden from tab bar):
- Calls `GET /api/stripe/verify-session?session_id=...` (Bearer JWT) → provisions `app_metadata` in Supabase
- "Você agora é Lucky Pro" — lists unlocked benefits
- CTA → Lucky List; secondary → home

**Premium check chain** (authoritative field: `user.app_metadata.plan_type === "premium"`):
- `GuiaContext.checkPremiumStatus()` — calls `supabase.auth.getUser()` on: user change, app foreground, manual restore
- `access_until = null` → treated as lifetime (never expires); explicit ISO date → checked against `new Date()`

### Stripe Webhook Setup (manual, required for production)

The API server handles all Stripe webhooks at `POST /api/stripe/webhook`. Without a webhook, premium is only provisioned via `verify-session` (post-purchase) or `sync-subscription` (restore).

**To register the webhook in the Stripe Dashboard:**
1. Go to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://<YOUR_REPLIT_DEV_DOMAIN>/api/stripe/webhook`
   - Find your domain in the Replit workspace URL bar (e.g. `abc123.replit.dev`) — this is the `REPLIT_DEV_DOMAIN` env var
4. Select these events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret → add as `STRIPE_WEBHOOK_SECRET` env var in Replit Secrets

**Emergency provisioning** (for users who paid but aren't recognized):
```bash
cd artifacts/api-server && node scripts/provision-user.mjs <supabase_user_id>
```
This script writes `app_metadata.plan_type = "premium"` directly via the Supabase admin API.

**Lucky List locking** (`app/(tabs)/luckyList/[id].tsx`):
- `FREE_ITEMS = 3`: first 3 picks visible to all; items 4+ are locked for non-premium
- Locked state: dimmed image (opacity 0.35), centered lock badge + "Toque para desbloquear"
- Locked body: generic text; gold "Desbloquear" CTA triggers `showPaywall("discovery")`

**Lucky AI paywall** (`app/(tabs)/lucky.tsx`):
- FREE_LIMIT = 2 questions; 3rd attempt shows in-chat paywall card
- Title: "Você chegou muito perto" / CTA: "Desbloquear agora" → `/subscription`
- Secondary: "Prefere ajuda humana?" (small link)

**Save gating** (`context/GuiaContext.tsx`):
- `save(item)` returns `boolean` — false if gated; non-premium can save 1 place free; 2nd+ triggers depth paywall automatically
