<script setup lang="ts">
import { ref, computed } from 'vue'
import { videoEnabled, toggleVideo, reduceDmgNumbers, toggleReduceDmg } from '../composables/useVideoPool'

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Local computed to ensure reactive binding across component mounts
const isEnabled = computed(() => videoEnabled.value)

// Vue confirmation overlay for new game — replaces native confirm()
const showResetConfirm = ref(false)

function onOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

function promptReset() {
  showResetConfirm.value = true
}

function cancelReset() {
  showResetConfirm.value = false
}

function confirmReset() {
  showResetConfirm.value = false
  // Remove the beforeunload save handler so it doesn't re-write state on unload
  const beforeUnloadHandler = (window as unknown as { _vantageBeforeUnload?: EventListenerOrEventListenerObject | null })._vantageBeforeUnload
  if (beforeUnloadHandler) window.removeEventListener('beforeunload', beforeUnloadHandler)
  // Clear persisted save data
  localStorage.removeItem('shadow_blade_save')
  // Force full navigation — hard redirect bypasses HMR/browser cache
  window.location.href = window.location.origin + window.location.pathname + '?fresh=' + Date.now()
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

          <div class="settings-divider"></div>

          <div class="settings-row">
            <span class="settings-label">Reduce Dmg Numbers</span>
            <div class="toggle-switch" :class="{ on: reduceDmgNumbers }" @click="toggleReduceDmg">
              <div class="toggle-slider"></div>
            </div>
          </div>
          <div class="settings-hint">
            Only shows damage numbers for the top character.
          </div>

          <div class="settings-divider"></div>

          <button class="new-game-btn" @click="promptReset">
            ✦ New Game
          </button>
          <div class="settings-hint danger-hint">
            Clears all progress and starts fresh.
          </div>
        </div>
      </div>
    </div>

      <!-- ── New Game Confirmation Overlay ── -->
      <div v-if="showResetConfirm" class="reset-confirm-overlay" @click="cancelReset">
        <div class="reset-confirm-box" @click.stop>
          <div class="reset-confirm-icon">⚠</div>
          <div class="reset-confirm-text">Start a new game?</div>
          <div class="reset-confirm-sub">All progress will be lost.</div>
          <div class="reset-confirm-actions">
            <button class="reset-confirm-yes" @click="confirmReset">Yes, Reset</button>
            <button class="reset-confirm-no" @click="cancelReset">Cancel</button>
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

/* ── Divider ── */
.settings-divider {
  height: 1px;
  background: rgba(168,85,247,.1);
  margin: 14px 0;
}

/* ── New Game Button ── */
.new-game-btn {
  width: 100%;
  padding: 8px 0;
  border: 1px solid rgba(239,68,68,.3);
  background: rgba(239,68,68,.08);
  color: #ef4444;
  font-family: monospace;
  font-size: 11px;
  font-weight: 900;
  border-radius: 4px;
  cursor: pointer;
  transition: all .15s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}
.new-game-btn:hover {
  background: rgba(239,68,68,.18);
  border-color: #ef4444;
  box-shadow: 0 0 12px rgba(239,68,68,.2);
}
.new-game-btn:active {
  transform: scale(.97);
}

.danger-hint {
  color: rgba(239,68,68,.5) !important;
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
/* ── New Game Confirmation Overlay ── */
.reset-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.75);
  z-index: 700;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: reset-fadein .15s ease-out;
}
@keyframes reset-fadein {
  0% { opacity: 0; }
  to { opacity: 1; }
}
.reset-confirm-box {
  background: #0d0d14;
  border: 1px solid rgba(239,68,68,.4);
  border-radius: 8px;
  padding: 22px 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  box-shadow: 0 0 50px rgba(239,68,68,.25);
  animation: reset-slidein .2s ease-out;
}
@keyframes reset-slidein {
  0% { opacity: 0; transform: translateY(20px) scale(.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.reset-confirm-icon {
  font-size: 34px;
  line-height: 1;
}
.reset-confirm-text {
  font-size: 14px;
  font-weight: 900;
  font-family: monospace;
  color: #ef4444;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.reset-confirm-sub {
  font-size: 10px;
  font-weight: 600;
  font-family: monospace;
  color: #ef444488;
  margin-top: -4px;
}
.reset-confirm-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}
.reset-confirm-yes,
.reset-confirm-no {
  padding: 6px 20px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  cursor: pointer;
  transition: all .12s ease;
  border: 1px solid;
}
.reset-confirm-yes {
  background: rgba(239,68,68,.15);
  border-color: rgba(239,68,68,.4);
  color: #ef4444;
}
.reset-confirm-yes:hover {
  background: rgba(239,68,68,.3);
  border-color: #ef4444;
  box-shadow: 0 0 10px rgba(239,68,68,.3);
}
.reset-confirm-no {
  background: rgba(168,85,247,.1);
  border-color: rgba(168,85,247,.25);
  color: #c084fc;
}
.reset-confirm-no:hover {
  background: rgba(168,85,247,.2);
  border-color: #a855f7;
}
</style>
