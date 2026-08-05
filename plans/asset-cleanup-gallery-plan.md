# Asset Cleanup & Gallery Implementation Plan (Revised)

## Context & Assumptions

- **No assets are deleted.** Every file on disk stays — bars, combat sprites, portraits, standalones, gems, everything.
- The original "10 mp4 cinematics, all portraits, 10 gems per character" rule applies to **what the game uses**, but all files remain on disk for the gallery to display.
- `tutorial.png` does not exist on disk yet — the TutorialOverlay currently points to `assets/Tutorial.png` (capital T). The user wants the path lowercased to `assets/tutorial.png`.

**Gallery scope:** All image files under `public/assets/` should be discoverable by the gallery and displayed in categorized tabs.

## Architecture Breakdown

### Domain 1: UI Fixes
| File | Change |
|---|---|
| [`src/App.vue`](src/App.vue:221) | Tutorial button text: `?` → `[Tutorial]` |
| [`src/App.vue`](src/App.vue:221) | Add `[Gallery]` button next to tutorial button |
| [`src/App.vue`](src/App.vue:274) | Add `GalleryOverlay` conditional render |
| [`src/components/TutorialOverlay.vue`](src/components/TutorialOverlay.vue:9) | `'assets/Tutorial.png'` → `'assets/tutorial.png'` |

### Domain 2: New GalleryOverlay Component
- Fullscreen overlay modal (styled like TutorialOverlay)
- **Tab navigation** for image categories:
  - **Portraits** — all `p_*.png` from `*_Portraits/` dirs per character
  - **Bars** — all images from `*_Bars/` dirs per character
  - **Combat** — all images from `*_Combat/` dirs per character
  - **Gems** — all gem images organized by color
  - **Standalone** — `Ashbeam.jpg`, `Crypsis.jpg`, `Hellshift.jpg`
  - **All** — flat grid of everything
- Close button (✕)
- Images loaded directly from `public/assets/` paths

### Image Discovery Strategy
Rather than hardcoding paths, the gallery can dynamically scan known directory patterns:
- `assets/*_Portraits/p_*.png`
- `assets/*_Bars/*.png`
- `assets/*_Combat/*.png`
- `assets/Gems/*/*.png`
- `assets/*.jpg` (standalone character JPGs)

Or simply hardcode the paths from what exists on disk + the existing `localImages` and `ALL_GEMS` config references. Hardcoding from existing config + known paths is simpler and more reliable.

## Execution Sequence

### Step 1: Update Tutorial button text and fix image path
- [`src/App.vue`](src/App.vue:221): Change `?` to `[Tutorial]` in button content
- [`src/components/TutorialOverlay.vue`](src/components/TutorialOverlay.vue:9): Lowercase the path

### Step 2: Create GalleryOverlay component
- New file: `src/components/GalleryOverlay.vue`
- Props: `visible` (Boolean), emits: `close`
- Tab state: reactive string for active tab
- Image data sourced from:
  - `localImages` in `gameData.js` (portraits + bars + combat per character)
  - `ALL_GEMS` in `gameData.js` (gems per color)
  - Hardcoded standalone JPG paths
- Display grid using `<img loading="lazy">`
- CSS: fullscreen overlay, dark backdrop, scrollable grid, close button

### Step 3: Wire Gallery button into App.vue
- Add `showGallery` ref (default `false`)
- Add `[Gallery]` button next to `[Tutorial]` button
- Import `GalleryOverlay` and render with `v-if="showGallery"`
- Style consistently with existing `.tutorial-btn`

## Verification Strategy

| Check | Method |
|---|---|
| Tutorial button shows `[Tutorial]` | Visual inspection |
| Tutorial overlay opens, tries `assets/tutorial.png` | Opens overlay, shows fallback if missing (expected) |
| Gallery button shows `[Gallery]` | Visual inspection |
| Gallery opens with all tabs | Click button, see overlay |
| Portraits tab loads all `p_*` files | Scroll grid, no broken images |
| Bars tab loads all bar images | Scroll grid, no broken images |
| Combat tab loads combat sprites | Scroll grid, no broken images |
| Gems tab loads all gem images | Scroll grid, no broken images |
| Standalone tab loads JPGs | Scroll grid, no broken images |
| Close button works | Click ✕, overlay dismisses |
