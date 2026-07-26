<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { gameState, formatNotation, initGame, cleanupGame, lvlPlusOneAll } from './composables/useGameState.js'
import { initVideoSystem, cleanupVideoSystem, updateVideoForObjective, videoEnabled, toggleVideo, reduceDmgNumbers } from './composables/useVideoPool.js'
import { heroThemes, CHAR_GEM_COLOR } from './config/gameData.js'
import GameCard from './components/GameCard.vue'
import GemTooltip from './components/GemTooltip.vue'
import GemRotary from './components/GemRotary.vue'
import SettingsOverlay from './components/SettingsOverlay.vue'

// Template ref to GemRotary for programmatic advancement via title click
const gemRotaryRef = ref(null)

// Selected gem color key from rotary (maps color → character for job medals)
const selectedGemColor = ref('reds')
let prevSelectedColor = 'reds'

// Counter that increments on rotary click to signal GameCards to close dropdowns
const closeDropdownsKey = ref(0)
function onCloseDropdowns() {
  closeDropdownsKey.value++
}

// Scrollable cards container ref
const cardsScrollRef = ref(null)

// Map color → character name
const colorToChar = {
  reds: 'Voltkin', blues: 'Ashbeam', oranges: 'Crypsis',
  cyans: 'Spectra', purples: 'Hellshift', blacks: 'Kailin'
}

// When rotary advances, move the PREVIOUS character's card to bottom
// so the new character naturally rises to the top
watch(selectedGemColor, (newColor) => {
  // Skip reorder if the color hasn't actually changed (e.g. initial load sync)
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

// Reactive values for header display
const totalCharGold = ref(0)
const goldRateDisplay = ref('+0/s')
// Throttled UI update
let updateInterval = null

function updateHeaderStats() {
  // Calculate total gold rate
  let totalGoldRate = 0
  gameState.objectives.forEach(obj => {
    totalGoldRate += obj.completed * obj.grade
  })

  // Universal gold from gameState.gold
  const gold = gameState.gold || 0
  if (gold < 1000) {
    totalCharGold.value = Math.floor(gold)
  } else {
    totalCharGold.value = gold
  }

  // Gold rate: whole numbers below 1K, notation with decimals above
  const rate = totalGoldRate
  let formattedRate
  if (rate < 1000) {
    formattedRate = Math.floor(rate).toString()
  } else {
    formattedRate = formatNotation(rate)
  }
  goldRateDisplay.value = ('+' + formattedRate + '/s').padEnd(9)
}

// Settings overlay
const showSettings = ref(false)

// Popup management
const popups = ref([])
let popupIdCounter = 0

function spawnTapPopup(payload) {
  // When reduce-dmg mode is on, only show popups for the first (top) character
  if (reduceDmgNumbers.value) {
    const firstObj = gameState.objectives[0]
    if (!firstObj || payload.obj?.id !== firstObj.id) return
  }
  const id = ++popupIdCounter
  popups.value.push({ ...payload, id })
  setTimeout(() => {
    popups.value = popups.value.filter(p => p.id !== id)
  }, 600)
}

function spawnLevelUpPopup(heroName) {
  // This would be emitted from GameCard
}

function spawnStatPointPopup(heroName) {
  // This would be emitted from GameCard
}

function spawnGemAward(heroName) {
  // This would be emitted from GameCard
}

// ── Hidden cursor — dispatches hover events without visual ──
const cursorEl = ref(null)
let lastHoveredEl = null

function dispatchHover(x, y) {
  // Find what's under the cursor using elementFromPoint
  const el = document.elementFromPoint(x, y)
  if (el === lastHoveredEl) return
  // Leave previous element — synthetic events don't need to bubble
  // (bubbling would re-trigger the document listener and cause infinite recursion)
  if (lastHoveredEl) {
    lastHoveredEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false, clientX: x, clientY: y }))
  }
  lastHoveredEl = el
  // Enter new element
  if (el) {
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, clientX: x, clientY: y }))
    el.dispatchEvent(new MouseEvent('mousemove', { bubbles: false, clientX: x, clientY: y }))
  }
}

function updateCursor(x, y) {
  dispatchHover(x, y)
}

function onPointerMove(e) {
  const p = e.touches ? e.touches[0] : e
  updateCursor(p.clientX, p.clientY)
}

function onPointerLeave() {
  if (lastHoveredEl) {
    lastHoveredEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
    lastHoveredEl = null
  }
}

