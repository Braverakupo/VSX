<script setup lang="ts">
// BagView.vue — global gem inventory (Bag tab).
// Full-screen dense view: collected gems + each pilot's 10 equipped slots.
// Styled with --z-* tokens from templatecss.css; same gem visuals/tooltips
// as the per-character inventory grid.
import { ref, computed } from 'vue'
import { gameState, heroRegistry, charTemplates, heroThemes, gemColorInfo, equipGemFromBag, unequipGemToBag, moveEquippedGem, deleteGem } from '../composables/useGameState'
import { useGemTooltip } from '../composables/useGemTooltip'
import type { GemEntity } from '../entities/GemEntity'
import GemItem from './GemItem.vue'
import GemTooltip from './GemTooltip.vue'

const { showTooltip, hideTooltip, updatePosition, selectGem } = useGemTooltip()

interface BagHero {
  name: string
  color: string
  filled: number
  gems: (GemEntity | null)[]
}

const heroes = computed<BagHero[]>(() =>
  charTemplates.map(name => {
    const hero = heroRegistry[name]
    return {
      name,
      color: heroThemes[name]?.color || '#a855f7',
      filled: hero.gemSlots.filter((s): s is string => s !== null).length,
      gems: hero.gemSlots.map(id => (id && hero.inventory.getGem(id)) || null)
    }
  })
)

const collected = computed(() => Object.values(gameState.collectedGems.gems))
const collectedCount = computed(() => collected.value.length)

function gemDot(color: string): string {
  return gemColorInfo[color]?.dotColor || '#a855f7'
}

// ── Click-to-place: pick a gem (from Bag or equipped), then click a slot/collected ──
interface SelectedGem {
  gem: GemEntity
  inBag: boolean  // true = source is collectedGems; false = source is an equipped slot
  heroName?: string
  slotIndex?: number
}

const selected = ref<SelectedGem | null>(null)

function selectBagGem(gem: GemEntity): void {
  // If an equipped gem is selected, clicking a bag gem moves it to the Bag.
  if (selected.value && !selected.value.inBag) {
    moveSelectedToBag()
  } else {
    selected.value = selected.value?.gem.id === gem.id ? null : { gem, inBag: true }
  }
}

function selectEquippedGem(heroName: string, slotIndex: number, gem: GemEntity | null): void {
  const sel = selected.value

  // Bag gem selected → clicking a slot places/swaps it in.
  if (sel && sel.inBag) {
    placeInSlot(heroName, slotIndex)
    return
  }

  // Another equipped gem selected → move/swap it into this slot.
  if (sel && !sel.inBag) {
    if (sel.heroName === heroName && sel.slotIndex === slotIndex) {
      selected.value = null // clicked its own slot → deselect
      return
    }
    moveEquippedGem(sel.heroName!, sel.slotIndex!, heroName, slotIndex)
    selected.value = null
    return
  }

  // Nothing selected → select this gem (if there is one).
  if (gem) selected.value = { gem, inBag: false, heroName, slotIndex }
}

const showTrashConfirm = ref(false)

function onTrashClick(): void {
  if (selected.value) { selectGem(selected.value.gem); showTrashConfirm.value = true }
}

function confirmDelete(): void {
  if (selected.value) {
    deleteGem(selected.value.gem.id)
    selected.value = null
  }
  showTrashConfirm.value = false
}

function cancelDeleteGem(): void {
  showTrashConfirm.value = false
}

function moveSelectedToBag(): void {
  if (!selected.value || selected.value.inBag) return
  unequipGemToBag(selected.value.heroName!, selected.value.slotIndex!)
  selected.value = null
}

function placeInSlot(heroName: string, slotIndex: number): void {
  const sel = selected.value
  if (!sel || !sel.inBag) return
  equipGemFromBag(heroName, slotIndex, sel.gem.id)
  selected.value = null
}
</script>

