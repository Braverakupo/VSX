// src/composables/useVideoPool.js
// Hidden video pool for canvas-based MP4 playback
//
// ── Thermal optimizations ──
// 1. Pause all videos + stop rAF loop when tab is hidden (visibilitychange)
// 3. 8fps on mobile, 16fps on desktop (isMobileView)
// 5. Crop calculation cache (keyed by dimensions)
// 6. Canvas scale 0.4 on mobile, 0.75 on desktop

import { ref } from 'vue'
import { charTemplates } from '../config/gameData.js'
import { gameState, heroRegistry, isMobileView } from './useGameState.js'

// ── Video on/off toggle (persisted to localStorage) ──
const STORAGE_KEY = 'vantage_video_enabled'
const videoEnabled = ref(localStorage.getItem(STORAGE_KEY) !== 'false') // default on

export function toggleVideo() {
  videoEnabled.value = !videoEnabled.value
  localStorage.setItem(STORAGE_KEY, videoEnabled.value ? 'true' : 'false')
  // Freeze all videos at frame 0 when disabled (still renders static poster)
  // Resume normal playback when enabled
  slotState.value.forEach(slot => {
    if (!slot.videoEl || !slot.src) return
    if (videoEnabled.value) {
      if (slot.ready && slot.videoEl.paused) {
        slot.videoEl.play().catch(() => {})
      }
    } else {
      slot.videoEl.pause()
      slot.videoEl.currentTime = 0
    }
  })
  if (videoEnabled.value) {
    startCanvasLoop()
  }
}

export { videoEnabled }

const POOL_SIZE = 6

const slotState = ref([])
const heroSlotMap = {}

charTemplates.forEach((name, i) => { heroSlotMap[name] = i })

// Canvas rendering state
let canvasAnimFrameId = null
let canvasLastTime = 0
// ── OPT 3: Dynamic frame rate — 8fps on mobile, 16fps on desktop ──
function getFrameInterval() {
  return isMobileView.value ? 1000 / 8 : 1000 / 16
}

// Store canvas refs per card ID
const canvasRefs = {}

export function registerCanvas(objId, canvasEl) {
  canvasRefs[objId] = canvasEl
}

export function unregisterCanvas(objId) {
  delete canvasRefs[objId]
}

function initVideoPool() {
  for (let i = 0; i < POOL_SIZE; i++) {
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.loop = true
    v.preload = 'auto'

    slotState.value.push({
      index: i,
      videoEl: v,
      heroName: null,
      ready: false,
      src: null
    })
  }
}

// Track last known play state per hero to avoid redundant play/pause calls
const lastMobilePlayState = {} // { [heroName]: boolean } — true if playing

function updateMobilePlayback(heroName) {
  if (!isMobileView.value) return
  const slotIndex = heroSlotMap[heroName]
  if (slotIndex === undefined) return
  const slot = slotState.value[slotIndex]
  if (!slot || !slot.videoEl || !slot.src) return

  const hero = heroRegistry[heroName]
  const topHero = gameState.objectives[0]?.name
  const isTop = heroName === topHero
  const isVantageCinematic = hero && hero.vantageRating >= 99

  // Determine if this video should play:
  // - Toggle ON: play only for top character (normal mobile behavior)
  // - Toggle OFF: play only for top character when vantage >= 99 (cinematic only)
  // - Otherwise: freeze at frame 0
  let shouldPlay = false
  if (videoEnabled.value) {
    shouldPlay = isTop
  } else {
    shouldPlay = isTop && isVantageCinematic
  }

  if (shouldPlay === lastMobilePlayState[heroName]) return // no change

  lastMobilePlayState[heroName] = shouldPlay
  const video = slot.videoEl

  if (shouldPlay) {
    video.currentTime = 0
    video.play().catch(() => {})
  } else {
    video.pause()
    video.currentTime = 0
  }
}

function hotSwapVideo(heroName, newSrc) {
  const slotIndex = heroSlotMap[heroName]
  if (slotIndex === undefined) return
  const slot = slotState.value[slotIndex]
  if (!slot) return

  slot.ready = false
  slot.heroName = heroName

  const video = slot.videoEl

  if (newSrc === slot.src && slot.src !== null) {
    slot.ready = true
    return
  }

  const onCanPlayThrough = () => {
    video.removeEventListener('canplaythrough', onCanPlayThrough)
    slot.ready = true
    // Start playback so canvas gets animated frames (unless video is disabled)
    if (videoEnabled.value) {
      video.play().catch(() => {})
    } else {
      video.currentTime = 0
    }
  }
  video.addEventListener('canplaythrough', onCanPlayThrough)

  video.pause()
  video.src = newSrc
  slot.src = newSrc
  video.load()
}

// ── OPT 5: Crop calculation cache ──
const cropCache = {}

function getCropParams(vw, vh, cssW, cssH, cropY) {
  const key = `${vw}_${vh}_${cssW}_${cssH}_${cropY}`
  if (cropCache[key]) return cropCache[key]

  const cropH = vh - cropY * 2
  let sx, sy, sw, sh

  if (cropH > 0) {
    const srcAspect = vw / cropH
    const containerAspect = cssW / cssH
    if (srcAspect > containerAspect) {
      sw = cropH * containerAspect
      sh = cropH
      sx = (vw - sw) / 2
      sy = cropY
    } else {
      sw = vw
      sh = vw / containerAspect
      sx = 0
      sy = cropY + (cropH - sh) / 2
    }
  } else {
    sx = 0; sy = 0; sw = vw; sh = vh
  }

  const params = { sx, sy, sw, sh }
  cropCache[key] = params
  return params
}

