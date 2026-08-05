<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { heroRegistry, gameState, closeCharPopout, togglePreferredStat, getEffectiveStats, getSpectraGemStatBonus, getHeroGemBonuses } from '../composables/useGameState'
import type { HeroBonuses, Objective } from '../composables/useGameState'
import { heroThemes, STAT_NAMES, STAT_LABELS } from '../config/gameData'
import { applyTheme } from '../composables/cssScripts'

const props = defineProps<{
  heroName: string
}>()

const hero = computed(() => heroRegistry[props.heroName])
const theme = computed(() => heroThemes[props.heroName] || heroThemes.Kailin)

// Resolve the matching objective first — effectiveStats below passes it through
const obj = computed<Objective | undefined>(() => gameState.objectives.find(o => o.name === props.heroName))

const ZERO_STATS = { Str: 0, Spi: 0, Int: 0, Con: 0, Dex: 0 }

/**
 * Effective stats include:
 *  - Continuous Spectra gem bonuses (+0.03 per stat per equipped cyan gem)
 *  - Per-army stat scaling (e.g. Reaver, Weaver, Aether classes)
 *  - Per-vantage stat scaling (e.g. Weaver class)
 * Passing the objective enables perArmyStat/perVantageStat calculations.
 */
const effectiveStats = computed(() => hero.value ? getEffectiveStats(hero.value, obj.value ?? null) : ZERO_STATS)
const spectraGemBonus = computed(() => hero.value ? getSpectraGemStatBonus(hero.value) : ZERO_STATS)

/** Use effective stats for the bar display, but keep the original stats for max calculation. */
const maxStat = computed(() => Math.max(...STAT_NAMES.map(s => effectiveStats.value[s] || 0), 20))
const hasSpectraBonus = computed(() => Object.values(spectraGemBonus.value).some(v => v > 0))

/** Total gem bonuses computed centrally from all equipped gems. */
const totalGemBonuses = computed<HeroBonuses>(() => {
  if (!hero.value) return {} as HeroBonuses
  return getHeroGemBonuses(hero.value)
})
const hasAshbeamBonus = computed(() => (totalGemBonuses.value.critChance ?? 0) > 0 || (totalGemBonuses.value.vantageCritChance ?? 0) > 0)
const hasVoltkinBonus = computed(() => (totalGemBonuses.value.critDamage ?? 0) > 0 || (totalGemBonuses.value.doubleCrit ?? 0) > 0)
const hasCrypsisBonus = computed(() => (totalGemBonuses.value.damageMult ?? 0) > 0)

// Faction theming: single-hero surface → [data-faction] via applyTheme
const popoutRef = ref<HTMLElement | null>(null)
watch(() => props.heroName, (name) => {
  applyTheme(popoutRef.value, name)
})
onMounted(() => {
  applyTheme(popoutRef.value, props.heroName)
})

function handleOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closeCharPopout()
  }
}

function handleToggleStat(statName: string) {
  togglePreferredStat(props.heroName, statName)
}

function onImgError(e: Event) {
  const el = e.target as HTMLElement | null
  if (el) el.style.display = 'none'
}
</script>

