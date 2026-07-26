<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useGemTooltip } from '../composables/useGemTooltip.js'
import { gemColorInfo, GEM_MODIFIER_DEFS } from '../config/gameData.js'

const props = defineProps({
  /** When true, renders as an inline panel (for embedding in StatSlidePanel) instead of a floating overlay. */
  inline: { type: Boolean, default: false }
})

const { visible, gem, heroStats, x, y, isTouch, hideTooltip, persistent, selectedGem, selectedGemId } = useGemTooltip()

// ── Viewport clamping via template ref measurement ──
const tooltipRef = ref(null)
const clampedX = ref(0)
const clampedY = ref(0)

// Watch visibility + position changes, measure tooltip, and clamp within viewport
watch([visible, x, y], async () => {
  if (!visible.value) return
  await nextTick()
  if (!tooltipRef.value) return

  const rect = tooltipRef.value.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const margin = 8

  // Clamp horizontal
  let cx = x.value
  if (cx + rect.width + margin > vw) {
    cx = vw - rect.width - margin
  }
  if (cx < margin) cx = margin

  // Clamp vertical
  let cy = y.value
  if (cy + rect.height + margin > vh) {
    cy = vh - rect.height - margin
  }
  if (cy < margin) cy = margin

  clampedX.value = cx
  clampedY.value = cy
}, { immediate: false })

/**
 * Resolve the correct gem to display:
 * - Inline mode (StatSlidePanel) → use `selectedGem` (never overwritten by hover)
 * - Floating mode → use `gem` (current hover target)
 */
const displayGem = computed(() => props.inline ? selectedGem.value : gem.value)

const tierLabels = ["", "Lesser", "Greater", "Superior", "Flawless", "Perfect"]

const colorInfo = computed(() => {
  if (!displayGem.value) return { label: '', cssColor: '#a855f7', dotColor: '#a855f7' }
  return gemColorInfo[displayGem.value.color] || { label: displayGem.value.color, cssColor: '#a855f7', dotColor: '#a855f7' }
})

const displayTier = computed(() => {
  const t = displayGem.value?.tier || 1
  return tierLabels[t] || `T${t}`
})

const displayLevel = computed(() => {
  return displayGem.value?.level || 1
})

const rarityColor = computed(() => {
  const t = displayGem.value?.tier || 1
  // Rarity colors: white (normal), blue (magic), yellow (rare), orange (unique)
  const colors = ['#fff', '#fff', '#88ddff', '#ffff77', '#ff8844', '#ff4444']
  return colors[t] || '#fff'
})

// ── Class display ──
const hasClass = computed(() => {
  return displayGem.value?.hasClass ?? false
})

const classDef = computed(() => {
  return displayGem.value?.classDef ?? null
})

const classDescription = computed(() => {
  return displayGem.value?.classDescription ?? ''
})

/** List class passive bonus properties for display (excluding colorPool, weight, id). */
const passiveEntries = computed(() => {
  const def = classDef.value
  if (!def) return []
  const entries = []
  const labels = {
    vantagePerTap: 'Vantage/Tap',
    vantageAutoRate: 'Vantage Speed',
    vantageCapBoost: 'Vantage Cap',
    vantage99DmgMult: 'Max Vantage Dmg',
    statPerCompletion: 'Completion Bonus',
    critChance: 'Crit Chance',
    vantageCritChance: 'Double Crit Chance',
    preferredStatBonus: 'Preferred Stats'
  }
  for (const [key, label] of Object.entries(labels)) {
    if (def[key] !== undefined) {
      let val = def[key]
      // Handle array ranges (blue gem crit/vantage crit: [10, 15] → shows rolled %)
      if (Array.isArray(val)) {
        if (displayGem.value) {
          const rolledKey = key === 'critChance' ? '_rolledCritChance' : '_rolledVantageCritChance'
          if (displayGem.value[rolledKey] === undefined) {
            displayGem.value[rolledKey] = val[0] + Math.random() * (val[1] - val[0])
          }
          val = '+' + displayGem.value[rolledKey].toFixed(0) + '%'
        } else {
          val = '+' + val[0] + '-' + val[1] + '%'
        }
      } else if (typeof val === 'number') {
        if (key === 'preferredStatBonus') {
          val = '+' + val.toFixed(2)
        } else if (val >= 1) {
          val = 'x' + val.toFixed(2)
        } else if (key === 'critChance' || key === 'vantageCritChance' || key === 'doubleCrit') {
          val = '+' + (val * 100).toFixed(1) + '%'
        } else {
          val = '+' + val.toFixed(2)
        }
      }
      entries.push({ label, value: val })
    }
  }
  // Check perArmyStat
  if (def.perArmyStat) {
    const parts = Object.entries(def.perArmyStat).map(([k, v]) => `${k}+${(v * 1000).toFixed(2)}/1k`)
    entries.push({ label: 'Per 1k Army', value: parts.join(' ') })
  }
  // ── Default statPerCompletion for classes without explicit one ──
  // Classes without explicit statPerCompletion still get 0.01 to flatStats
  // on each completion (matching OTHER_STAT_ON_COMPLETION in useGameState.js).
  if (displayGem.value?.color && displayGem.value.color !== 'cyans' && def?.flatStats) {
    if (def.statPerCompletion === undefined) {
      const statList = Object.keys(def.flatStats).join(', ')
      entries.push({ label: 'Completion Bonus', value: `+0.01 to ${statList}` })
    }
  }
  return entries
})

