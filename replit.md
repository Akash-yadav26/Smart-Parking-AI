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

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Application: ParkSense — Smart Parking Intelligence

A smart city parking app for Indian cities that uses AI, crowdsourcing, and demand prediction instead of IoT sensors.

### Artifacts
- **smart-parking** (React + Vite) — frontend app at `/`
- **api-server** (Express 5) — backend API at `/api`

### Database Tables
- `parking_zones` — parking areas with location, capacity, demand level, AI confidence scores
- `parking_spots` — individual spots within zones
- `parking_reports` — crowdsourced reports (leaving/arriving/available/occupied)
- `users` — user accounts with points, trust scores, ranks, rewards (INR)

### Features
- Live parking zone grid with demand badges (HIGH/MEDIUM/LOW) and AI confidence scores
- Zone detail with spot availability and best arrival time recommendations
- AI Prediction Engine — hourly probability charts per zone using Recharts
- Demand heatmap — visual color grid (red/yellow/green) filterable by time of day
- Crowdsourced report submission with reward points system
- Leaderboard with contributor rankings, accuracy rates, trust scores
- User profile with total rewards in INR, rank (newcomer→legend), and report history

### API Routes
- `GET/POST /api/zones` — list/create parking zones
- `GET /api/zones/:id` — zone detail
- `GET/POST /api/spots` — list/create spots
- `PATCH /api/spots/:id` — update spot status
- `GET/POST /api/reports` — list/submit crowdsourced reports
- `GET /api/predictions` — AI availability predictions by zone/time
- `GET /api/predictions/best-time` — best arrival time recommendation
- `GET/POST /api/users` — user management
- `GET /api/users/leaderboard` — top contributors
- `GET /api/analytics/heatmap` — demand heatmap data
- `GET /api/analytics/summary` — platform-wide stats
- `GET /api/analytics/peak-hours` — hourly occupancy per zone
