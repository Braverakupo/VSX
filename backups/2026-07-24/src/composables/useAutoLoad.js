// src/composables/useAutoLoad.js
// Simplified — keeps only the initialization guard (isLoaded) for save blocking.
// All server sync / polling logic removed for local-only gameplay.

import { ref } from 'vue'

// ─── Reactive initialization guard ───
// All save operations MUST check this before writing.
// Set to true only after initGame() has completed its initial load.
export const isLoaded = ref(false)

// Stub exports retained for compatibility — no-op stubs
export function updateLastServerTimestamp() {}
export function resetLastServerTimestamp() {}