function onTouchStart(e) {
  const touch = e.touches[0]
  updateCursor(touch.clientX, touch.clientY)
}

// The real onMounted — also sets up cursor listeners
onMounted(async () => {
  document.addEventListener('contextmenu', e => e.preventDefault())
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseleave', onPointerLeave)
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onPointerMove, { passive: true })
  await initGame()

  // Sync rotary to whichever character is at the top of the saved objective list
  // Set prevSelectedColor BEFORE selectedGemColor so the reorder watcher
  // sees no effective change and skips the reorder.
  const topChar = gameState.objectives[0]?.name
  if (topChar) {
    const color = CHAR_GEM_COLOR[topChar] || 'reds'
    prevSelectedColor = color
    selectedGemColor.value = color
    gemRotaryRef.value?.setActiveColor(color)
  }

  initVideoSystem()

  // Watch for new objectives to assign video
  watch(() => gameState.objectives.length, () => {
    gameState.objectives.forEach(obj => {
      if (obj.mp4Url) {
        updateVideoForObjective(obj)
      }
    })
  })

  // UI update every 100ms (10fps) — auto-save is handled by initGame() interval
  updateInterval = setInterval(updateHeaderStats, 100)
})

onUnmounted(() => {
  cleanupGame()
  cleanupVideoSystem()
  if (updateInterval) clearInterval(updateInterval)
})
</script>

<template>
  <!-- Game View (flex column) -->
  <div id="game-view" data-dev-label="Game View">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="title" :style="{ color: titleTheme.color }" @click="gemRotaryRef?.nextGem()">VANTAGE STRIKE</div>
        <GemRotary ref="gemRotaryRef" @char-change="selectedGemColor = $event" @close-dropdowns="onCloseDropdowns" />
      </div>
      <div class="header-right">
        <div class="header-stat gold-stat">
          <span class="label">CHARACTER GOLD</span>
          <span class="value gold-value">{{ formatNotation(totalCharGold) }}</span>
          <span class="value gold-rate">{{ goldRateDisplay }}</span>
          <button class="cheat-btn" @click="lvlPlusOneAll" title="Lvl+1 All (cheat)">+1</button>
          <button class="settings-btn" @click="showSettings = !showSettings" title="Settings">⚙</button>
        </div>
      </div>
    </div>

    <!-- Content Row (cards + gem sidebar, centered together) -->
    <div class="content-row" data-dev-label="Content Row">
      <!-- Scrollable Objectives -->
      <div class="cards-scroll" data-dev-label="Cards Scroll" ref="cardsScrollRef">
        <div class="cards-column">
          <GameCard
            v-for="obj in gameState.objectives"
            :key="obj.id"
            :objective="obj"
            :close-dropdowns-key="closeDropdownsKey"
            @tap-popup="spawnTapPopup"
          />
        </div>
      </div>

    </div>

    <!-- Damage Popups (hidden while gems tab is open) -->
    <Teleport to="body">
      <div
        v-for="popup in popups"
        :key="popup.id"
        class="tap-dmg-popup"
        :style="{
          left: popup.x + 'px',
          top: popup.y + 'px'
        }"
      >
        {{ formatNotation(popup.dmg, 1) }}
      </div>
    </Teleport>

    <!-- Blue touch dot — teleported to body for top-layer visibility -->
    <Teleport to="body">
      <div ref="cursorEl" class="cursor-glow" style="display:none"></div>
    </Teleport>

    <!-- Settings Overlay -->
    <SettingsOverlay v-if="showSettings" @close="showSettings = false" />

    <!-- Gem Tooltip (POE-style, teleported to body) -->
    <GemTooltip />

  </div>
</template>

