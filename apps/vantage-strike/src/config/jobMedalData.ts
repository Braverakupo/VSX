// src/config/jobMedalData.ts
// Job Medals system — stat-points-based leveling.
//
// Each medal tracks exactly 1 stat for leveling, 2 medals per stat per character:
//   Index 0: Str,  Index 1: Str,  Index 2: Dex,  Index 3: Dex
//   Index 4: Spi,  Index 5: Spi,  Index 6: Int,  Index 7: Int
//   Index 8: Con,  Index 9: Con
//   → 2× Str, 2× Dex, 2× Spi, 2× Int, 2× Con = 10 medals per character
//
// Leveling (stat-points-based):
//   Stat points = value of the single tracked stat.
//   Target for level N:  base 6, then 40% increase each level, rounded up.
//     level 0→1: 6
//     level 1→2: ceil(6  × 1.4) = 9
//     level 2→3: ceil(9  × 1.4) = 13
//     level 3→4: ceil(13 × 1.4) = 19
//     ...

import type { StatName } from './gameData'

// Infinite progression — medals can level indefinitely
export const MAX_JOB_MEDAL_LEVEL = 9999

/** Base stat points needed for first level-up. */
export const LEVEL_BASE = 6
/** Multiplier per level (40% increase). */
export const LEVEL_MULT = 1.4

/**
 * Character → gem unit key mapping.
 */
export const CHAR_UNIT_KEYS: Record<string, string> = {
  Voltkin:  'red_unit',
  Ashbeam:  'blue_unit',
  Crypsis:  'orange_unit',
  Spectra:  'cyan_unit',
  Hellshift:'purple_unit',
  Kailin:   'black_unit'
}

/**
 * Stat tracking category for each medal index.
 * All medals are single-stat now (2 per stat per character).
 */
export function getMedalCategory(index: number): string {
  return 'single'
}

/**
 * Get the single stat key tracked for a given medal index (0-9).
 * Distribution: 0=Str, 1=Str, 2=Dex, 3=Dex, 4=Spi, 5=Spi, 6=Int, 7=Int, 8=Con, 9=Con
 * This gives 2 medals per stat per character.
 */
export function getStatKeysForIndex(index: number): StatName[] {
  const order = ['Str', 'Str', 'Dex', 'Dex', 'Spi', 'Spi', 'Int', 'Int', 'Con', 'Con'] as const
  return [order[index] || 'Str']
}

/**
 * Compute the stat-points target for a given medal level.
 * Base 6 at level 0, then ~40% increase per level, rounded up.
 * @param {number} level - current medal level (0 = first target is 6)
 * @returns {number} stat points needed to reach next level
 */
export function getLevelTarget(level: number): number {
  let t = LEVEL_BASE
  for (let i = 0; i < level; i++) {
    t = Math.ceil(t * LEVEL_MULT)
  }
  return t
}

/**
 * All 60 job medal definitions organized by character.
 *
 * Each medal tracks exactly 1 stat for leveling, 2 medals per stat per character:
 *   Index 0: Str,  1: Spi,  2: Int,  3: Con,  4: Dex
 *   Index 5: Str,  6: Int,  7: Con,  8: Dex,  9: Spi
 *
 * Each medal:
 *  - id:           unique identifier
 *  - name:         display name
 *  - stats:        single stat key tracked for leveling
 *  - desc:         flavor text
 */
export interface JobMedalDef {
  id: string
  name: string
  /** Single stat key tracked for leveling (all medals are single-stat now). */
  stats: StatName[]
  desc: string
}

