// ═══════════════════════════════════════════════════════
// 1. PALETTE & FACTIONS
// ═══════════════════════════════════════════════════════

export const PALETTE = {
  bgDark: '#030305', bgCard: '#0d0d14', bgInput: '#0a0a12',
  textPrimary: '#e2e8f0', textSecondary: '#64748b', textMuted: '#94a3b8',
  red: '#ef4444', blue: '#3b82f6', amber: '#f59e0b', cyan: '#22d3ee', purple: '#a855f7', slate: '#6b7280'
}

export const alpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export const FACTIONS = {
  Voltkin:   { key: 'reds',    color: PALETTE.red,    bright: '#fca5a5', label: "Voltkin's Vanguard" },
  Ashbeam:   { key: 'blues',   color: PALETTE.blue,   bright: '#93c5fd', label: "Ashbeam's Tactician" },
  Crypsis:   { key: 'oranges', color: PALETTE.amber,  bright: '#fde68a', label: "Crypsis's Rogue" },
  Spectra:   { key: 'cyans',   color: PALETTE.cyan,   bright: '#a5f3fc', label: "Spectra's Mystic" },
  Hellshift: { key: 'purples', color: PALETTE.purple, bright: '#d8b4fe', label: "Hellshift's Brawler" },
  Kailin:    { key: 'blacks',  color: PALETTE.slate,  bright: '#d1d5db', label: "Kailin's Executor" }
}

// Backwards-compatible theme maps
export const characterThemes = {}
export const gemColorInfo = {}
export const CHAR_GEM_COLOR = {}

Object.entries(FACTIONS).forEach(([name, f]) => {
  characterThemes[name] = { color: f.color, bright: f.bright, glow: alpha(f.color, 0.6), label: f.label }
  gemColorInfo[f.key] = { label: f.label, cssColor: f.color, dotColor: f.color }
  CHAR_GEM_COLOR[name] = f.key
})

export const getFaction = (name) => FACTIONS[name] ?? FACTIONS.Voltkin
export function applyTheme(el, themeName) {
  if (el && FACTIONS[themeName]) el.dataset.faction = themeName
}

// ═══════════════════════════════════════════════════════
// 2. DYNAMIC CSS INGESTION
// ═══════════════════════════════════════════════════════

const factionCSS = Object.entries(FACTIONS).map(([name, f]) => 
  `[data-faction="${name}"]{--hero-color:${f.color};--hero-bright:${f.bright};--hero-glow:${alpha(f.color, 0.6)};}`
).join('\n')

