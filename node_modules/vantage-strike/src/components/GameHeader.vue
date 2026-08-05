<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { gameState, formatNotation, lvlPlusOneAll } from '../composables/useGameState'
import { heroThemes, CHAR_GEM_COLOR } from '../config/gameData'
import { applyTheme } from '../composables/cssScripts'
import GemRotary from './GemRotary.vue'

type GemColorKey = 'reds' | 'blues' | 'oranges' | 'cyans' | 'purples' | 'blacks'

/**
 * Top Navigation sections. 'home' is the outside (landing page) state;
 * the rest are the deeper navigations available inside the game.
 */
export type NavSection = 'home' | 'lore' | 'characters' | 'play' | 'assets'

const props = defineProps<{
  /** Active section (inside the game). */
  section?: NavSection
  /** Outside state — the landing page is open. */
  landingOpen?: boolean
  /** Optional external faction theme (e.g. character select hero) that
      overrides the rotary's active hero for the header's [data-faction]. */
  themeOverride?: string | null
}>()

const emit = defineEmits<{
  (e: 'navigate', target: NavSection): void
  (e: 'openSettings'): void
}>()

// ── Top navigation bar ──
const NAV_ITEMS: NavSection[] = ['home', 'lore', 'characters', 'play', 'assets']
const navItems = computed<NavSection[]>(() => (props.landingOpen ? ['home'] : NAV_ITEMS))
const activeItem = computed<NavSection>(() => (props.landingOpen ? 'home' : (props.section ?? 'play')))

function onNav(target: NavSection) {
  // While outside, [HOME] acts as the entry button — jump into the game.
  if (target === 'home' && props.landingOpen) {
    emit('navigate', 'play')
    return
  }
  emit('navigate', target)
}

// Template ref to GemRotary for programmatic advancement via title click
const gemRotaryRef = ref<InstanceType<typeof GemRotary> | null>(null)

// Root surface ref for [data-faction] theming (follows the active theme)
const headerRef = ref<HTMLElement | null>(null)

// Selected gem color key from rotary (maps color → character for job medals)
const selectedGemColor = ref<GemColorKey>('reds')
let prevSelectedColor: GemColorKey = 'reds'

// Counter that increments on rotary click to signal GameCards to close dropdowns
const closeDropdownsKey = ref(0)
function onCloseDropdowns() {
  closeDropdownsKey.value++
}

// Map color → character name
const colorToChar: Record<GemColorKey, string> = {
  reds: 'Voltkin', blues: 'Ashbeam', oranges: 'Crypsis',
  cyans: 'Spectra', purples: 'Hellshift', blacks: 'Kailin'
}

// When rotary advances, move the PREVIOUS character's card to bottom
watch(selectedGemColor, (newColor) => {
  if (prevSelectedColor === newColor) return
  const prevChar = colorToChar[prevSelectedColor]
  if (prevChar) {
    const idx = gameState.objectives.findIndex(o => o.name === prevChar)
    if (idx >= 0 && idx < gameState.objectives.length - 1) {
      const [obj] = gameState.objectives.splice(idx, 1)
      gameState.objectives.push(obj)
    }
  }
  prevSelectedColor = newColor
})

// Current character theme for the title gradient
const titleTheme = computed(() => {
  const charName = colorToChar[selectedGemColor.value]
  return heroThemes[charName] || heroThemes.Voltkin
})

// Faction theming: header surface reflects the active hero chip (rotary
// selection), unless an external theme override is provided (e.g. the
// character select screen's selected pilot).
const activeHeroName = computed(() => colorToChar[selectedGemColor.value])
const effectiveTheme = computed(() => props.themeOverride || activeHeroName.value)
watch([effectiveTheme, () => props.landingOpen], () => {
  applyTheme(headerRef.value, effectiveTheme.value)
})

// Reactive values for header display
const totalCharGold = ref(0)
const goldRateDisplay = ref('+0/s')
let updateInterval: ReturnType<typeof setInterval> | null = null

function updateHeaderStats() {
  let totalGoldRate = 0
  gameState.objectives.forEach(obj => {
    totalGoldRate += obj.completed * obj.grade
  })
  const gold = gameState.gold || 0
  totalCharGold.value = gold < 1000 ? Math.floor(gold) : gold
  const rate = totalGoldRate
  let formattedRate: string
  if (rate < 1000) {
    formattedRate = Math.floor(rate).toString()
  } else {
    formattedRate = formatNotation(rate)
  }
  goldRateDisplay.value = ('+' + formattedRate + '/s').padEnd(9)
}

