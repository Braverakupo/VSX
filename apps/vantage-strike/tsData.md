# .ts File Overviews

### src\flags.ts
**Overview:** // src/flags.ts // Consolidated atomic reactive state atoms. // Single file — no need for separate flag modules.

### src\main.ts
**Overview:** import { createApp } from 'vue' import App from './App.vue' import { install } from './composables/cssScripts'

### src\types.ts
**Overview:** // ═══════════════════════════════════════════════════════════════ // src/types.ts — canonical global TypeScript types file. // Global interfaces, type aliases, and unions for Vantage Strike

### src\vite-env.d.ts
**Overview:** /// <reference types="vite/client" />  declare module '*.vue' {

### src\composables\cssScripts.ts
**Overview:** // ═══════════════════════════════════════════════════════════════ // cssScripts.ts — UNIVERSAL design-system runtime (TypeScript). // Self-contained template module: no imports beyond `vue`, no app

### src\composables\useGameLoop.ts
**Overview:** // src/composables/useGameLoop.ts // Game loop composable — runs systems each tick via setInterval. // Accepts state references to avoid circular dependencies.

### src\composables\useGameState.ts
**Overview:** // src/composables/useGameState.ts // Central reactive game state + slim re-export hub. // State definitions only — all game logic lives in src/systems/.

### src\composables\useGemTooltip.ts
**Overview:** // src/composables/useGemTooltip.ts // Reactive global tooltip state for POE-style gem stat popups. // The tooltip is rendered at the <body> level via Teleport so it's never clipped.

### src\composables\useVantageSystem.ts
**Overview:** // src/composables/useVantageSystem.ts // Reactive vantage system — cinematic MP4 triggers and timer management. // Wraps vantage-related logic with timer cleanup.

### src\composables\useVideoPool.ts
**Overview:** // src/composables/useVideoPool.ts // Hidden video pool for canvas-based MP4 playback //

### src\config\gameData.ts
**Overview:** // src/config/gameData.ts // Game configuration data — class definitions, gem images, and constants // Centralized for easy tuning and balance adjustments

### src\config\jobMedalData.ts
**Overview:** // src/config/jobMedalData.ts // Job Medals system — stat-points-based leveling. //

### src\config\loreData.ts
**Overview:** // src/config/loreData.ts // VANTAGE STRIKE universe lore — typed constants transcribed from // plans/HIBABBBBBBBE.txt (universe bible). Gameplay data (themes,

### src\entities\CharacterEntity.ts
**Overview:** // src/entities/CharacterEntity.ts // Pure data holder — hero character state with JSON serialization. // No game logic, no Vue reactivity.

### src\entities\GemEntity.ts
**Overview:** // src/entities/GemEntity.ts // Pure data holder — gem state with JSON serialization. // No game logic, no Vue reactivity. All computation moved to gemSystem.

### src\entities\index.ts
**Overview:** // src/entities/index.ts // Barrel file for entity re-exports

### src\entities\InventoryEntity.ts
**Overview:** // src/entities/InventoryEntity.ts // Pure data container — wraps a dict of gems with JSON serialization. // No game logic, no Vue reactivity.

### src\entities\JobMedalEntity.ts
**Overview:** // src/entities/JobMedalEntity.ts // Pure data holder — single job medal state with JSON serialization. // Includes getProgress() for convenient template access.

### src\entities\JobMedalSystemEntity.ts
**Overview:** // src/entities/JobMedalSystemEntity.ts // Pure data container — per-character collection of 10 job medals. // No game logic — all medal checking moved to medalSystem.

### src\entities\ObjectiveEntity.ts
**Overview:** // src/entities/ObjectiveEntity.ts // Pure data holder — combat objective state with factory + JSON serialization. // No game logic, no Vue reactivity.

### src\services\SaveService.ts
**Overview:** // src/services/SaveService.ts // Save/Load abstraction layer — localStorage persistence with versioning. // Provides read/write access to game save data.

### src\systems\combatSystem.ts
**Overview:** // src/systems/combatSystem.ts // Pure combat logic — damage calculation, vantage, overcore, crits. // No Vue imports. Receives entity data, returns results.

**Vantage Damage — `overcoreMult` vs `maxVantageMult`:**
- `overcoreMult` (`getOvercoreDmgMult(hero)`): purely the over-99 exponential term — `overcap = max(0, vantageRating - 99)`, returns `Math.pow(1.12, overcap)`, or `1` when vantage ≤ 99. Scales on how far past the 99 cap a hero's vantage exceeds. Component of the next value, not independent.
- `maxVantageMult` (in `calculateAutoStrikeDamage`): a ≥99 gate that packs the full per-character multiplier — `1` unless `vantageRating >= 99`, then `overcoreMult * (2 + (vantage99DmgMult ?? 0))`:
  - `2` = base ×2 max-vantage damage (fixed once per hero)
  - `vantage99DmgMult` = SUMMED across all that hero's gem instances (`getTotalGemBonuses` uses `+=`; baseline 0). Applied in both tap and auto damage as `overcoreMult * (2 + vantage99DmgMult)`.
  - `overcoreMult` = the over-99 exponential scaling (above)
  Applied to `baseStrikeDps = effectiveArmy * vantage * 0.05`.
