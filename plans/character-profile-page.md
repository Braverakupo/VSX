# VANTAGE STRIKE — Landing Page & Character Profile Plan

> **Status:** Planning draft. Intel fields marked ⬜ TBD are waiting on user-supplied lore.
> **Lore source:** `plans/HIBABBBBBBBE.txt` (universe bible).
> **Data sources:** `src/config/gameData.ts`, `src/config/jobMedalData.ts`, `src/composables/cssScripts.ts`, `src/templatecss.css`, `src/types.ts`, `src/components/CharPopout.vue`, `plans/HIBABBBBBBBE.txt`.

---

## 1. Context & Assumptions

- **Goal:** A full **landing page** for VANTAGE STRIKE presenting the universe, doctrine, and the 6 playable heroes — themed per character using the existing Z design system.
- **Page form:** A Vue page inside the existing Vite app (`apps/vantage-strike`). The app has **no vue-router** — views are toggled via `v-if` flags in `App.vue` (same pattern as `GalleryOverlay`, `TutorialOverlay`, `SettingsOverlay`).
- **Theming:** Use `[data-faction]` + `--hero-color / --hero-bright / --hero-glow` via `applyTheme()` from `cssScripts.ts`. Components must import colors from `heroThemes` — no raw hex literals.
- **Conventions (AGENTS.md):** TypeScript only; extensionless imports; reuse `.z-btn`, `.z-pbar`, `.z-badge` primitives from `templatecss.css`; no dynamic union-key assignment on mixed arrays; Windows-safe commands only.
- **Lore status:** The universe bible is complete and actionable (characters, mechs, doctrine, cosmology). All lore below is transcribed from it. Gameplay intel (stats, medals, assets) comes from the configs.

---

## 2. Universe & Lore Summary (from the bible)

### 2.1 The Premise
VANTAGE STRIKE is a metaphysical framework and narrative universe about **self-becoming** — discipline, resilience, and personal sovereignty. Post-catastrophic world, an elite squad of pilots uses **W.A.R.G.E.A.R. mechs** to fight physical and spiritual battles. Core doctrine: **VANTAGE** is internal clarity, **STRIKE** is the precise application of outward force. Each character is an archetype for a specific inner struggle (rebellion, stoicism, spiritual insight) — facets of the human journey toward self-mastery.

### 2.2 Cosmology — The Three Worlds
| World | Role | Symbolism |
|---|---|---|
| **Arcadia** | Techno-civilization addicted to optics, bureaucracy, consensus. Hollowed out spiritually before its collapse. | The "Lost World" / shattered ordinary world; stale systems that must fall |
| **The Obsidian Depths** | Realm beneath Arcadia, home of The Forgeman; crucible where the squad descends. | "Belly of the whale" — the abyss of ego, ignorance, chaos |
| **Obsidia** | The new world/order forged from the destruction — the elemental aether, "waters of the universe." | Reborn order; self-becoming made real |

**The Fall of Arcadia:** Orchestrated by **The Forgeman** (true identity: **Varek Ironwake**, Scribe-General/Founder of VANTAGE STRIKE) — a signal sent through the planet's "ancient veins" collapsed all machinery; Arcadia fractured from within. Not a tragedy but a **principled sacrifice** (the **Forgeman's Paradox**): the hollow old world had to fall so an authentic new order could rise.

### 2.3 The Doctrine — The Codex of Sovereign Action
- **VANTAGE (Clarity. Control. Vision.)** — *"To have vantage is to rise above the noise, to see through the storm. You're not lost in the chaos — you're the one who shapes it."* Internal state = **Gnosis**. Tactical = strategic foresight, shaping the battlefield.
- **STRIKE (Precision. Power. Relentless.)** — *"A strike is one perfect, decisive moment — where every ounce of force converges in an instant."* External force = **Praxis**. Tactical = decisive action aligned with vision.
- **VANTAGE STRIKE (The Unyielding Edge)** — the synthesis: Gnosis converted to Praxis; mental + physical + tactical prowess fused into indomitable will.
- **Hardcore Culture** — the living framework: discipline, resilience, rebellion, loyalty. Each pilot embodies one tenet as a "warrior of the mind."