/** Display rolled gem modifiers (damageMult, vantageCapBoost, Mystic Aura). Mystic Aura always sorts to bottom. */
const modifierEntries = computed(() => {
  const g = displayGem.value
  if (!g || !g.modifiers || g.modifiers.length === 0) return []
  // Group by type, summing values
  const grouped = {}
  for (const mod of g.modifiers) {
    if (!grouped[mod.type]) grouped[mod.type] = 0
    grouped[mod.type] += mod.value
  }
  const entries = Object.entries(grouped).map(([type, totalValue]) => {
    const def = GEM_MODIFIER_DEFS[type]
    if (!def) return null
    const displayVal = def.format ? def.format(totalValue) : String(totalValue)
    return { label: def.label, value: displayVal, cssClass: def.cssClass || null }
  }).filter(Boolean)
  // Sort: Mystic Aura always last
  entries.sort((a, b) => {
    if (a.label === 'Mystic Aura') return 1
    if (b.label === 'Mystic Aura') return -1
    return 0
  })
  return entries
})

/**
 * Unified passives list: merges class passive bonuses + rolled gem modifiers.
 */
const allPassives = computed(() => {
  return [...passiveEntries.value, ...modifierEntries.value]
})

/** Force Gain — computed value shown in tooltip (base force * (1 + stat * 0.01)). */
const forceGain = computed(() => {
  const g = displayGem.value
  if (!g || !heroStats.value) return g ? g.dmg : 0
  const statVal = g.getScalingStatValue(heroStats.value)
  return g.dmg * (1 + statVal * 0.01)
})

/** Stat scaling info for display: shows the scaling stat and +1% per point. */
const scalingInfo = computed(() => {
  const g = displayGem.value
  if (!g) return null
  const def = g.classDef
  if (!def || !def.scalingStat) return null
  const statLabel = def.scalingStat === 'total' ? 'All Stats' : def.scalingStat
  return { label: `+1% per ${statLabel} point` }
})

const adjustedStyle = computed(() => {
  if (!visible.value) return { display: 'none' }
  return {
    left: clampedX.value + 'px',
    top: clampedY.value + 'px',
    pointerEvents: isTouch.value ? 'auto' : 'none'
  }
})
</script>

