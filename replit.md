# Workspace

## Overview

pnpm workspace monorepo using TypeScript. DarePool — a full-stack mobile-first dark-mode web app where users compete to complete dares for a prize pool. Production-ready with PostgreSQL, real accounts, JWT auth, Stripe payments, and full 48-hour dare lifecycle with automatic payouts.

## Architecture

- **Frontend** (`artifacts/dare-pool`) — React + Vite, port from `PORT` env var (default 24106 in dev)
- **API Server** (`artifacts/api-server`) — Express 5, port 8080, serves all routes under `/api`
- Vite proxies `/api` → `localhost:8080` in dev

## iOS / Capacitor Preparation (Complete)

- Capacitor installed: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`
- `capacitor.config.ts` — appId: `com.darepool.app`, webDir: `dist/public`
- `vite.capacitor.config.ts` — standalone build config (no Replit env deps, `base: "./"`)
- Build scripts: `build:capacitor`, `cap:sync`, `cap:ios`, `cap:run`
- `index.html` — iOS meta tags: `viewport-fit=cover`, `apple-mobile-web-app-capable`, `theme-color`
- `src/index.css` — iOS CSS: 16px inputs (no zoom), safe areas, tap highlight, overscroll
- `src/lib/iap.ts` — Apple IAP placeholder service with full integration checklist
- `Store.tsx` — clear comments separating Stripe (wallet/dares) from digital goods (future IAP)
- `ios-assets/icons/` and `ios-assets/splash/` — asset size guides
- `IOS_PREP.md` — comprehensive prep guide at project root
- Still needed on macOS: `npx cap add ios`, Xcode signing, app icons, Apple IAP products

## DarePool Features

- **Auth**: Real email/password accounts with bcrypt hashing + JWT stored in `localStorage`
- **Dare lifecycle**: 48h timer, funding from wallet, submissions, voting, automatic expiration processing
- **Payout split**: 80% to winner, 10% to dare creator, 10% to platform — all processed server-side
- **Pool transfer**: If dare expires with no valid submissions, 100% transfers to best eligible active dare (highest prizePool, ≥6h remaining). Funders get notified.
- **Entries**: Submit via video file upload only (up to 200MB, served from `/api/uploads`)
- **Votes**: One vote per user per dare, no self-voting, enforced server-side
- **Funding**: `POST /api/dares/:id/fund` — deduct from wallet, add to prizePool, tracked in poolContributions table
- **Expiration engine**: `closeExpiredDares()` lazily runs on GET /dares and GET /dares/:id. Idempotent — re-entrant safe via status check.
- **Wallet**: Stripe Checkout deposits, Stripe Connect withdrawals; balances in cents
- **Notifications**: Funders notified when pool transfers; winners notified on payout
- **Reports**: Reason + details, stored in DB, admin can dismiss or action
- **Comments**: Dare-level and entry-level comments with slur/threat blocking
- **User profiles**: Stats page at `/profile/:id` showing wins, entries, dares posted
- **Admin dashboard**: `/admin` (admin-only) — reports queue, dare management, user banning
- **Reels**: TikTok-style full-screen vertical video feed of all entry uploads
- **Fairness**: Unique constraints on votes; 409 on duplicate entry/vote; 403 on self-vote; dare creator can't submit to own dare

## Dare Status Values

- `active` — live, accepting funding/submissions/votes
- `completed` — winner selected, payouts distributed
- `expired_no_submissions` — ended with no valid entries (possible admin review)
- `transferred` — pool moved to another active dare (transferredToDareId set)
- `reported` — flagged for moderation
- `removed` — removed by admin

## Pages

- `/` — Home feed with Hot/Trending/Recent tabs, boosted dare section, smart labels (Hot/Trending/New/Ending Soon/Boosted)
- `/create` — Create dare form (deducts initial prizePool from wallet)
- `/dare/:id` — Dare detail: fund button, submit entry, vote, payout breakdown, transfer status
- `/store` — In-app store: profile badges ($0.99–$9.99) + dare boosts ($1.99–$9.99); accessed via sparkles icon in navbar
- `/reels` — TikTok-style full-screen vertical entry video feed
- `/wallet` — Balance, Stripe deposit/withdraw
- `/notifications` — Dare completion and pool transfer notifications with read/unread state
- `/leaderboard` — Past dares, hall of fame, total votes
- `/profile/:id` — User profile with stats and activity + gear icon → Settings when viewing own profile
- `/admin` — Admin dashboard (requires `isAdmin=true`)
- `/settings` — Settings hub (Instagram/TikTok-style grouped sections)
- `/settings/account` — Account Information: email, display name, bio, joined date, legal acceptance status, delete account
- `/settings/security` — Change password flow (server-side validated + bcrypt hashed)
- `/settings/privacy` — Privacy controls: private account, comment privacy, hide earnings, allow boosts
- `/settings/notifications` — Notification toggles for all event types, persisted to DB
- `/settings/payments` — Wallet balance snapshot + shortcuts to wallet/withdraw
- `/settings/content` — Video autoplay/mute/data saver, language, theme prefs
- `/settings/support` — Report a Problem (support tickets to DB) + FAQ accordion + legal links
- `/settings/about` — App version, legal links, logout
- `/settings/blocked` — Blocked users list with unblock action
- `/legal/terms` — Full Terms of Service (exact provided text)
- `/legal/guidelines` — Full Community Guidelines (exact provided text)
- `/legal/privacy` — Full Privacy Policy (exact provided text)
- `/legal/safety` — Full Safety & Risk Disclaimer (exact provided text)

## Feed Scoring (client-side, `Home.tsx`)

- **Hot score** = `recentFundingDollars × 1.5 + recentFunderCount × 6 + entryCount × 2`
  - "Hot" label shows on top 25% of active dares by hot score
- **Trending score** = `prizePool × 0.5 + entryCount × 10 + voteCount × 5 + recentFunderCount × 8 + commentCount × 2`
  - "Trending" label shows on top 30% of active dares by trending score
- **Recent** = sorted by `createdAt` descending (newest first)
- **Boosted** dares always appear in a dedicated section above tabs, sorted by tier (24h > 10h > 2h), then by longest remaining time. Max 3 shown.

## Store System

- **Boost tiers**: tier1=$1.99/2h, tier2=$4.99/10h, tier3=$9.99/24h — deducted from wallet
- **Badges**: bronze=$0.99, silver=$2.99, gold=$4.99, premium=$9.99 — deducted from wallet, stored in `user_badges`
- **Boosts** stored in `boosts` table with `status=active/expired/canceled` and `endsAt` timestamp
- Boost ordering: tier3 > tier2 > tier1 → then by `endsAt` desc
- Expired boosts stop affecting feed automatically (queries filter `endsAt > now()`)
- Admin can inspect active boosts at `GET /api/boosts/active`

## Key API Routes

- `GET /api/dares` — list with entryCount, new status fields
- `GET /api/dares/:id` — detail with funderCount, transferredToDareTitle
- `POST /api/dares` — create (deducts prizePool from creator wallet)
- `POST /api/dares/:dareId/fund` — fund dare from wallet
- `GET /api/dares/:dareId/fund` — funder stats
- `GET /api/notifications` — user notifications with unreadCount
- `POST /api/notifications/:id/read` — mark read
- `POST /api/notifications/read-all` — mark all read
- `GET /api/reels` — paginated video entries with dare info
- `GET /api/wallet` — balance + transactions + payout account

## DB Schema (key tables)

- `dares` — includes `transferred_to_dare_id`, `transfer_reason`
- `pool_contributions` — tracks who funded each dare
- `notifications` — type, title, message, relatedDareId, relatedTargetDareId, isRead
- `wallets`, `wallet_transactions` — all money movements; transaction types include dare_fund, dare_win_credit, dare_creator_credit, platform_fee, dare_pool_transfer_out/in

## Seed Data

POST `/api/seed` to populate demo dares/users:
- Admin: `admin@darepool.com` / `password123`
- Demo: `dareking@example.com` / `password123`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19, Vite 7, Wouter, Framer Motion, Sonner toasts, TailwindCSS, date-fns
- **API framework**: Express 5
- **Auth**: jsonwebtoken (HS256) + bcryptjs
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Payments**: Stripe (Checkout for deposits, Connect Express for payouts), stripe-replit-sync
- **File uploads**: multer, stored in `artifacts/api-server/uploads/`
- **Logging**: pino + pino-http

## Wallet Balance Units

- `availableBalance`, `withdrawableBalance`, `pendingBalance` — **cents** (multiply by 100 from dollars)
- `prizePool` on dares — **dollars** (integer)
- When computing payouts: `prizePool * 100` gives cents to distribute
