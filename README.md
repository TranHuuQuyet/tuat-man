# TUẤT MAN

> **ĐÊM NAY CÓ KÈO**

A mobile-first 2D arcade comedy web game set in Vietnam at night. Ride a motorbike (rear view), dodge traffic, hook and pull roadside dogs, upgrade your ride — and outrun the police through streets and alleys. Exaggerated cartoon visuals, very Vietnamese meme humour.

- Portrait **9:16** gameplay on phone, tablet and PC (never stretched to 16:9)
- Enter a name and play — no account
- **Season 1:** 5 levels — Xóm Nhỏ · Khu Phố · Chợ Đêm · Đại Náo Hẻm · Đêm Cuối

## Tech stack

- React 19 + TypeScript 5.9 (strict)
- Vite 8
- Phaser 3.90
- Planned: Cloudflare Pages (frontend) + Cloudflare Worker (lightweight player counter)

## Status

**Phase 0 — Foundation** complete. No gameplay yet. See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md).

## Local development

Requires **Node ≥ 22.12** (see `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173 (also exposed on LAN for phone testing)
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build
npm run typecheck
```

## Roadmap

0. Project audit & foundation ✅
1. Playable vertical slice
2. Core gameplay feel
3. Vietnamese night world & art direction
4. Dogs / vehicles / characters / progression
5. Season 1 — 5 levels
6. Police / meme / sound
7. Public web / realtime counter / deployment
8. QA / performance / polish

Details: [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) · Code layout: [ARCHITECTURE.md](ARCHITECTURE.md)
