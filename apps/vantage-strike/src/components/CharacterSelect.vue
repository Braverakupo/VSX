<script setup lang="ts">
// CharacterSelect.vue — minimalist video-game style character select screen.
// Rendered inside #game-view, so it is locked to the Main Game width (max 780px).
//
// Layout: the large character art is PINNED (sticky) and does not scroll with
// the page. The select UI (roster sidebar, caption) scrolls over it,
// and ALL lore lives below the characters screen — scroll down to read it.
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { charTemplates, heroThemes, localImages } from '../config/gameData'
import { applyTheme } from '../composables/cssScripts'
import LandingView from './LandingView.vue'

const emit = defineEmits<{
  (e: 'select', hero: string): void
}>()

const BASE = import.meta.env.BASE_URL

const rootRef = ref<HTMLElement | null>(null)
const heroList = charTemplates as readonly string[]

const selected = ref<string>('Ashbeam')
const theme = computed(() => heroThemes[selected.value] || heroThemes.Voltkin)

/** Short combat-role titles shown under each pilot's name (Ashbeam → Sniper-Tactician). */
const SHORT_ROLES: Record<string, string> = {
  Voltkin: 'Engineer · Shock Trooper',
  Ashbeam: 'Sniper-Tactician',
  Crypsis: 'Combat Economist',
  Spectra: 'Scout · Psionic Specialist',
  Hellshift: 'Vanguard · Heavy Assault',
  Kailin: 'Assassin · Knight-Errant'
}

// Character art: pinned to a single chosen render per pilot
const HERO_ART: Record<string, string> = {
  Voltkin: 'assets/Voltkin_Bars/scene_1778877404137.png',
  Hellshift: 'assets/Hellshift_Bars/post_1778878760382.png',
  Kailin: 'assets/Kailin_Bars/scene_1778877350796.png',
  Spectra: 'assets/Spectra_Bars/bar_1778877059432.png',
  Crypsis: 'assets/Crypsis_Bars/bar_1778877003152.png',
  Ashbeam: 'assets/Ashbeam_Bars/bar_1778876983518.png'
}
const heroArt = computed(() => BASE + (HERO_ART[selected.value] ?? HERO_ART.Ashbeam))

// Per-hero initial start point in REFERENCE space (px from the art area's
// top-left). Drag to a spot, read the img left/top, and drop values here.
const HERO_START: Record<string, { x: number; y: number }> = {
  Ashbeam: { x: -471, y: -113 },
  Voltkin: { x: -531, y: -113 },
  Crypsis: { x: -352, y: -80 },
  Spectra: { x: -340, y: -78 },
  Hellshift: { x: -588, y: -68 },
  Kailin: { x: -644, y: -96 }
}

// Reference art-area size at which HERO_START was captured (desktop window).
// The whole scene — image size AND offsets — scales uniformly with the art
// area via k, so the character keeps the same relative spot as the window
// scales. If you re-capture positions at a different window size, update
// REF_ART to that size so k=1 matches your capture.
const REF_ART = { w: 752, h: 737 }
const BASE_IMG = { w: 1720, h: 960 } // 1376×768 natural × 1.25

// ── Proportional art + drag-to-pan ──
// The img renders at BASE_IMG × k where k = min(1, artW/REF.w, artH/REF.h):
// the composition zooms out with the window but stays at the same relative
// spot. Offsets live in reference space; only the rendered px multiply by k.
// Dragging pans 1:1 on screen and updates the reference-space offset.
const artHost = ref<HTMLElement | null>(null)
const artImg = ref<HTMLImageElement | null>(null)
const k = ref(1) // uniform scale (≤ 1 — never upscales)
const refLeft = ref(0) // offset in reference space (px)
const refTop = ref(0)
const panning = ref(false)
let resizeObserver: ResizeObserver | null = null

function applyPos() {
  const img = artImg.value
  const host = artHost.value ?? img?.parentElement
  if (!img || !host) return
  const boxW = host.clientWidth
  const boxH = host.clientHeight
  if (!boxW || !boxH) return
  const imgW = BASE_IMG.w * k.value
  const imgH = BASE_IMG.h * k.value
  img.style.width = imgW + 'px'
  img.style.height = imgH + 'px'
  const left = Math.min(0, Math.max(boxW - imgW, refLeft.value * k.value))
  const top = Math.min(0, Math.max(boxH - imgH, refTop.value * k.value))
  img.style.left = left + 'px'
  img.style.top = top + 'px'
}

function updateScale() {
  const host = artHost.value
  if (!host) return
  const w = host.clientWidth
  const h = host.clientHeight
  if (!w || !h) return
  // zoom out with the window (proportional to the reference capture size),
  // but never below what's needed to keep the image covering the art area
  // (no black gaps on very portrait screens)
  const zoomK = Math.min(1, w / REF_ART.w, h / REF_ART.h)
  const coverK = Math.max(w / BASE_IMG.w, h / BASE_IMG.h)
  k.value = Math.max(zoomK, coverK)
  applyPos()
}