function renderCanvases() {
  gameState.objectives.forEach(obj => {
    if (isMobileView.value) {
      updateMobilePlayback(obj.name)
    }
    // Mobile: only play video when vantage >= 99, else freeze at frame 0
    if (isMobileView.value) {
      updateMobilePlayback(obj.name)
    }
    const slotIndex = heroSlotMap[obj.name]
    if (slotIndex === undefined) return
    const slot = slotState.value[slotIndex]
    if (!slot || !slot.ready) return

    const video = slot.videoEl
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    const canvas = canvasRefs[obj.id]
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const cssW = Math.round(rect.width)
    const cssH = Math.round(rect.height)

    if (cssW === 0 || cssH === 0) return

    // ── OPT 6: Lower canvas resolution on mobile ──
    const CANVAS_SCALE = isMobileView.value ? 0.4 : 0.75

    const currentW = parseInt(canvas.style.width, 10)
    if (currentW !== cssW || parseInt(canvas.style.height, 10) !== cssH) {
      canvas.width = Math.round(cssW * dpr * CANVAS_SCALE)
      canvas.height = Math.round(cssH * dpr * CANVAS_SCALE)
      canvas.style.width = cssW + 'px'
      canvas.style.height = cssH + 'px'
      // Clear cache when dimensions change
      const vw = video.videoWidth
      const vh = video.videoHeight
      const key = `${vw}_${vh}_${cssW}_${cssH}_25`
      delete cropCache[key]
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (vw > 0 && vh > 0) {
      const cropY = 25
      const { sx, sy, sw, sh } = getCropParams(vw, vh, cssW, cssH, cropY)
      const drawW = canvas.width / dpr
      const drawH = canvas.height / dpr
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, drawW, drawH)
    }
  })
}

function canvasLoop(timestamp) {
  const interval = getFrameInterval()
  const elapsed = timestamp - canvasLastTime
  if (elapsed >= interval) {
    canvasLastTime = timestamp - (elapsed % interval)
    renderCanvases()
  }
  canvasAnimFrameId = requestAnimationFrame(canvasLoop)
}

function startCanvasLoop() {
  if (canvasAnimFrameId) return // already running
  canvasLastTime = performance.now()
  canvasAnimFrameId = requestAnimationFrame(canvasLoop)
}

function stopCanvasLoop() {
  if (canvasAnimFrameId) {
    cancelAnimationFrame(canvasAnimFrameId)
    canvasAnimFrameId = null
  }
}

// ── OPT 1: Pause/Resume on tab visibility ──
function onVisibilityChange() {
  if (document.hidden) {
    stopCanvasLoop()
    slotState.value.forEach(slot => {
      try { slot.videoEl.pause() } catch (e) {}
    })
  } else {
    startCanvasLoop()
    slotState.value.forEach(slot => {
      if (slot.src && slot.ready && slot.videoEl.paused) {
        slot.videoEl.play().catch(() => {})
      }
    })
  }
}

// Play/pause helpers
export function playHeroVideo(heroName) {
  const slotIndex = heroSlotMap[heroName]
  if (slotIndex === undefined) return
  const slot = slotState.value[slotIndex]
  if (!slot) return
  const video = slot.videoEl
  video.currentTime = 0
  video.play().catch(() => {})
}

export function pauseHeroVideo(heroName) {
  const slotIndex = heroSlotMap[heroName]
  if (slotIndex === undefined) return
  const slot = slotState.value[slotIndex]
  if (!slot) return
  try { slot.videoEl.pause() } catch (e) {}
}

export function initVideoSystem() {
  initVideoPool()
  startCanvasLoop()

  // OPT 1: Listen for tab visibility changes
  document.addEventListener('visibilitychange', onVisibilityChange)

  // Watch for new objectives to hot-swap video
  gameState.objectives.forEach(obj => {
    if (obj.mp4Url) {
      hotSwapVideo(obj.name, obj.mp4Url)
    }
  })
}

export function updateVideoForObjective(obj) {
  if (obj.mp4Url) {
    hotSwapVideo(obj.name, obj.mp4Url)
  }
}

export function refreshVideoFrames() {
  gameState.objectives.forEach(obj => {
    const canvas = canvasRefs[obj.id]
    if (!canvas) return
    canvas.style.width = ''
    canvas.style.height = ''
  })
}

export function resumeAllVideos() {
  slotState.value.forEach(slot => {
    const video = slot.videoEl
    if (video && slot.src) {
      if (video.paused) {
        video.play().catch(() => {})
      }
    }
  })
}

export function cleanupVideoSystem() {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopCanvasLoop()
  slotState.value.forEach(slot => {
    try { slot.videoEl.pause() } catch (e) {}
    slot.videoEl.src = ''
    slot.videoEl.load()
  })
  slotState.value.splice(0)
}