<template>
  <div class="bag-view">
    <!-- Collected (Bag) gems -->
    <section class="bag-section">
      <header class="bag-section-head">
        <span class="bag-section-name">COLLECTED</span>
        <span class="bag-section-count">{{ collectedCount }}/40</span>
      </header>
      <div class="bag-gem-grid">
        <!-- one cell per bag gem -->
        <div
          v-for="gem in collected"
          :key="'g-' + gem.id"
          class="bag-gem-cell"
          :class="{ 'is-selected': selected?.gem.id === gem.id, 'is-target': selected !== null && !selected.inBag }"
          :style="{ borderColor: gemDot(gem.color) + '88' }"
          @click="selectBagGem(gem)"
          @mouseenter="showTooltip(gem, $event.clientX, $event.clientY, 16, -10, null, false)"
          @mouseleave="hideTooltip()"
          @mousemove="updatePosition($event.clientX, $event.clientY)"
        >
          <GemItem :gem="gem" :color="gemDot(gem.color)" />
        </div>
        <!-- empty placeholder cells up to 40 (park selected equipped gem here) -->
        <div
          v-for="n in 40 - collected.length"
          :key="'e-' + n"
          class="bag-gem-cell bag-gem-cell--empty"
          :class="{ 'is-target': selected !== null && !selected.inBag }"
          @click="moveSelectedToBag()"
        >
          <span class="bag-empty-slot">+</span>
        </div>
      </div>
    </section>

    <!-- Trash: deletes the currently selected gem (bag or equipped) -->
    <div
      class="bag-trash-zone"
      :class="{ active: selected !== null }"
      @click="onTrashClick"
      title="Click to delete selected gem"
    >
      <span class="bag-trash-icon">&#128465;</span>
      <span class="bag-trash-label">{{ selected ? 'Delete' : 'Trash' }}</span>
    </div>

    <!-- One dense row per pilot: exactly GEMS_PER_COLOR (10) slots -->
    <section v-for="hero in heroes" :key="hero.name" class="bag-section">
      <header class="bag-section-head" :style="{ color: hero.color }">
        <span class="bag-section-name">{{ hero.name.toUpperCase() }}</span>
        <span class="bag-section-count">{{ hero.filled }}/10</span>
      </header>
      <div class="bag-slot-row">
        <div
          v-for="(gem, i) in hero.gems"
          :key="'slot-' + i"
          class="bag-slot"
          :class="{ 'is-selected': selected !== null && gem !== null && selected.gem.id === gem.id, 'is-target': selected !== null }"
          :style="{ borderColor: gem ? gemDot(gem.color) + '88' : 'rgba(168,85,247,.15)' }"
          @click="selectEquippedGem(hero.name, i, gem)"
          @mouseenter="gem ? showTooltip(gem, $event.clientX, $event.clientY, 16, -10, null, false) : null"
          @mouseleave="hideTooltip()"
          @mousemove="gem ? updatePosition($event.clientX, $event.clientY) : null"
        >
          <GemItem v-if="gem" :gem="gem" :color="gemDot(gem.color)" />
          <span v-else class="bag-slot-idx">{{ i + 1 }}</span>
        </div>
      </div>
    </section>
  </div>

  <!-- ── Trash Confirmation Overlay ── -->
  <Teleport to="body">
    <div v-if="showTrashConfirm" class="bag-trash-confirm-overlay" @click="cancelDeleteGem">
      <div class="bag-trash-confirm-box" @click.stop>
        <div class="bag-trash-confirm-icon">&#128465;</div>
        <div class="bag-trash-confirm-text">Trash this gem?</div>
        <GemTooltip inline />
        <div class="bag-trash-confirm-actions">
          <button class="bag-trash-confirm-yes" @click="confirmDelete">Yes</button>
          <button class="bag-trash-confirm-no" @click="cancelDeleteGem">Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.bag-view {
  width: 100%;
  max-width: 780px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: 10px 12px 40px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--z-bg-card, #0d0d14);
}

.bag-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--z-border-muted, rgba(168, 85, 247, 0.1));
  border-radius: var(--z-radius, 8px);
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.24);
}

