// src/services/SaveService.js
// Save/Load abstraction layer
// No persistence — every page load returns a fresh game state.
// Current state is kept in-memory only (reactive JSON updates).

const STORAGE_KEY = 'shadow_blade_save'
const CURRENT_VERSION = 2
const DEFAULT_PLAYER_ID = 'local'

const FIXED_PLAYER_ID = DEFAULT_PLAYER_ID

function getPlayerId() {
  return FIXED_PLAYER_ID
}

// ─── Public API ───

export function getPlayerIdentity() {
  return getPlayerId()
}

/**
 * Read all saves — always empty (no persistence).
 */
export async function readAllSaves() {
  return {}
}

/**
 * Load game data — always returns null (fresh game every time).
 */
export async function loadGame() {
  return null
}

/**
 * Check if a save exists — always false (no persistence).
 */
export async function hasSave() {
  return false
}

/**
 * Save game state — no-op (state is in-memory only).
 */
export async function saveGame() {
  return true
}

/**
 * Delete save — no-op (nothing to delete).
 */
export async function deleteSave() {
  return true
}

/**
 * Get save metadata — always null (no persistence).
 */
export async function getSaveMeta() {
  return null
}

export default {
  getPlayerIdentity,
  readAllSaves,
  loadGame,
  hasSave,
  saveGame,
  deleteSave,
  getSaveMeta
}