function setStart() {
  const s = HERO_START[selected.value]
  refLeft.value = s ? s.x : 0
  refTop.value = s ? s.y : 0
  applyPos()
}

let panStartX = 0
let panStartY = 0
let panStartLeft = 0
let panStartTop = 0
function artDown(e: PointerEvent) {
  panning.value = true
  panStartX = e.clientX
  panStartY = e.clientY
  panStartLeft = refLeft.value
  panStartTop = refTop.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault()
}
function artMove(e: PointerEvent) {
  if (!panning.value) return
  const inv = k.value || 1
  refLeft.value = panStartLeft + (e.clientX - panStartX) / inv
  refTop.value = panStartTop + (e.clientY - panStartY) / inv
  applyPos()
}
function artUp() {
  panning.value = false
}
function portraitFor(hero: string): string {
  const portraits = localImages[hero]?.portraits
  return portraits && portraits.length ? portraits[0] : ''
}

function selectHero(hero: string) {
  if (selected.value === hero) return
  selected.value = hero
  emit('select', hero)
  nextTick(() => {
    applyTheme(rootRef.value, hero)
    setStart() // apply the hero's static start point
  })
}

function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
  switch (e.key) {
    case 'ArrowUp':
    case 'ArrowDown':
      // Up/Down cycles heroes, but only at the top of the page so the lore
      // below the select screen still scrolls with the arrow keys
      if (rootRef.value && rootRef.value.scrollTop === 0) {
        const i = heroList.indexOf(selected.value)
        const next = heroList[(i + (e.key === 'ArrowDown' ? 1 : -1) + heroList.length) % heroList.length]
        selectHero(next)
        e.preventDefault()
      }
      break
  }
}

function hideImg(e: Event) {
  const el = e.target as HTMLElement | null
  if (el) el.style.visibility = 'hidden'
}

