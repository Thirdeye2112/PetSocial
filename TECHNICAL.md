# PetSocial — Technical Overview

> A social voice-chat app where pet owners connect microphones near their animals so the pets can "talk" to each other across species-grouped live audio channels.

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [Stack & Key Dependencies](#2-stack--key-dependencies)
3. [Routing & Proxy Architecture](#3-routing--proxy-architecture)
4. [Database Schema](#4-database-schema)
5. [REST API](#5-rest-api)
6. [WebSocket Signaling Protocol](#6-websocket-signaling-protocol)
7. [WebRTC Voice Pipeline](#7-webrtc-voice-pipeline)
8. [Authentication (Clerk)](#8-authentication-clerk)
9. [Subscription & Trial System (Stripe)](#9-subscription--trial-system-stripe)
10. [AI Animal Companions](#10-ai-animal-companions)
11. [Web App — Key Pages & Components](#11-web-app--key-pages--components)
12. [Mobile App (Expo)](#12-mobile-app-expo)
13. [Shared Libraries](#13-shared-libraries)
14. [Dev Workflow](#14-dev-workflow)
15. [Known Limitations & Technical Debt](#15-known-limitations--technical-debt)

---

## 1. Monorepo Structure

```
petsocial/
├── artifacts/
│   ├── animal-chat/          # Web app   — React 19 + Vite 7  (serves at /)
│   ├── animal-chat-mobile/   # Mobile    — Expo / React Native (serves at /mobile)
│   ├── api-server/           # API + WS  — Express 5           (serves at /api, /ws)
│   └── mockup-sandbox/       # Internal  — Vite component sandbox (dev only)
├── lib/
│   ├── api-spec/             # OpenAPI 3.1 YAML — source of truth for API contract
│   ├── api-client-react/     # Generated React Query hooks  (from Orval)
│   ├── api-zod/              # Generated Zod schemas        (from Orval)
│   └── db/                   # Drizzle ORM schema + db client
├── scripts/                  # Utility scripts (@workspace/scripts)
├── pnpm-workspace.yaml       # Catalog pins, overrides, package discovery
├── tsconfig.base.json        # Shared strict TS defaults
└── tsconfig.json             # Solution file — composite libs only
```

**Package naming**: all workspace packages use the `@workspace/` prefix.  
**TypeScript model**: `lib/*` packages are composite and emit declarations; `artifacts/*` are leaf packages checked with `--noEmit`.

---

## 2. Stack & Key Dependencies

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Package manager | pnpm (workspaces) |
| Language | TypeScript 5.9 (strict) |
| Web framework | React 19 + Vite 7 |
| Mobile framework | Expo SDK + React Native |
| API framework | Express 5 |
| Database | PostgreSQL (Replit-managed) + Drizzle ORM |
| Validation | Zod v4 + drizzle-zod |
| API codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| Data fetching | TanStack React Query v5 |
| Routing (web) | Wouter v3 |
| Auth | Clerk (Replit connector proxy) |
| Payments | Stripe (Replit connector) |
| Styling | Tailwind CSS v4 |
| Build | esbuild (CJS bundle for API server) |
| Real-time | WebSocket (ws library) — signaling only |
| Voice | WebRTC (browser-native) |
| Audio synthesis | Web Audio API (AI companions) |

---

## 3. Routing & Proxy Architecture

All traffic enters through a **shared Replit reverse proxy** on port 80 that routes by path prefix (most-specific-first). Each artifact declares its own paths in `.replit-artifact/artifact.toml`.

```
User browser / mobile
        │
        ▼
   Replit proxy :80
   ├── /api/*   → api-server  (Express, REST)
   ├── /ws      → api-server  (WebSocket upgrade)
   └── /*       → animal-chat (Vite dev server / static build)

Expo app
   └── $REPLIT_EXPO_DEV_DOMAIN  (bypasses shared proxy)
```

**Rules for application code:**
- Use relative URLs in the web app — the proxy handles cross-service routing automatically.
- Never hardcode port numbers; each artifact reads `process.env.PORT`.
- Do not add Vite proxy configs; the shared proxy already forwards `/api` and `/ws`.

---

## 4. Database Schema

Managed by Drizzle ORM in `lib/db/`. Schema is pushed to PostgreSQL with `pnpm --filter @workspace/db run push`.

### `channels`
```sql
id              TEXT PRIMARY KEY
name            TEXT NOT NULL
category_id     TEXT NOT NULL           -- "birds" | "dogs" | "cats"
description     TEXT
participant_count INTEGER DEFAULT 0    -- kept in sync by WS server on join/leave
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### `activity`
```sql
id           TEXT PRIMARY KEY
channel_id   TEXT NOT NULL
channel_name TEXT NOT NULL
category_id  TEXT NOT NULL
action       TEXT NOT NULL              -- "join" | "leave" | "created"
created_at   TIMESTAMPTZ DEFAULT now()
```

### `user_stripe`
```sql
clerk_user_id        TEXT PRIMARY KEY   -- Clerk userId
stripe_customer_id   TEXT               -- Stripe Customer object ID
stripe_subscription_id TEXT             -- Stripe Subscription object ID
created_at           TIMESTAMPTZ DEFAULT now()
```

### `user_trial`
```sql
clerk_user_id       TEXT PRIMARY KEY    -- Clerk userId
total_seconds_used  INTEGER DEFAULT 0   -- cumulative seconds spent in any channel
session_started_at  TIMESTAMPTZ         -- NULL when no active session
created_at          TIMESTAMPTZ DEFAULT now()
```

---

## 5. REST API

Base path: `/api`. Defined in `lib/api-spec/openapi.yaml`. Regenerate client with:
```bash
pnpm --filter @workspace/api-spec run codegen
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/healthz` | Health check |
| GET | `/api/categories` | List all animal categories |
| GET | `/api/categories/:categoryId/channels` | Channels in a category |
| GET | `/api/channels` | All channels |
| POST | `/api/channels` | Create a channel |
| GET | `/api/channels/:channelId` | Channel detail |
| DELETE | `/api/channels/:channelId` | Delete a channel |
| GET | `/api/stats` | Global stats (channel counts, active users) |
| GET | `/api/stats/activity` | Recent join/leave activity feed |
| GET | `/api/usage/trial` | Trial status for the authenticated user |
| POST | `/api/usage/trial/start` | Mark trial session start |
| POST | `/api/usage/trial/stop` | Accumulate elapsed seconds, clear session |
| POST | `/api/stripe/checkout` | Create Stripe Checkout session (returns URL) |
| GET | `/api/stripe/subscription` | Check active subscription status |
| POST | `/api/stripe/webhook` | Stripe webhook handler |

### Animal Categories (static, defined in `channels.ts`)

```ts
const CATEGORIES = [
  { id: "birds", name: "Birds",  icon: "🦜", description: "Chirps, tweets, and tropical calls" },
  { id: "dogs",  name: "Dogs",   icon: "🐕", description: "Barks, howls, and friendly woofs" },
  { id: "cats",  name: "Cats",   icon: "🐱", description: "Meows, purrs, and mysterious trills" },
];
```

> Farm and Wild categories exist in the AI companion + sound synthesis code but do **not** have active channels yet.

---

## 6. WebSocket Signaling Protocol

Path: `/ws`. Implemented in `artifacts/api-server/src/lib/websocket.ts`.

The server is a **WebRTC signaling relay** — it never processes audio itself. Every connected client is identified by a random `peerId`.

### Message types (JSON, client → server)

```ts
{ type: "join",      channelId: string, peerId: string }
{ type: "offer",     to: string,        from: string,  sdp: RTCSessionDescriptionInit }
{ type: "answer",    to: string,        from: string,  sdp: RTCSessionDescriptionInit }
{ type: "ice",       to: string,        from: string,  candidate: RTCIceCandidateInit }
{ type: "leave",     channelId: string, peerId: string }
```

### Message types (server → client)

```ts
{ type: "peers",     peers: string[] }           // list of existing peers on join
{ type: "peer_joined", peerId: string }           // new peer entered the channel
{ type: "peer_left",   peerId: string }           // peer disconnected
{ type: "full" }                                   // channel at 4-person cap
{ type: "offer" | "answer" | "ice" }              // relayed 1:1 from another peer
```

### Channel cap enforcement

- **Authoritative gate**: the in-memory `rooms` Map (`Map<channelId, Set<peerId>>`). A join is rejected with `{ type: "full" }` if `rooms.get(channelId).size >= 4`.
- **DB sync (fire-and-forget)**: on join, `UPDATE channels SET participant_count = LEAST(participant_count + 1, 4)`; on leave (or disconnect), `GREATEST(participant_count - 1, 0)`. This keeps the REST API participant counts accurate for the channel list UI.

---

## 7. WebRTC Voice Pipeline

Implemented in `artifacts/animal-chat/src/hooks/use-webrtc.ts` (web) and the equivalent mobile hook.

### Audio filter

On join, the browser captures the microphone then passes audio through a Web Audio API **high-pass biquad filter at 3 kHz**. Frequencies below 3 kHz (human speech range) are attenuated; animal sounds (chirps, squeaks, high-pitched barks) pass through. The filtered `MediaStreamDestination` output is what gets sent to remote peers.

```
getUserMedia() → AudioContext → BiquadFilter(highpass, 3000 Hz) → MediaStreamDestination → RTCPeerConnection tracks
```

### Connection mesh

Full peer-to-peer mesh up to the 4-person cap. On join, the server sends the new peer the list of existing peers. The new peer initiates offers to all of them; each existing peer responds with an answer. ICE candidates are relayed through the signaling server.

### STUN only

No TURN server is configured. Works on most networks; may fail behind symmetric NAT. ICE server: `stun:stun.l.google.com:19302`.

### Mute / filter toggle

The `useWebRTC` hook exposes `isMuted` and `isFilterActive` state. Mute replaces the audio track with silence; disabling the filter sends the raw microphone stream instead of the filtered one.

---

## 8. Authentication (Clerk)

- **Provider**: Clerk, configured through the Replit integration connector (`app_3D8ZqEsxsf8pVtz0SPZzqG4QQSS`).
- **Web**: `@clerk/clerk-react` wraps the entire app. `ClerkProvider` is at the root. `useAuth()` / `useUser()` hooks are used throughout. Sign-in and sign-up modals are embedded inline with custom localization strings ("Join PetSocial", "Sign in to your PetSocial account").
- **Mobile**: `@clerk/clerk-expo` with token cache via `expo-secure-store`. Dedicated sign-in (`/sign-in`) and sign-up (`/sign-up`) screen routes.
- **API server auth**: The Express server reads the Clerk `userId` from the `x-clerk-user-id` header (set by the Replit Clerk proxy — no JWT validation needed server-side in dev; in production this is verified by the proxy).
- **Guest access**: Channel browsing and listening to AI companions works without auth. Auth is required to: create channels, use the microphone, and access subscription/trial features.

---

## 9. Subscription & Trial System (Stripe)

### Overview

Every authenticated user gets a **4-hour (14,400 second) free trial** across all sessions. After the trial expires, a paywall modal blocks channel entry. Subscribing at **$5/month** removes the restriction.

### Trial tracking flow

```
User enters channel
    → POST /api/usage/trial/start      (sets session_started_at = now())
    → Client polls or checks on leave

User leaves channel (or tab closes)
    → POST /api/usage/trial/stop       (adds elapsed seconds to total_seconds_used, clears session_started_at)

Client-side
    → useTrialTimer hook reads remaining = 14400 - total_seconds_used
    → Timer badge in channel room UI turns red when < 600 seconds (10 min) remain
    → On expiry: paywall modal opens, WebRTC connection is dropped
```

### Subscription flow

```
User clicks "Upgrade" (header) or paywall CTA
    → POST /api/stripe/checkout         (creates Stripe Checkout session)
    ← { url: "https://checkout.stripe.com/..." }
    → Client redirects to Stripe-hosted checkout

Stripe webhook (POST /api/stripe/webhook)
    → checkout.session.completed        → upsert user_stripe row with customerId + subscriptionId
    → customer.subscription.deleted     → clear subscriptionId from user_stripe
```

### Subscription check

```
GET /api/stripe/subscription
← { hasSubscription: boolean, customerId?: string }
```

The server queries `user_stripe` by `clerkUserId`, then calls `stripe.subscriptions.retrieve()` to confirm the subscription is still `active` or `trialing`.

### Stripe config

- **Connector ID**: `ccfg_stripe_01K611P4YQR0SZM11XFRQJC44Y` (Replit managed)
- **Product**: "PetSocial Pro" — created lazily on first checkout if no `priceId` env var is set
- **Price**: $5.00/month recurring (USD)
- **Webhook secret**: stored in environment via Replit secrets

---

## 10. AI Animal Companions

When a user enters a channel that has **0 real participants**, an AI companion appears automatically. The companion uses the **Web Audio API** only — no speech synthesis, no external API calls.

### Companions by category

| Category | Name | Emoji |
|---|---|---|
| Birds | Rio | 🦜 |
| Dogs | Buddy | 🐕 |
| Cats | Mittens | 🐱 |
| Farm | Daisy | 🐄 |
| Wild | Leo | 🦁 |

### Sound synthesis

Implemented in `artifacts/animal-chat/src/lib/animal-sounds.ts` (web) and `artifacts/animal-chat-mobile/hooks/animalSounds.ts` (mobile).

Each category has 3–5 sound patterns synthesized from oscillators, noise generators, and envelopes:

- **Birds**: cockatiel-style chirp sweep (sine oscillator, frequency glide 1.2 kHz → 2.4 kHz)
- **Dogs**: bark (sawtooth burst + lowpass) + howl (sine glide) + whimper (tremolo sine)
- **Cats**: meow (sine glide + vibrato) + purr (low-frequency tremolo) + trill + hiss (bandpass noise)
- **Farm**: moo (sine 80 Hz glide) + cluck (noise burst) + oink (wobble) + neigh (frequency sweep)
- **Wild**: roar (noise + sub-bass) + growl (low tremolo) + howl (sine sweep)

### Autoplay policy compliance

The companion is initialized but silent until the user's **first tap/click** on the page (required by browser autoplay policy). After unlock, sounds repeat on a random 7–19 second interval.

The hook (`useAICompanion`) exposes: `isActive`, `companionName`, `companionEmoji`, and `unlock()` (called on user gesture).

---

## 11. Web App — Key Pages & Components

**Stack**: React 19, Vite 7, Wouter routing, Tailwind CSS v4, shadcn/ui components, TanStack React Query.

### Routes

| Path | Component | Notes |
|---|---|---|
| `/` | `HomePage` | Category grid + live stats + activity feed |
| `/categories/:categoryId` | `CategoryPage` | Channel list for a species |
| `/channels/:channelId` | `ChannelPage` | Live voice room |
| `/subscribe` | `SubscribePage` | Stripe checkout entry point |

### Key hooks

| Hook | Purpose |
|---|---|
| `useWebRTC(channelId)` | Full WebRTC + WS signaling lifecycle |
| `useAICompanion(category, isAlone)` | AI companion audio control |
| `useTrialTimer()` | Polls trial time remaining, triggers paywall |
| `useSubscription()` | Checks active Stripe subscription status |

### Header

Always visible. Shows: PetSocial logo, "Only animal sounds allowed" badge, Sign in / Sign up buttons (unauthenticated) or user avatar + **Upgrade** button (authenticated, no active subscription).

---

## 12. Mobile App (Expo)

**Stack**: Expo SDK, React Native, Expo Router (file-based), Clerk Expo, `expo-secure-store`, `@expo/vector-icons`.

### Screens

```
app/
├── (tabs)/
│   ├── index.tsx       — Channel browse (categories → channels)
│   └── profile.tsx     — User profile, sign-in CTA if unauthenticated
├── channel/[id].tsx    — Voice room (mirrors web ChannelPage)
├── sign-in.tsx         — Clerk email/password sign-in
└── sign-up.tsx         — Clerk registration
```

### Feature parity with web

- Channel listing and joining ✅
- WebRTC voice via WebSocket signaling ✅
- AI companion sounds (Web Audio via Expo AV) ✅
- Clerk auth ✅
- Trial timer and paywall ✅
- Stripe checkout (opens external browser) ✅

### Notable differences

- No high-pass audio filter on mobile (the Web Audio API filter chain is web-only; raw mic audio is sent).
- Expo dev server is accessed via `$REPLIT_EXPO_DEV_DOMAIN`, not the shared proxy.

---

## 13. Shared Libraries

### `@workspace/api-spec`
- Single file: `openapi.yaml`
- Contains the canonical REST API contract (OpenAPI 3.1)
- Running `pnpm --filter @workspace/api-spec run codegen` regenerates both `api-client-react` and `api-zod`

### `@workspace/api-client-react`
- Generated by Orval from the OpenAPI spec
- Exports TanStack React Query hooks: `useListCategories`, `useListChannels`, `useGetChannel`, `useCreateChannel`, `useGetStats`, `useGetRecentActivity`, etc.

### `@workspace/api-zod`
- Generated by Orval from the OpenAPI spec
- Exports Zod schemas for all request/response shapes: `channelSchema`, `categorySchema`, `statsSchema`, etc.
- Used server-side for input validation in Express route handlers

### `@workspace/db`
- Drizzle ORM schema + database client
- Exports: `db` (Drizzle client), `channelsTable`, `activityTable`, `userStripeTable`, `userTrialTable`, all insert schemas and TypeScript types
- `DATABASE_URL` environment variable required at runtime

---

## 14. Dev Workflow

### Starting services

Services are managed as **Replit Workflows** (not `pnpm dev` at root):

| Workflow | Command | Port |
|---|---|---|
| `artifacts/animal-chat: web` | `pnpm --filter @workspace/animal-chat run dev` | `$PORT` |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | `$PORT` |
| `artifacts/animal-chat-mobile: expo` | `pnpm --filter @workspace/animal-chat-mobile run dev` | Expo tunneled |

### Type checking

```bash
pnpm run typecheck          # full check — builds libs, then checks all leaf packages
pnpm run typecheck:libs     # lib packages only (composite build)
pnpm --filter @workspace/animal-chat run typecheck   # single package
```

### Database migrations

```bash
pnpm --filter @workspace/db run push    # push schema changes to dev DB (no migration files)
```

### API code generation

```bash
pnpm --filter @workspace/api-spec run codegen   # re-generate hooks + Zod schemas from openapi.yaml
```
Run this any time `openapi.yaml` is changed.

### Environment variables / secrets

Managed through the Replit Secrets panel. Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Express session signing
- `STRIPE_SECRET_KEY` — injected by Replit Stripe connector
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signature verification
- `STRIPE_PRICE_ID` — optional; lazy-created if absent
- `VITE_CLERK_PUBLISHABLE_KEY` — injected by Replit Clerk connector
- `CLERK_SECRET_KEY` — injected by Replit Clerk connector

---

## 15. Known Limitations & Technical Debt

| Area | Issue |
|---|---|
| TURN server | No TURN server configured — calls may fail behind symmetric NAT |
| Mobile audio filter | High-pass filter not applied on mobile; human voice can pass through |
| Participant count | DB `participant_count` can drift if server crashes mid-session (fire-and-forget sync) |
| Farm/Wild channels | Sound synthesis and companion code exists for Farm and Wild categories but no channels are seeded |
| WebSocket auth | The WS upgrade does not verify the Clerk session — any client can join any channel by guessing a `channelId` |
| Trial stop on crash | If the browser tab is killed without firing `beforeunload`, `trial/stop` is never called; next `trial/start` will calculate elapsed time from the stale `session_started_at` (partial protection) |
| No TURN / relay | Audio calls are direct P2P; no fallback for restrictive firewalls |
| Orval `queryKey` type | Generated hooks in `category.tsx` / `channel.tsx` have a minor TS `queryKey` type mismatch (pre-existing, non-blocking at runtime) |
