<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { heroRegistry, gameState, getHeroGemBonuses, getEffectiveStats, formatNotation, getHPGradientColor, getEquippedCount, tapObjective, upgrade, rebirthObjective, isCinematicActive, getOvercoreDmgMult, CHAR_GEM_COLOR, ALL_GEMS, HP_TICK_COUNT } from '../composables/useGameState'
import type { GameObjective } from '../composables/useGameState'
import { registerCanvas, unregisterCanvas } from '../composables/useVideoPool'
import { heroThemes, gemColorInfo } from '../config/gameData'
import { useGemTooltip } from '../composables/useGemTooltip'
import { applyTheme } from '../composables/cssScripts'
import GemItem from './GemItem.vue'
import StatSlidePanel from './StatSlidePanel.vue'

interface TapPopupPayload {
  dmg: number
  x: number
  y: number
  obj?: { id: string } | null
}

const props = withDefaults(defineProps<{
  objective: GameObjective
  closeDropdownsKey?: number
}>(), {
  closeDropdownsKey: 0
})

const emit = defineEmits<{
  (e: 'tapPopup', payload: TapPopupPayload): void
  (e: 'levelUp'): void
  (e: 'statPoint'): void
  (e: 'gemAward'): void
}>()

const { showTooltip, hideTooltip, updatePosition } = useGemTooltip()

// Slide-out stat panel toggle
const showStatPanel = ref(false)

