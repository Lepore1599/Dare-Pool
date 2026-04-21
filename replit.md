# Workspace

## Overview

pnpm workspace monorepo using TypeScript. DarePool — a full-stack mobile-first dark-mode web app where users compete to complete dares for a prize pool. Production-ready with PostgreSQL, real accounts, JWT auth, Stripe payments, and full 48-hour dare lifecycle with automatic payouts.

## Architecture

- **Frontend** (`artifacts/dare-pool`) — React + Vite, port from `PORT` env var (default 24106 in dev)
- **API Server** (`artifacts/api-server`) — Express 5, port 8080, serves all routes under `/api`
- Vite proxies `/api` → `localhost:8080` in dev

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

- `/` — Home feed (active/ended filter, live countdown timers, real stats)
- `/create` — Create dare form (deducts initial prizePool from wallet)
- `/dare/:id` — Dare detail: fund button, submit entry, vote, payout breakdown, transfer status
- `/reels` — TikTok-style full-screen vertical entry video feed
- `/wallet` — Balance, Stripe deposit/withdraw
- `/notifications` — Dare completion and pool transfer notifications with read/unread state
- `/leaderboard` — Past dares, hall of fame, total votes
- `/profile/:id` — User profile with stats and activity
- `/admin` — Admin dashboard (requires `isAdmin=true`)

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
