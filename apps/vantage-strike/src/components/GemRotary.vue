<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { gemColorInfo, ALL_GEMS } from '../config/gameData'

// Ordered gem colors
const gemColors = ['reds', 'blues', 'oranges', 'cyans', 'purples', 'blacks'] as const
type GemColorKey = (typeof gemColors)[number]

const emit = defineEmits<{
  (e: 'charChange', color: GemColorKey): void
  (e: 'closeDropdowns'): void
}>()

// Pick the first gem image from each color
const gemImages = {} as Record<GemColorKey, string>
for (const color of gemColors) {
  const images = ALL_GEMS[color]
  gemImages[color] = images ? images[0] : ''
}

// ── Rotary state ──
const rotation = ref(0)

// Current "active" gem index
const currentIndex = computed(() => {
  const idx = Math.round(-rotation.value / 60) % gemColors.length
  return ((idx % gemColors.length) + gemColors.length) % gemColors.length
})

// The currently active color
const activeColor = computed<GemColorKey>(() => gemColors[currentIndex.value])

// Emit the color key when selection changes
watch(currentIndex, () => {
  emit('charChange', activeColor.value)
}, { immediate: true })

function nextGem() {
  rotation.value -= 60
  emit('closeDropdowns')
}

/** Set the rotary to a specific gem color by name, syncing rotation state. */
function setActiveColor(color: string) {
  const idx = gemColors.indexOf(color as GemColorKey)
  if (idx === -1) return
  // rotation = -idx * 60 makes currentIndex = idx
  rotation.value = -(idx * 60)
}
defineExpose({ nextGem, setActiveColor })
</script>

<template>
  <div
    class="gem-rotary-single"
    @click="nextGem"
    :style="{ '--gem-color': gemColorInfo[activeColor].cssColor }"
    :title="gemColorInfo[activeColor].label"
  >
    <div class="single-gem-circle" :style="{ borderColor: gemColorInfo[activeColor].cssColor }">
      <img
        v-if="gemImages[activeColor]"
        :src="gemImages[activeColor]"
        :alt="gemColorInfo[activeColor].label"
        class="gem-icon"
        loading="lazy"
      />
    </div>
  </div>
</template>

<style scoped>
.gem-rotary-single {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  transition: filter 0.2s ease;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--gem-color, #a855f7) 40%, transparent));
}
.gem-rotary-single:hover {
  filter: drop-shadow(0 0 8px var(--gem-color, #a855f7));
}
.gem-rotary-single:active {
  transform: scale(0.92);
}

.single-gem-circle {
  width: 24px;
  height: 24px;
  border: 1.5px solid;
  background: #0d0d14;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transform: rotate(45deg);
  overflow: hidden;
}

.gem-icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
  display: block;
  pointer-events: none;
  transform: rotate(-45deg) scale(1.5);
}

</style>