const BASE_CSS = `/* Z Design System v2 - High Performance */
:root {
  --z-bg-dark:#030305;--z-bg-card:#0d0d14;--z-bg-input:#0a0a12;
  --z-text-primary:#e2e8f0;--z-text-secondary:#64748b;--z-text-muted:#94a3b8;
  --z-accent:#a855f7;--z-border-default:rgba(168,85,247,.3);--z-border-muted:rgba(168,85,247,.1);
  --z-font-ui:system-ui,sans-serif;--z-font-mono:'JetBrains Mono','Fira Code',monospace;
}

${factionCSS}

/* Keyframes - Sheen */
@keyframes zPbarSheen{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
@keyframes zXpBarSheen{0%{transform:translateY(100%)}100%{transform:translateY(-200%)}}

/* Bar Primitives */
.z-pbar{height:var(--h,16px);border:1px solid var(--c,var(--hero-color,#a855f7))44;background:#000;overflow:hidden;position:relative}
.z-pbar__f{height:100%;width:var(--v,0%);background:linear-gradient(90deg,var(--c,var(--hero-color,#a855f7)) 0%,var(--b,var(--hero-bright,#c084fc)) 60%,var(--c,var(--hero-color,#a855f7)) 100%);box-shadow:0 0 18px var(--c,var(--hero-glow,rgba(168,85,247,.6))),inset 0 0 8px #ffffff26;transition:width .1s linear;position:relative;overflow:hidden}
.z-pbar__f::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.4) 50%,transparent 100%);animation:zPbarSheen 2.5s ease-in-out infinite;pointer-events:none}
.z-pbar__l{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;text-shadow:0 1px 2px #000}

.z-sbar{height:var(--h,7px);background:#000;overflow:hidden}
.z-sbar__f{height:100%;width:var(--v,0%);background:linear-gradient(90deg,var(--c,var(--hero-color,#a855f7)),var(--b,var(--hero-bright,#c084fc)));box-shadow:0 0 6px var(--c,#a855f766);position:relative;overflow:hidden}
.z-sbar__f::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.3) 50%,transparent 100%);animation:zPbarSheen 3s ease-in-out infinite;pointer-events:none}

.z-xpbar{width:var(--w,5px);height:100%;background:#000;display:flex;align-items:flex-end}
.z-xpbar__f{width:100%;height:var(--v,0%);background:linear-gradient(0deg,var(--c,var(--hero-color,#a855f7)),var(--b,var(--hero-bright,#c084fc)) 40%,#fff);box-shadow:0 0 12px var(--c,#a855f788);position:relative;overflow:hidden}
.z-xpbar__f::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,transparent 0%,rgba(255,255,255,.4) 50%,transparent 100%);animation:zXpBarSheen 2.5s ease-in-out infinite;pointer-events:none}

/* HP Segment Visualizer */
.z-hpv{display:flex;align-items:center;gap:4px;width:100%}
.z-hpv__f{flex:1;height:12px;background:#000;display:flex;gap:1px;padding:1px;border:1px solid rgba(255,255,255,.1)}
.z-hpv__t{height:100%;flex:1;transition:background-color .15s ease}

/* Badge */
.z-badge{display:inline-flex;align-items:center;gap:3px;background:#000000d9;border:1px solid var(--hero-color,#a855f7);border-radius:3px;padding:1px 6px;font-family:var(--z-font-mono,monospace);font-weight:700;font-size:10px;letter-spacing:.3px;text-shadow:0 1px 3px rgba(0,0,0,.8);pointer-events:none;line-height:1}
.z-badge--sm{padding:1px 5px;font-size:9px}
.z-badge__l{color:#64748b;font-size:inherit}
.z-badge__v{font-weight:900}

/* Button */
.z-btn{display:inline-flex;align-items:center;justify-content:center;font-family:var(--z-font-mono,monospace);font-weight:700;border-radius:3px;cursor:pointer;transition:all .12s ease;line-height:1}
.z-btn:active{transform:scale(.92)}
.z-btn--mini{background:none;border:1px solid rgba(168,85,247,.15);color:#64748b;padding:0 4px;height:18px;font-size:9px}
.z-btn--mini:hover{color:var(--hero-bright,#c084fc);border-color:var(--hero-color,#a855f7);background:rgba(168,85,247,.08)}
.z-btn--gradient{background:linear-gradient(135deg,var(--btn-c,var(--hero-color,#a855f7)),var(--btn-b,var(--hero-bright,#c084fc)));color:#fff;border:1px solid rgba(168,85,247,.4);padding:0 6px;height:22px;font-size:11px}
.z-btn--danger{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);color:#ef4444;text-transform:uppercase;letter-spacing:1px;padding:8px 16px;font-size:11px}
.z-btn--danger:hover{background:rgba(239,68,68,.18);border-color:#ef4444;box-shadow:0 0 12px rgba(239,68,68,.2)}
.z-btn.disabled{opacity:.35;cursor:default;pointer-events:none}

/* Toggle */
.z-tog{width:36px;height:20px;cursor:pointer;position:relative;flex-shrink:0}
.z-tog__s{position:absolute;inset:0;background:#1e293b;border:1px solid rgba(168,85,247,.15);border-radius:10px;transition:all .25s ease}
.z-tog__k{position:absolute;width:14px;height:14px;left:2px;bottom:2px;background:#64748b;border-radius:50%;transition:all .25s ease}
.z-tog.on .z-tog__s{background:rgba(34,197,94,.2);border-color:#22c55e;box-shadow:0 0 8px rgba(34,197,94,.2)}
.z-tog.on .z-tog__k{transform:translateX(16px);background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.5)}

/* Overlay & Confirm */
.zo{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center}
.zo__p{background:var(--z-bg-card,#0d0d14);border:1px solid var(--z-border-default);border-radius:8px}
.zc{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 26px}
.zc.d{border:1px solid rgba(239,68,68,.4);border-radius:8px;box-shadow:0 0 50px rgba(239,68,68,.25)}
.zc__i{font-size:34px;line-height:1}
.zc__t{font-size:14px;font-weight:900;font-family:var(--z-font-mono,monospace);color:#ef4444;text-transform:uppercase;letter-spacing:1px}
.zc__m{font-size:10px;color:rgba(239,68,68,.53);text-align:center;font-family:var(--z-font-mono,monospace)}
.zc__a{display:flex;gap:12px;margin-top:4px}
.zc__b{padding:6px 20px;border-radius:4px;font-family:var(--z-font-mono,monospace);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;cursor:pointer;border:1px solid;transition:all .12s ease}
.zc__b--y{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.4);color:#ef4444}
.zc__b--y:hover{background:rgba(239,68,68,.3);border-color:#ef4444;box-shadow:0 0 10px rgba(239,68,68,.3)}
.zc__b--n{background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.25);color:#c084fc}
.zc__b--n:hover{background:rgba(168,85,247,.2);border-color:#a855f7}
`