<style scoped>
/* ── Game View (flex column) ── */
#game-view {
  width: 100vw;
  max-width: 780px;
  height: 100vh;
  margin: 0 auto;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  background: #030305;
  border-left: 1px solid rgba(168,85,247,.1);
  border-right: 1px solid rgba(168,85,247,.1);
  box-shadow: 0 0 40px #a855f708;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* ── Header ── */
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
}
.header-left .subtitle {
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
  letter-spacing: .5px;
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
.header-stat .rate-label {
  margin-left: 2px;
}
.header-stat .gold-rate {
  flex: 0 0 9ch;
}

/* ── Cheat Button ── */
.cheat-btn {
  background: none;
  border: 1px solid rgba(168,85,247,.15);
  color: #64748b;
  font-family: monospace;
  font-size: 9px;
  font-weight: 700;
  padding: 0 4px;
  height: 18px;
  border-radius: 2px;
  cursor: pointer;
  transition: all .15s;
  line-height: 18px;
  opacity: 0.4;
}
.cheat-btn:hover {
  opacity: 1;
  border-color: #a855f7;
  color: #c084fc;
  background: rgba(168,85,247,.08);
}
.cheat-btn:active {
  transform: scale(.95);
}

/* ── Settings Button ── */
.settings-btn {
  background: none;
  border: 1px solid rgba(168,85,247,.15);
  color: #64748b;
  font-size: 14px;
  line-height: 1;
  padding: 0 4px;
  height: 18px;
  border-radius: 2px;
  cursor: pointer;
  transition: all .15s;
  opacity: 0.4;
  display: flex;
  align-items: center;
}
.settings-btn:hover {
  opacity: 1;
  border-color: #a855f7;
  color: #c084fc;
  background: rgba(168,85,247,.08);
}
.settings-btn:active {
  transform: scale(.95);
}

/* ── Content Row (centers the cards + gem group) ── */
.content-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex: 1;
  min-height: 0;
}

/* ── Cards Scroll (scrollable, width matches cards) ── */
.cards-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: 10px 0 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 537px;
  width: 100%;
}
.cards-scroll::-webkit-scrollbar { display: none; }

/* ── Cards Column (stacks objectives vertically) ── */
.cards-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
}

/* ── Save Notification ── */
.save-notification {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #000000e6;
  border: 1px solid #a855f7;
  color: #c084fc;
  padding: 6px 16px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  z-index: 9999;
  opacity: 0;
  transition: opacity .3s ease;
  pointer-events: none;
  box-shadow: 0 0 20px #a855f74d;
}
.save-notification.show {
  opacity: 1;
}

/* ── Remote Sync Notification ── */
.sync-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #1a0a0ae6;
  border: 1px solid #f97316;
  color: #fb923c;
  padding: 8px 16px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  z-index: 9999;
  opacity: 0;
  transition: opacity .3s ease;
  pointer-events: none;
  box-shadow: 0 0 20px #f973164d;
  display: flex;
  align-items: center;
  gap: 10px;
}
.sync-notification.show {
  opacity: 1;
  pointer-events: auto;
}
.sync-reload-btn {
  background: #f97316;
  border: none;
  color: #0a0a12;
  font-family: monospace;
  font-size: 10px;
  font-weight: 900;
  padding: 3px 10px;
  border-radius: 3px;
  cursor: pointer;
  transition: all .15s;
  letter-spacing: .5px;
}
.sync-reload-btn:hover {
  background: #fb923c;
  transform: scale(1.05);
}
.sync-reload-btn:active {
  transform: scale(.95);
}

/* ── Account Select Dropdown ── */
.account-select {
  background: #0a0a12;
  border: 1px solid rgba(168,85,247,.25);
  border-radius: 3px;
  color: #c084fc;
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 4px;
  cursor: pointer;
  outline: none;
  transition: border-color .15s;
  min-width: 56px;
  height: 22px;
}
.account-select:hover {
  border-color: #a855f7;
}
.account-select:focus {
  border-color: #a855f7;
  box-shadow: 0 0 6px rgba(168,85,247,.2);
}
.account-select option {
  background: #0a0a12;
  color: #c084fc;
}


/* ── Damage Popup ── */
:global(.tap-dmg-popup) {
  position: fixed;
  pointer-events: none;
  z-index: 9998;
  font-family: monospace;
  font-size: 14px;
  font-weight: 900;
  color: #ef4444;
  text-shadow: 0 0 8px rgba(239,68,68,.6), 0 1px 3px rgba(0,0,0,.8);
  will-change: transform, opacity;
  animation: tap-dmg-float .6s ease-out forwards;
  white-space: nowrap;
}
@keyframes tap-dmg-float {
  0% { opacity: 1; transform: translate3d(-50%, -50%, 0) scale(.6); }
  40% { opacity: 1; transform: translate3d(-50%, -100%, 0) scale(1.1); }
  to { opacity: 0; transform: translate3d(-50%, -160%, 0) scale(.8); }
}

/* ── Blue Touch Dot ── */
:global(.cursor-glow) {
  position: fixed;
  pointer-events: none;
  z-index: 99999;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 6px rgba(56,189,248,.8), 0 0 16px rgba(56,189,248,.3);
}
</style>
