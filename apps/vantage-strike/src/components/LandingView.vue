<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { heroThemes, gemColorInfo, CHAR_GEM_COLOR, charTemplates } from '../config/gameData'
import { applyTheme } from '../composables/cssScripts'
import { CHAR_LORE, CODEX, WORLDS, FALL_OF_ARCADIA, WARGEAR, VEIL_KIN, SQUAD_MANDATE, ASHBEAM_CREED, HARDCORE_TENETS } from '../config/loreData'
import { JOB_MEDAL_DEFS } from '../config/jobMedalData'
import RosterProfile from './RosterProfile.vue'

const props = defineProps<{
  /** Optional section id to scroll to on mount (e.g. 'lv-codex' for the Lore section). */
  anchor?: string
  /** Lore-only mode: hides the masthead/roster, renders as an in-flow block
      (used below the character select screen). Inherits the parent faction theme. */
  sectionsOnly?: boolean
  /** Selected pilot — drives the dossier block shown just above The Codex. */
  hero?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// ── Faction theming: page surface follows the selected hero ──
const pageRef = ref<HTMLElement | null>(null)
const activeHero = ref<string>('Voltkin')

const heroList = charTemplates as readonly string[]

const lore = computed(() => CHAR_LORE[activeHero.value])
// Dossier medal grid: 3 rows × 3 columns of Job Medals + titles
const medals = computed(() => (JOB_MEDAL_DEFS[activeHero.value] || []).slice(0, 9))

const activeTheme = computed(() => heroThemes[activeHero.value] || heroThemes.Voltkin)

watch(activeHero, (name) => {
  if (!props.sectionsOnly) applyTheme(pageRef.value, name)
})

watch(() => props.hero, (h) => {
  if (h && h !== activeHero.value) activeHero.value = h
})

onMounted(async () => {
  await nextTick()
  if (!props.sectionsOnly) applyTheme(pageRef.value, activeHero.value)
  if (props.anchor) scrollTo(props.anchor)
})

watch(() => props.anchor, (a) => {
  if (a) nextTick(() => scrollTo(a))
})

function setHero(name: string) {
  activeHero.value = name
}

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div ref="pageRef" class="lv" :class="{ 'lv--sections': sectionsOnly }">
      <!-- ── Hero masthead ── -->
      <section v-if="!sectionsOnly" class="lv-hero">
        <button class="z-btn z-btn--ghost lv-close" @click="emit('close')">✕ Exit</button>
        <div class="lv-hero-inner">
          <div class="lv-kicker">A MODERN RITE OF PASSAGE</div>
          <h1 class="lv-title">VANTAGE&nbsp;STRIKE</h1>
          <div class="lv-tagline">"To have vantage is to rise above the noise, to see through the storm. You're not lost in the chaos — you're the one who shapes it."</div>
          <div class="lv-hero-cta">
            <button class="z-btn z-btn--primary" @click="scrollTo('lv-codex')">Enter the Codex</button>
            <button class="z-btn z-btn--ghost" @click="scrollTo('lv-roster')">Meet the Squad</button>
            <button class="z-btn z-btn--ghost" @click="scrollTo('lv-universe')">The Fall of Arcadia</button>
          </div>
          <!-- Faction chips: hover/click to re-theme the whole page -->
          <div class="lv-chips">
            <button
              v-for="name in heroList"
              :key="name"
              class="lv-chip"
              :class="{ active: activeHero === name }"
              :style="{ borderColor: heroThemes[name].color, color: heroThemes[name].bright, boxShadow: activeHero === name ? '0 0 12px ' + heroThemes[name].glow : 'none' }"
              @click="setHero(name)"
              :title="gemColorInfo[CHAR_GEM_COLOR[name]].label"
            >
              {{ name }}
            </button>
          </div>
        </div>
      </section>

      <!-- ── Pilot Dossier — moved up from the character-select overlay ── -->
      <section class="lv-dossier">
        <div class="lv-section-head">
          <span class="z-badge">DOSSIER</span>
          <h2>{{ lore.realName }}</h2>
          <p class="lv-section-sub">{{ activeHero }}</p>
        </div>
        <dl class="lv-dossier-facts">
          <div class="lv-dossier-fact"><dt>Role</dt><dd>{{ lore.role }}</dd></div>
          <div class="lv-dossier-fact"><dt>Mech</dt><dd>{{ lore.mech }}</dd></div>
          <div class="lv-dossier-fact"><dt>Tenet</dt><dd>{{ lore.hardcoreTenet }}</dd></div>
          <div class="lv-dossier-fact lv-dossier-fact--quote"><dt>Philosophy</dt><dd>"{{ lore.philosophy }}"</dd></div>
        </dl>
        <p class="lv-dossier-back">{{ lore.background }}</p>
        <div class="lv-dossier-medals">
          <div class="lv-dossier-medals-label">JOB MEDALS</div>
          <div class="lv-dossier-medals-grid">
            <div v-for="m in medals" :key="m.id" class="lv-dossier-medal" :title="m.desc">
              <span class="lv-dossier-medal-name">{{ m.name }}</span>
              <span class="lv-dossier-medal-stat">{{ m.stats[0] }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── The Codex ── -->
      <section id="lv-codex" class="lv-section">
        <div class="lv-section-head">
          <span class="z-badge">THE CODEX</span>
          <h2>Doctrine of Sovereign Action</h2>
        </div>
        <div class="lv-cards">
          <div v-for="pillar in [CODEX.vantage, CODEX.strike]" :key="pillar.title" class="lv-card">
            <div class="lv-card-title">{{ pillar.title }}</div>
            <div class="lv-card-sub">{{ pillar.subtitle }}</div>
            <div class="lv-card-triad">
              <span v-for="t in pillar.triad" :key="t" class="z-badge">{{ t }}</span>
            </div>
            <p class="lv-card-verse">"{{ pillar.verse }}"</p>
            <div class="lv-card-essence">{{ pillar.essence }}</div>
          </div>
        </div>
        <div class="lv-edge">
          <div class="lv-edge-title">{{ CODEX.unyieldingEdge.title }} — {{ CODEX.unyieldingEdge.subtitle }}</div>
          <p class="lv-edge-verse">"{{ CODEX.unyieldingEdge.verse }}"</p>
          <div class="lv-edge-triads">
            <span v-for="t in CODEX.unyieldingEdge.triad" :key="t" class="z-badge">{{ t }}</span>
          </div>
        </div>
        <div class="lv-tenets">
          <span class="lv-tenets-label">HARDCORE TENETS</span>
          <span v-for="tenet in HARDCORE_TENETS" :key="tenet" class="z-badge">{{ tenet }}</span>
        </div>
      </section>

      <!-- ── The Universe ── -->
      <section id="lv-universe" class="lv-section">
        <div class="lv-section-head">
          <span class="z-badge">THE UNIVERSE</span>
          <h2>Arcadia → The Obsidian Depths → Obsidia</h2>
        </div>
        <div class="lv-worlds">
          <div v-for="(world, i) in WORLDS" :key="world.name" class="lv-world">
            <div class="lv-world-arrow" v-if="i > 0">→</div>
            <div class="lv-world-card">
              <div class="lv-world-name">{{ world.name }}</div>
              <div class="lv-world-role">{{ world.role }}</div>
              <p class="lv-world-desc">{{ world.description }}</p>
              <div class="lv-world-sym">{{ world.symbolism }}</div>
            </div>
          </div>
        </div>
        <div class="lv-fall">
          <div class="lv-fall-title">{{ FALL_OF_ARCADIA.title }}</div>
          <p class="lv-fall-text">
            <strong>{{ FALL_OF_ARCADIA.agent }}</strong> — {{ FALL_OF_ARCADIA.trueIdentity }} — {{ FALL_OF_ARCADIA.method }}
          </p>
          <p class="lv-fall-text">{{ FALL_OF_ARCADIA.paradox }}</p>
          <div class="lv-fall-veil">
            <strong>{{ VEIL_KIN.title }}:</strong> {{ VEIL_KIN.description }}
            <span class="lv-fall-shadow">{{ VEIL_KIN.shadow }}</span>
          </div>
        </div>
      </section>

      <!-- ── The Roster ── -->
      <section v-if="!sectionsOnly" id="lv-roster" class="lv-section">
        <div class="lv-section-head">
          <span class="z-badge">THE ROSTER</span>
          <h2>The Inner Council</h2>
          <p class="lv-section-sub">Six archetypes of self-mastery. Select a pilot to re-theme the page and open their dossier.</p>
        </div>
        <div class="lv-tabs">
          <button
            v-for="name in heroList"
            :key="name"
            class="z-btn lv-tab"
            :class="{ 'lv-tab--active': activeHero === name }"
            :style="{ borderColor: heroThemes[name].color, color: activeHero === name ? heroThemes[name].bright : undefined }"
            @click="setHero(name)"
          >
            {{ name }}
          </button>
        </div>
        <RosterProfile :hero-name="activeHero" />
      </section>

      <!-- ── W.A.R.G.E.A.R. ── -->
      <section id="lv-wargear" class="lv-section">
        <div class="lv-section-head">
          <span class="z-badge">W.A.R.G.E.A.R.</span>
          <h2>Psycho-Spiritual Anchors</h2>
        </div>
        <div class="lv-wargear">
          <div class="lv-wargear-grid">
            <div v-for="name in heroList" :key="name" class="lv-mech">
              <span class="lv-mech-pilot" :style="{ color: heroThemes[name].bright }">{{ name }}</span>
              <span class="lv-mech-name">{{ CHAR_LORE[name].mech }}</span>
            </div>
          </div>
          <p class="lv-wargear-text">{{ WARGEAR.tagline }}</p>
          <div class="lv-rating">
            <div class="lv-rating-row">
              <span class="z-badge">VANTAGE RATING</span>
              <span class="lv-rating-max">MAX {{ WARGEAR.ratingMax }}</span>
              <span class="z-badge lv-forms-badge">99 FORMS</span>
            </div>
            <div class="z-pbar lv-rating-bar" :style="{ '--v': '97%', '--h': '10px' }">
              <div class="z-pbar__f"></div>
              <div class="z-pbar__l">97 — THE UNYIELDING EDGE</div>
            </div>
            <p class="lv-rating-note">{{ WARGEAR.ratingMeaning }}</p>
            <p class="lv-rating-note">{{ WARGEAR.ninetyNineForms }}</p>
            <p class="lv-rating-note">{{ WARGEAR.formsAesthetic }}</p>
          </div>
        </div>
      </section>

      <!-- ── Footer ── -->
      <footer class="lv-footer">
        <div class="lv-footer-mandate">"{{ SQUAD_MANDATE }}"</div>
        <div class="lv-footer-creed">"{{ ASHBEAM_CREED }}"</div>
        <div class="lv-footer-cta">
          <button v-if="!sectionsOnly" class="z-btn z-btn--primary" @click="scrollTo('lv-hero')">Rise Above the Noise</button>
        </div>
        <div class="lv-footer-copy">VANTAGE STRIKE — a metaphysical framework for self-becoming. Gnosis → Praxis.</div>
      </footer>
  </div>
</template>

<style scoped>
.lv {
  position: absolute;
  inset: 0;
  z-index: 5;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--z-bg-dark);
  color: var(--z-text-primary);
  font-family: var(--z-font-ui);
  scroll-behavior: smooth;
}

/* Lore-only mode: in-flow block, no own scrolling, inherits parent theme */
.lv--sections {
  position: relative;
  inset: auto;
  z-index: auto;
  height: auto;
  overflow: visible;
  background: transparent;
}

/* ── Hero ── */
.lv-hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 20px 60px;
  position: relative;
  background:
    radial-gradient(ellipse at 50% 0%, var(--hero-glow, rgba(168,85,247,.18)) 0%, transparent 60%),
    var(--z-bg-dark);
}
.lv-close {
  position: absolute;
  top: 14px;
  right: 14px;
}
.lv-hero-inner {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
.lv-kicker {
  font-family: var(--z-font-mono);
  font-size: 11px;
  letter-spacing: 4px;
  color: var(--hero-bright, var(--z-text-muted));
  text-transform: uppercase;
}
.lv-title {
  font-family: var(--z-font-mono);
  font-size: clamp(34px, 8vw, 64px);
  font-weight: 900;
  letter-spacing: 4px;
  line-height: 1.05;
  color: var(--hero-bright, var(--z-text-primary));
  text-shadow: 0 0 30px var(--hero-glow, rgba(168,85,247,.5));
}
.lv-tagline {
  font-size: 14px;
  font-style: italic;
  color: var(--z-text-secondary);
  max-width: 560px;
  line-height: 1.6;
}
.lv-hero-cta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.lv-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}
.lv-chip {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid;
  border-radius: 3px;
  padding: 5px 10px;
  font-family: var(--z-font-mono);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.lv-chip:hover {
  transform: translateY(-1px);
}

/* ── Sections ── */
.lv-section {
  padding: 48px 20px;
  border-top: 1px solid var(--z-border-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}
.lv-section-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.lv-section-head h2 {
  font-family: var(--z-font-mono);
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 1px;
}
.lv-section-sub {
  font-size: 12px;
  color: var(--z-text-secondary);
  max-width: 560px;
}

/* ── Pilot Dossier (moved up from the select-screen overlay) ── */
.lv-dossier {
  width: 100%;
  max-width: 860px;
  background: var(--z-bg-card);
  border: 1px solid var(--z-border-default);
  border-radius: var(--z-radius);
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  text-align: center;
}
.lv-dossier-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin: 0;
  width: 100%;
  max-width: 660px;
}
.lv-dossier-fact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 8px;
  background: rgba(255,255,255,.035);
  border-radius: var(--z-radius-sm);
  min-width: 0;
}
.lv-dossier-fact dt {
  font-family: var(--z-font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--z-text-muted);
}
.lv-dossier-fact dd {
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--z-text-primary);
}
.lv-dossier-fact--quote dd { font-style: italic; color: var(--z-text-secondary); }
.lv-dossier-back {
  font-size: 12px;
  line-height: 1.6;
  color: var(--z-text-secondary);
  max-width: 640px;
}
.lv-dossier-medals {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  border-top: 1px solid var(--z-border-muted);
  padding-top: 12px;
}
.lv-dossier-medals-label {
  font-family: var(--z-font-mono);
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--z-text-muted);
}
.lv-dossier-medals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 6px;
  width: 100%;
  max-width: 640px;
}
.lv-dossier-medal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px 7px;
  background: rgba(255,255,255,.045);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: var(--z-radius-sm);
  min-width: 0;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.lv-dossier-medal:hover {
  border-color: var(--hero-color, var(--z-accent));
  box-shadow: 0 0 10px var(--hero-glow, rgba(168,85,247,.3));
}
.lv-dossier-medal-name {
  font-family: var(--z-font-mono);
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: .4px;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.15;
  color: var(--hero-bright, var(--z-text-primary));
  text-shadow: 0 0 6px var(--hero-glow, rgba(168,85,247,.35));
}
.lv-dossier-medal-stat {
  font-family: var(--z-font-mono);
  font-size: 9px;
  font-weight: 700;
  color: var(--z-text-secondary);
}