// Close the stat panel whenever the rotary sends a close signal
watch(() => props.closeDropdownsKey, () => {
  showStatPanel.value = false
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const cardRef = ref<HTMLDivElement | null>(null)
const hpBarRef = ref<HTMLDivElement | null>(null)
const hpVisualizerRef = ref<HTMLDivElement | null>(null)

const hero = computed(() => heroRegistry[props.objective.name])
const theme = computed(() => heroThemes[props.objective.name] || heroThemes.Kailin)
const effectiveStats = computed(() => hero.value ? getEffectiveStats(hero.value, props.objective) : null)
const effectiveArmy = computed(() => (props.objective.heroArmy || 1))
const dps = computed(() => effectiveArmy.value * (hero.value?.level || 1) * 0.1)

// ── Gem DPS ──
// Sum of (gem.dmg / gem.cd) for all equipped gems on this hero
const gemDps = computed(() => {
  const hero = heroRegistry[props.objective.name]
  if (!hero || !hero.gemSlots) return 0
  let total = 0
  for (const gemId of hero.gemSlots) {
    if (!gemId) continue
    const gem = hero.inventory?.getGem(gemId)
    if (!gem || !gem.dmg || !gem.cd) continue
    total += gem.dmg / gem.cd
  }
  return total
})

// Combined auto DPS = strike DPS + gem DPS
const totalAutoDps = computed(() => dps.value + gemDps.value)
const hpPct = computed(() => props.objective.enemyArmyMax > 0 ? (props.objective.enemyArmyCurrent / props.objective.enemyArmyMax) : 0)
const vantagePct = computed(() => {
  if (!hero.value) return 0
  const gemBonuses = getHeroGemBonuses(hero.value)
  const maxVantage = 99 + gemBonuses.vantageCapBoost
  return (hero.value.vantageRating / maxVantage) * 100
})
const overcoreMult = computed(() => {
  if (!hero.value) return 1
  return getOvercoreDmgMult(hero.value)
})
const rebirthPct = computed(() => Math.min(100, (props.objective.completed / props.objective.totalCompletionsNeeded * 100)))
const cinematicActive = computed(() => isCinematicActive(props.objective.id))
const equippedCount = computed(() => getEquippedCount(props.objective.name))
const gemColor = computed(() => CHAR_GEM_COLOR[props.objective.name] || "reds")
const gemInfo = computed(() => gemColorInfo[gemColor.value] || { dotColor: "#a855f7" })
// HP tick visualization (enemy)
const hpTicks = computed(() => {
  const ticks: { bgColor: string; width: string }[] = []
  const activeBarsCount = hpPct.value * HP_TICK_COUNT
  const fullBars = Math.floor(activeBarsCount)
  const fraction = activeBarsCount % 1
  const depletedCount = HP_TICK_COUNT - fullBars - (fraction > 0 ? 1 : 0)

  for (let i = 0; i < HP_TICK_COUNT; i++) {
    const color = getHPGradientColor(i, HP_TICK_COUNT)
    let bgColor = color
    let width = '100%'
    if (i < depletedCount) {
      bgColor = '#000'
    } else if (fraction > 0 && i === depletedCount) {
      bgColor = color
      width = (fraction * 100) + '%'
    }
    ticks.push({ bgColor, width })
  }
  return ticks
})

// ─── Hex to RGB helper ───
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const val = parseInt(hex.replace('#', ''), 16)
  return { r: (val >> 16) & 255, g: (val >> 8) & 255, b: val & 255 }
}

// Equipped gems for this hero — read from character-owned gemSlots,
// look up via the hero's personal inventory (not global)
const heroEquipped = computed(() => {
  const hero = heroRegistry[props.objective.name]
  const slots = hero ? hero.gemSlots : []
  return slots.map((gemId: string | null) => {
    if (!gemId) return null
    const gem = hero?.inventory?.getGem(gemId)
    if (!gem) return null
    return {
      id: gemId,
      gemIdx: gem.gemIdx,
      color: gem.color,
      path: ALL_GEMS[gem.color]?.[gem.gemIdx] || null,
      gem   // include the Gem instance for GemItem tooltip
    }
  })
})

// ─── Popup position helpers ───
function getHPBarPopupCoords(): { x: number; y: number } {
  // Use the visualizer bar directly for precise HP-bar-level Y positioning
  const el = hpVisualizerRef.value || hpBarRef.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  // Center X on HP bar with random ±8px jitter per instance
  const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 16
  // Y position follows HP %: 100% HP → top of bar, 0% HP → bottom of bar
  const y = rect.top + (1 - hpPct.value) * rect.height
  return { x, y }
}

function emitDMGPopup(dmg: number) {
  const { x, y } = getHPBarPopupCoords()
  emit('tapPopup', { dmg, x, y, obj: props.objective })
}

// Track auto-damage popup signal from game loop (fires once per second)
const lastAutoDmgT = ref(0)
watch(() => props.objective.autoDmgPopup, (val) => {
  if (val && val.t && val.t !== lastAutoDmgT.value) {
    lastAutoDmgT.value = val.t
    emitDMGPopup(val.dmg)
  }
})


// Handle click/tap
function handleTap(event: MouseEvent) {
  const result = tapObjective(event, props.objective.id)
  if (result) {
    emitDMGPopup(result.dmg)
  }
}

// Handle upgrade
function handleUpgrade(event: MouseEvent) {
  event.stopPropagation()
  upgrade(props.objective.name)
}

// Handle rebirth
function handleRebirth(event: MouseEvent) {
  event.stopPropagation()
  rebirthObjective(props.objective.id)
}

// Handle portrait click — toggle slide panel instead of opening overlay
function handlePortraitClick(event: MouseEvent) {
  event.stopPropagation()
  showStatPanel.value = !showStatPanel.value
}

function onImgError(e: Event) {
  const el = e.target as HTMLElement | null
  if (el) el.style.display = 'none'
}

// Canvas video setup
onMounted(() => {
  if (canvasRef.value) {
    registerCanvas(props.objective.id, canvasRef.value)
  }
  applyTheme(cardRef.value, props.objective.name)
})

onUnmounted(() => {
  unregisterCanvas(props.objective.id)
})

// Faction theming: single-hero surface → keep [data-faction] in sync with the card's hero
watch(() => props.objective.name, (name) => {
  applyTheme(cardRef.value, name)
})

// NOTE: Gem movement (drag & drop) is intentionally disabled on the main game screen.
// All gem management (equip/unequip/rearrange) is handled in the standalone gems tab
// via GemTab.vue. This ensures consistent state management through saveGemChanges().
</script>

<template>
  <div
    ref="cardRef"
    class="rpg-card"
    :id="'card-' + objective.id"
    data-dev-label="Game Card"
    :style="{
      '--hero-color': theme.color,
      '--hero-bright': theme.bright,
      '--hero-glow': theme.glow,
      borderColor: theme.color + '55',
      boxShadow: '0 0 15px ' + theme.color + '22, inset 0 0 30px ' + theme.color + '11'
    }"
    @click="handleTap"
  >
    <!-- Card Main Content Row (portrait + cinematic side by side) -->
    <div class="card-main-row">
    <!-- Portrait Section -->
    <div class="portrait-div">
      <div
        class="portrait-frame"
        :class="{ 'panel-open': showStatPanel }"
        :style="{ borderColor: showStatPanel ? theme.color : theme.color + '33' }"
        @click="handlePortraitClick"
      >
        <!-- Panel open indicator arrow -->
        <div class="portrait-toggle-arrow" :class="{ open: showStatPanel }">▾</div>
        <img
          :src="objective.portraitUrl || ''"
          :alt="objective.name"
          loading="lazy"
          @error="onImgError"
        />
        <!-- XP Bar (3px vertical, theme-colored) -->
        <div
          class="portrait-xp-bar"
          :style="{
            borderColor: theme.color + '55',
            boxShadow: '0 0 6px ' + theme.color + '33'
          }"
        >
          <div
            class="portrait-xp-fill"
            :style="{
              height: Math.min(100, (hero.xp / hero.maxXp * 100)) + '%',
              backgroundImage: 'linear-gradient(0deg, ' + theme.color + ', ' + theme.bright + ' 40%, ' + theme.bright + ', #fff)',
              boxShadow: '0 0 12px ' + theme.color + '88, inset 0 0 6px #fff3'
            }"
          ></div>
        </div>
        <!-- Level Badge -->
        <div
          class="portrait-level-badge"
          :style="{
            borderColor: theme.color + '66',
            color: theme.bright,
            boxShadow: '0 0 8px ' + theme.color + '33, inset 0 0 4px ' + theme.color + '22'
          }"
        >
          <span class="level-label">LV</span>
          <span class="level-val">{{ hero.level }}</span>
        </div>
        <!-- Vantage Badge -->
        <div
          class="vantage-badge"
          :class="{ maxed: hero.vantageRating >= 99 }"
          :style="{
            borderColor: hero.vantageRating >= 99 ? '#22d3ee' : '#f59e0b',
            color: hero.vantageRating >= 99 ? '#22d3ee' : '#f59e0b'
          }"
        >
          <span class="vantage-label">V</span>
          <span class="vantage-val">{{ Math.floor(hero.vantageRating) }}</span>
        </div>
        <!-- Overcore Damage Badge (visible only when vantage > 99) -->
        <div
          v-if="hero.vantageRating > 99"
          class="overcore-badge"
          :style="{
            borderColor: '#f43f5e',
            color: '#f43f5e'
          }"
          :title="'Overcore Damage: x' + overcoreMult.toFixed(2) + ' (' + (hero.vantageRating - 99) + ' OC points @ 1.12x each)'"
        >
          <span class="overcore-label">OC</span>
          <span class="overcore-val">x{{ overcoreMult.toFixed(1) }}</span>
        </div>
      </div>
    </div>

    <!-- Cinematic Right Wrap -->
    <div class="cinematic-right-wrap">
      <div class="cinematic-div">
        <!-- Video Canvas -->
        <canvas
          ref="canvasRef"
          class="video-canvas"
          :style="{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
            pointerEvents: 'none',
            imageRendering: 'auto',
            filter: 'contrast(1.15) brightness(.75) saturate(1.3)'
          }"
        ></canvas>
        <!-- Cinematic Overlay -->
        <div
          class="cinematic-overlay"
          :style="{
            background: 'linear-gradient(90deg, rgba(13,13,20,.7) 0%, transparent 40%, transparent 60%, rgba(13,13,20,.7) 100%), linear-gradient(180deg, ' + theme.color + '15 0%, transparent 50%, ' + theme.color + '15 100%)'
          }"
        ></div>
        <!-- Tactical Bar (vantage progress) -->
        <div
          class="tactical-bar-bg"
          :style="{
            borderColor: theme.color + '44',
            boxShadow: 'inset 0 1px 3px #000c, 0 0 6px ' + theme.color + '33'
          }"
        >
          <div
            class="tactical-bar-fill"
            :style="{
              width: Math.min(100, Math.max(0, vantagePct)) + '%',
              backgroundImage: 'linear-gradient(90deg, ' + theme.color + ' 0%, ' + theme.bright + ' 60%, ' + theme.color + ' 100%)',
              boxShadow: '0 0 18px ' + theme.glow + ', inset 0 0 8px #ffffff26'
            }"
          ></div>
        </div>
        <!-- Stat Badges -->
        <div class="stat-badge">
          <span
            class="stat-item force-stat"
            :style="{
              borderColor: theme.color + '55',
              color: theme.bright,
              boxShadow: '0 0 8px ' + theme.color + '33, inset 0 0 4px ' + theme.color + '22'
            }"
          >
            <span class="stat-label">FORCE</span>
            <span class="stat-val hero-army-val">{{ formatNotation(objective.heroArmy) }}</span>
          </span>
          <span class="stat-item dps-stat">
            <span class="stat-label">AUTO DPS</span>
            <span class="stat-val strike-dps-val">{{ formatNotation(totalAutoDps) }}/s</span>
          </span>
        </div>
        <!-- Completion Badge -->
        <div
          class="completion-badge"
          :style="{
            color: theme.bright,
            borderColor: theme.color + '88',
            boxShadow: '0 0 12px ' + theme.color + '66, inset 0 0 8px ' + theme.color + '33'
          }"
        >
          <span class="stage-val">{{ objective.completed }}</span>
        </div>
        <!-- Rebirth Button -->
        <button
          class="rebirth-btn"
          :style="{
            color: theme.bright,
            borderColor: theme.color + '88',
            boxShadow: '0 0 12px ' + theme.color + '66, inset 0 0 8px ' + theme.color + '33',
            textShadow: '0 0 4px ' + theme.color + '66'
          }"
          @click="handleRebirth"
        >
          <span class="rebirth-pct-val">{{ Math.floor(rebirthPct) }}%</span>
        </button>
        <!-- Upgrade Button -->
        <div class="card-footer">
          <button
            class="btn-plus"
            :style="{
              background: 'linear-gradient(135deg, ' + theme.color + ', ' + theme.bright + ')',
              boxShadow: '0 0 10px ' + theme.color + '66',
              borderColor: theme.color + '88',
              animation: 'btn-force-pulse 1.2s ease-in-out infinite'
            }"
            @click="handleUpgrade"
          >+</button>
        </div>
        <!-- Gems Grid (inside cinematic div, above tactical bar) -->
        <div class="gems-grid" :data-hero="objective.name">
          <div
            v-for="(gemData, slotIdx) in heroEquipped"
            :key="'gs-' + slotIdx"
            class="gem-slot"
            :data-slot-hero="objective.name"
            :data-slot-idx="slotIdx"
            :data-has-gem="gemData !== null ? '1' : undefined"
            :style="{ borderColor: gemInfo.dotColor + 'aa' }"
            @mouseenter="gemData && gemData.gem ? showTooltip(gemData.gem, $event.clientX, $event.clientY, 16, -10, null, false) : null"
            @mouseleave="hideTooltip()"
            @mousemove="gemData && gemData.gem ? updatePosition($event.clientX, $event.clientY) : null"
          >
            <GemItem
              v-if="gemData !== null && gemData.gem"
              :gem="gemData.gem"
              :color="gemInfo.dotColor"
            />
            <span v-else class="gem-slot-idx">{{ slotIdx + 1 }}</span>
          </div>
        </div>
      </div>

      <!-- HP Visualizer (Info Div) -->
      <div ref="hpBarRef" class="info-div" :style="{ borderLeftColor: theme.color + '33' }">
        <span class="hostile-hp-top-badge">
          <span class="stat-val enemy-army-val">{{ formatNotation(objective.enemyArmyCurrent) }}</span>
        </span>
        <div class="hp-visualizer-frame">
          <div ref="hpVisualizerRef" class="hp-visualizer-inner">
            <div
              v-for="tick in hpTicks"
              class="hp-tick"
              :style="{ backgroundColor: tick.bgColor, width: tick.width }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- Stat Slide Panel (hidden by default, slides into view when toggled) -->
    <div class="stat-slide-wrapper" :class="{ open: showStatPanel }">
      <div class="stat-slide-inner">
        <StatSlidePanel
          v-show="showStatPanel"
          :hero-name="props.objective.name"
          :objective="props.objective"
        />
      </div>
    </div>

  </div>
