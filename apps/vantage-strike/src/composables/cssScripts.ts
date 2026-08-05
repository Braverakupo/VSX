// ═══════════════════════════════════════════════════════════════
// cssScripts.ts — UNIVERSAL design-system runtime (TypeScript).
// Self-contained template module: no imports beyond `vue`, no app
// files. Pairs with templatecss.css (the CANONICAL token source):
//   • PALETTE mirrors the --z-* tokens 1:1 — edit both together.
//   • FACTIONS / applyTheme drive the [data-faction] theming hooks
//     declared in templatecss.css.
//
// Conventions:
//   • TypeScript only — no raw JS. The runtime `template:` strings
//     below (ZButton/ZOverlay/ZConfirmDialog) are the sanctioned
//     exception: plain Vue options objects that require the FULL
//     Vue build (vue.esm-bundler) to compile — alias it in your
//     bundler if you use them.
//   • Extensionless imports — only bare package specifiers (vue).
//   • Standalone: not an SFC module and holds no long-lived state —
//     the useConfirm() composable owns its own reactive state.
//   • Dynamic record access (FACTIONS[name], Object.entries(ALL))
//     is intentional — string-keyed maps, not mixed entity arrays.
// ═══════════════════════════════════════════════════════════════
import { ref, readonly, reactive } from 'vue'
import type { App } from 'vue'

export interface FactionConfig {
  key: string
  color: string
  bright: string
  label: string
}

// PALETTE mirrors the --z-* tokens in templatecss.css (canonical source)
export const PALETTE = {
  bgDark: '#030305', bgCard: '#0d0d14', bgInput: '#0a0a12',
  textPrimary: '#e2e8f0', textSecondary: '#64748b', textMuted: '#94a3b8',
  red: '#ef4444', blue: '#3b82f6', amber: '#f59e0b', cyan: '#22d3ee', purple: '#a855f7', slate: '#6b7280',
  success: '#3fb950', warn: '#d29922', danger: '#f85149',
  borderDefault: 'rgba(168, 85, 247, 0.3)', borderMuted: 'rgba(168, 85, 247, 0.1)'
} as const

export const alpha = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export const FACTIONS: Record<string, FactionConfig> = {
  Voltkin:   { key: 'reds',    color: PALETTE.red,    bright: '#fca5a5', label: "Voltkin's Vanguard" },
  Ashbeam:   { key: 'blues',   color: PALETTE.blue,   bright: '#93c5fd', label: "Ashbeam's Tactician" },
  Crypsis:   { key: 'oranges', color: PALETTE.amber,  bright: '#fde68a', label: "Crypsis's Rogue" },
  Spectra:   { key: 'cyans',   color: PALETTE.cyan,   bright: '#a5f3fc', label: "Spectra's Mystic" },
  Hellshift: { key: 'purples', color: PALETTE.purple, bright: '#d8b4fe', label: "Hellshift's Brawler" },
  Kailin:    { key: 'blacks',  color: PALETTE.slate,  bright: '#d1d5db', label: "Kailin's Executor" }
}

export const getFaction = (name: string): FactionConfig => FACTIONS[name] ?? FACTIONS.Voltkin
export function applyTheme(el: HTMLElement | null, themeName: string): void {
  if (el && FACTIONS[themeName]) el.dataset.faction = themeName
}

// ═══════════════════════════════════════════════════════
// ROBUST COMPOSABLES
// ═══════════════════════════════════════════════════════

export function useConfirm() {
  const show = ref(false)
  const config = ref({ title: 'Confirm', message: '', confirmText: 'Confirm', cancelText: 'Cancel' })
  let resolvePromise: ((value: boolean) => void) | null = null

  // reactive() return → nested refs (showConfirm/config) auto-unwrap in templates,
  // so `<ZConfirmDialog :visible="confirm.showConfirm" v-bind="confirm.config" />` works.
  return reactive({
    showConfirm: readonly(show),
    config: readonly(config),
    prompt: (override = {}) => {
      config.value = { ...config.value, ...override }
      if (resolvePromise) resolvePromise(false) // re-entrancy guard: never leak a pending promise
      show.value = true
      return new Promise<boolean>((resolve) => {
        resolvePromise = resolve
      })
    },
    confirm: () => {
      show.value = false
      resolvePromise?.(true)
      resolvePromise = null
    },
    cancel: () => {
      show.value = false
      resolvePromise?.(false) // Safely resolves false if canceled or dismissed via overlay
      resolvePromise = null
    }
  })
}

// ═══════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════

export const ZButton = {
  name: 'ZButton',
  props: { variant: { type: String, default: 'mini' }, disabled: Boolean },
  emits: ['click'],
  template: `<button class="z-btn" :class="['z-btn--'+variant, {disabled}]" :disabled="disabled" @click="$emit('click', $event)"><slot /></button>`
}

export const ZOverlay = {
  name: 'ZOverlay',
  props: { visible: Boolean, closable: { type: Boolean, default: true } },
  emits: ['close'],
  template: `<Teleport to="body"><div v-if="visible" class="zo" @click="e => closable && e.target === e.currentTarget && $emit('close')"><div class="zo__p"><slot /></div></div></Teleport>`
}

export const ZConfirmDialog = {
  name: 'ZConfirmDialog',
  props: { visible: Boolean, title: String, message: String, confirmText: { type: String, default: 'Confirm' }, cancelText: { type: String, default: 'Cancel' } },
  emits: ['confirm', 'cancel'],
  template: `<ZOverlay :visible="visible" @close="$emit('cancel')"><div class="zc"><h3>{{ title }}</h3><p>{{ message }}</p><div><button @click="$emit('confirm')">{{ confirmText }}</button><button @click="$emit('cancel')">{{ cancelText }}</button></div></div></ZOverlay>`
}

// ═══════════════════════════════════════════════════════
// INSTALLER
// ═══════════════════════════════════════════════════════

const ALL = { ZButton, ZOverlay, ZConfirmDialog }

export function install(app: App, opts: { exclude?: string[] } = {}) {
  const skip = new Set(opts.exclude || [])
  for (const [n, c] of Object.entries(ALL)) {
    if (!skip.has(n)) app.component(n, c)
  }
}

export default { PALETTE, FACTIONS, alpha, getFaction, applyTheme, useConfirm, ...ALL, install }