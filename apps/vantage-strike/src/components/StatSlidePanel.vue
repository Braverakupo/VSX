<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useGemTooltip } from '../composables/useGemTooltip'
import { heroRegistry, formatNotation, equipGem, unequipGem, deleteGem, togglePreferredStat } from '../composables/useGameState'
import { heroThemes, STAT_NAMES, GEMS_PER_COLOR, CHAR_GEM_COLOR, ALL_GEMS, classDefinitions, STAT_LABELS } from '../config/gameData'
import { JOB_MEDAL_DEFS } from '../config/jobMedalData'
import * as combatSystem from '../systems/combatSystem'
import { applyTheme } from '../composables/cssScripts'
import GemItem from './GemItem.vue'
import GemTooltip from './GemTooltip.vue'
const { showTooltip, hideTooltip, updatePosition, selectGem, clearGemSelection, selectedGemId, persistent, selectedGem } = useGemTooltip()

const props = defineProps<{
  heroName: string
  objective: any
}>()

const hero = computed(() => heroRegistry[props.heroName])
const theme = computed(() => heroThemes[props.heroName] || heroThemes.Kailin)

// Faction theming: single-hero surface → [data-faction] via applyTheme
const panelRef = ref<HTMLElement | null>(null)
watch(() => props.heroName, (name) => {
  applyTheme(panelRef.value, name)
})
onMounted(() => {
  applyTheme(panelRef.value, props.heroName)
})

// ── Effective stats (including Spectra gem bonuses) ──
const effectiveStats = computed(() => combatSystem.getEffectiveStats(hero.value))

// ── Job Medals from this hero's jobMedal system ──
const jobMedalDefs = computed(() => JOB_MEDAL_DEFS[props.heroName] || [])
const jobMedalSlots = computed(() => {
  if (!hero.value || !hero.value.jobMedals) return []
  const system = hero.value.jobMedals
  return jobMedalDefs.value.map((def: any, i: number) => {
    const medal = system.medalSlots[i]
    return { def, medal, level: medal?.level ?? 0 }
  })
})

// Build a lookup from medal ID → class definition
const classDefById: Record<string, any> = {}
for (const cd of classDefinitions) {
  classDefById[cd.id] = cd
}

// Get the class ID from a medal ID
function getClassIdFromMedal(medalId: string): string | null {
  const parts = medalId.split('_')
  if (parts.length < 2) return null
  return parts.slice(1).join('_')
}

// Get the class definition for a medal, or a mock with at least an id
function getClassDefForMedal(medalId: string): any {
  const classId = getClassIdFromMedal(medalId)
  if (!classId) return null
  return classDefById[classId] || { id: classId }
}

// Passive key labels for display
const PASSIVE_LABELS: Record<string, string> = {
  vantageAutoRate: 'Vantage Auto/s',
  armyPerSecond: 'Army Gain',
  critDamage: 'Crit Dmg',
  doubleCrit: 'Dbl Dmg',
  goldPerSecond: 'Gold/s',
  idleDamageMult: 'Idle Dmg',
  statPerCompletion: 'Stat/Completion',
  preferredStatBonus: 'Pref Stat Bonus'
}

// 10 passives, each appearing exactly 3× per character across 10 classes
const PASSIVES_10 = ['vantageAutoRate','armyPerSecond','critDamage','critDamage','doubleCrit','goldPerSecond','idleDamageMult','statPerCompletion','preferredStatBonus','doubleCrit']
function buildBalanced(rot: number): string[][] {
  const base = PASSIVES_10
  const items: string[] = []
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < 10; i++) {
      items.push(base[(i + rot) % 10])
    }
  }
  const groups: string[][] = []
  for (let i = 0; i < 10; i++) groups.push(items.slice(i * 3, i * 3 + 3))
  return groups
}
const CLASS_PASSIVES: Record<string, string[]> = {
  vanguard:      buildBalanced(0)[0],  berserker:     buildBalanced(0)[1],
  blademaster:   buildBalanced(0)[2],  fury:          buildBalanced(0)[3],
  ravager:       buildBalanced(0)[4],  tempest:       buildBalanced(0)[5],
  inferno:       buildBalanced(0)[6],  warlord:       buildBalanced(0)[7],
  onslaught:     buildBalanced(0)[8],  overlord:      buildBalanced(0)[9],
  tactician:     buildBalanced(1)[0],  ranger:        buildBalanced(1)[1],
  gunslinger:    buildBalanced(1)[2],  spotter:       buildBalanced(1)[3],
  strategist:    buildBalanced(1)[4],  sharpshooter:  buildBalanced(1)[5],
  patrol:        buildBalanced(1)[6],  falcon:        buildBalanced(1)[7],
  scope:         buildBalanced(1)[8],  ace:           buildBalanced(1)[9],
  rogue:         buildBalanced(2)[0],  assassin:      buildBalanced(2)[1],
  trickster:     buildBalanced(2)[2],  scout:         buildBalanced(2)[3],
  bandit:        buildBalanced(2)[4],  shadowblade:   buildBalanced(2)[5],
  poacher:       buildBalanced(2)[6],  marauder:      buildBalanced(2)[7],
  corsair:       buildBalanced(2)[8],  shadow_king:   buildBalanced(2)[9],
  mystic:        buildBalanced(3)[0],  arcanist:      buildBalanced(3)[1],
  enchanter:     buildBalanced(3)[2],  sage:          buildBalanced(3)[3],
  oracle:        buildBalanced(3)[4],  aegis:         buildBalanced(3)[5],
  seer:          buildBalanced(3)[6],  weaver:        buildBalanced(3)[7],
  luminary:      buildBalanced(3)[8],  archon:        buildBalanced(3)[9],
  brawler:       buildBalanced(4)[0],  juggernaut:    buildBalanced(4)[1],
  reaver:        buildBalanced(4)[2],  pugilist:      buildBalanced(4)[3],
  gladiator:     buildBalanced(4)[4],  brute:         buildBalanced(4)[5],
  colossus:      buildBalanced(4)[6],  ironclad:      buildBalanced(4)[7],
  titan:         buildBalanced(4)[8],  war_master:    buildBalanced(4)[9],
  executor:      buildBalanced(5)[0],  voidcaller:    buildBalanced(5)[1],
  doombringer:   buildBalanced(5)[2],  judge:         buildBalanced(5)[3],
  harbinger:     buildBalanced(5)[4],  reaper:        buildBalanced(5)[5],
  inquisitor:    buildBalanced(5)[6],  fallen:        buildBalanced(5)[7],
  eclipse:       buildBalanced(5)[8],  death:         buildBalanced(5)[9],
}