// Sync rotary to top character on mount
onMounted(async () => {
  const topChar = gameState.objectives[0]?.name
  if (topChar) {
    const color = (CHAR_GEM_COLOR[topChar] as GemColorKey | undefined) || 'reds'
    prevSelectedColor = color
    selectedGemColor.value = color
    gemRotaryRef.value?.setActiveColor(color)
  }
  applyTheme(headerRef.value, effectiveTheme.value)
  updateInterval = setInterval(updateHeaderStats, 100)
})

onUnmounted(() => {
  if (updateInterval) clearInterval(updateInterval)
})

function onTitleClick() {
  gemRotaryRef.value?.nextGem()
}
</script>

<template>
  <div class="header" ref="headerRef">
    <div class="header-top">
      <div class="header-left">
        <div class="title" :style="{ color: titleTheme.color }" @click="onTitleClick">VANTAGE STRIKE</div>
        <GemRotary v-if="!landingOpen" ref="gemRotaryRef" @char-change="selectedGemColor = $event" @close-dropdowns="onCloseDropdowns" />
      </div>
      <div v-if="!landingOpen" class="header-right">
        <div class="header-stat gold-stat">
          <span class="label">GOLD</span>
          <span class="value gold-value">{{ formatNotation(totalCharGold) }}</span>
          <span class="value gold-rate">{{ goldRateDisplay }}</span>
          <button class="z-btn z-btn--mini" @click="lvlPlusOneAll" title="Lvl+1 All (cheat)">+1</button>
          <button class="z-btn z-btn--mini" @click="emit('openSettings')" title="Settings">⚙</button>
        </div>
      </div>
    </div>

    <!-- Top Navigation Bar: [Home] [Lore] [Characters] [Play] [Assets].
         The active section drops its brackets, takes the themed color, and
         shows a glowing themed underline. -->
    <nav class="header-nav">
      <button
        v-for="item in navItems"
        :key="item"
        class="nav-item"
        :class="{ active: activeItem === item }"
        @click="onNav(item)"
      >
        <span v-if="activeItem !== item" class="nav-bracket">[</span>
        {{ item }}
        <span v-if="activeItem !== item" class="nav-bracket">]</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  flex-direction: column;
  padding: 5px 10px 4px;
  background: linear-gradient(180deg, #0d0d14 0%, #0a0a12 100%);
  border-bottom: 1px solid rgba(168,85,247,.1);
  flex-shrink: 0;
  z-index: 100;
  width: 100%;
  max-width: 780px;
  align-self: center;
}
.header-top {
  display: flex;
  align-items: center;
  gap: 6px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.header-left .title {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 1px;
  cursor: pointer;
  white-space: nowrap;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.header-stat {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 700;
  font-family: monospace;
}
.header-stat .label {
  color: #64748b;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.header-stat .value {
  color: #f59e0b;
}
.header-stat .value.gold-rate {
  color: #94a3b8;
  font-size: 10px;
}
.header-stat.gold-stat {
  gap: 4px;
}
.header-stat .gold-value {
  flex: 0 0 6ch;
  text-align: right;
}
.header-stat .gold-rate {
  flex: 0 0 9ch;
}

/* ── Navigation ── */
.header-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  margin-top: 3px;
  flex-wrap: wrap;
}
.nav-item {
  position: relative;
  background: none;
  border: none;
  padding: 5px 9px;
  color: var(--z-text-muted, #94a3b8);
  font-family: var(--z-font-mono, monospace);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: color .15s ease, text-shadow .15s ease;
}
.nav-bracket {
  color: var(--z-text-secondary, #64748b);
  opacity: .75;
}
.nav-item:hover:not(.active) {
  color: var(--hero-bright, #93c5fd);
  text-shadow: 0 0 8px var(--hero-glow, rgba(59,130,246,.5));
}
.nav-item.active {
  color: var(--hero-bright, #93c5fd);
  text-shadow: 0 0 10px var(--hero-glow, rgba(59,130,246,.6)), 0 0 26px var(--hero-glow, rgba(59,130,246,.4));
}
.nav-item.active::after {
  content: '';
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: 1px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--hero-color, #3b82f6), transparent);
  box-shadow: 0 0 8px var(--hero-glow, rgba(59,130,246,.7)), 0 0 18px var(--hero-glow, rgba(59,130,246,.5));
  animation: nav-glow-pulse 1.6s ease-in-out infinite alternate;
}
@keyframes nav-glow-pulse {
  from { opacity: .6; }
  to { opacity: 1; }
}
</style>
