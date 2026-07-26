# Stats Bar — Implementation Plan

## Context & Assumptions

**What we're building:**
A compact horizontal stats bar at the very top of [`StatSlidePanel.vue`](src/components/StatSlidePanel.vue:374), positioned directly above the existing **"Attributes"** section. It displays 5 key hero stats computed in real-time.

**Locked-in decisions:**
- Damage multiplier from level-ups shown as a ratio: `1.85x`
- Force per tap shown as raw army gain: `+5 Army/tap`
- Layout is a single horizontal bar with labeled stat chips

**Data sources:**
- [`CharacterEntity`](src/entities/CharacterEntity.js:28) — `hero.level`, `hero.xp`, `hero.maxXp`, `hero.baseVantage`, `hero.stats`
- [`ObjectiveEntity`](src/entities/ObjectiveEntity.js:26) — `obj.enemyArmyCurrent` (current HP)
- [`combatSystem.js`](src/systems/combatSystem.js) — `getHeroVantage()`, `getEffectiveStats()`, `getTotalGemBonuses()`, `calculateAutoStrikeDamage()`
- [`medalSystem.js`](src/systems/medalSystem.js:180) — `getTotalHeroBonuses()`
- [`xpSystem.js`](src/systems/xpSystem.js:9) — XP formulas
- [`useGameState.js`](src/composables/useGameState.js) — re-exports `getTotalHeroBonuses`, `getEffectiveStats`, etc.

---

## Architecture Breakdown

### Computed Properties (added to `<script setup>` in StatSlidePanel)

| Property | Formula | Type |
|----------|---------|------|
| `xpRemaining` | `hero.maxXp - hero.xp` | Number |
| `xpProgress` | `hero.xp / hero.maxXp` | Ratio 0-1 |
| `timeToNextLevel` | Formatted `mm:ss` from `xpRemaining / xpPerSecond` | String |
| `dmgLevelMult` | `vantageAtCurrentLevel / vantageAtLevel1` | Float (e.g. 1.85) |
| `forcePerTap` | `hero.level` (raw army gain per tap) | Integer |
| `autoDPS` | Deterministic expected auto-strike DPS (excluding random crits) | Number |
| `timeToCompletion` | Formatted `mm:ss` from `objective.enemyArmyCurrent / autoDPS` | String |

### New Imports Needed

```js
import { cheatActive } from '../flags.js'
import * as combatSystem from '../systems/combatSystem.js'  // or selective imports
import { getTotalHeroBonuses } from '../composables/useGameState.js'  // already exported
import { getXpForLevel } from '../systems/xpSystem.js'
```

### State / Flags (reactive from existing sources)

- `hero` — computed from `heroRegistry[props.heroName]`
- `objective` — passed as prop
- `cheatActive` — from `flags.js`
- `gemBonuses` / `bonuses` — computed, derived from hero (deterministic aside from random crit seed; we exclude crit for display)

### Template Structure (new section before Attributes)

```html
<!-- Hero Stats Bar -->
<div class="ss-stats-bar">
  <div class="ss-stat-chip" title="XP remaining / Time to next level">
    <span class="ss-stat-icon">✦</span>
    <span class="ss-stat-value">12,345 XP</span>
    <span class="ss-stat-sub">0:45 to next lvl</span>
  </div>
  <div class="ss-stat-chip" title="Damage multiplier from level ups">
    <span class="ss-stat-icon">⚔</span>
    <span class="ss-stat-value">1.85x</span>
    <span class="ss-stat-sub">Dmg mult</span>
  </div>
  <div class="ss-stat-chip" title="Army gained per tap">
    <span class="ss-stat-icon">💪</span>
    <span class="ss-stat-value">+5</span>
    <span class="ss-stat-sub">Army/tap</span>
  </div>
  <div class="ss-stat-chip" title="Time to complete current objective at current DPS">
    <span class="ss-stat-icon">⏱</span>
    <span class="ss-stat-value">2:30</span>
    <span class="ss-stat-sub">to clear</span>
  </div>
</div>
```

### CSS Design

- Horizontal flexbox row, evenly distributed or with logical gaps
- Dark semi-transparent background (matches panel theme)
- Each "chip": icon + primary value + small label, aligned center
- Uses existing CSS variables: `--hero-color`, `--hero-bright`, `--hero-glow`
- Compact: font-size ~9-10px for labels, 13-14px for values

---

## Math Detail

### 1. XP Remaining + Time to Next Level

