# TUẤT MAN — Architecture

Short reference for how the code is organised and why. Keep it simple; grow only when a phase needs it.

## Responsibilities

| Layer | Owns | Does NOT own |
|---|---|---|
| **React** (`src/components`, `src/ui`) | App shell, 9:16 frame, name entry, menus, shop, result screens, text/button overlays | Game loop, physics, world rendering |
| **Phaser** (`src/game`) | Game loop, scenes, entities, collisions, camera, effects, audio playback | DOM UI, routing |
| **Data** (`src/game/data`) | Dogs, vehicles, levels, tuning, meme tables, audio keys — plain typed objects | Logic |

React ↔ Phaser communicate through a **small typed event bus** (added in Phase 1), never by reaching into each other's internals.

## Folder structure

Current (Phase 0) files are marked ✅; the rest is the target layout, created only when a phase needs it.

```
src/
  main.tsx                 ✅ React entry
  App.tsx                  ✅ App shell
  styles.css               ✅ Global + 9:16 frame styles
  components/
    GameViewport.tsx       ✅ Fixed 9:16 portrait frame
    PhaserGame.tsx         ✅ Mounts/destroys Phaser.Game
  ui/                      React overlays (name entry, menus, shop, result)   — P1+
  game/
    config.ts              ✅ Resolution, palette, scene keys
    createGame.ts          ✅ Phaser.Game factory
    EventBus.ts            Typed React↔Phaser events                           — P1
    scenes/
      BootScene.ts         ✅ Placeholder (becomes Preload in P1)
      RideScene.ts         Thin orchestrator: wires systems together           — P1
    entities/              Bike, Dog, Traffic, Obstacle, Police                — P1+
    systems/               Spawner, Hook, Pull, Combo, Wanted, Police,
                           MemeEvent, Audio — one concern each                 — P1+
    input/                 InputController: keyboard/mouse/touch → actions     — P1
    camera/                CameraDirector + camera profiles                    — P2
    effects/               Particles, floating text, hit-stop, flashes         — P2
    data/                  dogs.ts, vehicles.ts, levels.ts, tuning.ts,
                           memes.ts, audio.ts                                  — P1+
    utils/                 Small pure helpers (math, random, pooling)          — as needed
  services/                localStorage save (P1), presence client (P7)
public/assets/             Images, atlases, audio                              — P1+
worker/                    Cloudflare Worker for presence counter              — P7
```

## Key decisions

- **Viewport:** logical resolution **720×1280** (exact 9:16). A CSS frame keeps a 9:16 box centered on any screen (`aspect-ratio` + `100dvh`); Phaser `Scale.FIT` scales the canvas into it. Never stretched to 16:9 on PC.
- **Fake 3D rear view:** the world is 2D; depth is simulated by projecting a "distance ahead" value to screen Y + scale (classic pseudo-3D road). Entities store `lane` + `z`; one projection helper converts to screen space.
- **Scenes stay thin:** `RideScene` creates systems and forwards `update(dt)`. Systems hold logic; entities hold state + visuals.
- **Data-driven content:** adding a dog / level / vehicle / meme / sound = adding a data entry, not editing logic.
- **Events over coupling:** gameplay emits events (`dog:caught`, `hook:miss`, `crash`, …). Camera, memes, audio and UI subscribe. This keeps `MemeEventSystem` out of gameplay logic.
- **No global state library** for now. React local state + EventBus is enough.
- **Phaser 3** (3.90, latest v3) as specified, pinned exactly to avoid an accidental jump to Phaser 4.

## Conventions

- TypeScript `strict` + `noUncheckedIndexedAccess`; avoid `any`.
- Tuning numbers live in `data/tuning.ts` (named), not inline.
- Scene keys / event names are constants, never repeated raw strings.
- Files over ~300 lines are a signal to split.
