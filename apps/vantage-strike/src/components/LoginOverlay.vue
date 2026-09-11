<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { saveNow, lastSaveLabel } from '../composables/useGameState'

const emit = defineEmits<{
  (e: 'close'): void
  /** Account was just created — App clears local save for a fresh gamestate. */
  (e: 'registered'): void
  /** Account signed in — App restores the server save (if any). */
  (e: 'signedIn'): void
  (e: 'signedOut'): void
}>()

const auth = useAuth()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')

function switchMode(next: 'login' | 'register') {
  mode.value = next
  auth.error.value = ''
}

async function onSubmit() {
  if (auth.isBusy.value) return
  try {
    if (mode.value === 'login') {
      await auth.login(username.value.trim(), password.value)
      emit('signedIn')
    } else {
      await auth.registerAccount(username.value.trim(), password.value)
      emit('registered')
    }
    emit('close')
  } catch (err) {
    auth.error.value = err instanceof Error ? err.message : 'Something went wrong.'
  }
}

async function onLogout() {
  await auth.logout()
  emit('signedOut')
  emit('close')
}

const saveBusy = ref(false)
const saveFlash = ref('')
async function onSaveNow() {
  if (saveBusy.value) return
  saveBusy.value = true
  saveFlash.value = ''
  const ok = await saveNow()
  saveFlash.value = ok ? 'Saved ✓' : 'Save failed — is the server running?'
  saveBusy.value = false
  setTimeout(() => { saveFlash.value = '' }, 2500)
}
</script>

<template>
  <ZOverlay :visible="true" @close="emit('close')">
    <div class="auth-box">
      <div class="auth-header">
        <span class="auth-title">Vantage Strike</span>
        <button class="auth-close" @click="emit('close')">✕</button>
      </div>

      <template v-if="auth.isLoggedIn.value">
        <div class="auth-account">
          <span class="auth-avatar">{{ auth.user.value?.username.slice(0, 1).toUpperCase() }}</span>
          <div class="auth-meta">
            <span class="auth-name">{{ auth.user.value?.username }}</span>
            <span class="auth-sub">Signed in — progress syncs here</span>
          </div>
        </div>
        <div class="auth-actions">
          <ZButton variant="mini" :disabled="saveBusy" @click="onSaveNow">Save Now</ZButton>
          <ZButton variant="mini" @click="onLogout">Sign Out</ZButton>
        </div>
        <p class="auth-save-status">{{ saveFlash || lastSaveLabel }}</p>
      </template>

      <template v-else>
        <div class="auth-tabs">
          <button class="auth-tab" :class="{ active: mode === 'login' }" @click="switchMode('login')">Sign In</button>
          <button class="auth-tab" :class="{ active: mode === 'register' }" @click="switchMode('register')">Create Account</button>
        </div>

        <label class="auth-label" for="auth-user">Username</label>
        <input
          id="auth-user"
          v-model="username"
          class="auth-input"
          type="text"
          autocomplete="username"
          maxlength="20"
          placeholder="3-20 letters, numbers, . _ -"
          @keyup.enter="onSubmit"
        />

        <label class="auth-label" for="auth-pass">Password</label>
        <input
          id="auth-pass"
          v-model="password"
          class="auth-input"
          type="password"
          autocomplete="current-password"
          maxlength="100"
          placeholder="At least 6 characters"
          @keyup.enter="onSubmit"
        />

        <p v-if="auth.error.value" class="auth-error">{{ auth.error.value }}</p>

        <ZButton
          variant="primary"
          :disabled="auth.isBusy.value || username.trim().length === 0 || password.length === 0"
          @click="onSubmit"
        >
          {{ auth.isBusy.value ? 'Please wait…' : (mode === 'login' ? 'Sign In' : 'Create Account') }}
        </ZButton>
        <p>
          Local demo? No — accounts live on the game server (scrypt-hashed, never plaintext).
        </p>
      </template>
    </div>
  </ZOverlay>
</template>

<style scoped>
.auth-box {
  width: 320px;
  max-width: 90vw;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.auth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.auth-title {
  font-family: var(--z-font-ui, sans-serif);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .06em;
  color: var(--z-text-primary, #f5f5f8);
}
.auth-close {
  background: none;
  border: none;
  color: var(--z-text-muted, #888);
  font-size: 15px;
  cursor: pointer;
  line-height: 1;
}
.auth-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--z-border-muted, #222);
  padding-bottom: 6px;
}
.auth-tab {
  flex: 1;
  background: none;
  border: none;
  color: var(--z-text-secondary, #aaa);
  font-family: var(--z-font-ui, sans-serif);
  font-size: 13px;
  padding: 6px 0;
  cursor: pointer;
}
.auth-tab.active {
  color: var(--z-accent, #a855f7);
  box-shadow: inset 0 -2px 0 var(--z-accent, #a855f7);
}
.auth-label {
  font-size: 11px;
  color: var(--z-text-muted, #888);
  font-family: var(--z-font-ui, sans-serif);
}
.auth-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--z-bg-input, #101018);
  border: 1px solid var(--z-border-default, #333);
  border-radius: var(--z-radius-sm, 6px);
  color: var(--z-text-primary, #f5f5f8);
  font-family: var(--z-font-ui, sans-serif);
  font-size: 14px;
  padding: 8px 10px;
}
.auth-input:focus {
  outline: none;
  border-color: var(--z-accent, #a855f7);
}
.auth-error {
  margin: 0;
  font-size: 12px;
  color: var(--z-danger, #ef4444);
}
.auth-account {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--z-border-default, #333);
  border-radius: var(--z-radius, 8px);
  background: var(--z-bg-card, #0d0d14);
}
.auth-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--z-accent, #a855f7);
  color: #fff;
  font-weight: 800;
}
.auth-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.auth-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--z-text-primary, #f5f5f8);
}
.auth-sub {
  font-size: 11px;
  color: var(--z-text-muted, #888);
}
.auth-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.auth-save-status {
  margin: 0;
  font-size: 11px;
  color: var(--z-text-muted, #888);
}
.auth-foot {
  margin: 0;
  font-size: 11px;
  color: var(--z-text-muted, #888);
  line-height: 1.4;
}
</style>