// Base values for each passive key (used when class def doesn't have a specific value)
const PASSIVE_BASE: Record<string, number> = {
  vantageAutoRate: 0.05,
  armyPerSecond: 2,
  critDamage: 0.15,
  doubleCrit: 0.15,
  goldPerSecond: 1,
  idleDamageMult: 0.05,
  statPerCompletion: 0.01,
  preferredStatBonus: 0.01
}

// Format a single passive value
function formatPassive(key: string, scaledVal: number): string {
  const label = PASSIVE_LABELS[key] || key
  const v = scaledVal
  if (key === 'armyPerSecond') return `${label} +${v.toFixed(2)} /s`
  if (key === 'goldPerSecond') return `${label}: +${v.toFixed(1)}`
  if (key === 'statPerCompletion' || key === 'preferredStatBonus') return `${label}: +${(v * 100).toFixed(1)}%`
  if (key === 'critDamage' || key === 'doubleCrit') return `${label}: +${(v * 100).toFixed(0)}%`
  if (key === 'idleDamageMult') return `${label}: +${(v * 100).toFixed(0)}%`
  if (key === 'vantageAutoRate') return `${label}: +${v.toFixed(2)}`
  if (typeof v === 'number' && v < 1) return `${label}: +${(v * 100).toFixed(1)}%`
  return `${label}: +${v.toFixed(2)}`
}

// Get passive entries for a class (always exactly 3)
function getPassiveEntries(classDef: any, level: number): string[] {
  if (!classDef) return []
  const keys = CLASS_PASSIVES[classDef.id]
  if (!keys) return []
  const lvl = Math.max(1, level)
  return keys.map(key => {
    // Medal passives always use the uniform base (mirrors medalSystem JOB_PASSIVE_BASE);
    // classDef values (e.g. preferredStatBonus) are separate per-completion gem perks.
    let baseVal: number | number[] = PASSIVE_BASE[key] || 0.01
    if (Array.isArray(baseVal)) {
      baseVal = ((baseVal[0] + baseVal[1]) / 2) / 100
    }
    const scaled = typeof baseVal === 'number' ? baseVal * lvl : baseVal
    return formatPassive(key, scaled)
  })
}

// Track which medal is selected for detail display
const selectedMedalIndex = ref(0)

const selectedMedalSlot = computed(() => jobMedalSlots.value[selectedMedalIndex.value] || null)

// ── Stat progress for the selected medal (single tracked stat) ──
const selectedMedalProgress = computed<{ statKey: string; currentVal: number; target: number; progress: number } | null>(() => {
  const slot = selectedMedalSlot.value
  if (!slot || !slot.medal) return null
  if (slot.medal.isMaxLevel) return null
  const statKey = slot.def.stats?.[0]
  if (!statKey) return null
  const currentVal = slot.medal.getStatValue(effectiveStats.value)
  const tgt = slot.medal.getTarget()
  const progress = slot.medal.getProgress(effectiveStats.value)
  return { statKey, currentVal, target: tgt, progress }
})

// Class definition for the selected medal
const selectedClassDef = computed(() => {
  const slot = selectedMedalSlot.value
  if (!slot) return null
  return getClassDefForMedal(slot.def.id)
})

