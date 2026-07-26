// src/composables/useGemTooltip.js
// Reactive global tooltip state for POE-style gem stat popups.
// The tooltip is rendered at the <body> level via Teleport so it's never clipped.
// Viewport clamping is handled in GemTooltip.vue via template ref measurement.
//
// ── Dual state model ──
// Hover tooltip (floating): uses `gem`, `visible`, `x`, `y` — follows cursor.
// Selected gem (persistent): uses `selectedGem`, `selectedGemId`, `persistent` — shown in inline panel.
// These two are independent: hovering over gems never clears the selected gem.

import { ref, reactive, readonly } from 'vue'

// ─── Hover tooltip state (floating overlay) ──────────────────────────
const visible = ref(false)
const gem = ref(null)          // Gem instance for hover tooltip
const heroStats = ref(null)    // Optional character stats for DPS calculation
const x = ref(0)               // screen X position
const y = ref(0)               // screen Y position
const extraOffset = reactive({ x: 0, y: 0 })  // per-gem offset if needed
const isTouch = ref(false)     // true when shown via touch (mobile)

// ─── Selected gem state (persistent, shown in inline panel) ──────────
const persistent = ref(false)  // when true, a gem is "selected" (pinned)
const selectedGemId = ref(null)
const selectedGem = ref(null)  // Gem instance for the selected gem (separate from hover `gem`)

// ─── Actions ────────────────────────────────────────────────────────

/**
 * Show the hover tooltip (floating overlay).
 * When `isPersistent` is true, also sets the selected gem for the inline panel.
 * When `isPersistent` is false, hover NEVER touches `persistent` or `selectedGem`,
 * so the inline panel remains undisturbed.
 */
function showTooltip(gemInstance, clientX, clientY, offsetX = 16, offsetY = -10, stats = null, touchInitiated = false, isPersistent = false) {
  // Always update hover state
  gem.value = gemInstance
  heroStats.value = stats
  x.value = clientX + offsetX
  y.value = clientY + offsetY
  extraOffset.x = offsetX
  extraOffset.y = offsetY
  isTouch.value = touchInitiated
  visible.value = true

  // Only touch persistent state when explicitly requested
  if (isPersistent) {
    persistent.value = true
    selectedGem.value = gemInstance
  }
  // NOTE: When !isPersistent, we NEVER set persistent=false here.
  // That preserves the selected gem's inline panel during hover.
}

/**
 * Hide the hover tooltip (floating overlay).
 * Always clears hover state so the floating tooltip hides on mouse leave.
 * When `force` is true, also clears the selected gem (persistent) state.
 * When `force` is false and persistent is active, the inline panel remains visible.
 */
function hideTooltip(force = false) {
  // Always clear hover state — floating tooltip should hide on mouse leave
  visible.value = false
  gem.value = null
  heroStats.value = null
  isTouch.value = false

  // Only clear persistent state on force (deselecting a gem)
  if (force) {
    persistent.value = false
    selectedGem.value = null
    selectedGemId.value = null
  }
}

function updatePosition(clientX, clientY) {
  if (visible.value) {
    x.value = clientX + extraOffset.x
    y.value = clientY + extraOffset.y
  }
}

/**
 * Toggle selection of a gem by its id.
 * If the gem is already selected, deselect it.
 * If a different gem was selected, switch selection to this gem.
 * Deselection force-hides the tooltip.
 */
function toggleGemSelection(gemId) {
  if (selectedGemId.value === gemId) {
    // Tap again — deselect
    hideTooltip(true)  // force-close, clears all state
  } else {
    // Tap — select this gem (set selectedGem + persistent for inline panel)
    selectedGemId.value = gemId
    // Look up the Gem instance - stored by id lookup from wherever called
    // The caller must provide the Gem instance; we store it in selectedGem
    // if gem.value happens to match (from a prior hover or persistent show)
  }
}

/** Select a gem by providing the full Gem instance (for inline detail panel). */
function selectGem(gemInstance) {
  if (!gemInstance) return
  if (selectedGemId.value === gemInstance.id) {
    hideTooltip(true)
    return
  }
  selectedGemId.value = gemInstance.id
  selectedGem.value = gemInstance
  persistent.value = true
}

/** Clear gem selection programmatically. */
function clearGemSelection() {
  hideTooltip(true)
}

export function useGemTooltip() {
  return {
    // Hover state
    visible: readonly(visible),
    gem: readonly(gem),
    heroStats: readonly(heroStats),
    x: readonly(x),
    y: readonly(y),
    isTouch: readonly(isTouch),
    // Selected gem state
    persistent: readonly(persistent),
    selectedGemId: readonly(selectedGemId),
    selectedGem: readonly(selectedGem),
    // Actions
    showTooltip,
    hideTooltip,
    updatePosition,
    toggleGemSelection,
    selectGem,
    clearGemSelection
  }
}
