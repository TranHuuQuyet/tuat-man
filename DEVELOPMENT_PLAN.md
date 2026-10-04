# TUẤT MAN — Development Plan (Season 1)

> **ĐÊM NAY CÓ KÈO**

Incremental, phase-based development. Each phase must be **completed, validated and approved** before the next one starts. No features outside the current phase without explicit approval.

**Priority order:** 1. Playable core → 2. Game feel → 3. Vietnamese visual identity → 4. Content & progression → 5. Meme/audio polish → 6. Public deployment.

| Phase | Name | Status |
|---|---|---|
| 0 | Project audit & foundation | ✅ Done (awaiting approval) |
| 1 | Playable vertical slice | ⏳ Next |
| 2 | Core gameplay feel | — |
| 3 | Vietnamese night world & art direction | — |
| 4 | Dogs / vehicles / characters / progression | — |
| 5 | Season 1 — 5 levels | — |
| 6 | Police / meme / sound | — |
| 7 | Public web / realtime counter / deployment | — |
| 8 | QA / performance / polish | — |

---

## PHASE 0 — Project audit & foundation

**Goal:** a clean, runnable foundation and a clear plan. No gameplay.

- [x] Audit repository (was empty, no Git, no Node installed)
- [x] Confirm stack: React 19 + TypeScript 5.9 (strict) + Vite 8 + Phaser 3.90
- [x] Node 22 LTS (macOS 12 compatible), npm
- [x] 9:16 portrait viewport frame (CSS) + Phaser `Scale.FIT` at 720×1280
- [x] React ↔ Phaser bridge (StrictMode-safe mount/destroy)
- [x] Placeholder `BootScene` (title only)
- [x] README.md, DEVELOPMENT_PLAN.md, ARCHITECTURE.md
- [x] `npm run dev`, `npm run build`, `npm run typecheck` pass
- [x] Git initialised locally (no remote, no push)

---

## PHASE 1 — Playable vertical slice

**Goal:** one short, ugly-but-playable loop, end to end. Placeholder shapes are fine.

Scope:
- Scene flow: `Preload → Title (name entry) → Ride → Result`
- Name entry (React overlay) → saved in `localStorage` → play immediately
- Rear-view road with fake-perspective scroll (lanes converge to horizon)
- Bike auto-forward; steer left/right (A/D, ←/→, touch left/right / drag)
- Simple obstacles/traffic in lanes; collision → crash → run ends
- One dog type at the roadside; **MÓC** (hook) button when in range (Space / mouse / touch button)
- Hook success → **KÉO** (pull) mode: tap repeatedly, simple power-vs-resistance meter → catch or escape
- In-run score: dogs caught, distance, money
- Result screen: dogs, money, distance, retry
- `InputController` mapping keyboard/mouse/touch → game actions
- First data files: `dogs.ts` (1 dog), `tuning.ts` (speeds, spawn rates)

Out of scope: upgrades, police, multiple levels, real art, audio, memes.

**Validate:** playable on desktop Chrome/Safari and on a real phone over LAN; stable 60 fps on a mid-range phone.

---

## PHASE 2 — Core gameplay feel

**Goal:** make the loop feel good before adding content.

- Steering with acceleration/inertia + bike lean
- Boost / nẹt pô (cooldown, speed burst)
- Hook: catch window, spammable, strong dogs can break the hook
- Pull: circular power ring, resistance curve, **PERFECT / GOOD / MISS** feedback
- Combo system (consecutive catches)
- `CameraDirector` with profiles: steering, hook, pull, catch, boost, crash (shake, zoom, tilt, punch)
- Juice: hit-stop, particles, screen flash, floating text
- Near-miss detection + reward
- Tuning pass — all numbers in `data/tuning.ts`

**Validate:** playtest notes; tuning adjusted; no mobile regressions.

---

## PHASE 3 — Vietnamese night world & art direction

**Goal:** strong Vietnamese identity, exaggerated 2D cartoon look.

- Style guide (palette, outline thickness, proportions) — 2D cartoon; no 3D / anime / pixel art / realism
- Parallax roadside layers: nhà ống, nhà cấp 4, cột điện + dây điện chằng chịt, đèn đường, quán nước, tạp hóa, tiệm sửa xe, biển hiệu tiếng Việt
- Traffic sprites: xe máy, ô tô, xe ba gác
- Night lighting: streetlight pools, headlight cone, neon signs
- Driver + passenger characters (cartoon, animated)
- Texture atlas pipeline + asset manifest
- UI font with full Vietnamese diacritics

**Validate:** visual review; asset size budget; fps check.

---

## PHASE 4 — Dogs / vehicles / characters / progression

**Goal:** variety and a reason to keep playing.

- Dog roster (data-driven): hook difficulty, pull resistance, value, behaviour, rarity
- Vehicle roster (parody names): speed, handling, boost, pô power
- Equipment: hook types, pô upgrades
- Garage/shop screen (React UI), in-game money
- Local progression in `localStorage` (versioned save schema)
- Character skins (data-driven)

**Validate:** economy sanity check; save/load migration test.

---

## PHASE 5 — Season 1: 5 levels

**Goal:** structured content with rising difficulty.

| # | Level | Theme |
|---|---|---|
| 1 | XÓM NHỎ | quiet village lanes, tutorial-ish |
| 2 | KHU PHỐ | town streets, more traffic |
| 3 | CHỢ ĐÊM | night market, crowded, obstacles |
| 4 | ĐẠI NÁO HẺM | narrow alleys, tight steering |
| 5 | ĐÊM CUỐI | everything, finale |

- `LevelDefinition` data: length/goal, spawn tables, dog pool, traffic density, environment set, wanted thresholds
- Level select + unlock flow; goal rating
- Difficulty curve tuning

**Validate:** every level completable; difficulty curve playtested.

---

## PHASE 6 — Police / meme / sound

**Goal:** the climax and the comedy.

- Wanted meter (rises with catches) → police chase
- Police pursuit; escape through streets/hẻm; caught = **GAME OVER**
- `MemeEventSystem`: subscribes to gameplay events → data table of reactions (text, sticker, SFX, camera) for hook miss, pull fail, catch, police, crash, near miss, level clear, secret events
- `AudioManager`: music, engine, exhaust, hook, pull, dog, police, crash, UI, meme SFX; volume settings; mobile audio unlock
- Only original / properly licensed audio (CC0 or commissioned), tracked in a licence log

**Validate:** chase is fair and escapable; meme frequency not annoying; licence check.

---

## PHASE 7 — Public web / realtime counter / deployment

**Goal:** public launch.

- Cloudflare Pages deploy (build `npm run build`, output `dist/`)
- Cloudflare Worker (+ Durable Object or KV) for lightweight presence:
  - 🔴 *X người đang chơi* (approximate, heartbeat-based)
  - 👥 *X lượt tham gia* (counter)
- Only a display name, no account; basic rate limit + name filter
- Social share meta (OG image); optional PWA manifest

**Validate:** production smoke test on mobile & desktop; counter behaviour under load.

---

## PHASE 8 — QA / performance / polish

- Device matrix (iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari, tablet)
- Performance: object pooling, atlases, draw calls, memory, load time
- Accessibility basics: volume controls, reduced camera shake option
- Bug bash, balance pass, final copy/meme review
- Season 1 release

---

## Working rules

- One phase at a time; stop and report at the end of each phase.
- No dependency without a clear need.
- Data-driven content (`game/data/*`); no giant scene files; no scattered magic numbers.
- No copyrighted music/audio/art without rights.
- Never push to a remote without explicit approval.