// Build passive description for next upgrade (using classDefinition passives)
const nextUpgradePassives = computed(() => {
  const cd = selectedClassDef.value
  if (!cd) return []
  const slot = selectedMedalSlot.value
  const nextLvl = (slot?.level ?? 0) + 1
  return getPassiveEntries(cd, nextLvl)
})

// Current passives (at current level)
const currentPassives = computed(() => {
  const cd = selectedClassDef.value
  if (!cd) return []
  const slot = selectedMedalSlot.value
  return getPassiveEntries(cd, slot?.level ?? 0)
})

// ── Tooltip state for medal hover ──
const tooltipMedal = ref<{ slot: any; def: any; passives: string[] } | null>(null)
const tooltipX = ref(0)
const tooltipY = ref(0)

function showMedalTooltip(slot: any, event: MouseEvent) {
  if (event.isTrusted) return
  const cd = getClassDefForMedal(slot.def.id)
  if (!cd) return
  tooltipMedal.value = { slot, def: cd, passives: getPassiveEntries(cd, slot.level) }
  tooltipX.value = event.clientX
  tooltipY.value = event.clientY
}

function hideMedalTooltip() {
  tooltipMedal.value = null
}

function moveMedalTooltip(event: MouseEvent) {
  if (event.isTrusted) return
  if (tooltipMedal.value) {
    tooltipX.value = event.clientX
    tooltipY.value = event.clientY
  }
}

function selectMedal(index: number) {
  selectedMedalIndex.value = index
}

// Gem color for this character's medal images
const charGemColor = computed(() => CHAR_GEM_COLOR[props.heroName] || 'reds')
const medalGemImages = computed(() => ALL_GEMS[charGemColor.value] || [])

const maxStat = computed(() => Math.max(...STAT_NAMES.map(s => effectiveStats.value[s] || 0), 20))

// ── Per-stat gain per completion ──
const statGains = computed(() => {
  const gains: Record<string, number> = { Str: 0, Spi: 0, Int: 0, Con: 0, Dex: 0 }
  if (!hero.value || !hero.value.gemSlots) return gains

  if (hero.value.preferredStats.length > 0) {
    hero.value.preferredStats.forEach((s: string) => {
      if (gains[s] !== undefined) gains[s] += 0.01
    })
  }

  // Pull gem bonuses to include modifier-based per-stat gains
  const gemBonuses = combatSystem.getTotalGemBonuses(hero.value)

  for (const gemId of hero.value.gemSlots) {
    if (!gemId) continue
    const gem = hero.value.inventory?.getGem(gemId)
    if (!gem || !gem.classId) continue
    const def = combatSystem.getGemClassDef(gem)
    if (!def) continue

    const statGain = def.statPerCompletion !== undefined ? def.statPerCompletion : 0.01

    if (def.flatStats) {
      for (const statKey of Object.keys(def.flatStats)) {
        if (gains[statKey] !== undefined) gains[statKey] += statGain
      }
    }

    if (def.preferredStatBonus && hero.value.preferredStats.length > 0) {
      const preferredGain = Math.max(0.01, Math.min(0.05, def.preferredStatBonus))
      hero.value.preferredStats.forEach((s: string) => {
        if (gains[s] !== undefined) gains[s] += preferredGain
      })
    }
  }

  // Modifier-based completionStat (guaranteed 1st modifier — targeted per-stat)
  if (gemBonuses.completionPerStat) {
    for (const [statKey, gain] of Object.entries(gemBonuses.completionPerStat)) {
      if (gain > 0 && gains[statKey] !== undefined) {
        gains[statKey] += gain
      }
    }
  }

  // Mystic Aura legendary modifier (+0.10 to ALL stats per completion)
  const mysticAura = gemBonuses.mysticAuraStatPerCompletion ?? 0
  if (mysticAura > 0) {
    for (const statKey of Object.keys(gains)) {
      gains[statKey] += mysticAura
    }
  }

  for (const key of Object.keys(gains)) {
    gains[key] = Math.round(gains[key] * 10000) / 10000
  }
  return gains
})

// ── Preferred stats ──
const preferredStats = computed(() => hero.value?.preferredStats || [])

// ── Gem slot data ──
const gemSlots = computed(() => {
  if (!hero.value) return []
  const slots = hero.value.gemSlots || []
  return slots.map((gemId: string | null, i: number) => {
    const gem = gemId ? (hero.value.inventory?.getGem(gemId) || null) : null
    return { index: i, gemId, gem, filled: !!gem }
  })
})

// ── Unequipped gems in hero's inventory ──
const inventoryGems = computed(() => {
  if (!hero.value || !hero.value.inventory) return []
  const equippedIds = new Set((hero.value.gemSlots || []).filter((id: string | null) => id !== null))
  return hero.value.inventory.getAll().filter((g: any) => !equippedIds.has(g.id))
})

const equippedCount = computed(() => {
  if (!hero.value || !hero.value.gemSlots) return 0
  return hero.value.gemSlots.filter((s: string | null) => s !== null).length
})

