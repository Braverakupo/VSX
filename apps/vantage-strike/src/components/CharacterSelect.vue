<script setup lang="ts">
// CharacterSelect.vue — minimalist video-game style character select screen.
// Rendered inside #game-view, so it is locked to the Main Game width (max 780px).
// Follows the Landing Page's design guidelines: --z-* tokens, mono UI chrome,
// and [data-faction] theming via applyTheme (cssScripts.ts).
import { ref, computed, onMounted, nextTick } from 'vue'
import { charTemplates, heroThemes, localImages } from '../config/gameData'
import { CHAR_LORE } from '../config/loreData'
import { JOB_MEDAL_DEFS } from '../config/jobMedalData'
import { applyTheme } from '../composables/cssScripts'

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

// Large waist-up hero render (any asset for now — the standalone character JPGs)
const heroArt = computed(() => BASE + 'assets/' + selected.value + '.jpg')
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
  nextTick(() => applyTheme(rootRef.value, hero))
}

function hideImg(e: Event) {
  const el = e.target as HTMLElement | null
  if (el) el.style.visibility = 'hidden'
}

onMounted(async () => {
  await nextTick()
  applyTheme(rootRef.value, selected.value)
  emit('select', selected.value)
})
</script>

<template>
  <div ref="rootRef" class="cs">
    <!-- ══ Character Roster Sidebar (left) ══ -->
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

    <!-- ══ Main Hero Presentation (center) ══ -->
    <main class="cs-stage">
      <!-- Background aura: behind the character layer, above the dark UI bg -->
      <div class="cs-aura"></div>

      <!-- Character art: full-background waist-up render -->
      <div class="cs-art">
        <img :src="heroArt" :alt="selected + ' render'" @error="hideImg" />
      </div>

      <!-- Swirling themed glow over the character layer -->
      <div class="cs-swirl"></div>

      <!-- Depth/readability scrim -->
      <div class="cs-shade"></div>

      <!-- Typography (bottom left, based on selected character) -->
      <div class="cs-caption">
        <div class="cs-kicker">PILOT PROFILE</div>
        <div class="cs-name-big">{{ selected }}</div>
        <div class="cs-role">{{ SHORT_ROLES[selected] }}</div>
      </div>

      <!-- ══ Dossier & Stats Panel (right) ══ -->
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
    </main>
  </div>
</template>

<style scoped>
.cs {
  display: flex;
  width: 100%;
  max-width: 780px;
  height: 100%;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 0%, var(--hero-glow, rgba(59,130,246,.12)) 0%, transparent 55%),
    var(--z-bg-dark, #030305);
}

/* ── Roster Sidebar (left) ── */
.cs-side {
  width: 122px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 8px;
  overflow-y: auto;
  overflow-x: hidden;
  background: linear-gradient(90deg, rgba(0, 0, 0, .55), transparent);
  border-right: 1px solid var(--z-border-muted, rgba(168,85,247,.1));
  z-index: 4;
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

/* ── Stage (center) ── */
.cs-stage {
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: hidden;
}

/* Aura — behind the character layer, in front of the dark UI background */
.cs-aura {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(circle at 32% 42%, var(--hero-glow, rgba(59,130,246,.55)) 0%, transparent 52%),
    radial-gradient(circle at 78% 26%, var(--hero-glow, rgba(59,130,246,.4)) 0%, transparent 46%);
  filter: blur(18px);
  mix-blend-mode: screen;
  animation: cs-aura-breathe 5.5s ease-in-out infinite alternate;
}
@keyframes cs-aura-breathe {
  from { opacity: .45; }
  to { opacity: .9; }
}

/* Character art — full background, intentionally breaks out of containers */
.cs-art {
  position: absolute;
  inset: 0;
  z-index: 2;
}
.cs-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 16%;
}

/* Swirling themed glow — over the character layer for depth */
.cs-swirl {
  position: absolute;
  inset: -35%;
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

/* ── Typography (bottom left) ── */
.cs-caption {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 6;
  max-width: 58%;
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
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

/* ── Narrow layouts: roster strip on top, compact dossier ── */
@media (max-width: 700px) {
  .cs { flex-direction: column; }
  .cs-side {
    width: 100%;
    height: 88px;
    flex-direction: row;
    gap: 8px;
    padding: 8px 10px;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: none;
    border-bottom: 1px solid var(--z-border-muted, rgba(168,85,247,.1));
    background: rgba(0,0,0,.45);
  }
  .cs-char { flex-shrink: 0; }
  .cs-avatar { width: 52px; height: 52px; }
  .cs-name { font-size: 7.5px; }
  .cs-dossier { width: 168px; top: 10px; right: 10px; bottom: 10px; }
  .cs-name-big { font-size: clamp(26px, 8vw, 38px); }
  .cs-caption { max-width: 52%; }
}
</style>