</template>

<style scoped>
.rpg-card {
  position: relative;
  background: var(--card-bg, #0d0d14);
  border: 1px solid var(--blazblue-border, rgba(168,85,247,.3));
}

/* ── Card Base ── */
.rpg-card {
  background: var(--card-bg, #0d0d14);
  border: 1px solid var(--blazblue-border, rgba(168,85,247,.3));
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  height: auto;
  min-height: 155px;
  width: 100%;
  max-width: 537px;
  flex-shrink: 0;
  position: relative;
  overflow: visible;
  cursor: pointer;
  z-index: 10;
  margin-bottom: 0;
  transition: transform .1s ease, border-color .3s ease, box-shadow .3s ease;
  box-shadow: 0 0 15px #a855f714, inset 0 0 30px #a855f708;
}

.card-main-row {
  display: flex;
  flex-direction: row;
  height: 155px;
  flex-shrink: 0;
}
.rpg-card:hover {
  border-color: #a855f799;
  box-shadow: 0 0 20px #a855f726, inset 0 0 30px #a855f70d;
}
.rpg-card:before,
.rpg-card:after {
  content: "";
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: var(--hero-color, #a855f7);
  border-style: solid;
  opacity: .5;
  pointer-events: none;
  z-index: 35;
}
.rpg-card:before {
  top: -1px;
  left: -1px;
  border-width: 2px 0 0 2px;
}
.rpg-card:after {
  content: "";
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: var(--hero-color, #a855f7);
  border-style: solid;
  opacity: .5;
  pointer-events: none;
  z-index: 35;
  bottom: -1px;
  right: -1px;
  border-width: 0 2px 2px 0;
}

/* ── Portrait Toggle Arrow ── */
.portrait-toggle-arrow {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%) rotate(0deg);
  font-size: 8px;
  color: var(--hero-bright, #c084fc);
  opacity: .6;
  transition: transform .3s ease, opacity .3s ease;
  pointer-events: none;
  line-height: 1;
}
.portrait-toggle-arrow.open {
  transform: translateX(-50%) rotate(180deg);
  opacity: 1;
}

/* ── Stat Slide Wrapper (instant toggle, no animation) ── */
.stat-slide-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  width: 100%;
}

.stat-slide-wrapper.open {
  grid-template-rows: 1fr;
}

.stat-slide-inner {
  overflow: hidden;
  min-height: 0;
}

/* ── Portrait frame panel-open state ── */
.portrait-frame.panel-open {
  border-color: var(--hero-color, #a855f7) !important;
  box-shadow: 0 0 16px var(--hero-glow, rgba(168,85,247,.6)), 0 0 30px var(--hero-glow, rgba(168,85,247,.3)) !important;
}

/* ── Cinematic Right Wrap needs to stay flex row ── */
.cinematic-right-wrap {
  flex-shrink: 0;
}
</style>