- Both are resolved per-character (vantage- and per-hero-gem-driven); gems via `combatSystem.getTotalGemBonuses(hero)`, and in the loop `medalSystem.getTotalHeroBonuses(hero, gemBonuses)` before `calculateAutoStrikeDamage`.

### src\systems\completionSystem.ts
**Overview:** // src/systems/completionSystem.ts // Unified completion logic — called by both tap and auto-strike. // Pure logic: receives entities, mutates them, returns debug info.

### src\systems\gemSystem.ts
**Overview:** // src/systems/gemSystem.ts // Pure gem logic — rolling, modifiers, naming, equip/unequip. // No Vue imports. Receives entity data, returns results.

### src\systems\medalSystem.ts
**Overview:** // src/systems/medalSystem.ts // Pure medal logic — leveling, bonuses, target computation. // No Vue imports. Receives entity data, returns results.

### src\systems\rebirthSystem.ts
**Overview:** // src/systems/rebirthSystem.ts // Pure rebirth logic. No Vue imports.

### src\systems\saveSystem.ts
**Overview:** // src/systems/saveSystem.ts // Pure save/load orchestration — serializes entities and calls SaveService. // No direct Vue imports (calls external SaveService for I/O).

### src\systems\xpSystem.ts
**Overview:** // src/systems/xpSystem.ts // Pure XP/leveling logic. No Vue imports.


---

## Where Rebirth-Gem Passives Are Defined

**Canonical definitions live in `src/config/gameData.ts`, two layers:**
- `classDefinitions: ClassDefinition[]` (~line 114) — each gem class IS a passive set: `vantagePerTap`, `vantageAutoRate`, `armyPerSecond`, `critDamage`, `doubleCrit`, `critChance`, `vantage99DmgMult`, `vantageCritChance`, `preferredStatBonus`, `idleDamageMult`, `statPerCompletion`, `flatStats`, `scalingStat`, `weight`
- `GEM_MODIFIER_DEFS` (~line 251) — rollable modifiers stacked on top: `damageMult`, `vantageCapBoost`, `statPerCompletion` (Mystic Aura), `preferredStatBonus`

**Which passives a class gets (`which pool` / `which class`):**
- `src/components/StatSlidePanel.vue:77` — `PASSIVES_10`, the 10-passive key pool distributed by `buildBalanced(rot)` (gem-side; medal mirror is `P10` in `medalSystem.ts`)
- `src/systems/gemSystem.ts` `rollAbilityForColor()` — weighted-random class pick from `classDefinitions` on gem drop (incl. rebirth gems)

**Resolution (what a gem ends up with):**
- `src/systems/combatSystem.ts` `getTotalGemBonuses()` + `getModifierValue` — sums class passives (stat-scaled) + rolled modifiers
- `src/components/GemTooltip.vue:229` `allPassives` — display merge (class passives + modifiers)

---
## Separation: Jobmedals vs Gems

**Jobmedals** (progression/reward)
- config/jobMedalData.ts, entities/JobMedalEntity.ts, systems/medalSystem.ts, entities/JobMedalSystemEntity.ts
- Tied to job/completion rewards (medalSystem, combat/completion)

**Gems / Inventory Slots** (item placement)
- systems/gemSystem.ts, entities/GemEntity.ts, entities/InventoryEntity.ts, config/gameData.ts
- Generated gem goes into 1 of 10 character/inventory slots (slot references in cssScripts, useVideoPool, InventoryEntity)

---
## Overlap / Interaction

- Jobmedals pull StatName from config/gameData (types)
- medalSystem sums gem passives + job medal bonuses via getTotalHeroBonuses; medals do NOT receive gem bonuses
- Separate slot systems: medalSlots vs gem/inventory slots
- Overlap = shared hero stat aggregation only

---
## Medal Index / Bonus Structure

- 10 slots always: 0-1 Str, 2-3 Dex, 4-5 Spi, 6-7 Int, 8-9 Con
- Global leveling: LEVEL_BASE=6, LEVEL_MULT=1.4; same for all chars
- Bonus keys shared via JOB_PASSIVE_BASE / P10; no per-char unique bonus definitions by index
- Char differences: unlock state + CHAR_UNIT_KEYS (gem mapping), not slot stats

---
## Bonus Scaling / Leveling

- Bonuses scale linearly with medal.level (not char level): baseVal * lvl
- Same bonus keys per medal class (JOB_MEDAL_PASSIVES), amount increases with level
- Level-up targets: LEVEL_BASE=6, LEVEL_MULT=1.4 (stat-point based)
- P10 defines progression key tiers globally