### 2.4 W.A.R.G.E.A.R. & The 99 Forms
- W.A.R.G.E.A.R. suits are **psycho-spiritual anchors** / conduits bridging a pilot's internal state and external impact.
- **VANTAGE Rating (0–99):** measures alignment with one's Core Essence and Purpose. The antagonistic **Veil Kin / Veil Lords** hoard Vantage tech but can never reach 99 — they lack Core Essence (authentic internal alignment).
- **The 99 Forms (Overcore):** pushing the rating to **97–99** triggers a temporary metamorphosis — heightened speed/power + unique cosmetic change ("Onee Chanbara / Warframe" style). Managed by the Vantage Mechanism; the ultimate proof of personal sovereignty.

### 2.5 The Enemy — Veil Kin
Not "simple evil" but a dogmatic, militant-spiritual force that suppresses self-becoming. Veil Lords enforce global stagnation by hoarding Vantage technology. They are the mythic **Shadow** — a mirror of the hero's fears and suppressed knowledge; obstacles = crucible for growth.

### 2.6 The Hero's Journey (Monomyth)
Departure (Fall of Arcadia) → Initiation (Obsidian Depths / belly of the whale) → Return (Transformation; cyclical — the squad continually evolves). The whole is framed as a **modern rite of passage** restoring transformational journeys lost in modern society.

---

## 3. Landing Page Concept (full page)

A single scrolling Vue view, `CharacterProfileView.vue` → rename concept to **`LandingView.vue`** (or keep one page with all sections). Sections in order:

### 3.1 Hero / Masthead
- Full-screen intro: game title "VANTAGE STRIKE", tagline, the Codex verse for VANTAGE.
- Background: `--z-bg-dark` + animated `--hero-glow` gradient; optional cinematic MP4 from `assets/Starred/`.
- CTA buttons: `[Enter the Codex]` (scroll to doctrine), `[Meet the Squad]` (scroll to roster) — `.z-btn--primary` / `.z-btn--ghost`.
- Faction accent strip: 6 color chips (one per hero) that set `[data-faction]` on hover/click.

### 3.2 The Codex — Doctrine Cards
- Two `.z-card` panels: **VANTAGE (Gnosis)** and **STRIKE (Praxis)** with verse text + the triad (Clarity·Control·Vision / Precision·Power·Relentless).
- A center **VANTAGE STRIKE — The Unyielding Edge** banner (`.z-badge` labels, `--hero-color` accents).
- Hardcore tenets row: Discipline · Resilience · Rebellion · Loyalty (`.z-badge` pills).

