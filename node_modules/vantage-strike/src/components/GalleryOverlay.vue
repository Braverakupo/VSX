<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import { localImages, ALL_GEMS, gemColorInfo, charTemplates } from '../config/gameData'

defineProps<{
  visible?: boolean
}>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const BASE = import.meta.env.BASE_URL

function onImgError(e: Event) {
  const el = e.target as HTMLElement | null
  if (el) el.style.display = 'none'
}

// ── Tab state ──
const tabs = ['Portraits', 'Bars', 'Combat', 'Gems', 'Standalone'] as const
type TabKey = (typeof tabs)[number]
const activeTab = ref<TabKey>('Portraits')

// ── Build image data ──

interface CombatGroup {
  char: string
  images: string[]
}
interface StandaloneItem {
  name: string
  path: string
}
interface GallerySection {
  label: string
  images: string[]
  color?: string
}

// Combat images (not in localImages config — hardcoded from disk)
const combatData: CombatGroup[] = [
  {
    char: 'Ashbeam',
    images: [
      'assets/Ashbeam_Combat/skill_1778900702109.png',
      'assets/Ashbeam_Combat/skill_1778900903599.png',
      'assets/Ashbeam_Combat/skill_1778901078932.png',
      'assets/Ashbeam_Combat/skill_1778901253716.png',
      'assets/Ashbeam_Combat/skill_1778901418901.png'
    ]
  },
  {
    char: 'Voltkin',
    images: [
      'assets/Voltkin_Combat/skill_1778900826829.png',
      'assets/Voltkin_Combat/skill_1778901052290.png',
      'assets/Voltkin_Combat/skill_1778901221069.png',
      'assets/Voltkin_Combat/skill_1778901396213.png'
    ]
  }
]

// Standalone character JPGs
const standaloneData: StandaloneItem[] = [
  { name: 'Ashbeam', path: 'assets/Ashbeam.jpg' },
  { name: 'Crypsis', path: 'assets/Crypsis.jpg' },
  { name: 'Hellshift', path: 'assets/Hellshift.jpg' }
]

// ── Computed sections per tab ──

const portraitSections = computed<GallerySection[]>(() => {
  return charTemplates.map(char => ({
    label: char,
    images: (localImages[char]?.portraits || []).map(p => BASE + p)
  })).filter(s => s.images.length > 0)
})

const barSections = computed<GallerySection[]>(() => {
  return charTemplates.map(char => ({
    label: char,
    images: (localImages[char]?.bars || []).map(b => BASE + b)
  })).filter(s => s.images.length > 0)
})

const combatSections = computed<GallerySection[]>(() => {
  return combatData.map(group => ({
    label: group.char,
    images: group.images.map(p => BASE + p)
  }))
})

const gemSections = computed<GallerySection[]>(() => {
  const colorKeys = Object.keys(ALL_GEMS)
  return colorKeys.map(color => {
    const info = gemColorInfo[color]
    return {
      label: info ? info.label : color,
      color: color,
      images: (ALL_GEMS[color] || []).map(p => BASE + p)
    }
  })
})

const standaloneSections = computed<GallerySection[]>(() => {
  return standaloneData.map(item => ({
    label: item.name,
    images: [BASE + item.path]
  }))
})

// Map tab to computed data
const tabDataMap: Record<TabKey, ComputedRef<GallerySection[]>> = {
  Portraits: portraitSections,
  Bars: barSections,
  Combat: combatSections,
  Gems: gemSections,
  Standalone: standaloneSections
}

const activeSections = computed<GallerySection[]>(() => tabDataMap[activeTab.value]?.value || [])

function setTab(tab: TabKey) {
  activeTab.value = tab
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="gallery-overlay" @click.self="emit('close')">
      <div class="gallery-modal">
        <!-- Header -->
        <div class="gallery-header">
          <div class="gallery-tabs">
            <button
              v-for="tab in tabs"
              :key="tab"
              class="gallery-tab"
              :class="{ active: activeTab === tab }"
              @click="setTab(tab)"
            >{{ tab }}</button>
          </div>
          <button class="gallery-close-btn" @click="emit('close')" title="Close gallery">✕</button>
        </div>

        <!-- Content -->
        <div class="gallery-content">
          <div
            v-for="(section, idx) in activeSections"
            :key="idx"
            class="gallery-section"
          >
            <div class="gallery-section-label">{{ section.label }}</div>
            <div class="gallery-grid">
              <div
                v-for="(src, imgIdx) in section.images"
                :key="imgIdx"
                class="gallery-item"
              >
                <img
                  :src="src"
                  :alt="section.label + ' ' + imgIdx"
                  loading="lazy"
                  @error="onImgError"
                />
              </div>
            </div>
          </div>

          <div v-if="activeSections.length === 0" class="gallery-empty">
            No images in this category.
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gallery-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 100000;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: gallery-fadein .15s ease-out;
}

@keyframes gallery-fadein {
  0% { opacity: 0; }
  to { opacity: 1; }
}

.gallery-modal {
  position: relative;
  width: 92vw;
  max-width: 740px;
  height: 88vh;
  background: #0d0d14;
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.7);
}

/* ── Header ── */
.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(168, 85, 247, 0.12);
  background: #0a0a12;
  flex-shrink: 0;
}

.gallery-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.gallery-tab {
  background: none;
  border: 1px solid rgba(168, 85, 247, 0.12);
  color: #64748b;
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 3px;
  cursor: pointer;
  transition: all .12s ease;
  letter-spacing: .3px;
}

.gallery-tab:hover {
  border-color: rgba(168, 85, 247, 0.3);
  color: #c084fc;
}

.gallery-tab.active {
  border-color: #a855f7;
  color: #fff;
  background: rgba(168, 85, 247, 0.15);
  box-shadow: 0 0 8px rgba(168, 85, 247, 0.15);
}

.gallery-close-btn {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(168, 85, 247, 0.2);
  color: #c084fc;
  font-size: 16px;
  line-height: 1;
  width: 26px;
  height: 26px;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .12s ease;
  flex-shrink: 0;
  margin-left: 8px;
}

.gallery-close-btn:hover {
  background: rgba(168, 85, 247, 0.2);
  border-color: #a855f7;
  color: #fff;
}

/* ── Scrollable Content ── */
.gallery-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(168, 85, 247, 0.2) transparent;
}

.gallery-content::-webkit-scrollbar {
  width: 6px;
}

.gallery-content::-webkit-scrollbar-track {
  background: transparent;
}

.gallery-content::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.2);
  border-radius: 3px;
}

.gallery-content::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.4);
}

/* ── Section ── */
.gallery-section {
  margin-bottom: 16px;
}

.gallery-section-label {
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  color: #c084fc;
  letter-spacing: .5px;
  text-transform: uppercase;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(168, 85, 247, 0.1);
}

/* ── Grid ── */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 6px;
}

.gallery-item {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(168, 85, 247, 0.08);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color .12s ease;
}

.gallery-item:hover {
  border-color: rgba(168, 85, 247, 0.3);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ── Empty state ── */
.gallery-empty {
  color: #64748b;
  font-family: monospace;
  font-size: 12px;
  text-align: center;
  padding: 40px 20px;
}
</style>
