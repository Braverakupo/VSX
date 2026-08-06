<script setup lang="ts">
// CharacterSelect.vue — minimalist video-game style character select screen.
// Rendered inside #game-view, so it is locked to the Main Game width (max 780px).
//
// Layout: the large character art is PINNED (sticky) and does not scroll with
// the page. The select UI (roster sidebar, caption, dossier) scrolls over it,
// and ALL lore lives below the characters screen — scroll down to read it.
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { charTemplates, heroThemes, localImages } from '../config/gameData'
import { CHAR_LORE } from '../config/loreData'
import { JOB_MEDAL_DEFS } from '../config/jobMedalData'
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

// ── Content-aware framing ──
// The bar strips are wide 1376×768 landscape renders with baked-in cinematic
// black bars at the top and bottom, so the character art only occupies the
// middle band. Instead of showing the full strip (which leaves black bands
// inside the art area), we measure the bright (non-black) content of each
// image once, zoom so that band fills the art area's height, and center the
// content's middle in the art area. The user can still grab and pan the
// zoomed view (photo-viewer style) ──
const artHost = ref<HTMLElement | null>(null)
const artImg = ref<HTMLImageElement | null>(null)

const posLeft = ref(0) // img left (px) relative to the art area
const posTop = ref(0) // img top (px) relative to the art area
const panning = ref(false)
let imgW = 0 // rendered img size (px)
let imgH = 0
let boxW = 0 // art area size (px)
let boxH = 0

const CONTENT_LUM_THRESH = 28 // same threshold as the bbox analysis scripts
const MAX_ZOOM_RATIO = 2 // cap so a nearly-empty image can't blow up

interface ContentBox {
  x0: number; y0: number; x1: number; y1: number
  cx: number; cy: number
}
const contentCache = new Map<string, ContentBox | null>()

