// src/flags.js
// Consolidated atomic reactive state atoms.
// Single file — no need for separate flag modules.

import { ref, computed, readonly } from 'vue'

// ─── Game State Flags ──────────────────────────────────
/** Whether the initial load has completed (guards saves) */
export const isLoaded = ref(false)

/** Cheat mode toggle (100x damage) */
export const cheatActive = ref(false)

/** Currently open character popout (null | heroName) */
export const popoutHero = ref(null)

/** Settings overlay toggle */
export const showSettings = ref(false)

// ─── Save State Flags ──────────────────────────────────
/** Timestamp of the last successful save (ms) */
export const lastSaveTime = ref(null)

/** Human-readable label like "saved now", "5s ago" */
export const lastSaveLabel = ref('')

/** Whether a save operation is currently in progress */
export const isSaving = ref(false)

// ─── UI State Flags ────────────────────────────────────
/** Current viewport width in pixels */
export const viewportWidth = ref(window.innerWidth)

/** Whether the viewport is mobile-sized (< 600px) */
export const isMobileView = computed(() => viewportWidth.value < 600)

/** Video playback toggle (persisted to localStorage) */
const STORAGE_KEY = 'vantage_video_enabled'
export const videoEnabled = ref(localStorage.getItem(STORAGE_KEY) !== 'false')

/** Track video enabled changes back to localStorage */
export function persistVideoFlag() {
  localStorage.setItem(STORAGE_KEY, videoEnabled.value ? 'true' : 'false')
}