### 3.3 The Universe — Timeline of Three Worlds
- Three-stage horizontal strip: **Arcadia → Obsidian Depths → Obsidia**, each with `--z-bg-card` panel, the world's role, and its symbolism.
- Fall of Arcadia callout (The Forgeman's Paradox, Varek Ironwake).

### 3.4 The Roster — 6 Character Profiles
- 6 faction-colored tabs / cards; click to swap the active profile (see §4 per-character data).
- Each profile: portrait, real name + callsign, role, mech, personal philosophy quote, hardcore tenet, stats, signature class, medals, relationships.

### 3.5 W.A.R.G.E.A.R. & The 99 Forms
- Per-character mech card (name + one-line spec) — mirrors the game's `mp4Index` cinematic hook.
- **VANTAGE Rating bar** rendered with `.z-pbar` (0–99 fill); "99 Forms" threshold marker at 97–99 (`--z-warn`/`--hero-bright` segment).
- Veil Kin "can't reach 99" lore note as a muted `.z-badge`.

### 3.6 Footer — Codex & Mandate
- Squad Mandate: *"Strike only when it matters. Speak only when it cuts through noise. Command through presence, not volume."*
- Ashbeam's creed; back-to-top button (`.z-btn--ghost`).

---

## 4. Per-Character Profiles (gameplay data + lore)

### 4.1 Voltkin — "Voltkin's Vanguard"
- **Real name:** Sera Raze (aka Rina "Volt" Kai)
- **Role:** Engineer, Shock Trooper, Artillery Specialist
- **Mech:** Rhino-L7 / Thunder-Wasp — modular turrets, deployable mines, mobile forge; EMP/electropulse shockwaves, area denial
- **Personal philosophy:** *"Disruption for Fun / Disruption is Truth."* — individuality & rebellion; the squad's wild child & primary mechanic
- **Background:** First to join Ashbeam after the escape from Arcadia; built her first mech from the wreckage of their destroyed home. **Personality:** energetic, foul-mouthed, rebellious; fiercely loyal to her "family."
- **Anime inspirations:** Yumeko (Kakegurui), Mad Moxxi (Borderlands)
- **Hardcore tenet:** Rebellion
- **Gem color:** `reds` | **Theme:** `#ef4444` / bright `#fca5a5` / glow `rgba(239,68,68,.6)`
- **Signature class:** **Vanguard** — *"Spearhead of the assault. Vantage builds faster and army swells with each blow."*
- **Job medals (10):** Vanguard · Berserker · Blademaster · Fury · Ravager · Tempest · Inferno · Warlord · Onslaught · Overlord
- **Assets:** 23 portraits · 23 bars · 10 cinematic MP4s
- **Art preview:**

  ![Voltkin standalone](../apps/vantage-strike/public/assets/Voltkin.jpg)
  ![Voltkin portrait](../apps/vantage-strike/public/assets/Voltkin_Portraits/p_1778866771799.png)
  ![Voltkin scene bar](../apps/vantage-strike/public/assets/Voltkin_Bars/scene_1778877404137.png)

  - Standalone: [`assets/Voltkin.jpg`](../apps/vantage-strike/public/assets/Voltkin.jpg)
  - Portrait: [`assets/Voltkin_Portraits/p_1778866771799.png`](../apps/vantage-strike/public/assets/Voltkin_Portraits/p_1778866771799.png)
  - Scene bar: [`assets/Voltkin_Bars/scene_1778877404137.png`](../apps/vantage-strike/public/assets/Voltkin_Bars/scene_1778877404137.png)
- **Intel:**
  - ⬜ Backstory:
  - ⬜ Relationships (Hellshift — childhood best friend; Ashbeam — first recruit):

### 4.2 Ashbeam — "Ashbeam's Tactician"
- **Real name:** Kaori Tenjou (aka Elara Vahn)
- **Role:** Squad Leader, Tactical Commander, Sniper-Tactician
- **Mech:** Izanami S-Type — stealth, cloaking, long-range railgun, terrain mapping; ghost-silent precision
- **Personal philosophy:** *"The world is already burning. You either take the shot — or become the ash."* — Hardcore Precision; leads through presence, not volume
- **Background:** Assumed command after the squad's first mission during the Fall of Arcadia ended in disaster; a recon survivor carrying secret guilt for the losses. **Personality:** stoic, cold, calculating; the group's "big sister."
- **Anime inspirations:** Re-L Mayer (Ergo Proxy), Kallen Kozuki (Code Geass), Yoo Mina (CounterSide)
- **Hardcore tenet:** Discipline (the "living Codex")
- **Gem color:** `blues` | **Theme:** `#3b82f6` / bright `#93c5fd` / glow `rgba(59,130,246,.6)`
- **Signature class:** **Tactician** — *"Calculates every angle. Boosts crit chance and precise vantage strikes."*
- **Job medals (10):** Tactician · Ranger · Gunslinger · Spotter · Sharpshooter · Strategist · Patrol · Falcon · Scope · Ace
- **Assets:** 25 portraits · 23 bars · 10 cinematic MP4s
- **Art preview:**

  ![Ashbeam standalone](../apps/vantage-strike/public/assets/Ashbeam.jpg)
  ![Ashbeam portrait](../apps/vantage-strike/public/assets/Ashbeam_Portraits/p_1778866663977.png)
  ![Ashbeam scene bar](../apps/vantage-strike/public/assets/Ashbeam_Bars/scene_1778877262133.png)

  - Standalone: [`assets/Ashbeam.jpg`](../apps/vantage-strike/public/assets/Ashbeam.jpg)
  - Portrait: [`assets/Ashbeam_Portraits/p_1778866663977.png`](../apps/vantage-strike/public/assets/Ashbeam_Portraits/p_1778866663977.png)
  - Scene bar: [`assets/Ashbeam_Bars/scene_1778877262133.png`](../apps/vantage-strike/public/assets/Ashbeam_Bars/scene_1778877262133.png)
- **Intel:**
  - ⬜ Backstory:
  - ⬜ Relationships (Hellshift — younger brother; Voltkin — first recruit; Spectra — quiet mentorship):

### 4.3 Crypsis — "Crypsis's Rogue"
- **Real name:** Dr. Illya Voss (often listed as Unknown)
- **Role:** Combat Economist, Resource Strategist, Logistics Commander
- **Mech:** Ledger-X7 / Nightshade-M — minimalist recon-finance unit; AI projection, crypto-siphoning, real-time asset tracking, optical camouflage
- **Personal philosophy:** *"The true war is won through economic attrition, not brute strength."* — surgical focus; detached, data-driven
- **Background:** Former employee of a private economic warfare firm; defected after witnessing unethical resource depletion. Hired by Ashbeam — the professional "outsider" counterpoint to the trauma-bonded founders. **Personality:** aloof, analytical, surgical.
- **Hardcore tenet:** Surgical Focus (cost-value survival calculus)
- **Gem color:** `oranges` | **Theme:** `#f59e0b` / bright `#fde68a` / glow `rgba(245,158,11,.6)`
- **Signature class:** **Rogue** — *"Strikes from the shadows. Bonus final damage and stats per completion."*
- **Job medals (10):** Rogue · Assassin · Trickster · Scout · Bandit · Shadowblade · Poacher · Marauder · Swashbuckler · Corsair · Shadow King
- **Assets:** 22 portraits · 27 bars · 10 cinematic MP4s
- **Art preview:**

  ![Crypsis standalone](../apps/vantage-strike/public/assets/Crypsis.jpg)
  ![Crypsis portrait](../apps/vantage-strike/public/assets/Crypsis_Portraits/p_1778866681842.png)
  ![Crypsis scene bar](../apps/vantage-strike/public/assets/Crypsis_Bars/scene_1778877291672.png)

  - Standalone: [`assets/Crypsis.jpg`](../apps/vantage-strike/public/assets/Crypsis.jpg)
  - Portrait: [`assets/Crypsis_Portraits/p_1778866681842.png`](../apps/vantage-strike/public/assets/Crypsis_Portraits/p_1778866681842.png)
  - Scene bar: [`assets/Crypsis_Bars/scene_1778877291672.png`](../apps/vantage-strike/public/assets/Crypsis_Bars/scene_1778877291672.png)
- **Intel:**
  - ⬜ Backstory:
  - ⬜ Relationships (outsider to the found family; hired by Ashbeam):

### 4.4 Spectra — "Spectra's Mystic"
- **Real name:** Minami Yurei (aka Lyra Solsana)
- **Role:** Scout, Close-Quarters Operative, Support/Psionic Specialist
- **Mech:** Kage-9 / Aegis-Unit — agile "ghost dancer"; energy blades, wall-running, reactive stealth plating, energy shields & psionic fields
- **Personal philosophy:** *"Embody the ability to see the hidden truths and strike at the heart of what matters most."* — spiritual insight; understanding loss is essential to survival
- **Background:** Rescued by the squad after being abandoned in a ruined arcology; from Caelith Prime. **Personality:** quiet, poetic, empathic; speaks in riddles; the squad's spiritual anchor / "middle sibling" mediator.
- **Hardcore tenet:** Spiritual Resilience
- **Gem color:** `cyans` | **Theme:** `#22d3ee` / bright `#a5f3fc` / glow `rgba(34,211,238,.6)`
- **Signature class:** **Mystic** — *"Attuned to arcane forces. Bonus stats per completion and faster growth."*
- **Job medals (10):** Mystic · Arcanist · Enchanter · Sage · Oracle · Aegis · Seer · Weaver · Luminary · Archon
- **Assets:** 21 portraits · 20 bars · 10 cinematic MP4s
- **Art preview:**

  ![Spectra standalone](../apps/vantage-strike/public/assets/Spectra.jpg)
  ![Spectra portrait](../apps/vantage-strike/public/assets/Spectra_Portraits/p_1778866744231.png)
  ![Spectra scene bar](../apps/vantage-strike/public/assets/Spectra_Bars/scene_1778877375231.png)

  - Standalone: [`assets/Spectra.jpg`](../apps/vantage-strike/public/assets/Spectra.jpg)
  - Portrait: [`assets/Spectra_Portraits/p_1778866744231.png`](../apps/vantage-strike/public/assets/Spectra_Portraits/p_1778866744231.png)
  - Scene bar: [`assets/Spectra_Bars/scene_1778877375231.png`](../apps/vantage-strike/public/assets/Spectra_Bars/scene_1778877375231.png)
- **Intel:**
  - ⬜ Backstory:
  - ⬜ Relationships (Kailin — Caelith Prime duo; Ashbeam — quiet mentorship; Hellshift — training partner):

### 4.5 Hellshift — "Hellshift's Brawler"
- **Real name:** Ryo Kazama (aka Kael Vahn)
- **Role:** Vanguard, Heavy Assault, Recon-Strike Hybrid
- **Mech:** Cerberus Mk-X — lithe panther-like transforming mech; crimson plating, twin plasma blades, high-speed boosters; vertical terrain control & ambushes
- **Personal philosophy:** *"Endure loss and transform it into unshakable resolve."* — protective fury for the squad
- **Background:** Ashbeam's younger brother; lost his family to a rogue faction during the Fall; the squad is his second family. **Personality:** brave, intense, protective "big brother"; tactical mind sharpened by grief.
- **Hardcore tenet:** Resilience
- **Gem color:** `purples` | **Theme:** `#a855f7` / bright `#d8b4fe` / glow `rgba(168,85,247,.6)`
- **Signature class:** **Brawler** — *"Throws the first punch. Bigger armies that grow faster."*
- **Job medals (10):** Brawler · Juggernaut · Reaver · Pugilist · Gladiator · Brute · Colossus · Ironclad · Titan · War Master
- **Assets:** 20 portraits · 22 bars · 10 cinematic MP4s
- **Art preview:**

  ![Hellshift standalone](../apps/vantage-strike/public/assets/Hellshift.jpg)
  ![Hellshift portrait](../apps/vantage-strike/public/assets/Hellshift_Portraits/p_1778869625436.png)
  ![Hellshift scene bar](../apps/vantage-strike/public/assets/Hellshift_Bars/scene_1778877332808.png)

  - Standalone: [`assets/Hellshift.jpg`](../apps/vantage-strike/public/assets/Hellshift.jpg)
  - Portrait: [`assets/Hellshift_Portraits/p_1778869625436.png`](../apps/vantage-strike/public/assets/Hellshift_Portraits/p_1778869625436.png)
  - Scene bar: [`assets/Hellshift_Bars/scene_1778877332808.png`](../apps/vantage-strike/public/assets/Hellshift_Bars/scene_1778877332808.png)
- **Intel:**
  - ⬜ Backstory:
  - ⬜ Relationships (Ashbeam — sister; Voltkin — childhood best friend):

### 4.6 Kailin — "Kailin's Executor"
- **Real name:** Kailin (formerly Halorise)
- **Role:** Assassin, "Knight-Errant"
- **Mech:** Wraith-Blade — high-speed lightweight duelist mech; "Vantage"-tech blades for high-stakes duels
- **Personal philosophy:** Heresy & self-liberation — abandoned his titles after uncovering a "great betrayal" in his former order (the corrupt Iron Order on Caelith Prime)
- **Background:** Knight-Errant turned heretic; rejected old systems to define his own path to mastery. Bonded with Spectra fleeing their pasts across the wastes. **Personality:** defiant; the individual's journey outside failed systems.
- **Hardcore tenet:** Defiance
- **Gem color:** `blacks` | **Theme:** `#6b7280` / bright `#d1d5db` / glow `rgba(107,114,128,.6)`
- **Signature class:** **Executor** — *"Passes final judgment. Gains stats per completion and amplifies idle damage."*
- **Job medals (10):** Executor · Voidcaller · Doombringer · Judge · Harbinger · Reaper · Inquisitor · Fallen · Eclipse · Death
- **Assets:** 22 portraits · 22 bars · 10 cinematic MP4s
- **Art preview:**

  ![Kailin standalone](../apps/vantage-strike/public/assets/Kailin.jpg)
  ![Kailin portrait](../apps/vantage-strike/public/assets/Kailin_Portraits/p_1778866978646.png)
  ![Kailin scene bar](../apps/vantage-strike/public/assets/Kailin_Bars/scene_1778877350796.png)

  - Standalone: [`assets/Kailin.jpg`](../apps/vantage-strike/public/assets/Kailin.jpg)
  - Portrait: [`assets/Kailin_Portraits/p_1778866978646.png`](../apps/vantage-strike/public/assets/Kailin_Portraits/p_1778866978646.png)
  - Scene bar: [`assets/Kailin_Bars/scene_1778877350796.png`](../apps/vantage-strike/public/assets/Kailin_Bars/scene_1778877350796.png)
- **Intel:**
  - ⬜ Backstory:
  - ⬜ Relationships (Spectra — Caelith Prime duo):

---

## 5. Squad Relationships (lore)

| Bond | Members | Dynamic |
|---|---|---|
| **Siblings** | Ashbeam & Hellshift | Biological siblings; Ashbeam is the "big sister" of the whole squad |
| **Childhood friends** | Hellshift & Voltkin | Bond "forged in the fires of their destroyed home"; playful friction, mutual protection |
| **First recruits** | Ashbeam & Voltkin | Voltkin joined first after the escape; Ashbeam scolds, Voltkin teases, foundation of the squad |
| **Caelith Prime duo** | Spectra & Kailin | Pre-squad partnership; fled their pasts and survived the wastes together |
| **Mentorship** | Ashbeam→Spectra, Hellshift→Spectra | Quiet encouragement / combat training |
| **The Outsider** | Crypsis | Hired by Ashbeam; detached professional counterpoint to trauma-forged bonds |

---

## 6. Design System Mapping (templatecss.css + cssScripts.ts)

### 6.1 Tokens to use (no new global CSS, no raw hex in components)
| Landing element | Token / primitive |
|---|---|
| Page background | `--z-bg-dark` (#030305), cards `--z-bg-card` (#0d0d14), inputs `--z-bg-input` |
| Text | `--z-text-primary / --z-text-secondary / --z-text-muted` |
| Faction accent | `--hero-color / --hero-bright / --hero-glow` (set via `[data-faction]`) |
| Borders | `--z-border-default / --z-border-muted`; radius `--z-radius` |
| Buttons | `.z-btn` (+ `--primary / --ghost / --mini` variants) |
| VANTAGE Rating bar | `.z-pbar` + `.z-pbar__f` with `--v` fill, `--c`/`--b` theme vars |
| Pills / tags | `.z-badge` (tenets, mech tags, ratings) |
| Monospace accents | `--z-font-mono` (title, verses, stat labels) |

### 6.2 Faction theming (already implemented in cssScripts.ts — reuse as-is)
| `[data-faction]` | Color | Bright | Glow | Faction label |
|---|---|---|---|---|
| Voltkin | `#ef4444` | `#fca5a5` | `rgba(239,68,68,.6)` | Voltkin's Vanguard |
| Ashbeam | `#3b82f6` | `#93c5fd` | `rgba(59,130,246,.6)` | Ashbeam's Tactician |
| Crypsis | `#f59e0b` | `#fde68a` | `rgba(245,158,11,.6)` | Crypsis's Rogue |
| Spectra | `#22d3ee` | `#a5f3fc` | `rgba(34,211,238,.6)` | Spectra's Mystic |
| Hellshift | `#a855f7` | `#d8b4fe` | `rgba(168,85,247,.6)` | Hellshift's Brawler |
| Kailin | `#6b7280` | `#d1d5db` | `rgba(107,114,128,.6)` | Kailin's Executor |

- `PALETTE` and `FACTIONS` in `cssScripts.ts` mirror these 1:1 — the landing page consumes them via `applyTheme(el, name)` + `getFaction(name)`; **do not add a second palette**.
- `ZButton`, `ZOverlay`, `ZConfirmDialog` + `useConfirm()` are available for any modal (e.g., 99 Forms preview, character detail overlay reuse from `CharPopout.vue`).

### 6.3 Component reuse
- `CharPopout.vue` already implements: theme switching via `applyTheme` (watch + onMounted), stat bars with `--hero-color` gradient fills, portrait `@error` fallback. Reuse its patterns for the roster detail block.
- `GameCard.vue` / `StatSlidePanel.vue` patterns for medal grids and stat rows.
- No new design-system files: all styling via `templatecss.css` classes + `--hero-*` inline vars bound from `heroThemes`.

---

## 7. Implementation Plan (Vue page in the game)

### 7.1 View wiring (no router — `v-if` pattern)
- Add `showLanding` ref (default `false`) in `App.vue`.
- Add a `[Lore]` / `[Profiles]` header button (styled like existing `[G]` / `[?]` buttons) toggling it.
- Render `<LandingView v-if="showLanding" @close="showLanding = false" />` as a full-page view.

### 7.2 Components
- **`src/components/LandingView.vue`** (`<script setup lang="ts">`) — page shell with all sections (§3.1–3.6) as stacked sections; section refs for anchor scrolling.
- **`src/components/RosterProfile.vue`** — single character profile block (header + quote + stats + medals + mech), reused per selection.
- **`src/components/CodexCard.vue`** — doctrine card (VANTAGE / STRIKE / Unyielding Edge) with verse + triad pills. (Optional if kept inline.)

### 7.3 Data sources (import from configs + lore constants — no duplication)
| Data | Source |
|---|---|
| Theme tokens | `heroThemes` from `gameData.ts` |
| Gem color + label | `gemColorInfo` from `gameData.ts` |
| Signature class + desc | `classDefinitions` (ids: `vanguard`, `tactician`, `rogue`, `mystic`, `brawler`, `executor`) |
| 10 job medals | `JOB_MEDAL_DEFS[charName]` from `jobMedalData.ts` |
| Portrait + asset counts | `localImages[charName]` from `gameData.ts` |
| Faction theming | `applyTheme()` + `FACTIONS` from `cssScripts.ts` |
| **Lore (names, mechs, quotes, roles, relationships, cosmology)** | New `src/config/loreData.ts` (typed, from `plans/HIBABBBBBBBE.txt` + this doc) |

### 7.4 Theming & layout rules
- `applyTheme()` on the view root (watch + onMounted, mirroring `CharPopout.vue`).
- Only design-system primitives; `--hero-*` vars for accents; no raw hex.
- VANTAGE Rating demo bar: `.z-pbar` with `--v: 97%` + `.z-badge` "99 FORMS" threshold note (lore tie-in, not a live stat).

### 7.5 Optional enhancements (not required for v1)
- Cinematic MP4 embed keyed off `VANTAGE_STRIKE_THRESHOLD` / `mp4Index` (`assets/Starred/<Name>_Starred/`) in the hero masthead.
- Standalone JPGs for **all 6 heroes** (`assets/*.jpg`) as profile hero art.
- 99 Forms modal via `useConfirm()`/`ZOverlay` showcasing Overcore cosmetic state.

---

## 8. Verification Strategy

| Check | Method |
|---|---|
| 6 characters render with correct lore + theme | Open landing page, click each roster tab |
| Faction theming switches per selection | Verify `--hero-*` / `[data-faction]` applied |
| Medals + signature class match configs | Compare against `JOB_MEDAL_DEFS` / `classDefinitions` |
| Lore sections match the bible | Cross-check names/mechs/quotes against `plans/HIBABBBBBBBE.txt` |
| Type-check passes | `npm run typecheck` (vue-tsc, no `.ts` import extensions) |
| Dev server boots | `npm run dev` |
| No raw hex in components | Grep new components for `#[0-9a-f]` hex literals |
| Close button returns to game | Click `✕` / header toggle off |
| Anchor nav (Codex → Roster → Wargear) | Scroll targets land on correct sections |

---

## 9. Follow-ups (later sessions)
- ⬜ Fill remaining intel placeholders (backstory depth, extra quotes) from user.
- ⬜ Build `loreData.ts` + `LandingView.vue` per §7 once approved.
- ⬜ Optionally promote the landing page to a standalone `public/` HTML entry if marketing use is wanted.