async function measureContent(src: string): Promise<ContentBox | null> {
  if (contentCache.has(src)) return contentCache.get(src) ?? null
  const measure = async (): Promise<ContentBox | null> => {
    const img = new Image()
    img.src = src
    await img.decode().catch(() => null)
    if (!img.naturalWidth) return null
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    const w = c.width
    const h = c.height
    let minX = w, maxX = 0, minY = h, maxY = 0, count = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
        if (lum > CONTENT_LUM_THRESH) {
          count++
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (count === 0) return null
    return {
      x0: minX, y0: minY, x1: maxX, y1: maxY,
      cx: (minX + maxX) / 2, cy: (minY + maxY) / 2
    }
  }
  const result = await measure()
  contentCache.set(src, result)
  return result
}

function applyPos() {
  const img = artImg.value
  if (!img) return
  const left = Math.min(0, Math.max(boxW - imgW, posLeft.value))
  const top = Math.min(0, Math.max(boxH - imgH, posTop.value))
  posLeft.value = left
  posTop.value = top
  img.style.left = left + 'px'
  img.style.top = top + 'px'
}

let layoutSeq = 0
let resizeObserver: ResizeObserver | null = null

async function layoutArt() {
  const img = artImg.value
  const host = artHost.value
  if (!img || !host || !img.naturalWidth) return
  const want = new URL(heroArt.value, document.baseURI).href
  if (img.currentSrc && img.currentSrc !== want) return // stale image swap
  boxW = host.clientWidth
  boxH = host.clientHeight
  if (!boxW || !boxH) return
  const W = img.naturalWidth
  const H = img.naturalHeight
  const seq = ++layoutSeq
  const bbox = await measureContent(img.currentSrc || img.src)
  if (seq !== layoutSeq) return
  const coverS = Math.max(boxW / W, boxH / H)
  let s = coverS
  if (bbox) {
    const contentH = bbox.y1 - bbox.y0 + 1
    // zoom so the non-black content fills the art-area height (crops the
    // baked-in cinematic bars), never less than a plain cover
    s = Math.max(s, Math.min(boxH / contentH, coverS * MAX_ZOOM_RATIO))
  }
  imgW = W * s
  imgH = H * s
  img.style.width = imgW + 'px'
  img.style.height = imgH + 'px'
  const cx = bbox ? bbox.cx : W / 2
  const cy = bbox ? bbox.cy : H / 2
  posLeft.value = boxW / 2 - cx * s
  posTop.value = boxH / 2 - cy * s
  applyPos()
}

function onArtLoad() {
  layoutArt()
}

let panStartX = 0
let panStartY = 0
let panStartLeft = 0
let panStartTop = 0
function artDown(e: PointerEvent) {
  panning.value = true
  panStartX = e.clientX
  panStartY = e.clientY
  panStartLeft = posLeft.value
  panStartTop = posTop.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault()
}
function artMove(e: PointerEvent) {
  if (!panning.value) return
  posLeft.value = panStartLeft + (e.clientX - panStartX)
  posTop.value = panStartTop + (e.clientY - panStartY)
  applyPos()
}
function artUp() {
  panning.value = false
}
const lore = computed(() => CHAR_LORE[selected.value])
// Dossier medal grid: 3 rows × 3 columns of Job Medals + titles
const medals = computed(() => (JOB_MEDAL_DEFS[selected.value] || []).slice(0, 9))

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
    layoutArt() // re-frame around the new image's content
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
  layoutArt()
  if (artHost.value) {
    resizeObserver = new ResizeObserver(() => layoutArt())
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
        <img ref="artImg" :src="heroArt" :alt="selected + ' render'" draggable="false" @load="onArtLoad" @error="hideImg" />
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

        <!-- Dossier & Stats Panel (right) -->
        <aside class="cs-dossier">
          <div class="glass">
            <div class="d-head">
              <span class="d-kicker">DOSSIER</span>
              <span class="d-real">{{ lore.realName }}</span>
            </div>
            <dl class="d-facts">
              <div class="d-fact"><dt>Role</dt><dd>{{ lore.role }}</dd></div>
              <div class="d-fact"><dt>Mech</dt><dd>{{ lore.mech }}</dd></div>
              <div class="d-fact"><dt>Tenet</dt><dd>{{ lore.hardcoreTenet }}</dd></div>
              <div class="d-fact d-fact--quote"><dt>Philosophy</dt><dd>"{{ lore.philosophy }}"</dd></div>
            </dl>
            <p class="d-back">{{ lore.background }}</p>
            <div class="d-medals">
              <div class="d-medals-label">JOB MEDALS</div>
              <div class="d-medals-grid">
                <div v-for="m in medals" :key="m.id" class="d-medal" :title="m.desc">
                  <span class="d-medal-name">{{ m.name }}</span>
                  <span class="d-medal-stat">{{ m.stats[0] }}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      <!-- ══ All lore below the characters screen ══ -->
    </div>

    <section class="cs-lore">
      <LandingView sections-only />
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

/* Character art — fills the pinned area. The script measures each image's
   non-black content, zooms so that content fills the art-area height (cropping
   the baked-in cinematic bars), and centers it in the art area */
.cs-art {
  position: absolute;
  inset: 0;
  z-index: 2;
  cursor: grab;
  touch-action: pan-y; /* vertical page scroll still works on touch */
  overflow: hidden;
}
.cs-art.is-panning {
  cursor: grabbing;
}
.cs-art img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  max-width: none; /* override global img { max-width: 100% } reset */
  max-height: none;
  object-fit: cover;
  /* Fallback framing while the content measurement runs; layoutArt() then
     sets the exact zoomed size and centered position inline */
  object-position: 50% 50%;
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
   only the three panels (sidebar / caption / dossier) stay interactive ── */
.cs-ui {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.cs-ui > .cs-side,
.cs-ui > .cs-caption,
.cs-ui > .cs-dossier {
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

/* ── Dossier & Stats Panel (right) — translucent glass ── */
.cs-dossier {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 12px;
  width: 212px;
  z-index: 6;
}
.glass {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 13px 14px;
  overflow-y: auto;
  background: rgba(13,13,20,.55);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 12px;
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.04),
    inset 0 0 26px rgba(0,0,0,.38),
    0 10px 34px rgba(0,0,0,.55);
}
.d-head {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.d-kicker {
  font-family: var(--z-font-mono, monospace);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--hero-color, #3b82f6);
}
.d-real {
  font-family: var(--z-font-mono, monospace);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .5px;
  color: var(--hero-bright, #93c5fd);
}
.d-facts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
}
.d-fact dt {
  font-family: var(--z-font-mono, monospace);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--z-text-secondary, #64748b);
}
.d-fact dd {
  font-size: 11px;
  line-height: 1.45;
  color: var(--z-text-primary, #e2e8f0);
  margin: 1px 0 0;
}
.d-fact--quote dd { font-style: italic; color: var(--z-text-muted, #94a3b8); }
.d-back {
  font-size: 10.5px;
  line-height: 1.5;
  color: var(--z-text-secondary, #64748b);
  border-top: 1px solid rgba(255,255,255,.06);
  padding-top: 8px;
}

/* Job Medals — 3 rows × 3 columns of medals + titles */
.d-medals {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid rgba(255,255,255,.06);
  padding-top: 8px;
}
.d-medals-label {
  font-family: var(--z-font-mono, monospace);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--z-text-secondary, #64748b);
}
.d-medals-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}
.d-medal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 3px 5px;
  background: rgba(255,255,255,.045);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 6px;
  min-width: 0;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.d-medal:hover {
  border-color: var(--hero-color, #3b82f6)66;
  box-shadow: 0 0 10px var(--hero-glow, rgba(59,130,246,.25));
}
.d-medal-name {
  font-family: var(--z-font-mono, monospace);
  font-size: 7.5px;
  font-weight: 800;
  letter-spacing: .4px;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.15;
  color: var(--hero-bright, #93c5fd);
  text-shadow: 0 0 6px var(--hero-glow, rgba(59,130,246,.4));
}
.d-medal-stat {
  font-family: var(--z-font-mono, monospace);
  font-size: 8px;
  font-weight: 700;
  color: var(--z-text-secondary, #64748b);
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
   scroll strip); dossier and caption compact to fit ── */
@media (max-width: 700px) {
  .cs-dossier { width: 168px; top: 10px; right: 10px; bottom: 10px; }
  .cs-name-big { font-size: clamp(26px, 8vw, 38px); }
  .cs-caption { left: 134px; max-width: 24%; }
}
</style>