/* ── Codex cards ── */
.lv-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
  width: 100%;
  max-width: 860px;
}
.lv-card {
  background: var(--z-bg-card);
  border: 1px solid var(--z-border-default);
  border-radius: var(--z-radius);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lv-card-title {
  font-family: var(--z-font-mono);
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 2px;
  color: var(--hero-bright, var(--z-text-primary));
}
.lv-card-sub {
  font-size: 12px;
  color: var(--z-text-muted);
  font-weight: 700;
}
.lv-card-triad {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.lv-card-triad .z-badge {
  border-color: var(--hero-color, var(--z-accent));
}
.lv-card-verse {
  font-size: 13px;
  font-style: italic;
  color: var(--z-text-secondary);
  line-height: 1.6;
}
.lv-card-essence {
  font-size: 11px;
  font-weight: 700;
  color: var(--hero-color, var(--z-accent));
}
.lv-edge {
  width: 100%;
  max-width: 860px;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.35));
  border: 1px solid var(--hero-color, var(--z-accent));
  border-radius: var(--z-radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: center;
  align-items: center;
  box-shadow: 0 0 24px var(--hero-glow, rgba(168,85,247,.15));
}
.lv-edge-title {
  font-family: var(--z-font-mono);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 2px;
  color: var(--hero-bright, var(--z-text-primary));
}
.lv-edge-verse {
  font-size: 13px;
  font-style: italic;
  color: var(--z-text-secondary);
  max-width: 640px;
  line-height: 1.6;
}
.lv-edge-triads {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}
.lv-tenets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}
.lv-tenets-label {
  font-family: var(--z-font-mono);
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--z-text-muted);
}

