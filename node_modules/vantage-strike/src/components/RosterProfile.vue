<script setup lang="ts">
import { computed } from 'vue'
import { heroThemes, gemColorInfo, CHAR_GEM_COLOR, localImages, STAT_NAMES, STAT_LABELS, classDefinitions } from '../config/gameData'
import { JOB_MEDAL_DEFS } from '../config/jobMedalData'
import { CHAR_LORE } from '../config/loreData'

const props = defineProps<{
  heroName: string
}>()

const BASE = import.meta.env.BASE_URL

const theme = computed(() => heroThemes[props.heroName] || heroThemes.Voltkin)
const gemColor = computed(() => CHAR_GEM_COLOR[props.heroName] || 'reds')
const gemInfo = computed(() => gemColorInfo[gemColor.value])
const lore = computed(() => CHAR_LORE[props.heroName])
const medals = computed(() => JOB_MEDAL_DEFS[props.heroName] || [])
const signatureClass = computed(() =>
  classDefinitions.find(c => c.id === lore.value?.signatureClassId)
)
const portrait = computed(() => {
  const list = localImages[props.heroName]?.portraits
  return list && list.length > 0 ? BASE + list[0] : ''
})

function onImgError(e: Event) {
  const el = e.target as HTMLElement | null
  if (el) el.style.display = 'none'
}
</script>

<template>
  <div class="rp" :style="{ '--rp-color': theme.color, '--rp-bright': theme.bright, '--rp-glow': theme.glow }">
    <!-- Header: portrait + identity -->
    <div class="rp-head">
      <div class="rp-portrait-wrap">
        <img
          class="rp-portrait"
          :src="portrait"
          :alt="heroName"
          @error="onImgError"
        />
      </div>
      <div class="rp-ident">
        <div class="rp-name">{{ heroName }}</div>
        <div class="rp-title">{{ gemInfo.label }}</div>
        <div class="rp-real">{{ lore.realName }} <span v-if="lore.aliases.length">· {{ lore.aliases.join(' / ') }}</span></div>
        <div class="rp-badges">
          <span class="z-badge">{{ lore.hardcoreTenet }}</span>
          <span class="z-badge">{{ lore.role }}</span>
        </div>
      </div>
    </div>

    <!-- Quote -->
    <div class="rp-quote">"{{ lore.philosophy }}"</div>

    <!-- Mech -->
    <div class="rp-section">
      <div class="rp-section-title">W.A.R.G.E.A.R.</div>
      <div class="rp-mech">{{ lore.mech }}</div>
      <div class="rp-mech-spec">{{ lore.mechSpec }}</div>
    </div>

    <!-- Background / personality -->
    <div class="rp-section">
      <div class="rp-section-title">Record</div>
      <p class="rp-text">{{ lore.background }}</p>
      <p class="rp-text">{{ lore.personality }}</p>
      <p v-if="lore.relationships" class="rp-text rp-links">{{ lore.relationships }}</p>
      <div v-if="lore.animeInspirations.length" class="rp-insp">
        <span class="rp-insp-label">Inspirations:</span>
        <span v-for="src in lore.animeInspirations" :key="src" class="z-badge">{{ src }}</span>
      </div>
    </div>

    <!-- Attributes -->
    <div class="rp-section">
      <div class="rp-section-title">Attributes</div>
      <div v-for="stat in STAT_NAMES" :key="stat" class="rp-stat">
        <span class="rp-stat-label">{{ STAT_LABELS[stat] }}</span>
        <div class="rp-stat-bar">
          <div
            class="rp-stat-fill"
            :style="{
              width: '60%',
              background: 'linear-gradient(90deg, ' + theme.color + ', ' + theme.bright + ')',
              boxShadow: '0 0 6px ' + theme.glow
            }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Signature class + medals -->
    <div class="rp-section">
      <div class="rp-section-title">Signature Class</div>
      <div v-if="signatureClass" class="rp-class">
        <span class="rp-class-name" :style="{ color: theme.bright }">{{ signatureClass.name }}</span>
        <span class="rp-class-desc">{{ signatureClass.description }}</span>
      </div>
    </div>

    <div class="rp-section">
      <div class="rp-section-title">Job Medals</div>
      <div class="rp-medals">
        <span v-for="m in medals" :key="m.id" class="z-badge">{{ m.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rp {
  border: 1px solid var(--z-border-default);
  border-radius: var(--z-radius);
  background: var(--z-bg-card);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Header */
.rp-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.rp-portrait-wrap {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  border: 1px solid var(--rp-color);
  border-radius: var(--z-radius-sm);
  overflow: hidden;
  box-shadow: 0 0 18px var(--rp-glow);
  background: #000;
}
.rp-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.rp-ident {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.rp-name {
  font-family: var(--z-font-mono);
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 1px;
  color: var(--rp-bright);
}
.rp-title {
  font-size: 12px;
  color: var(--rp-color);
  font-weight: 700;
}
.rp-real {
  font-size: 11px;
  color: var(--z-text-secondary);
}
.rp-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.rp-badges .z-badge {
  border-color: var(--rp-color);
}

/* Quote */
.rp-quote {
  border-left: 3px solid var(--rp-color);
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.35);
  color: var(--z-text-primary);
  font-style: italic;
  font-size: 13px;
  line-height: 1.5;
}

/* Sections */
.rp-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rp-section-title {
  font-family: var(--z-font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--z-text-muted);
  border-bottom: 1px solid var(--z-border-muted);
  padding-bottom: 4px;
}
.rp-mech {
  font-size: 13px;
  font-weight: 800;
  color: var(--rp-bright);
}
.rp-mech-spec,
.rp-text {
  font-size: 12px;
  line-height: 1.55;
  color: var(--z-text-secondary);
}
.rp-text.rp-links {
  color: var(--rp-color);
}
.rp-insp {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.rp-insp-label {
  font-size: 11px;
  color: var(--z-text-muted);
}
.rp-insp .z-badge {
  border-color: var(--rp-color);
}

/* Stats */
.rp-stat {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rp-stat-label {
  flex: 0 0 86px;
  font-size: 11px;
  color: var(--z-text-secondary);
  font-weight: 700;
}
.rp-stat-bar {
  flex: 1;
  height: 10px;
  background: #000;
  border: 1px solid var(--z-border-muted);
  overflow: hidden;
}
.rp-stat-fill {
  height: 100%;
  transition: width 0.3s ease;
}

/* Class + medals */
.rp-class {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rp-class-name {
  font-size: 13px;
  font-weight: 800;
}
.rp-class-desc {
  font-size: 12px;
  color: var(--z-text-secondary);
  line-height: 1.5;
}
.rp-medals {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.rp-medals .z-badge {
  border-color: var(--rp-color);
  color: var(--rp-bright);
}
</style>
