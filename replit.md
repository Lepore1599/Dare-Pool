# Workspace

## Overview

pnpm workspace monorepo using TypeScript. DarePool — a full-stack mobile-first dark-mode web app where users compete to complete dares for a prize pool. Upgraded from localStorage prototype to a production-ready app with PostgreSQL, real accounts, and JWT auth.

## Architecture

- **Frontend** (`artifacts/dare-pool`) — React + Vite, port from `PORT` env var (default 24106 in dev)
- **API Server** (`artifacts/api-server`) — Express 5, port 8080, serves all routes under `/api`
- Vite proxies `/api` → `localhost:8080` in dev

## DarePool Features

- **Auth**: Real email/password accounts with bcrypt hashing + JWT stored in `localStorage`
- **Dares**: Create dares with 48h expiration, server-side content moderation (hard-block + soft-warn)
- **Entries**: Submit via URL link or video file upload (up to 200MB, served from `/api/uploads`)
- **Votes**: One vote per user per dare, no self-voting, enforced server-side
- **Expiration engine**: `closeExpiredDares()` auto-picks winner by voteCount on GET /dares
- **Reports**: Reason + details, stored in DB, admin can dismiss or action
- **User profiles**: Stats page at `/profile/:id` showing wins, entries, dares posted
- **Admin dashboard**: `/admin` (admin-only) — reports queue, dare management, user banning
- **Fairness**: Unique constraints on votes; 409 on duplicate entry/vote; 403 on self-vote

## Pages

- `/` — Home feed (active/ended filter, live countdown timers, real stats)
- `/create` — Create dare form with server-side moderation
- `/dare/:id` — Dare detail, submit entry, vote, report
- `/leaderboard` — Past dares, hall of fame, total votes
- `/profile/:id` — User profile with stats and activity
- `/admin` — Admin dashboard (requires `isAdmin=true`)

## Seed Data

POST `/api/seed` to populate demo dares/users:
- Admin: `admin@darepool.com` / `password123`
- Demo: `dareking@example.com` / `password123`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19, Vite 7, Wouter, Framer Motion, Sonner toasts, TailwindCSS
- **API framework**: Express 5
- **Auth**: jsonwebtoken (HS256) + bcryptjs
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **File uploads**: Multer (200MB limit, MP4/WebM/MOV/AVI)
- **Build**: esbuild (ESM bundle for API server)

## Profile System

- **Profile page** (`/profile/:id`) — full competitive profile with stats, badges, tabbed history
- **Stats computed** live from entries/comments/votes tables on every request — always accurate
- **Badges**: First Win 🔥, Champion 👑, Legend 🏆, Top Performer 🌟, Competitor 📋, Active Competitor 🎯, Commentator 💬, Hot Streak ⚡, Clean Account ✅, Early User 🚀
- **Tabs**: Entries (with sort: newest / most voted / winners only), Wins, Comments
- **Edit profile**: bio + avatar upload (from device) + username change — only visible on own profile
- **Avatar upload**: `POST /api/users/:id/avatar` (multer, jpg/jpeg/png/webp, max 5MB, stored in `uploads/avatars/`)
- **Username cooldown**: 30-day server-enforced limit tracked via `lastUsernameChangeAt` DB column; admins bypass; error includes next allowed date
- **Clickable usernames everywhere**: Home feed, Dare Detail, Leaderboard, Comments, TikTok feed
- **Video submissions**: upload-only (no link pasting); `capture="environment"` hint for mobile camera roll

## Submission System

- **Upload only** — link-based submission UI removed; only file upload allowed
- **Server-side validation** for video type (mp4/webm/mov/avi) and size (200MB max)
- **Mobile-native upload zone** with tap target, file name preview, upload progress bar

## DB Schema (lib/db/src/schema/)

- `users` — id, username, email, passwordHash, isAdmin, isBanned, strikeCount, wins, totalEntries, totalVotesCast
- `dares` — id, title, description, prizePool, status, expiresAt, winnerEntryId, isFeatured, reportCount
- `entries` — id, dareId, userId, videoUrl, videoType, voteCount, status
- `votes` — id, dareId, entryId, userId (unique constraint prevents double-voting)
- `reports` — id, dareId?, entryId?, reportedByUserId, reason, details, status
- `admin_actions` — id, adminUserId, targetType, targetId, action, notes

## Key Commands

- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/dare-pool run dev` — run frontend locally
- `cd lib/db && pnpm tsc` — build DB type declarations (needed for API server tsc)
