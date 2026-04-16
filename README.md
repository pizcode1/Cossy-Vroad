# Cossy Vroad

Production-oriented endless voxel arcade game inspired by the Crossy Road loop, implemented with **Three.js + TypeScript + Vite**.

## Features

- Fixed angled camera with smooth follow.
- Responsive grid-based hop movement (keyboard + touch).
- Procedural endless row generation with safe-zone cadence.
- Multiple lane hazard systems: vehicles, logs, and trains.
- Fairness guardrails (safe rows + lane limits + drift checks).
- Dynamic difficulty scaling by score.
- Rear-pressure fail state to maintain pacing.
- Character selection with biome-driven visual themes.
- Mobile-first HUD and simple low-overhead audio feedback.
- Performance-aware architecture with pooled hazards and row cleanup.

## Architecture

- `GameManager`: orchestration and game state lifecycle.
- `PlayerController`: queued tile movement + animation squash.
- `ChunkManager`: procedural row generation and cleanup.
- `ObstacleSpawner`: lane hazard timing, pooling, and updates.
- `UIManager`: score overlay, start/restart, character select.
- `AudioManager`: low-latency synthesized SFX.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Controls

- **Desktop**: Arrow keys / WASD
  - Up/W: forward
  - Left/A: left
  - Right/D: right
  - Down/S: backward (only on characters that support it)
- **Mobile**:
  - Tap: forward
  - Swipe left/right: strafe
  - Swipe up: forward
  - Swipe down: backward (if supported)

## Tuning

Gameplay balancing constants live in `src/game/config.ts`.

Key knobs:
- `SAFE_ZONE_BASE`
- `REAR_PUSH_BASE`
- `INITIAL_ROWS_AHEAD`
- per-character `moveCooldown` / `canMoveBack`

## Placeholder assets

This build uses procedural voxel primitives and synthesized sounds (no external asset files required). Replace geometry/materials and audio hooks with production assets without changing architecture.