onMounted(async () => {
  await nextTick()
  applyTheme(rootRef.value, selected.value)
  emit('select', selected.value)
  window.addEventListener('keydown', onKey)
  updateScale()
  setStart()
  if (artHost.value) {
    resizeObserver = new ResizeObserver(() => updateScale())
    resizeObserver.observe(artHost.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div ref="rootRef" class="cs-page">
    <!-- ══ Pinned character art — never scrolls with the page ══ -->
    <div class="cs-pin">
      <div ref="artHost" class="cs-art" :class="{ 'is-panning': panning }" @pointerdown="artDown" @pointermove="artMove" @pointerup="artUp" @pointercancel="artUp">
        <img ref="artImg" :src="heroArt" :alt="selected + ' render'" draggable="false" @error="hideImg" />
      </div>
      <div class="cs-swirl"></div>
      <div class="cs-shade"></div>
    </div>

    <!-- ══ Select UI overlay — scrolls away over the pinned art ══ -->
    <div class="cs-ui">
        <!-- Character Roster Sidebar (left) -->
        <aside class="cs-side">
          <button
            v-for="hero in heroList"
            :key="hero"
            class="cs-char"
            :class="{ active: selected === hero }"
            @click="selectHero(hero)"
          >
            <span class="cs-avatar">
              <img :src="BASE + portraitFor(hero)" :alt="hero" loading="lazy" @error="hideImg" />
            </span>
            <span class="cs-name">{{ hero }}</span>
          </button>
        </aside>

        <!-- Typography (bottom left, based on selected character) -->
        <div class="cs-caption">
          <div class="cs-kicker">PILOT PROFILE</div>
          <div class="cs-name-big">{{ selected }}</div>
          <div class="cs-role">{{ SHORT_ROLES[selected] }}</div>
          <div class="cs-nav">
            <span class="cs-nav-keys">▲ ▼</span>
            <span class="cs-nav-label">HERO</span>
          </div>
        </div>

      <!-- ══ All lore below the characters screen ══ -->
    </div>

    <section class="cs-lore">
      <LandingView sections-only :hero="selected" />
    </section>
  </div>
</template>

<style scoped>
.cs-page {
  position: relative;
  width: 100%;
  max-width: 780px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--z-bg-dark, #030305);
}

/* ── Pinned art layer (sticky — does not scroll) ── */
.cs-pin {
  position: sticky;
  top: 0;
  height: 100%;
  z-index: 1;
  overflow: hidden;
  background: #000; /* completely black */
}
/* Swirling themed glow — constrained to a centered band over the character
   layer so it never paints the (black) background */
.cs-swirl {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 14%;
  width: 72%;
  z-index: 3;
  pointer-events: none;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    var(--hero-color, #3b82f6) 40deg,
    transparent 90deg,
    transparent 160deg,
    var(--hero-bright, #93c5fd) 205deg,
    transparent 260deg,
    var(--hero-color, #3b82f6) 320deg,
    transparent 360deg
  );
  filter: blur(34px);
  opacity: .22;
  mix-blend-mode: screen;
  animation: cs-swirl-rotate 16s linear infinite;
}
@keyframes cs-swirl-rotate { to { transform: rotate(360deg); } }

/* Character art — fixed-size static image positioned by left/top. The
   initial point per hero lives in HERO_START; drag to pan */
.cs-art {
  position: absolute;
  inset: 0;
  z-index: 2;
  cursor: grab;
  touch-action: none; /* both-axis panning — vertical drag must reach the image */
  overflow: hidden;
}
.cs-art.is-panning {
  cursor: grabbing;
}
.cs-art img {
  position: absolute;
  top: 0;
  left: 0;
  width: 1720px; /* base 1.25× size (1376×768 natural); JS scales it down
                    proportionally with the art area via k (≤ 1) */
  height: 960px;
  max-width: none; /* override global img { max-width: 100% } reset */
  max-height: none;
  -webkit-user-drag: none;
}

/* Readability scrim */
.cs-shade {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background:
    linear-gradient(to top, rgba(3,3,5,.85) 0%, rgba(3,3,5,.25) 32%, transparent 60%),
    linear-gradient(to right, rgba(3,3,5,.6) 0%, transparent 30%);
}

/* ── Select UI overlay — absolutely positioned over the pinned art area, so
   it consumes no flow space and scrolls away while the art stays pinned ──
   pointer-events: none so drags pass through to the art layer beneath;
   only the two panels (sidebar / caption) stay interactive ── */
.cs-ui {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.cs-ui > .cs-side,
.cs-ui > .cs-caption {
  pointer-events: auto;
}

/* ── Roster Sidebar (left) ── */
.cs-side {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 122px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 8px;
  overflow-y: auto;
  overflow-x: hidden;
  background: linear-gradient(90deg, rgba(0, 0, 0, .55), transparent);
  border-right: 1px solid var(--z-border-muted, rgba(168,85,247,.1));
}
.cs-char {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform .15s ease;
}
.cs-char:hover { transform: translateY(-2px); }
.cs-avatar {
  width: 76px;
  height: 76px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(168,85,247,.18);
  background: #000;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.cs-char.active .cs-avatar {
  border-color: var(--hero-color, #3b82f6);
  box-shadow: 0 0 14px var(--hero-glow, rgba(59,130,246,.5)), inset 0 0 8px rgba(255,255,255,.08);
}
.cs-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(.75) brightness(.92);
  transition: filter .15s ease;
}
.cs-char.active .cs-avatar img { filter: saturate(1.1) brightness(1.05); }
.cs-name {
  font-family: var(--z-font-mono, monospace);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .8px;
  text-transform: uppercase;
  color: var(--z-text-secondary, #64748b);
  transition: color .15s ease, text-shadow .15s ease;
}
.cs-char.active .cs-name {
  color: var(--hero-bright, #93c5fd);
  text-shadow: 0 0 8px var(--hero-glow, rgba(59,130,246,.5));
}

/* ── Typography (bottom left) ── */
.cs-caption {
  position: absolute;
  left: 138px;
  bottom: 16px;
  z-index: 6;
  max-width: 50%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px 16px;
  border-left: 3px solid var(--hero-color, #3b82f6);
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(3,3,5,.78), rgba(3,3,5,.35) 75%, transparent);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}
.cs-kicker {
  font-family: var(--z-font-mono, monospace);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--z-text-muted, #94a3b8);
}
.cs-name-big {
  font-family: var(--z-font-ui, system-ui, sans-serif);
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  font-size: clamp(30px, 6.5vw, 52px);
  line-height: .95;
  letter-spacing: 1px;
  color: var(--hero-bright, #93c5fd);
  text-shadow:
    0 0 12px var(--hero-glow, rgba(59,130,246,.6)),
    0 0 42px var(--hero-glow, rgba(59,130,246,.45)),
    0 2px 4px rgba(0,0,0,.85);
}
.cs-role {
  font-size: 12px;
  font-style: italic;
  font-weight: 800;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--hero-color, #3b82f6);
  text-shadow: 0 0 10px var(--hero-glow, rgba(59,130,246,.55));
  margin-top: 2px;
}
/* Arrow-key navigation hint under the pilot caption */
.cs-nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
}
.cs-nav-keys {
  font-family: var(--z-font-mono, monospace);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--hero-bright, #93c5fd);
  text-shadow: 0 0 8px var(--hero-glow, rgba(59,130,246,.5));
}
.cs-nav-label {
  font-family: var(--z-font-mono, monospace);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--z-text-muted, #94a3b8);
  text-transform: uppercase;
}

/* ── All lore below the characters screen ── */
.cs-lore {
  position: relative;
  z-index: 3;
  /* Translucent so the pinned character art stays visible as a dimmed
     backdrop behind the lore docs while scrolling */
  background: rgba(3, 3, 5, .82);
  border-top: 1px solid var(--hero-color, rgba(168,85,247,.25));
  box-shadow: 0 -12px 40px rgba(0,0,0,.55);
}

/* ── Narrow layouts: sidebar stays vertical on the left (no horizontal
   scroll strip); caption compacts to fit ── */
@media (max-width: 700px) {
  .cs-name-big { font-size: clamp(26px, 8vw, 38px); }
  .cs-caption { left: 134px; max-width: 24%; }
}
</style>
