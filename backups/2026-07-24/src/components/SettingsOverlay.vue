<script setup>
import { computed } from 'vue'
import { videoEnabled, toggleVideo } from '../composables/useVideoPool.js'

const emit = defineEmits(['close'])

// Local computed to ensure reactive binding across component mounts
const isEnabled = computed(() => videoEnabled.value)

function onOverlayClick(event) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="settings-overlay" @click="onOverlayClick">
      <div class="settings-box">
        <div class="settings-header">
          <span class="settings-title">Settings</span>
          <button class="settings-close" @click="emit('close')">✕</button>
        </div>
        <div class="settings-body">
          <div class="settings-row">
            <span class="settings-label">Cinematic Videos</span>
            <div class="toggle-switch" :class="{ on: isEnabled }" @click="toggleVideo">
              <div class="toggle-slider"></div>
            </div>
          </div>
          <div class="settings-hint">
            Reduces battery drain and phone temperature on mobile devices.
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.7);
  z-index: 600;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: settings-fadein .15s ease-out;
}
@keyframes settings-fadein {
  0% { opacity: 0; }
  to { opacity: 1; }
}

.settings-box {
  background: #0d0d14;
  border: 1px solid rgba(168,85,247,.3);
  border-radius: 8px;
  width: 280px;
  box-shadow: 0 0 40px rgba(168,85,247,.2), 0 0 80px rgba(168,85,247,.08);
  animation: settings-slidein .2s ease-out;
}
@keyframes settings-slidein {
  0% { opacity: 0; transform: translateY(20px) scale(.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(168,85,247,.1);
}

.settings-title {
  font-size: 13px;
  font-weight: 900;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #c084fc;
}

.settings-close {
  width: 24px;
  height: 24px;
  border: 1px solid rgba(168,85,247,.2);
  background: rgba(0,0,0,.5);
  color: #c084fc;
  font-size: 12px;
  font-weight: 900;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .12s ease;
}
.settings-close:hover {
  background: rgba(168,85,247,.2);
  border-color: #a855f7;
}

.settings-body {
  padding: 14px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.settings-label {
  font-size: 12px;
  font-weight: 700;
  font-family: monospace;
  color: #e2e8f0;
}

.settings-hint {
  font-size: 9px;
  color: #64748b;
  font-family: monospace;
  line-height: 1.4;
}

/* ── Toggle Switch ── */
.toggle-switch {
  width: 36px;
  height: 20px;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: #1e293b;
  border: 1px solid rgba(168,85,247,.15);
  border-radius: 10px;
  transition: all .25s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 2px;
  bottom: 2px;
  background: #64748b;
  border-radius: 50%;
  transition: all .25s ease;
}

.toggle-switch.on .toggle-slider {
  background: rgba(34,197,94,.2);
  border-color: #22c55e;
  box-shadow: 0 0 8px rgba(34,197,94,.2);
}

.toggle-switch.on .toggle-slider::before {
  transform: translateX(16px);
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34,197,94,.5);
}
</style>