function inject() {
  if (typeof document === 'undefined' || document.getElementById('z-ds-v2')) return
  const s = document.createElement('style')
  s.id = 'z-ds-v2'; s.textContent = BASE_CSS
  document.head.appendChild(s)
}
if (typeof document !== 'undefined') inject()

// ═══════════════════════════════════════════════════════
// 3. COMPOSABLES
// ═══════════════════════════════════════════════════════

import { ref, readonly } from 'vue'

export function useTooltip() {
  const visible = ref(false), content = ref(null), x = ref(0), y = ref(0)
  return {
    visible: readonly(visible), content: readonly(content), x: readonly(x), y: readonly(y),
    showTooltip: (d, cx, cy, ox = 16, oy = -10) => { content.value = d; x.value = cx + ox; y.value = cy + oy; visible.value = true },
    hideTooltip: () => { visible.value = false; content.value = null },
    updatePosition: (cx, cy, ox = 16, oy = -10) => { if (visible.value) { x.value = cx + ox; y.value = cy + oy } }
  }
}

export function useOverlay(opts = {}) {
  const visible = ref(opts.initial || false)
  return {
    visible: readonly(visible),
    open: () => visible.value = true,
    close: () => { if (opts.closable ?? true) visible.value = false },
    toggle: () => visible.value = !visible.value
  }
}

export function useConfirm(opts = {}) {
  const show = ref(false), config = ref(opts)
  let resolvePromise = null
  return {
    showConfirm: readonly(show), config: readonly(config),
    prompt: (override = {}) => {
      config.value = { ...opts, ...override }
      show.value = true
      return new Promise(r => { resolvePromise = r })
    },
    confirm: () => { show.value = false; resolvePromise?.(true) },
    cancel: () => { show.value = false; resolvePromise?.(false) }
  }
}

// ═══════════════════════════════════════════════════════
// 4. VUE COMPONENTS
// ═══════════════════════════════════════════════════════

export const ZBadge = {
  name: 'ZBadge',
  props: { label: String, value: [String, Number], color: String, size: { type: String, default: 'md' } },
  template: `<span class="z-badge" :class="'z-badge--' + size" :style="color ? { color, borderColor: color } : null"><span v-if="label" class="z-badge__l">{{ label }}</span><span class="z-badge__v"><slot>{{ value }}</slot></span></span>`
}

export const ZButton = {
  name: 'ZButton',
  props: { variant: { type: String, default: 'mini' }, size: { type: String, default: 'md' }, disabled: Boolean, themeColor: String, themeBright: String },
  emits: ['click'],
  template: `<button class="z-btn" :class="['z-btn--'+variant, 'z-btn--'+size, {disabled}]" :style="themeColor ? {'--btn-c': themeColor, '--btn-b': themeBright} : null" :disabled="disabled" @click="$emit('click', $event)"><slot /></button>`
}

export const ZToggle = {
  name: 'ZToggle',
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  template: `<div class="z-tog" :class="{on:modelValue}" role="switch" :aria-checked="modelValue" tabindex="0" @click="$emit('update:modelValue',!modelValue)" @keydown.enter.prevent="$emit('update:modelValue',!modelValue)" @keydown.space.prevent="$emit('update:modelValue',!modelValue)"><div class="z-tog__s"><div class="z-tog__k"></div></div></div>`
}

export const ZProgressBar = {
  name: 'ZProgressBar',
  props: { value: { type: Number, default: 0 }, height: { type: Number, default: 16 }, animated: Boolean, showLabel: Boolean, label: String, c: String, b: String },
  template: `<div class="z-pbar" :class="{a:animated}" :style="{'--h': height + 'px', '--c': c || 'var(--hero-color,#a855f7)', '--b': b || 'var(--hero-bright,#c084fc)'}"><div class="z-pbar__f" :style="{'--v': Math.min(100, Math.max(0, value)) + '%'}"><div v-if="showLabel" class="z-pbar__l">{{ label || Math.round(value)+'%' }}</div></div></div>`
}