.bag-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--z-font-ui, system-ui, sans-serif);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--z-text-secondary, #64748b);
}

.bag-section-count {
  font-family: var(--z-font-mono, monospace);
  font-size: 10px;
  color: var(--z-text-muted, #94a3b8);
}

/* Collected bag gems — dense wrapping grid */
.bag-gem-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(30px, 1fr));
  gap: 3px;
}

.bag-gem-cell {
  aspect-ratio: 1;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--z-border-default, rgba(168, 85, 247, 0.3));
  border-radius: var(--z-radius-sm, 4px);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Per-pilot 10 slot row — mirrors the card's gems-grid look */
.bag-slot-row {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 3px;
}

.bag-slot {
  aspect-ratio: 1;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(168, 85, 247, 0.15);
  border-radius: var(--z-radius-sm, 4px);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bag-gem-cell.is-selected,
.bag-slot.is-selected {
  box-shadow: 0 0 10px var(--z-success, #3fb950)aa;
  outline: 2px solid var(--z-success, #3fb950);
}

.bag-gem-cell.is-target,
.bag-slot.is-target,
.bag-gem-cell--empty.is-target {
  border-color: var(--z-success, #3fb950)aa;
  box-shadow: inset 0 0 8px var(--z-success, #3fb950)44;
}

.bag-gem-cell--empty {
  border-style: dashed;
  background: transparent;
}

.bag-gem-cell:hover {
  outline: 1px solid var(--z-text-muted, #94a3b8);
}

.bag-slot-idx {
  font-size: 9px;
  color: var(--z-text-secondary, #64748b);
  font-family: var(--z-font-mono, monospace);
}

.bag-empty-inline {
  font-size: 11px;
  color: var(--z-text-muted, #94a3b8);
  padding: 6px 0;
}

.bag-trash-zone {
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
.bag-trash-zone.active {
  border-color: rgba(239,68,68,.4);
  background: rgba(239,68,68,.1);
  cursor: pointer;
}
.bag-trash-zone.active:hover {
  background: rgba(239,68,68,.2);
  border-color: rgba(239,68,68,.6);
  border-style: solid;
}
.bag-trash-icon {
  font-size: 13px;
  line-height: 1;
  opacity: .5;
  transition: opacity .15s;
}
.bag-trash-zone.active .bag-trash-icon {
  opacity: 1;
  transform: scale(1.15);
}
.bag-trash-label {
  font-size: 9px;
  font-weight: 700;
  font-family: monospace;
  color: #ef444488;
  letter-spacing: .5px;
  text-transform: uppercase;
}
.bag-trash-zone.active .bag-trash-label {
  color: #ef4444;
}

:global(.bag-trash-confirm-overlay) {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.7);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: trash-confirm-fadein .15s ease-out;
}
.bag-trash-confirm-box {
  background: #0d0d14;
  border: 1px solid rgba(239,68,68,.4);
  border-radius: 6px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 300px;
}
.bag-trash-confirm-icon {
  font-size: 28px;
  line-height: 1;
}
.bag-trash-confirm-text {
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
}
.bag-trash-confirm-actions {
  display: flex;
  gap: 8px;
}
.bag-trash-confirm-yes,
.bag-trash-confirm-no {
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
.bag-trash-confirm-yes {
  background: rgba(239,68,68,.15);
  border-color: rgba(239,68,68,.4);
  color: #ef4444;
}
.bag-trash-confirm-yes:hover {
  background: rgba(239,68,68,.3);
  border-color: #ef4444;
  box-shadow: 0 0 10px rgba(239,68,68,.3);
}
.bag-trash-confirm-no {
  background: rgba(168,85,247,.1);
  border-color: rgba(168,85,247,.25);
  color: #c084fc;
}
.bag-trash-confirm-no:hover {
  background: rgba(168,85,247,.2);
  border-color: rgba(168,85,247,.5);
  box-shadow: 0 0 10px rgba(168,85,247,.3);
}
</style>