<template>
  <!-- ── Floating overlay (teleported to body) — shown for hover tooltips only ── -->
  <Teleport to="body">
    <div
      v-if="!inline && visible && gem"
      ref="tooltipRef"
      class="gem-tooltip-overlay"
      :class="{ 'tt-touch-mode': isTouch }"
      :style="adjustedStyle"
      @click.stop="hideTooltip"
      @touchend.stop="hideTooltip"
    >
      <!-- Class Name -->
      <div class="tt-name" :style="{ color: rarityColor }">{{ displayGem.name }}</div>

      <!-- ── Unified Passives Block (class passives + rolled modifiers) ── -->
      <div v-if="allPassives.length > 0" class="tt-passives-block">
        <div class="tt-sep"></div>
        <div v-if="hasClass" class="tt-class-desc">{{ classDescription }}</div>
        <div class="tt-passives-stats">
          <div
            v-for="entry in allPassives"
            :key="entry.label"
            class="tt-passives-row"
            :class="entry.cssClass"
          >
            <span class="tt-passives-label">{{ entry.label }}</span>
            <span class="tt-passives-val">{{ entry.value }}</span>
          </div>
        </div>
      </div>

      <!-- Force Gain (replaces old DPS) -->
      <div class="tt-dps-box">
        <span class="tt-metric">
          <span class="tt-metric-label">Force Gain</span>
          <span class="tt-metric-val dps-val">+{{ Math.round(forceGain) }}</span>
        </span>
      </div>

      <!-- Stat Scaling (labels only) -->
      <div v-if="scalingInfo" class="tt-scaling">
        <span class="tt-scaling-label">Scales with</span>
        <span class="tt-scaling-stats">{{ scalingInfo.label }}</span>
      </div>

      <!-- Tier & Level -->
      <div class="tt-tier-level">
        <span class="tt-tier">{{ displayTier }}</span>
        <span class="tt-archetype">{{ colorInfo.label }}</span>
        <span class="tt-level">Lv.{{ displayLevel }}</span>
      </div>
    </div>
  </Teleport>

  <!-- ── Inline panel (embedded in parent) — shown for selected gem details ── -->
  <div
    v-if="inline && selectedGem && persistent"
    class="gem-tooltip-inline"
  >
    <!-- Class Name -->
    <div class="tt-name" :style="{ color: rarityColor }">{{ displayGem.name }}</div>

    <!-- ── Unified Passives Block ── -->
    <div v-if="allPassives.length > 0" class="tt-passives-block">
      <div class="tt-sep"></div>
      <div v-if="hasClass" class="tt-class-desc">{{ classDescription }}</div>
      <div class="tt-passives-stats">
        <div
          v-for="entry in allPassives"
          :key="entry.label"
          class="tt-passives-row"
          :class="entry.cssClass"
        >
          <span class="tt-passives-label">{{ entry.label }}</span>
          <span class="tt-passives-val">{{ entry.value }}</span>
        </div>
      </div>
    </div>

    <!-- Force Gain (replaces old DPS) -->
    <div class="tt-dps-box">
      <span class="tt-metric">
        <span class="tt-metric-label">Force Gain</span>
        <span class="tt-metric-val dps-val">+{{ Math.round(forceGain) }}</span>
      </span>
    </div>

    <!-- Stat Scaling -->
    <div v-if="scalingInfo" class="tt-scaling">
      <span class="tt-scaling-label">Scales with</span>
      <span class="tt-scaling-stats">{{ scalingInfo.label }}</span>
    </div>

    <!-- Tier & Level -->
    <div class="tt-tier-level">
      <span class="tt-tier">{{ displayTier }}</span>
      <span class="tt-archetype">{{ colorInfo.label }}</span>
      <span class="tt-level">Lv.{{ displayLevel }}</span>
    </div>
  </div>
</template>

<style scoped>
.gem-tooltip-overlay {
  position: fixed;
  z-index: 99999;
  pointer-events: none;
  background: rgba(10, 10, 18, 0.97);
  border: 1px solid rgba(120, 120, 160, 0.25);
  border-radius: 6px;
  padding: 10px 14px;
  min-width: 200px;
  max-width: 280px;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: #c8c8d4;
  box-shadow:
    0 0 20px rgba(0, 0, 0, 0.7),
    0 4px 16px rgba(0, 0, 0, 0.5),
    inset 0 0 30px rgba(168, 85, 247, 0.04);
  user-select: none;
}

/* In touch mode, tooltip has pointer-events: auto (set via inline style) so tapping it can dismiss it */
.gem-tooltip-overlay.tt-touch-mode {
  cursor: pointer;
}

/* ── Name ── */
.tt-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-shadow: 0 0 8px currentColor;
  margin-bottom: 2px;
}

/* ── Base type ── */
.tt-base-type {
  font-size: 11px;
  color: #8888aa;
  font-weight: 500;
  margin-bottom: 4px;
}

/* ── Separator ── */
.tt-sep {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.25), transparent);
  margin: 5px 0;
}

/* ── Tier & Level ── */
.tt-tier-level {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  margin-bottom: 2px;
}
.tt-tier {
  color: #f59e0b;
  font-weight: 600;
}
.tt-archetype {
  color: #64748b;
  font-size: 10px;
  font-weight: 500;
}
.tt-level {
  color: #60a5fa;
  font-size: 10px;
  font-weight: 600;
  margin-left: auto;
  padding-left: 8px;
}