export const ZStatBar = {
  name: 'ZStatBar',
  props: { value: { type: Number, default: 0 }, height: { type: Number, default: 7 }, c: String, b: String },
  template: `<div class="z-sbar" :style="{'--h': height + 'px', '--c': c || 'var(--hero-color,#a855f7)', '--b': b || 'var(--hero-bright,#c084fc)'}"><div class="z-sbar__f" :style="{'--v': Math.min(100, Math.max(0, value)) + '%'}"></div></div>`
}

export const ZXPBar = {
  name: 'ZXPBar',
  props: { value: { type: Number, default: 0 }, width: { type: Number, default: 5 }, c: String, b: String },
  template: `<div class="z-xpbar" :style="{'--w': width + 'px', '--c': c || 'var(--hero-color,#a855f7)', '--b': b || 'var(--hero-bright,#c084fc)'}"><div class="z-xpbar__f" :style="{'--v': Math.min(100, Math.max(0, value)) + '%'}"></div></div>`
}

// HP Segment Color Calculation
const HA = [{r:250,g:204,b:21},{r:239,g:136,b:68},{r:239,g:68,b:68}]
function lerp(a,b,t){return{r:Math.round(a.r+(b.r-a.r)*t),g:Math.round(a.g+(b.g-a.g)*t),b:Math.round(a.b+(b.b-a.b)*t)}}
function hpGrad(p){
  const P = Math.max(0,Math.min(1,p)), isLower = P <= 0.5, t = isLower ? P / 0.5 : (P - 0.5) / 0.5
  const c = lerp(isLower ? HA[2] : HA[1], isLower ? HA[1] : HA[0], t)
  return `rgb(${c.r},${c.g},${c.b})`
}

export const ZHPVisualizer = {
  name: 'ZHPVisualizer',
  props: { hpPercent: { type: Number, default: 1 }, tickCount: { type: Number, default: 15 }, showBadge: Boolean, badgeValue: String },
  template: `<div class="z-hpv"><span v-if="showBadge" class="z-hpv__b">{{ badgeValue }}</span><div class="z-hpv__f"><div v-for="(t,i) in ticks" :key="i" class="z-hpv__t" :style="{backgroundColor: t}"></div></div></div>`,
  computed: {
    ticks() {
      const activeCount = Math.round(this.hpPercent * this.tickCount)
      return Array.from({ length: this.tickCount }, (_, i) => i < activeCount ? hpGrad(i / (this.tickCount - 1)) : '#000')
    }
  }
}

export const ZOverlay = {
  name: 'ZOverlay',
  props: { visible: Boolean, closable: { type: Boolean, default: true }, zIndex: { type: Number, default: 500 } },
  emits: ['close'],
  template: `<Teleport to="body"><Transition name="zo"><div v-if="visible" class="zo" :style="{zIndex}" @click="e => closable && e.target === e.currentTarget && $emit('close')"><div class="zo__p"><slot /></div></div></Transition></Teleport>`
}

export const ZConfirmDialog = {
  name: 'ZConfirmDialog',
  props: { visible: Boolean, title: { type: String, default: 'Confirm' }, message: { type: String, default: 'Are you sure?' }, confirmText: { type: String, default: 'Confirm' }, cancelText: { type: String, default: 'Cancel' }, danger: Boolean, closable: { type: Boolean, default: true } },
  emits: ['confirm','cancel'],
  template: `<ZOverlay :visible="visible" :closable="closable" :z-index="700" @close="$emit('cancel')"><div class="zc" :class="{d:danger}" @click.stop><div v-if="danger" class="zc__i">⚠</div><div class="zc__t">{{ title }}</div><div class="zc__m">{{ message }}</div><div class="zc__a"><button class="zc__b zc__b--y" @click="$emit('confirm')">{{ confirmText }}</button><button class="zc__b zc__b--n" @click="$emit('cancel')">{{ cancelText }}</button></div></div></ZOverlay>`
}

// ═══════════════════════════════════════════════════════
// 5. INSTALLER
// ═══════════════════════════════════════════════════════

const ALL = { ZBadge, ZButton, ZToggle, ZProgressBar, ZStatBar, ZHPVisualizer, ZXPBar, ZOverlay, ZConfirmDialog }

export function install(app, opts = {}) {
  const skip = new Set(opts.exclude || [])
  for (const [n, c] of Object.entries(ALL)) { if (!skip.has(n)) app.component(n, c) }
  inject()
}

export default { PALETTE, FACTIONS, alpha, characterThemes, gemColorInfo, CHAR_GEM_COLOR, getFaction, applyTheme, useTooltip, useOverlay, useConfirm, ...ALL, install }