/* ── Universe worlds ── */
.lv-worlds {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 860px;
  align-items: stretch;
}
.lv-world {
  display: flex;
  gap: 10px;
  align-items: stretch;
}
.lv-world-arrow {
  display: flex;
  align-items: center;
  font-family: var(--z-font-mono);
  color: var(--hero-color, var(--z-accent));
  font-size: 20px;
  padding: 0 2px;
}
.lv-world-card {
  flex: 1;
  background: var(--z-bg-card);
  border: 1px solid var(--z-border-muted);
  border-left: 3px solid var(--hero-color, var(--z-accent));
  border-radius: var(--z-radius);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lv-world-name {
  font-family: var(--z-font-mono);
  font-size: 16px;
  font-weight: 900;
  color: var(--hero-bright, var(--z-text-primary));
}
.lv-world-role {
  font-size: 11px;
  font-weight: 700;
  color: var(--hero-color, var(--z-accent));
  letter-spacing: 1px;
  text-transform: uppercase;
}
.lv-world-desc {
  font-size: 12px;
  color: var(--z-text-secondary);
  line-height: 1.55;
}
.lv-world-sym {
  font-size: 11px;
  font-style: italic;
  color: var(--z-text-muted);
}
.lv-fall {
  width: 100%;
  max-width: 860px;
  background: var(--z-bg-card);
  border: 1px solid var(--z-border-default);
  border-radius: var(--z-radius);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lv-fall-title {
  font-family: var(--z-font-mono);
  font-size: 16px;
  font-weight: 900;
  color: var(--hero-bright, var(--z-text-primary));
}
.lv-fall-text {
  font-size: 12px;
  color: var(--z-text-secondary);
  line-height: 1.6;
}
.lv-fall-veil {
  font-size: 12px;
  color: var(--z-text-secondary);
  line-height: 1.6;
  border-top: 1px solid var(--z-border-muted);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lv-fall-shadow {
  font-style: italic;
  color: var(--z-text-muted);
}

/* ── Roster ── */
.lv-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  max-width: 860px;
}
.lv-tab--active {
  box-shadow: 0 0 12px var(--hero-glow, rgba(168,85,247,.35));
}
.lv-roster-body {
  width: 100%;
  max-width: 860px;
}

/* ── Wargear ── */
.lv-wargear {
  width: 100%;
  max-width: 860px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}
.lv-wargear-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  width: 100%;
}
.lv-mech {
  background: var(--z-bg-card);
  border: 1px solid var(--z-border-muted);
  border-radius: var(--z-radius-sm);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lv-mech-pilot {
  font-family: var(--z-font-mono);
  font-size: 11px;
  font-weight: 800;
}
.lv-mech-name {
  font-size: 12px;
  color: var(--z-text-secondary);
}
.lv-wargear-text {
  font-size: 13px;
  color: var(--z-text-secondary);
  line-height: 1.6;
  text-align: center;
  max-width: 640px;
}
.lv-rating {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lv-rating-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.lv-rating-max {
  font-family: var(--z-font-mono);
  font-size: 11px;
  color: var(--z-text-muted);
}
.lv-forms-badge {
  border-color: var(--hero-color, var(--z-accent));
  color: var(--hero-bright, var(--z-text-primary));
}
.lv-rating-bar {
  --c: var(--hero-color, var(--z-accent));
  --b: var(--hero-bright, var(--z-text-primary));
}
.lv-rating-note {
  font-size: 12px;
  color: var(--z-text-secondary);
  line-height: 1.6;
}

/* ── Footer ── */
.lv-footer {
  padding: 48px 20px 60px;
  border-top: 1px solid var(--z-border-default);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}
.lv-footer-mandate {
  font-family: var(--z-font-mono);
  font-size: 14px;
  font-weight: 800;
  color: var(--hero-bright, var(--z-text-primary));
  max-width: 640px;
  line-height: 1.6;
}
.lv-footer-creed {
  font-size: 13px;
  font-style: italic;
  color: var(--z-text-secondary);
}
.lv-footer-copy {
  font-size: 11px;
  color: var(--z-text-muted);
  font-family: var(--z-font-mono);
  letter-spacing: 1px;
}
</style>