export const JOB_MEDAL_DEFS: Record<string, JobMedalDef[]> = {
  // ═══════════════════════════════════════════════
  // VOLTKIN (reds) — Vanguard Assault
  // 0:Str, 1:Spi, 2:Int, 3:Con, 4:Dex, 5:Str, 6:Int, 7:Con, 8:Dex, 9:Spi
  // ═══════════════════════════════════════════════
  Voltkin: [
    { id: 'voltkin_vanguard',    name: 'Vanguard',    stats: ['Str'],       desc: 'Spearhead of the assault — raw strength fuels force.' },
    { id: 'voltkin_berserker',   name: 'Berserker',   stats: ['Str'],       desc: 'Unbridled strength channels devastating force.' },
    { id: 'voltkin_blademaster', name: 'Blademaster', stats: ['Dex'],       desc: 'Dexterous strikes sharpen the flow of force.' },
    { id: 'voltkin_fury',        name: 'Fury',        stats: ['Dex'],       desc: 'Furious dexterity generates relentless force.' },
    { id: 'voltkin_ravager',     name: 'Ravager',     stats: ['Spi'],       desc: 'Ravager spirit amplifies force output.' },
    { id: 'voltkin_tempest',     name: 'Tempest',     stats: ['Spi'],       desc: 'Storm of spirit — tempest force.' },
    { id: 'voltkin_inferno',     name: 'Inferno',     stats: ['Int'],       desc: 'Burning intellect generates infernal force.' },
    { id: 'voltkin_warlord',     name: 'Warlord',     stats: ['Int'],       desc: 'Warlord intellect forges warlord-tier force.' },
    { id: 'voltkin_onslaught',   name: 'Onslaught',   stats: ['Con'],       desc: 'Onslaught constitution powers the onslaught.' },
    { id: 'voltkin_overlord',    name: 'Overlord',    stats: ['Con'],       desc: 'Overlord constitution commands overwhelming force.' }
  ],

  // ═══════════════════════════════════════════════
  // ASHBEAM (blues) — Precision Force
  // 0:Str, 1:Spi, 2:Int, 3:Con, 4:Dex, 5:Str, 6:Int, 7:Con, 8:Dex, 9:Spi
  // ═══════════════════════════════════════════════
  Ashbeam: [
    { id: 'ashbeam_tactician',    name: 'Tactician',    stats: ['Str'],       desc: 'Calculated strength fuels precise force.' },
    { id: 'ashbeam_ranger',       name: 'Ranger',       stats: ['Str'],       desc: 'Ranger strength channels consistent force.' },
    { id: 'ashbeam_gunslinger',   name: 'Gunslinger',   stats: ['Dex'],       desc: 'Gunslinger dexterity generates rapid force.' },
    { id: 'ashbeam_spotter',      name: 'Spotter',      stats: ['Dex'],       desc: 'Spotter dexterity builds steady force.' },
    { id: 'ashbeam_sharpshooter', name: 'Sharpshooter', stats: ['Spi'],       desc: 'Sharpshooter spirit yields concentrated force.' },
    { id: 'ashbeam_strategist',   name: 'Strategist',   stats: ['Spi'],       desc: 'Strategist spirit aligns for maximum force.' },
    { id: 'ashbeam_patrol',       name: 'Patrol',       stats: ['Int'],       desc: 'Patrol intellect builds layered force.' },
    { id: 'ashbeam_falcon',       name: 'Falcon',       stats: ['Int'],       desc: 'Falcon intellect soars with falcon force.' },
    { id: 'ashbeam_scope',        name: 'Scope',        stats: ['Con'],       desc: 'Scope constitution combines for scoped force.' },
    { id: 'ashbeam_ace',          name: 'Ace',          stats: ['Con'],       desc: 'Ace constitution deals precise force.' }
  ],

  // ═══════════════════════════════════════════════
  // CRYPSIS (oranges) — Shadow Force
  // 0:Str, 1:Str, 2:Dex, 3:Dex, 4:Spi, 5:Spi, 6:Int, 7:Int, 8:Con, 9:Con
  // ═══════════════════════════════════════════════
  Crypsis: [
    { id: 'crypsis_rogue',       name: 'Rogue',       stats: ['Str'],       desc: 'Shadowy strength breeds rogue force.' },
    { id: 'crypsis_assassin',    name: 'Assassin',    stats: ['Str'],       desc: 'Assassin strength channels lethal force.' },
    { id: 'crypsis_trickster',   name: 'Trickster',   stats: ['Dex'],       desc: 'Trickster dexterity weaves deceptive force.' },
    { id: 'crypsis_scout',       name: 'Scout',       stats: ['Dex'],       desc: 'Scout dexterity builds steady shadow force.' },
    { id: 'crypsis_bandit',      name: 'Bandit',      stats: ['Spi'],       desc: 'Bandit spirit pilfers extra force.' },
    { id: 'crypsis_shadowblade', name: 'Shadowblade', stats: ['Spi'],       desc: 'Shadowblade spirit forges dark force.' },
    { id: 'crypsis_poacher',     name: 'Poacher',     stats: ['Int'],       desc: 'Poacher intellect hunts with force.' },
    { id: 'crypsis_marauder',    name: 'Marauder',    stats: ['Int'],       desc: 'Marauder intellect crushes with force.' },
    { id: 'crypsis_corsair',     name: 'Corsair',     stats: ['Con'],       desc: 'Corsair constitution commands shadow force.' },
    { id: 'crypsis_shadow_king', name: 'Shadow King', stats: ['Con'],       desc: 'Shadow King constitution commands every shadow attribute.' }
  ],

  // ═══════════════════════════════════════════════
  // SPECTRA (cyans) — Arcane Force
  // 0:Str, 1:Str, 2:Dex, 3:Dex, 4:Spi, 5:Spi, 6:Int, 7:Int, 8:Con, 9:Con
  // ═══════════════════════════════════════════════
  Spectra: [
    { id: 'spectra_mystic',     name: 'Mystic',     stats: ['Str'],       desc: 'Arcane strength empowers mystic force.' },
    { id: 'spectra_arcanist',   name: 'Arcanist',   stats: ['Str'],       desc: 'Arcanist strength weaves potent force.' },
    { id: 'spectra_enchanter',  name: 'Enchanter',  stats: ['Dex'],       desc: 'Enchanter dexterity amplifies arcane force.' },
    { id: 'spectra_sage',       name: 'Sage',       stats: ['Dex'],       desc: 'Sage dexterity sustains deep force.' },
    { id: 'spectra_oracle',     name: 'Oracle',     stats: ['Spi'],       desc: 'Oracle spirit predicts and channels force.' },
    { id: 'spectra_aegis',      name: 'Aegis',      stats: ['Spi'],       desc: 'Aegis spirit shields and channels arcane force.' },
    { id: 'spectra_seer',       name: 'Seer',       stats: ['Int'],       desc: 'Seer intellect peers into force streams.' },
    { id: 'spectra_weaver',     name: 'Weaver',     stats: ['Int'],       desc: 'Weaver intellect threads together force.' },
    { id: 'spectra_luminary',   name: 'Luminary',   stats: ['Con'],       desc: 'Luminary constitution radiates supreme force.' },
    { id: 'spectra_archon',     name: 'Archon',     stats: ['Con'],       desc: 'Archon constitution radiates arcane force.' }
  ],

  // ═══════════════════════════════════════════════
  // HELLSHIFT (purples) — Titanic Force
  // 0:Str, 1:Str, 2:Dex, 3:Dex, 4:Spi, 5:Spi, 6:Int, 7:Int, 8:Con, 9:Con
  // ═══════════════════════════════════════════════
  Hellshift: [
    { id: 'hellshift_brawler',     name: 'Brawler',     stats: ['Str'],       desc: 'Brawler strength throws heavy force.' },
    { id: 'hellshift_juggernaut',  name: 'Juggernaut',  stats: ['Str'],       desc: 'Juggernaut strength drives unstoppable force.' },
    { id: 'hellshift_reaver',      name: 'Reaver',      stats: ['Dex'],       desc: 'Reaver dexterity harvests dark force.' },
    { id: 'hellshift_pugilist',    name: 'Pugilist',    stats: ['Dex'],       desc: 'Pugilist dexterity fuels force with grit.' },
    { id: 'hellshift_gladiator',   name: 'Gladiator',   stats: ['Spi'],       desc: 'Gladiator spirit strikes with swift force.' },
    { id: 'hellshift_brute',       name: 'Brute',       stats: ['Spi'],       desc: 'Brute spirit crushes with force.' },
    { id: 'hellshift_colossus',    name: 'Colossus',    stats: ['Int'],       desc: 'Colossus intellect generates titan force.' },
    { id: 'hellshift_ironclad',    name: 'Ironclad',    stats: ['Int'],       desc: 'Ironclad intellect forges unbreakable force.' },
    { id: 'hellshift_titan',       name: 'Titan',       stats: ['Con'],       desc: 'Titan constitution commands supreme force.' },
    { id: 'hellshift_war_master',  name: 'War Master',  stats: ['Con'],       desc: 'War Master constitution forges titanic force.' }
  ],

  // ═══════════════════════════════════════════════
  // KAILIN (blacks) — Void Force
  // 0:Str, 1:Str, 2:Dex, 3:Dex, 4:Spi, 5:Spi, 6:Int, 7:Int, 8:Con, 9:Con
  // ═══════════════════════════════════════════════
  Kailin: [
    { id: 'kailin_executor',    name: 'Executor',    stats: ['Str'],       desc: 'Executor strength delivers void force.' },
    { id: 'kailin_voidcaller',  name: 'Voidcaller',  stats: ['Str'],       desc: 'Voidcaller strength summons dark force.' },
    { id: 'kailin_doombringer', name: 'Doombringer', stats: ['Dex'],       desc: 'Doombringer dexterity spreads force destruction.' },
    { id: 'kailin_judge',       name: 'Judge',       stats: ['Dex'],       desc: 'Judge dexterity endures with void force.' },
    { id: 'kailin_harbinger',   name: 'Harbinger',   stats: ['Spi'],       desc: 'Harbinger spirit heralds incoming force.' },
    { id: 'kailin_reaper',      name: 'Reaper',      stats: ['Spi'],       desc: 'Reaper spirit harvests void force.' },
    { id: 'kailin_inquisitor',  name: 'Inquisitor',  stats: ['Int'],       desc: 'Inquisitor intellect extracts void force.' },
    { id: 'kailin_fallen',      name: 'Fallen',      stats: ['Int'],       desc: 'Fallen intellect channels corrupted force.' },
    { id: 'kailin_eclipse',     name: 'Eclipse',     stats: ['Con'],       desc: 'Eclipse constitution blots out with force.' },
    { id: 'kailin_death',       name: 'Death',       stats: ['Con'],       desc: 'Death constitution harvests void force.' }
  ]
}

/**
 * Get the medal definitions for a given character.
 * @param {string} characterName
 * @returns {Array}
 */
export function getMedalDefsForChar(characterName: string): JobMedalDef[] {
  return JOB_MEDAL_DEFS[characterName] || []
}

/**
 * Get a specific medal definition by its id.
 * @param {string} medalId - e.g. "voltkin_vanguard"
 * @returns {Object|undefined}
 */
export function getMedalDefById(medalId: string): JobMedalDef | undefined {
  for (const charName of Object.keys(JOB_MEDAL_DEFS)) {
    const found = JOB_MEDAL_DEFS[charName].find(m => m.id === medalId)
    if (found) return found
  }
  return undefined
}


