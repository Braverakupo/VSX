<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { gameState, formatNotation, lvlPlusOneAll } from '../composables/useGameState'
import { heroThemes, CHAR_GEM_COLOR } from '../config/gameData'
import { applyTheme } from '../composables/cssScripts'
import GemRotary from './GemRotary.vue'

type GemColorKey = 'reds' | 'blues' | 'oranges' | 'cyans' | 'purples' | 'blacks'

const emit = defineEmits<{
  (e: 'openTutorial'): void
  (e: 'openGallery'): void
  (e: 'openSettings'): void
  (e: 'openLanding'): void
}>()

// Template ref to GemRotary for programmatic advancement via title click
const gemRotaryRef = ref<InstanceType<typeof GemRotary> | null>(null)

// Root surface ref for [data-faction] theming (follows the rotary's active hero)
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

// Faction theming: header surface reflects the active hero chip (rotary selection)
const activeHeroName = computed(() => colorToChar[selectedGemColor.value])
watch(activeHeroName, (name) => {
  applyTheme(headerRef.value, name)
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
  applyTheme(headerRef.value, activeHeroName.value)
  updateInterval = setInterval(updateHeaderStats, 100)
})

onUnmounted(() => {
  if (updateInterval) clearInterval(updateInterval)
})

function onTitleClick() {
  gemRotaryRef.value?.nextGem()
  emit('openTutorial')
}
</script>

<template>
  <div class="header" ref="headerRef">
    <div class="header-left">
      <div class="title" :style="{ color: titleTheme.color }" @click="onTitleClick">VANTAGE STRIKE</div>
      <GemRotary ref="gemRotaryRef" @char-change="selectedGemColor = $event" @close-dropdowns="onCloseDropdowns" />
      <button class="z-btn z-btn--mini" @click="emit('openTutorial')" title="How to Play">[?]</button>
      <button class="z-btn z-btn--mini" @click="emit('openGallery')" title="View all assets">[G]</button>
      <button class="z-btn z-btn--mini" @click="emit('openLanding')" title="Lore & Profiles">[L]</button>
    </div>
    <div class="header-right">
      <div class="header-stat gold-stat">
        <span class="label">GOLD</span>
        <span class="value gold-value">{{ formatNotation(totalCharGold) }}</span>
        <span class="value gold-rate">{{ goldRateDisplay }}</span>
        <button class="z-btn z-btn--mini" @click="lvlPlusOneAll" title="Lvl+1 All (cheat)">+1</button>
        <button class="z-btn z-btn--mini" @click="emit('openSettings')" title="Settings">⚙</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  padding: 4px 10px;
  background: linear-gradient(180deg, #0d0d14 0%, #0a0a12 100%);
  border-bottom: 1px solid rgba(168,85,247,.1);
  flex-shrink: 0;
  z-index: 100;
  min-height: 40px;
  width: 100%;
  max-width: 537px;
  align-self: center;
  align-items: center;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.header-left .title {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 1px;
  cursor: pointer;
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
</style>