/* ── DPS Metrics ── */
.tt-dps-box {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 4px;
  padding: 3px 6px;
  background: rgba(168, 85, 247, 0.06);
  border: 1px solid rgba(168, 85, 247, 0.12);
  border-radius: 3px;
}
.tt-metric {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}
.tt-metric-label {
  color: #64748b;
  font-weight: 700;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.tt-metric-val {
  font-weight: 900;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
}
.tt-metric-val.dps-val {
  color: #a78bfa;
  text-shadow: 0 0 6px rgba(168, 85, 247, 0.3);
}

/* ── Stat Scaling ── */
.tt-scaling {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  padding: 3px 6px;
  background: rgba(34, 211, 238, 0.06);
  border: 1px solid rgba(34, 211, 238, 0.12);
  border-radius: 3px;
  font-size: 10px;
}
.tt-scaling-label {
  color: #64748b;
  font-weight: 600;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.tt-scaling-stats {
  color: #22d3ee;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 10px;
}
.tt-scaling-dmg {
  color: #a78bfa;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 10px;
  margin-left: auto;
}

/* ── Power Rating ── */
.tt-power {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
}
.tt-power-label {
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.tt-power-val {
  color: #a78bfa;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* ── Class Description ── */
.tt-class-desc {
  font-size: 11px;
  color: #c8c8d4;
  line-height: 1.4;
  margin-bottom: 4px;
  font-style: italic;
}

/* ── Unified Passives Block (gold styling) ── */
.tt-passives-block {
  margin-bottom: 2px;
}
.tt-passives-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  padding: 4px 6px;
  background: rgba(245, 158, 11, 0.08);
  border-radius: 3px;
  border: 1px solid rgba(245, 158, 11, 0.15);
}
.tt-passives-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
}
.tt-passives-label {
  color: #fbbf24;
  font-weight: 600;
}
.tt-passives-val {
  color: #f59e0b;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
/* Legendary modifier (vantageCapBoost) — red border highlight */
.tt-passives-row.mod-legendary {
  border: 1px solid rgba(239,68,68,.6);
  border-radius: 3px;
  padding: 1px 4px;
  background: rgba(239,68,68,.08);
  box-shadow: 0 0 6px rgba(239,68,68,.2);
}
.tt-passives-row.mod-legendary .tt-passives-label,
.tt-passives-row.mod-legendary .tt-passives-val {
  color: #ef4444;
  text-shadow: 0 0 6px rgba(239,68,68,.4);
}
/* Mystic Aura modifier — cyan/blue border highlight */
.tt-passives-row.mod-mystic {
  border: 1px solid rgba(34,211,238,.6);
  border-radius: 3px;
  padding: 1px 4px;
  background: rgba(34,211,238,.08);
  box-shadow: 0 0 6px rgba(34,211,238,.2);
}
.tt-passives-row.mod-mystic .tt-passives-label,
.tt-passives-row.mod-mystic .tt-passives-val {
  color: #22d3ee;
  text-shadow: 0 0 6px rgba(34,211,238,.4);
}
</style>

/* ── Inline Mode (embedded in StatSlidePanel right column) ── */
.gem-tooltip-inline {
  background: rgba(10, 10, 18, 0.85);
  border: 1px solid rgba(120, 120, 160, 0.15);
  border-radius: 4px;
  padding: 8px 10px;
  min-width: 0;
  max-width: 100%;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 11px;
  line-height: 1.5;
  color: #c8c8d4;
  user-select: none;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.gem-tooltip-inline .tt-name {
  font-size: 12px;
  margin-bottom: 1px;
}
.gem-tooltip-inline .tt-sep {
  margin: 3px 0;
}
.gem-tooltip-inline .tt-passives-stats {
  padding: 3px 5px;
  gap: 1px;
}
.gem-tooltip-inline .tt-passives-row {
  font-size: 9px;
}
.gem-tooltip-inline .tt-dps-box {
  padding: 2px 5px;
  margin-bottom: 2px;
}
.gem-tooltip-inline .tt-metric {
  font-size: 10px;
}
.gem-tooltip-inline .tt-scaling {
  padding: 2px 5px;
  margin-bottom: 2px;
  font-size: 9px;
}
.gem-tooltip-inline .tt-tier-level {
  font-size: 10px;
  margin-top: auto;
  padding-top: 4px;
  border-top: 1px solid rgba(120, 120, 160, 0.1);
}
.gem-tooltip-inline .tt-class-desc {
  font-size: 10px;
}