const inventoryCount = computed(() => hero.value?.inventory?.count || 0)

// ── Inventory slots (10 fixed slots for unequipped gems) ──
const invSlots = computed(() => {
  const unequipped = inventoryGems.value
  const slots: { index: number; gem: any; filled: boolean }[] = []
  for (let i = 0; i < GEMS_PER_COLOR; i++) {
    const gem = unequipped[i] || null
    slots.push({ index: i, gem, filled: !!gem })
  }
  return slots
})

// ── Move logic: selected gem (green) + tap another slot → move it there ──
function onEquippedSlotClick(slotIndex: number, gem: any) {
  if (!gem) {
    // Empty slot clicked with a gem selected → move selected gem here
    if (selectedGemId.value) {
      equipGem(props.heroName, slotIndex, selectedGemId.value)
      clearGemSelection()
    }
    return
  }
  // Filled slot clicked
  if (selectedGemId.value === gem.id) {
    // Same gem → deselect
    clearGemSelection()
  } else if (selectedGemId.value) {
    // Different gem selected → swap
    equipGem(props.heroName, slotIndex, selectedGemId.value)
    clearGemSelection()
  } else {
    // Nothing selected → select this gem
    selectGem(gem)
  }
}

function onInventorySlotClick(slotIndex: number, gem: any) {
  if (selectedGemId.value) {
    // A gem is selected — unequip it to inventory regardless of which slot was tapped
    const slotIdx = hero.value?.gemSlots?.indexOf(selectedGemId.value)
    if (slotIdx !== -1) {
      unequipGem(props.heroName, slotIdx)
      clearGemSelection()
    } else if (gem) {
      // Selected gem is from inventory too — just switch selection
      selectGem(gem)
    }
    return
  }
  // Nothing selected — select this inventory gem (if filled)
  if (gem) selectGem(gem)
}

// ── Trash confirmation overlay ──
const showTrashConfirm = ref(false)

function onTrashClick() {
  if (selectedGemId.value) {
    showTrashConfirm.value = true
  }
}

function confirmDelete() {
  if (selectedGemId.value) {
    deleteGem(selectedGemId.value)
    clearGemSelection()
  }
  showTrashConfirm.value = false
}

function cancelDelete() {
  showTrashConfirm.value = false
}
</script>

