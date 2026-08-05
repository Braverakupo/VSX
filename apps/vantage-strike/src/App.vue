<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { gameState, formatNotation, initGame, cleanupGame } from './composables/useGameState'
import { initVideoSystem, cleanupVideoSystem, updateVideoForObjective, reduceDmgNumbers } from './composables/useVideoPool'
import { applyTheme } from './composables/cssScripts'
import GameHeader from './components/GameHeader.vue'
import type { NavSection } from './components/GameHeader.vue'
import GameCard from './components/GameCard.vue'
import GemTooltip from './components/GemTooltip.vue'
import TutorialOverlay from './components/TutorialOverlay.vue'
import GalleryOverlay from './components/GalleryOverlay.vue'
import SettingsOverlay from './components/SettingsOverlay.vue'
import LandingView from './components/LandingView.vue'
import CharacterSelect from './components/CharacterSelect.vue'

interface TapPopupPayload {
  dmg: number
  x: number
  y: number
  obj?: { id: string } | null
}

interface TapPopup extends TapPopupPayload {
  id: number
}

// ── Overlay visibility ──
const showTutorial = ref(false)
const showSettings = ref(false)

// ── Navigation ──
// The landing page is the outside 'home' state. Inside the game the top nav
// switches between Play / Lore / Characters / Assets sections.
const showLanding = ref(false)
const section = ref<Exclude<NavSection, 'home'>>('play')
const charSelectHero = ref('Ashbeam')

function onNavigate(target: NavSection) {
  if (target === 'home') {
    showLanding.value = true
    section.value = 'play'
  } else {
    showLanding.value = false
    section.value = target
  }
}

// ── Damage popups ──
// MUST be disabled when the application is not in the active game screen:
// any overlay open, a non-play section, or the tab hidden.
const popups = ref<TapPopup[]>([])
let popupIdCounter = 0

const isGameScreenActive = computed(() =>
  section.value === 'play' &&
  !showLanding.value &&
  !showTutorial.value &&
  !showSettings.value &&
  document.visibilityState === 'visible'
)

function spawnTapPopup(payload: TapPopupPayload) {
  if (!isGameScreenActive.value) return
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

// Faction theming: root surface follows the active (top) hero
const gameViewRef = ref<HTMLElement | null>(null)
const activeHero = computed(() => gameState.objectives[0]?.name ?? 'Voltkin')
watch(activeHero, (name) => {
  applyTheme(gameViewRef.value, name)
})

onMounted(async () => {
  document.addEventListener('contextmenu', e => e.preventDefault())
  await initGame()
  initVideoSystem()
  applyTheme(gameViewRef.value, activeHero.value)

  watch(() => gameState.objectives.length, () => {
    gameState.objectives.forEach(obj => {
      if (obj.mp4Url) updateVideoForObjective(obj)
    })
  })
})

onUnmounted(() => {
  cleanupGame()
  cleanupVideoSystem()
})
</script>

<template>
  <div id="game-view" ref="gameViewRef">
    <GameHeader
      :section="section"
      :landing-open="showLanding"
      :theme-override="section === 'characters' ? charSelectHero : null"
      @navigate="onNavigate"
      @open-settings="showSettings = true"
    />

    <div class="content-row">
      <!-- Home (outside) — the Landing Page masthead -->
      <LandingView v-if="showLanding" @close="onNavigate('play')" />

      <!-- Lore section — the Landing Page anchored to its lore content -->
      <LandingView v-else-if="section === 'lore'" anchor="lv-codex" @close="onNavigate('play')" />

      <!-- Characters — the character select screen (locked to Main Game width) -->
      <CharacterSelect v-else-if="section === 'characters'" @select="charSelectHero = $event" />

      <!-- Assets — the asset browser rendered inline inside the game view -->
      <GalleryOverlay v-else-if="section === 'assets'" inline :visible="true" @close="onNavigate('play')" />

      <!-- Play — the active game screen -->
      <template v-else>
        <div class="cards-scroll">
          <div class="cards-column">
            <GameCard
              v-for="obj in gameState.objectives"
              :key="obj.id"
              :objective="obj"
              @tap-popup="spawnTapPopup"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Damage Popups -->
    <Teleport to="body">
      <div
        v-for="popup in popups"
        :key="popup.id"
        class="tap-dmg-popup"
        :style="{ left: popup.x + 'px', top: popup.y + 'px' }"
      >
        {{ formatNotation(popup.dmg, 1) }}
      </div>
    </Teleport>

    <SettingsOverlay v-if="showSettings" @close="showSettings = false" @open-tutorial="showTutorial = true" />
    <TutorialOverlay :visible="showTutorial" @close="showTutorial = false" />
    <GemTooltip />
  </div>
</template>

<style scoped>
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

.content-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

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

.cards-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
}

/* Damage Popup */
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
</style>
