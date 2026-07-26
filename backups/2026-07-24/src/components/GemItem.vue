<script setup>
import { computed } from 'vue'
import { ALL_GEMS } from '../composables/useGameState.js'

const props = defineProps({
  gem: { type: Object, required: true },
  color: { type: String, default: null },
})

const gemPath = computed(() => {
  if (!props.gem) return null
  return ALL_GEMS[props.gem.color]?.[props.gem.gemIdx] || null
})

const dropColor = computed(() => {
  return props.color || '#a855f7'
})
</script>

<template>
  <div class="gem-item-wrap" v-if="gemPath">
    <img
      :src="gemPath"
      :alt="gem.name"
      loading="lazy"
      @error="$event.target.style.display='none'"
      draggable="false"
      :style="{ filter: 'drop-shadow(0 0 3px ' + dropColor + ')' }"
    />
  </div>
  <span v-else class="gem-placeholder">&#9670;</span>
</template>

<style scoped>
.gem-item-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.gem-item-wrap img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  pointer-events: none;
}

/* Placeholder */
.gem-placeholder {
  font-size: 14px;
  color: #334155;
  pointer-events: none;
}
</style>