<template>
  <div class="stat-slide-panel-wrap">
  <div class="stat-slide-panel" ref="panelRef" :style="{ '--hero-color': theme.color, '--hero-bright': theme.bright, '--hero-glow': theme.glow, '--slot-color': theme.color }">
    <!-- Attributes -->
    <div class="ss-section">
      <div class="ss-section-title">Attributes</div>
      <div class="ss-stats-grid">
        <div
          v-for="stat in STAT_NAMES"
          :key="stat"
          class="ss-stat-item"
          :class="{ 'is-preferred': preferredStats.includes(stat) }"
          @click="togglePreferredStat(props.heroName, stat)"
        >
          <span class="ss-stat-label">{{ stat }}</span>
          <div class="ss-stat-bar-bg">
            <div
              class="ss-stat-bar-fill"
              :style="{
                width: Math.min(100, (effectiveStats[stat] / maxStat) * 100) + '%',
                background: 'linear-gradient(90deg, ' + theme.color + ', ' + theme.bright + ')',
                boxShadow: '0 0 6px ' + theme.glow
              }"
            ></div>
          </div>
          <span class="ss-stat-value">{{ effectiveStats[stat].toFixed(2) }}</span>
          <span class="ss-stat-gain" :class="{ 'no-gain': statGains[stat] <= 0 }">+{{ statGains[stat].toFixed(2) }}</span>
          <span class="ss-stat-pref" :class="{ active: preferredStats.includes(stat) }" title="Click to toggle preferred stat">
            {{ preferredStats.includes(stat) ? '★' : '☆' }}
          </span>
        </div>
      </div>
    </div>

    <!-- ── Job Medals Row + Detail ── -->
    <div class="ss-section">
      <div class="ss-section-title">Class Passives</div>
      <div class="ss-medal-row">
        <div
          v-for="(slot, i) in jobMedalSlots"
          :key="slot.def.id"
          class="ss-medal-slot"
          :class="{
            'is-selected': selectedMedalIndex === i,
            'is-max': slot.medal?.isMaxLevel,
            'is-unlocked': slot.level > 0
          }"
          :style="{ '--slot-color': slot.medal?.isMaxLevel ? '#facc15' : theme.color }"
          @click="selectMedal(i)"
          @mouseenter="showMedalTooltip(slot, $event)"
          @mouseleave="hideMedalTooltip"
          @mousemove="moveMedalTooltip"
        >
          <img
            v-if="medalGemImages[i]"
            :src="medalGemImages[i]"
            :alt="slot.def.name"
            class="ss-medal-gem-img"
            loading="lazy"
          />
          <div class="ss-medal-overlay">
            <span class="ss-medal-lvl" :class="{ 'max-lvl': slot.medal?.isMaxLevel }">
              {{ slot.medal?.isMaxLevel ? 'MAX' : slot.level > 0 ? 'Lv.' + slot.level : '🔒' }}
            </span>
          </div>
          <div class="ss-medal-progress">
            <div class="ss-medal-fill" :style="{ width: (slot.medal?.getProgress(effectiveStats) * 100) + '%' }"></div>
          </div>
        </div>
      </div>
      <!-- Detail panel for selected medal -->
      <div v-if="selectedMedalSlot" class="ss-medal-detail">
        <div class="ss-medal-detail-title" :style="{ color: theme.bright }">
          {{ selectedMedalSlot.def.name }}
          <span class="ss-medal-detail-lvl" :class="{ maxed: selectedMedalSlot.medal?.isMaxLevel }">
            {{ selectedMedalSlot.medal?.isMaxLevel ? 'MAXED' : 'Lv.' + selectedMedalSlot.level }}
          </span>
        </div>
        <div class="ss-medal-detail-desc">{{ selectedMedalSlot.def.desc }}</div>
        <!-- ── Stat Progress ── -->
        <div v-if="selectedMedalProgress" class="ss-medal-stat-progress">
          <div class="ss-medal-stat-header">
            <span class="ss-medal-stat-label">{{ STAT_LABELS[selectedMedalProgress.statKey] || selectedMedalProgress.statKey }}</span>
            <span class="ss-medal-stat-fraction">
              {{ formatNotation(selectedMedalProgress.currentVal) }} / {{ formatNotation(selectedMedalProgress.target) }}
            </span>
          </div>
          <div class="ss-medal-stat-bar-bg">
            <div
              class="ss-medal-stat-bar-fill"
              :style="{ width: (selectedMedalProgress.progress * 100) + '%' }"
            ></div>
          </div>
        </div>
        <!-- Current passives -->
        <div class="ss-medal-passives-row">
          <div v-for="(line, li) in currentPassives" :key="'c'+li" class="ss-passive-chip" :style="{ borderColor: theme.color + '44', color: theme.bright }">{{ line }}</div>
        </div>
        <!-- Next upgrade passives -->
        <div v-if="!selectedMedalSlot.medal?.isMaxLevel" class="ss-medal-detail-next">
          <div class="ss-next-label">Next upgrade →</div>
          <div v-for="(line, li) in nextUpgradePassives" :key="'n'+li" class="ss-next-line">{{ line }}</div>
        </div>
        <div v-else class="ss-medal-detail-max">✦ Maximum level reached ✦</div>
      </div>

    <!-- ── Medal Tooltip (teleported to body) ── -->
    <Teleport to="body">
      <div
        v-if="tooltipMedal"
        class="medal-tooltip"
        :style="{ left: (tooltipX + 14) + 'px', top: (tooltipY - 10) + 'px' }"
      >
        <div class="medal-tip-title" :style="{ color: theme.bright }">{{ tooltipMedal.slot.def.name }}</div>
        <div class="medal-tip-lvl">Lv.{{ tooltipMedal.slot.level }}</div>
        <div class="medal-tip-passives">
          <div v-for="(p, pi) in tooltipMedal.passives" :key="pi" class="medal-tip-line">{{ p }}</div>
        </div>
      </div>
    </Teleport>
    </div>

    <!-- ── Gem Area: Equipped + Inventory (tooltip via hidden cursor hover) ── -->
    <div class="gem-area">
      <!-- Equipped Gem Slots -->
      <div class="gem-section">
        <div class="gem-section-title">
          Equipped
          <span class="gem-section-count">{{ equippedCount }}/{{ GEMS_PER_COLOR }}</span>
        </div>
        <div class="gem-slots-row">
          <div
            v-for="slot in gemSlots"
            :key="'eq-' + slot.index"
            class="gem-slot"
            :class="{
              filled: slot.filled,
              selected: slot.filled && selectedGemId === slot.gemId
            }"
            @click="onEquippedSlotClick(slot.index, slot.gem)"
            @mouseenter="slot.filled && slot.gem && !$event.isTrusted ? showTooltip(slot.gem, $event.clientX, $event.clientY, 16, -10, null, false) : null"
            @mouseleave="slot.filled && !$event.isTrusted ? hideTooltip() : null"
            @mousemove="slot.filled && !$event.isTrusted ? updatePosition($event.clientX, $event.clientY) : null"
          >
            <div class="gem-slot-inner">
              <GemItem v-if="slot.filled && slot.gem" :key="'eqgem-' + slot.index" :gem="slot.gem" :color="theme.color" />
              <span v-else :key="'eqempty-' + slot.index" class="gem-slot-empty">{{ slot.index + 1 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Inventory Slots (10 fixed slots for unequipped gems) -->
      <div class="gem-section">
        <div class="gem-section-title">
          Inventory
          <span class="gem-section-count">{{ inventoryCount }}</span>
        </div>
        <div class="gem-slots-row">
          <div
            v-for="slot in invSlots"
            :key="'inv-' + slot.index"
            class="gem-slot"
            :class="{
              filled: slot.filled,
              selected: slot.filled && selectedGemId === slot.gem.id
            }"
            @click="onInventorySlotClick(slot.index, slot.gem)"
            @mouseenter="slot.filled && !$event.isTrusted ? showTooltip(slot.gem, $event.clientX, $event.clientY, 16, -10, null, false) : null"
            @mouseleave="slot.filled && !$event.isTrusted ? hideTooltip() : null"
            @mousemove="slot.filled && !$event.isTrusted ? updatePosition($event.clientX, $event.clientY) : null"
          >
            <div class="gem-slot-inner">
              <GemItem v-if="slot.filled && slot.gem" :key="'invgem-' + slot.index" :gem="slot.gem" />
              <span v-else :key="'invempty-' + slot.index" class="gem-slot-empty">{{ slot.index + 1 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Selected Gem Info (inline panel) ── -->
    <div v-if="persistent && selectedGem" class="gem-info-inline">
      <GemTooltip inline />
    </div>

    <!-- ── Trashbin ── -->
    <div class="ss-trashbin-zone" :class="{ active: selectedGemId }" @click="onTrashClick" title="Click to delete selected gem">
      <span class="ss-trash-icon">🗑</span>
      <span class="ss-trash-label">{{ selectedGemId ? 'Delete' : 'Trash' }}</span>
    </div>

  </div>

  <!-- ── Trash Confirmation Overlay ── -->
  <Teleport to="body">
    <div v-if="showTrashConfirm" class="trash-confirm-overlay" @click="cancelDelete">
      <div class="trash-confirm-box" @click.stop>
        <div class="trash-confirm-icon">🗑</div>
        <div class="trash-confirm-text">Trash this gem?</div>
        <div class="trash-confirm-actions">
          <button class="trash-confirm-yes" @click="confirmDelete">Yes</button>
          <button class="trash-confirm-no" @click="cancelDelete">Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
  </div>
</template>

<style scoped>
.stat-slide-panel {
  background: linear-gradient(180deg, rgba(13,13,20,.98) 0%, #0a0a12 100%);
  border: 1px solid rgba(168,85,247,.15);
  border-top: none;
  border-radius: 0 0 6px 6px;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: monospace;
  font-size: 11px;
}

/* ── Section ── */
.ss-section {
  border-bottom: 1px solid rgba(168,85,247,.08);
  padding-bottom: 5px;
}

.ss-section-title, .gem-section-title {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
  margin-bottom: 4px;
}

/* ── Stat Grid ── */
.ss-stats-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ss-stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background .12s ease;
}
.ss-stat-item:hover {
  background: rgba(168,85,247,.08);
}
.ss-stat-item.is-preferred {
  background: rgba(245,158,11,.08);
}

.ss-stat-label {
  font-size: 11px;
  font-weight: 700;
  width: 30px;
  flex-shrink: 0;
  color: var(--hero-bright, #c084fc);
}

.ss-stat-bar-bg {
  flex: 1;
  height: 7px;
  background: rgba(168,85,247,.1);
  border-radius: 3px;
  overflow: hidden;
}

.ss-stat-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: none;
}

.ss-stat-value {
  font-size: 11px;
  font-weight: 700;
  width: 26px;
  text-align: right;
  color: #e2e8f0;
}

.ss-stat-gain {
  font-size: 10px;
  font-weight: 700;
  color: #4ade80;
  width: 50px;
  text-align: right;
  font-family: monospace;
}
.ss-stat-gain.no-gain {
  visibility: hidden;
}

.ss-stat-pref {
  font-size: 11px;
  width: 14px;
  text-align: center;
  transition: color .2s ease, text-shadow .2s ease;
}
.ss-stat-pref.active {
  color: #f59e0b;
  text-shadow: 0 0 6px rgba(245,158,11,.5);
}
.ss-stat-pref:not(.active) {
  color: #334155;
}
.ss-stat-item:hover .ss-stat-pref:not(.active) {
  color: #64748b;
}

/* ── Job Medals Horizontal Row ── */
.ss-medal-row {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.ss-medal-slot {
  position: relative;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  background: rgba(0,0,0,.3);
  border: 1px solid rgba(168,85,247,.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .12s ease;
  overflow: hidden;
}
.ss-medal-slot:hover {
  border-color: var(--hero-color, #a855f7);
  background: rgba(0,0,0,.5);
  z-index: 1;
}
.ss-medal-slot.is-selected {
  border-color: var(--hero-color, #a855f7) !important;
  box-shadow: inset 0 0 8px var(--hero-glow, rgba(168,85,247,.15)), 0 0 6px var(--hero-glow, rgba(168,85,247,.2));
  z-index: 2;
}
.ss-medal-slot.is-unlocked {
  border-color: rgba(74,222,128,.1);
}
.ss-medal-slot.is-max {
  border-color: rgba(250,204,21,.2);
}
.ss-medal-slot.is-max.is-selected {
  border-color: #facc15 !important;
  box-shadow: inset 0 0 8px rgba(250,204,21,.15), 0 0 6px rgba(250,204,21,.2);
}
.ss-medal-gem-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scale(1.4);
  pointer-events: none;
  position: absolute;
}
.ss-medal-overlay {
  position: absolute;
  bottom: 2px;
  right: 2px;
  pointer-events: none;
  z-index: 1;
}
.ss-medal-lvl {
  font-size: 7px;
  font-weight: 700;
  font-family: monospace;
  color: rgba(168,85,247,.5);
  line-height: 1;
  text-shadow: 0 0 3px rgba(0,0,0,.9);
}
.ss-medal-lvl.max-lvl {
  color: #facc15;
  text-shadow: 0 0 5px rgba(250,204,21,.5);
}
.ss-medal-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(168,85,247,.08);
  z-index: 1;
}
.ss-medal-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--hero-color, #a855f7), var(--hero-bright, #c084fc));
  transition: width .3s ease;
}
.ss-medal-slot.is-max .ss-medal-fill {
  background: linear-gradient(90deg, #facc15, #fde047);
}
/* ── Medal Detail Panel ── */
.ss-medal-detail {
  margin-top: 4px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(168,85,247,.1);
  border-radius: 3px;
  padding: 6px 8px;
}
.ss-medal-detail-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: .5px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}
.ss-medal-detail-lvl {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  font-family: monospace;
  padding: 1px 5px;
  background: rgba(0,0,0,.4);
  border: 1px solid rgba(168,85,247,.1);
  border-radius: 2px;
}
.ss-medal-detail-lvl.maxed {
  color: #facc15;
  border-color: rgba(250,204,21,.3);
  text-shadow: 0 0 5px rgba(250,204,21,.3);
}
.ss-medal-detail-desc {
  font-size: 14px;
  color: #94a3b8;
  font-style: italic;
  line-height: 1.4;
  margin-bottom: 4px;
}
/* ── Stat Progress in Medal Detail ── */
.ss-medal-stat-progress {
  margin-bottom: 4px;
  padding: 4px 6px;
  background: rgba(0,0,0,.25);
  border: 1px solid rgba(168,85,247,.08);
  border-radius: 3px;
}
.ss-medal-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}
.ss-medal-stat-label {
  font-size: 10px;
  font-weight: 800;
  color: var(--hero-bright, #c084fc);
  text-transform: uppercase;
  letter-spacing: .5px;
  font-family: monospace;
}
.ss-medal-stat-fraction {
  font-size: 9px;
  font-weight: 700;
  color: #94a3b8;
  font-family: monospace;
}
.ss-medal-stat-bar-bg {
  height: 6px;
  background: rgba(0,0,0,.4);
  border: 1px solid rgba(168,85,247,.1);
  border-radius: 2px;
  overflow: hidden;
}
.ss-medal-stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--hero-color, #a855f7), color-mix(in srgb, var(--hero-color, #a855f7) 70%, white));
  border-radius: 1px;
  transition: width .4s ease;
  box-shadow: 0 0 6px var(--hero-color, rgba(168,85,247,.3));
}
.ss-medal-detail-next {
  font-size: 8px;
  color: #64748b;
}
.ss-next-label {
  font-weight: 700;
  color: #22d3ee;
  margin-bottom: 2px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: .3px;
}
.ss-next-line {
  padding-left: 6px;
  line-height: 1.5;
  color: #94a3b8;
  font-size: 13px;
}
.ss-medal-detail-max {
  font-size: 15px;
  font-weight: 700;
  color: #facc15;
  text-align: center;
  text-shadow: 0 0 6px rgba(250,204,21,.3);
  padding: 4px 0;
}
/* ── Passive chips row ── */
.ss-medal-passives-row {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.ss-passive-chip {
  font-size: 13px;
  font-weight: 700;
  font-family: monospace;
  border: 1px solid;
  border-radius: 2px;
  padding: 1px 4px;
  background: rgba(0,0,0,.3);
  letter-spacing: .3px;
  line-height: 1.4;
}
/* ── Medal Tooltip (body-teleported) ── */
.medal-tooltip {
  position: fixed;
  z-index: 99999;
  background: rgba(10,10,18,.96);
  border: 1px solid rgba(168,85,247,.25);
  border-radius: 4px;
  padding: 6px 8px;
  font-family: monospace;
  pointer-events: none;
  max-width: 180px;
  box-shadow: 0 0 20px rgba(0,0,0,.6);
}
.medal-tip-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: .5px;
  margin-bottom: 2px;
}
.medal-tip-lvl {
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 4px;
  font-family: monospace;
}
.medal-tip-passives {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.medal-tip-line {
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  line-height: 1.4;
  padding-left: 4px;
  border-left: 2px solid rgba(168,85,247,.2);
}

/* ── Gem Section ── */
.gem-section {
  border-bottom: 1px solid rgba(168,85,247,.08);
  padding-bottom: 5px;
}

.gem-slots-row {
  display: flex;
  gap: 3px;
  justify-content: flex-start;
}

.gem-slot {
  width: 32px;
  height: 32px;
  background: rgba(0,0,0,.5);
  border: 1px solid rgba(168,85,247,.12);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .12s ease;
  flex-shrink: 0;
  cursor: pointer;
}

.gem-slot.filled {
  border-color: var(--slot-color, #a855f7);
  box-shadow: 0 0 5px color-mix(in srgb, var(--slot-color, #a855f7) 25%, transparent);
}

.gem-slot.filled:hover {
  transform: scale(1.12);
  z-index: 2;
  box-shadow: 0 0 10px color-mix(in srgb, var(--slot-color, #a855f7) 45%, transparent);
}

/* ── Selected gem highlight (green border, matching class passive style) ── */
.gem-slot.selected {
  border-color: #22c55e !important;
  box-shadow: 0 0 12px rgba(34,197,94,.5), inset 0 0 8px rgba(34,197,94,.2) !important;
  animation: gem-selected-pulse 1.2s ease-in-out infinite alternate;
}

@keyframes gem-selected-pulse {
  0% {
    box-shadow: 0 0 8px rgba(34,197,94,.4), inset 0 0 6px rgba(34,197,94,.15);
  }
  100% {
    box-shadow: 0 0 16px rgba(34,197,94,.7), inset 0 0 12px rgba(34,197,94,.3);
  }
}

.gem-slot-inner {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.gem-slot-empty {
  font-size: 9px;
  font-weight: 700;
  font-family: monospace;
  color: #334155;
  line-height: 1;
  pointer-events: none;
}

/* ── Gem Area ── */
.gem-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.gem-section-count {
  color: #64748b;
  font-size: 8px;
  font-weight: 600;
  margin-left: 4px;
  font-family: monospace;
}

/* ── Selected Gem Inline Info ── */
.gem-info-inline {
  border: 1px solid rgba(168,85,247,.1);
  border-radius: 3px;
  background: rgba(0,0,0,.25);
  min-height: 60px;
  overflow: hidden;
}

/* ── Trashbin ── */
.ss-trashbin-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5px 8px;
  border: 1px dashed rgba(239,68,68,.15);
  border-radius: 4px;
  background: rgba(239,68,68,.04);
  cursor: default;
  transition: all .15s ease;
  user-select: none;
  margin-top: 2px;
}
.ss-trashbin-zone.active {
  border-color: rgba(239,68,68,.4);
  background: rgba(239,68,68,.1);
  cursor: pointer;
}
.ss-trashbin-zone.active:hover {
  background: rgba(239,68,68,.2);
  border-color: rgba(239,68,68,.6);
  border-style: solid;
}
.ss-trash-icon {
  font-size: 13px;
  line-height: 1;
  opacity: .5;
  transition: opacity .15s;
}
.ss-trashbin-zone.active .ss-trash-icon {
  opacity: 1;
  transform: scale(1.15);
}
.ss-trash-label {
  font-size: 9px;
  font-weight: 700;
  font-family: monospace;
  color: #ef444488;
  letter-spacing: .5px;
  text-transform: uppercase;
}
.ss-trashbin-zone.active .ss-trash-label {
  color: #ef4444;
}

/* ── Trash Confirmation Overlay ── */
:global(.trash-confirm-overlay) {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.7);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: trash-confirm-fadein .15s ease-out;
}
@keyframes trash-confirm-fadein {
  0% { opacity: 0; }
  to { opacity: 1; }
}
.trash-confirm-box {
  background: #0d0d14;
  border: 1px solid rgba(239,68,68,.4);
  border-radius: 8px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 0 40px rgba(239,68,68,.2);
  animation: trash-confirm-slidein .2s ease-out;
}
@keyframes trash-confirm-slidein {
  0% { opacity: 0; transform: translateY(20px) scale(.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.trash-confirm-icon {
  font-size: 32px;
  line-height: 1;
}
.trash-confirm-text {
  font-size: 14px;
  font-weight: 700;
  font-family: monospace;
  color: #ef4444;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.trash-confirm-actions {
  display: flex;
  gap: 12px;
}
.trash-confirm-yes,
.trash-confirm-no {
  padding: 6px 20px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  cursor: pointer;
  transition: all .12s ease;
  border: 1px solid;
}
.trash-confirm-yes {
  background: rgba(239,68,68,.15);
  border-color: rgba(239,68,68,.4);
  color: #ef4444;
}
.trash-confirm-yes:hover {
  background: rgba(239,68,68,.3);
  border-color: #ef4444;
  box-shadow: 0 0 10px rgba(239,68,68,.3);
}
.trash-confirm-no {
  background: rgba(168,85,247,.1);
  border-color: rgba(168,85,247,.25);
  color: #c084fc;
}
.trash-confirm-no:hover {
  background: rgba(168,85,247,.2);
  border-color: #a855f7;
}
</style>
