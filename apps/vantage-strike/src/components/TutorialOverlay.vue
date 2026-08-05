<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  visible?: boolean
}>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const imgPath = import.meta.env.BASE_URL + 'assets/tutorial.png'
const showFallback = ref(false)

function onImageError(e: Event) {
  const el = e.target as HTMLElement | null
  if (el) el.style.display = 'none'
  showFallback.value = true
}
function onImageLoad() {
  showFallback.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="tutorial-overlay" @click.self="emit('close')">
      <div class="tutorial-modal">
        <button class="tutorial-close-btn" @click="emit('close')" title="Close tutorial">✕</button>
        <img
          v-show="!showFallback"
          class="tutorial-image"
          :src="imgPath"
          alt="Tutorial"
          @error="onImageError"
          @load="onImageLoad"
        />
        <div v-show="showFallback" class="tutorial-fallback">
          <p>Tutorial image not found.</p>
          <p>Place <code>public/assets/Tutorial.png</code> and rebuild.</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tutorial-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 100000;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: tutorial-fadein .15s ease-out;
}
@keyframes tutorial-fadein {
  0% { opacity: 0; }
  to { opacity: 1; }
}
.tutorial-modal {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: #0d0d14;
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
  overflow: auto;
}
.tutorial-close-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 1;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(168, 85, 247, 0.2);
  color: #c084fc;
  font-size: 16px;
  line-height: 1;
  width: 24px;
  height: 24px;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .12s ease;
}
.tutorial-close-btn:hover {
  background: rgba(168, 85, 247, 0.2);
  border-color: #a855f7;
  color: #fff;
}
.tutorial-image {
  display: block;
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 3px;
}
.tutorial-fallback {
  color: #64748b;
  font-family: monospace;
  font-size: 12px;
  text-align: center;
  padding: 20px;
}
.tutorial-fallback code {
  color: #c084fc;
  background: rgba(168,85,247,.1);
  padding: 1px 4px;
  border-radius: 2px;
}
</style>
