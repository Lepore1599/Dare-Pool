# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Includes DarePool — a mobile-first dark-mode web app where users compete to complete dares for a prize pool.

## DarePool App (`artifacts/dare-pool`)

- **Frontend only** — all data stored in `localStorage`, no backend required
- **Pages**: Home (dare feed), Create Dare, Dare Detail (voting + submissions), Leaderboard
- **Auth**: Username-only (localStorage)
- **Content moderation**: `src/lib/moderation.ts` — hard-block + soft-warn keyword system with leet-speak normalization
- **Report system**: `src/lib/reports.ts` — users can report dares; reported dares are hidden from the feed
- **Key components**: `ModerationDialogs.tsx`, `ReportModal.tsx`, `SubmitEntryModal.tsx`, `LoginModal.tsx`

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

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