<template>
  <Teleport to="body">
    <div class="char-popout-overlay" @click="handleOverlayClick">
      <div
        ref="popoutRef"
        class="char-popout"
        :style="{
          '--hero-color': theme.color,
          '--hero-bright': theme.bright,
          '--hero-glow': theme.glow
        }"
      >
        <div class="popout-close-wrap">
          <button class="char-popout-close" @click="closeCharPopout()">✕</button>
        </div>
        <div class="char-popout-header">
          <img
            class="popout-portrait"
            :src="obj?.portraitUrl || ''"
            :alt="heroName"
            @error="onImgError"
            :style="{
              '--hero-color': theme.color,
              '--hero-glow': theme.glow
            }"
          />
          <div>
            <div class="popout-name">{{ heroName }}</div>
            <div class="popout-level">LV {{ hero.level }} &middot; Grade {{ hero.grade || 1 }}</div>
          </div>
        </div>
        <div class="char-popout-body">
          <div class="section-title">Attributes</div>
          <div
            v-for="stat in STAT_NAMES"
            :key="stat"
            class="stat-row"
            :class="{ preferred: hero.preferredStats.includes(stat) }"
            @click="handleToggleStat(stat)"
          >
            <span class="stat-label">{{ stat }}</span>
            <div class="stat-bar-bg">
              <div
                class="stat-bar-fill"
                :style="{
                  width: Math.min(100, (effectiveStats[stat] / maxStat) * 100) + '%',
                  background: 'linear-gradient(90deg, ' + theme.color + ', ' + theme.bright + ')',
                  boxShadow: '0 0 6px ' + theme.glow
                }"
              ></div>
            </div>
            <span class="stat-value">{{ effectiveStats[stat].toFixed(2) }}</span>
            <span
              class="stat-pref-star"
              :class="{ active: hero.preferredStats.includes(stat) }"
            >{{ hero.preferredStats.includes(stat) ? '★' : '☆' }}</span>
          </div>
          <!-- Spectra gem bonus indicator -->
          <div v-if="hasSpectraBonus" class="spectra-bonus-row">
            <span class="spectra-bonus-label">✦ Spectra Gems</span>
            <span
              v-for="stat in STAT_NAMES"
              :key="'sb-' + stat"
              class="spectra-bonus-stat"
              :class="{ active: spectraGemBonus[stat] > 0 }"
            >+{{ spectraGemBonus[stat].toFixed(2) }}</span>
          </div>
          <!-- Ashbeam (blue) gem crit bonus indicator -->
          <div v-if="hasAshbeamBonus" class="ashbeam-bonus-row">
            <span class="ashbeam-bonus-label">✦ Ashbeam Gems</span>
            <span class="ashbeam-bonus-stat">Crit {{ ((totalGemBonuses.critChance ?? 0) * 100).toFixed(0) }}%</span>
            <span class="ashbeam-bonus-stat vc">D.Crit {{ ((totalGemBonuses.vantageCritChance ?? 0) * 100).toFixed(0) }}%</span>
          </div>
          <!-- Voltkin (red) gem damage bonus indicator -->
          <div v-if="hasVoltkinBonus" class="voltkin-bonus-row">
            <span class="voltkin-bonus-label">✦ Voltkin Gems</span>
            <span class="voltkin-bonus-stat">Crit Dmg +{{ ((totalGemBonuses.critDamage ?? 0) * 100).toFixed(0) }}%</span>
            <span class="voltkin-bonus-stat vd">D.Crit {{ (totalGemBonuses.doubleCrit ?? 0).toFixed(0) }}x</span>
          </div>
          <!-- Crypsis (orange) gem final damage % increase -->
          <div v-if="hasCrypsisBonus" class="crypsis-dmg-row">
            <span class="crypsis-dmg-label">✦ Crypsis Gems</span>
            <span class="crypsis-dmg-stat">Final Dmg +{{ ((totalGemBonuses.damageMult ?? 0) * 100).toFixed(1) }}%</span>
          </div>
          <div class="stat-points-display">
            <span class="pts-label">Preferred Stats</span>
            <span class="pts-value">{{ hero.preferredStats.join(', ') || 'None' }}</span>
          </div>
          <div style="margin-top:10px;font-size:10px;color:#64748b;font-family:monospace;text-align:center;">
            Click a stat to toggle preference (max 2).<br>
            +0.01/preferred stat per completion.<br>
            Spectra gems: +0.03 to all stats while equipped.<br>
            Crypsis gems: +{{ ((totalGemBonuses.damageMult ?? 0) * 100).toFixed(1) }}% final damage.
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.char-popout-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.7);
  z-index: 500;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: popout-fadein .15s ease-out;
}
@keyframes popout-fadein {
  0% { opacity: 0; }
  to { opacity: 1; }
}
.char-popout {
  background: #0d0d14;
  border: 1px solid rgba(168,85,247,.3);
  border-radius: 8px;
  width: 90%;
  max-width: 360px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 0 40px rgba(168,85,247,.3), 0 0 80px rgba(168,85,247,.1);
  animation: popout-slidein .2s ease-out;
  scrollbar-width: thin;
  scrollbar-color: rgba(168,85,247,.2) transparent;
}
.char-popout::-webkit-scrollbar { width: 3px; }
.char-popout::-webkit-scrollbar-track { background: transparent; }
.char-popout::-webkit-scrollbar-thumb { background: rgba(168,85,247,.2); border-radius: 2px; }
@keyframes popout-slidein {
  0% { opacity: 0; transform: translateY(20px) scale(.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.popout-close-wrap { position: relative; }
.char-popout-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid rgba(168,85,247,.2);
  background: rgba(0,0,0,.5);
  color: var(--hero-bright, #c084fc);
  font-size: 16px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .15s;
  z-index: 10;
}
.char-popout-close:hover {
  background: rgba(168,85,247,.2);
  border-color: var(--hero-color, #a855f7);
}
.char-popout-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid rgba(168,85,247,.1);
  background: linear-gradient(180deg, rgba(168,85,247,.08) 0%, transparent 100%);
}
.popout-portrait {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  border: 2px solid var(--hero-color, #a855f7);
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 0 12px var(--hero-glow, rgba(168,85,247,.6));
}
.popout-name {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 1px;
  color: var(--hero-bright, #c084fc);
}
.popout-level {
  font-size: 11px;
  font-family: monospace;
  color: #64748b;
  font-weight: 700;
}
.char-popout-body { padding: 16px; }
.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
  margin-bottom: 10px;
  font-family: monospace;
}
.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(168,85,247,.1);
  border-radius: 4px;
  margin-bottom: 6px;
  background: rgba(168,85,247,.03);
  transition: all .15s;
  cursor: pointer;
}
.stat-row:hover {
  border-color: rgba(168,85,247,.3);
  background: rgba(168,85,247,.06);
}
.stat-row.preferred {
  border-color: #f59e0b;
  background: rgba(245,158,11,.08);
  box-shadow: 0 0 10px rgba(245,158,11,.15);
}
.stat-label {
  font-size: 13px;
  font-weight: 700;
  font-family: monospace;
  width: 40px;
  flex-shrink: 0;
  color: var(--hero-bright, #c084fc);
}
.stat-bar-bg {
  flex: 1;
  height: 8px;
  background: rgba(168,85,247,.1);
  border-radius: 4px;
  overflow: hidden;
}
.stat-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: none;
}
.stat-value {
  font-size: 13px;
  font-weight: 900;
  font-family: monospace;
  width: 52px;
  text-align: right;
  color: #e2e8f0;
}
.stat-pref-star {
  font-size: 14px;
  width: 20px;
  text-align: center;
  color: #64748b;
  transition: all .2s;
}
.stat-pref-star.active {
  color: #f59e0b;
  text-shadow: 0 0 8px rgba(245,158,11,.6);
}
.spectra-bonus-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 6px 10px;
  margin-top: 6px;
  margin-bottom: 6px;
  background: rgba(34,211,238,.06);
  border: 1px solid rgba(34,211,238,.15);
  border-radius: 4px;
  font-family: monospace;
  font-size: 10px;
}
.spectra-bonus-label {
  color: #22d3ee;
  font-weight: 700;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.spectra-bonus-stat {
  color: #64748b;
  font-weight: 600;
  font-size: 9px;
}
.spectra-bonus-stat.active {
  color: #22d3ee;
  text-shadow: 0 0 6px rgba(34,211,238,.3);
}
.ashbeam-bonus-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 6px 10px;
  margin-top: 6px;
  margin-bottom: 6px;
  background: rgba(29,78,216,.06);
  border: 1px solid rgba(29,78,216,.15);
  border-radius: 4px;
  font-family: monospace;
  font-size: 10px;
}
.ashbeam-bonus-label {
  color: #60a5fa;
  font-weight: 700;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.ashbeam-bonus-stat {
  color: #64748b;
  font-weight: 600;
  font-size: 9px;
}
.ashbeam-bonus-stat.vc {
  color: #a855f7;
  text-shadow: 0 0 6px rgba(168,85,247,.3);
}
.voltkin-bonus-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 6px 10px;
  margin-top: 6px;
  margin-bottom: 6px;
  background: rgba(239,68,68,.06);
  border: 1px solid rgba(239,68,68,.15);
  border-radius: 4px;
  font-family: monospace;
  font-size: 10px;
}
.voltkin-bonus-label {
  color: #f87171;
  font-weight: 700;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.voltkin-bonus-stat {
  color: #64748b;
  font-weight: 600;
  font-size: 9px;
}
.voltkin-bonus-stat.vd {
  color: #f87171;
  text-shadow: 0 0 6px rgba(239,68,68,.3);
}
/* ── Crypsis Bonus Row ── */
.crypsis-dmg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 6px 10px;
  margin-top: 6px;
  margin-bottom: 6px;
  background: rgba(245,158,11,.06);
  border: 1px solid rgba(245,158,11,.15);
  border-radius: 4px;
  font-family: monospace;
  font-size: 10px;
}
.crypsis-dmg-label {
  color: #fbbf24;
  font-weight: 700;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.crypsis-dmg-stat {
  color: #f59e0b;
  font-weight: 700;
  font-size: 10px;
  text-shadow: 0 0 8px rgba(245,158,11,.3);
}
.stat-points-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(168,85,247,.05);
  border: 1px solid rgba(168,85,247,.15);
  border-radius: 4px;
  margin-top: 10px;
  font-family: monospace;
}
.pts-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.pts-value {
  font-size: 13px;
  font-weight: 900;
  color: #f59e0b;
  text-shadow: 0 0 8px rgba(245,158,11,.3);
}
</style>
