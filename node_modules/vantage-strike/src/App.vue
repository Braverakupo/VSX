<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { gameState, formatNotation, initGame, cleanupGame } from './composables/useGameState'
import { initVideoSystem, cleanupVideoSystem, updateVideoForObjective, reduceDmgNumbers } from './composables/useVideoPool'
import { applyTheme } from './composables/cssScripts'
import GameHeader from './components/GameHeader.vue'
import GameCard from './components/GameCard.vue'
import GemTooltip from './components/GemTooltip.vue'
import TutorialOverlay from './components/TutorialOverlay.vue'
import GalleryOverlay from './components/GalleryOverlay.vue'
import SettingsOverlay from './components/SettingsOverlay.vue'

interface TapPopupPayload {
  dmg: number
  x: number
  y: number
  obj?: { id: string } | null
}

interface TapPopup extends TapPopupPayload {
  id: number
}

// Popup management
const popups = ref<TapPopup[]>([])
let popupIdCounter = 0

function spawnTapPopup(payload: TapPopupPayload) {
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

// Overlay visibility
const showTutorial = ref(false)
const showGallery = ref(false)
const showSettings = ref(false)

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
      @open-tutorial="showTutorial = true"
      @open-gallery="showGallery = true"
      @open-settings="showSettings = true"
    />

    <div class="content-row">
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

    <SettingsOverlay v-if="showSettings" @close="showSettings = false" />
    <TutorialOverlay :visible="showTutorial" @close="showTutorial = false" />
    <GalleryOverlay :visible="showGallery" @close="showGallery = false" />
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