```js
const xpRemaining = hero.maxXp - hero.xp

// XP per second from passive auto-strike
// autoDPS = calculateAutoStrikeDamage(...) but without random crits
// We compute expected base DPS:
const vantage = combatSystem.getHeroVantage(hero)
const effectiveArmy = objective.heroArmy || 1
const overcoreMult = combatSystem.getOvercoreDmgMult(hero)
const maxVantageMult = hero.vantageRating >= 99 ? (gemBonuses.vantage99DmgMult ?? 2) * overcoreMult : 1
const baseStrikeDps = effectiveArmy * vantage * 0.05 * maxVantageMult
const idleMult = gemBonuses.idleDamageMult ?? 1
const finalMult = (1 + (gemBonuses.damageMult ?? 0))
const autoDPS = baseStrikeDps * idleMult * finalMult  // deterministic, no crit

const xpPerSecond = autoDPS / 1000
const secondsToLevel = xpRemaining / xpPerSecond
```

Format as `mm:ss` or `h:mm:ss` if > 1 hour.

### 2. Damage Multiplier from Level Ups

```js
const effectiveStats = combatSystem.getEffectiveStats(hero)
const statBonus = (effectiveStats.Str + effectiveStats.Spi + effectiveStats.Int + effectiveStats.Con + effectiveStats.Dex) / 25

const vantageAtCurrent = hero.baseVantage + (hero.level - 1) * 0.5 + statBonus
const vantageAtLevel1 = hero.baseVantage + statBonus  // level = 1, so (1-1)*0.5 = 0
const dmgLevelMult = vantageAtCurrent / vantageAtLevel1
```

Display as `dmgLevelMult.toFixed(2) + 'x'`.

### 3. Force per Tap

```js
// From useGameState.js line 189: obj.heroArmy += 1 * hero.level
const forcePerTap = hero.level
```

Display as `+{forcePerTap}`.

### 4. Time to Objective Completion

```js
const currentHP = objective.enemyArmyCurrent
const secondsToClear = currentHP / autoDPS  // same autoDPS computed above
```

Format as `mm:ss` or `h:mm:ss`.

### Display Formatting Helper

```js
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '--:--'
  if (seconds < 60) return `0:${Math.ceil(seconds)}`
  const mins = Math.floor(seconds / 60)
  const secs = Math.ceil(seconds % 60)
  if (mins < 60) return `${mins}:${String(secs).padStart(2, '0')}`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hrs}:${String(remainMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
```

---

## Execution Sequence

### Step 1: Add imports to StatSlidePanel.vue
Add `combatSystem`, `getTotalHeroBonuses`, `getXpForLevel`, `cheatActive` to the existing import block (lines 1-9).

### Step 2: Add computed properties
After line 19 (`const hero` / `theme`), add computed properties:
- `gemBonuses` — computed using `combatSystem.getTotalGemBonuses(hero.value)`
- `bonuses` — computed using `getTotalHeroBonuses(hero.value, gemBonuses.value)` (or `medalSystem.getTotalHeroBonuses` with `gemBonuses.value`)
- `effectiveStats` — already exists as `effectiveStats` on line 230
- `xpRemaining`, `xpProgress` — from `hero.value`
- `autoDPS` — deterministic auto-strike DPS (no crits)
- `timeToNextLevelStr`, `timeToCompletionStr` — formatted strings
- `dmgLevelMult` — damage multiplier ratio
- `forcePerTap` — hero level

### Step 3: Insert template section
Before the `<!-- Attributes -->` section (line 377), add the stats bar HTML.

### Step 4: Add CSS styles
Before the existing `.stat-slide-panel` block (line 584), or within it, add styles for:
- `.ss-stats-bar` — flex row container
- `.ss-stat-chip` — individual chip
- `.ss-stat-icon` — icon span
- `.ss-stat-value` — primary value
- `.ss-stat-sub` — label below value

---

## Verification Strategy

1. **Check imports** — Confirm all imported symbols resolve correctly (no undefined module errors)
2. **Check computed values** — Open Vue DevTools or add console.log to verify:
   - `xpRemaining` = `maxXp - xp` (positive number)
   - `dmgLevelMult` > 1.0 (at level > 1)
   - `forcePerTap` = `hero.level`
   - `autoDPS` > 0 (when hero has army)
   - Time values are sensible finite strings
3. **Visual check** — Stats bar renders above "Attributes", horizontal layout, no overflow
4. **Edge cases**:
   - Level 1 hero → `dmgLevelMult` should be `1.00x`
   - Max level / max XP → `xpRemaining` = 0, time shows `--:--`
   - No army / no DPS → time to clear shows `--:--`
   - Hero hasn't loaded yet → graceful fallback/computed defaults
