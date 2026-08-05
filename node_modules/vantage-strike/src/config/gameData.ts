// src/config/gameData.ts
// Game configuration data — class definitions, gem images, and constants
// Centralized for easy tuning and balance adjustments

import type { StatName, HeroName, GemColor } from '../types'

export const HP_TICK_COUNT = 15
export const GEMS_PER_COLOR = 10

/** Vantage rating at which a hero's cinematic MP4 triggers (vantage-strike threshold). */
export const VANTAGE_STRIKE_THRESHOLD = 99

/** The five hero stats, in canonical order. */
export const STAT_NAMES = ['Str', 'Spi', 'Int', 'Con', 'Dex'] as const
export type { StatName } from '../types'

export const STAT_LABELS: Record<string, string> = {
  Str: 'Strength',
  Spi: 'Spirit',
  Int: 'Intelligence',
  Con: 'Constitution',
  Dex: 'Dexterity'
}

export interface RgbAnchor {
  r: number
  g: number
  b: number
}

export const HP_GRADIENT_ANCHORS: RgbAnchor[] = [
  { r: 250, g: 204, b: 21 },  // yellow (top - full HP)
  { r: 239, g: 136, b: 68 },  // orange (middle)
  { r: 239, g: 68,  b: 68 }   // red (bottom - low HP)
];

/** Gem color keys used across gem images, gem entities, and config records. */
export type { GemColor } from '../types'

export interface GemColorInfo {
  label: string
  cssColor: string
  dotColor: string
}

export const gemColorInfo: Record<string, GemColorInfo> = {
  reds:    { label: "Voltkin's Vanguard",    cssColor: '#ef4444', dotColor: '#ef4444' },
  blues:   { label: "Ashbeam's Tactician",   cssColor: '#3b82f6', dotColor: '#3b82f6' },
  oranges: { label: "Crypsis's Rogue",       cssColor: '#f59e0b', dotColor: '#f59e0b' },
  cyans:   { label: "Spectra's Mystic",      cssColor: '#22d3ee', dotColor: '#22d3ee' },
  purples: { label: "Hellshift's Brawler",   cssColor: '#a855f7', dotColor: '#a855f7' },
  blacks:  { label: "Kailin's Executor",     cssColor: '#6b7280', dotColor: '#6b7280' },
}

// ─── Hero color mapping (which gem color each hero uses) ───
export const CHAR_GEM_COLOR: Record<string, GemColor> = {
  Voltkin:  'reds',
  Ashbeam:  'blues',
  Crypsis:  'oranges',
  Spectra:  'cyans',
  Hellshift:'purples',
  Kailin:   'blacks'
}

export const charTemplates = ['Voltkin', 'Ashbeam', 'Crypsis', 'Spectra', 'Hellshift', 'Kailin'] as const

export type { HeroName } from '../types'

export interface HeroTheme {
  color: string
  bright: string
  glow: string
}

export const heroThemes: Record<string, HeroTheme> = {
  Voltkin:  { color: '#ef4444', bright: '#fca5a5', glow: 'rgba(239,68,68,.6)' },
  Ashbeam:  { color: '#3b82f6', bright: '#93c5fd', glow: 'rgba(59,130,246,.6)' },
  Crypsis:  { color: '#f59e0b', bright: '#fde68a', glow: 'rgba(245,158,11,.6)' },
  Spectra:  { color: '#22d3ee', bright: '#a5f3fc', glow: 'rgba(34,211,238,.6)' },
  Hellshift:{ color: '#a855f7', bright: '#d8b4fe', glow: 'rgba(168,85,247,.6)' },
  Kailin:   { color: '#6b7280', bright: '#d1d5db', glow: 'rgba(107,114,128,.6)' }
}

// ─── Class Definitions ───
// Each class is a gem 'paradigm' — similar to FF13 Paradigm system.
// Each gem IS the class, and its effects are determined by the class definition.
// All effects are passive — no active skills.
// Classes are organized by color archetype but ALL classes can roll on ALL colors now.
//
// Properties:
//  - id: unique class identifier
//  - scalingStat: which hero stat this class's effects scale with ('Str'|'Spi'|'Int'|'Con'|'Dex'|'total')
//  - name: display name
//  - description: flavor / tooltip text
//  - flatStats: stat weights for damage scaling (also legacy stat gain per completion)
//  - weight: roll weight (higher = more common)
//  - Various passive modifiers (armyPerSecond, critChance, etc.)
// Note: damageMult is now a rollable gem modifier,
// not a class property. See GEM_MODIFIER_DEFS below.
//
// Class archetypes:
//   Vanguard  (reds)    - Aggression: vantage synergy, crit amplification
//   Tactician (blues)   - Precision: crit chance, vantage crit, support
//   Rogue     (oranges) - Trickster: final damage % increase, stat growth
//   Mystic    (cyans)   - Growth: stat gain, XP, per-vantage/per-army scaling
//   Brawler   (purples) - Sustain: army growth, per-army stats, brawling
//   Executor  (blacks)  - Endgame: stat growth, idle damage, vantage cap
// ────────────────────────────────────────────

export type ClassScalingStat = StatName | 'total'

export interface ClassDefinition {
  id: string
  scalingStat: ClassScalingStat
  name: string
  description: string
  flatStats: Partial<Record<StatName, number>>
  weight: number
  vantagePerTap?: number
  armyPerSecond?: number
  critDamage?: number
  doubleCrit?: number
  /** Flat crit chance as a fraction, or a [min, max] roll range (percent points). */
  critChance?: number | [number, number]
  vantage99DmgMult?: number
  vantageAutoRate?: number
  preferredStatBonus?: number
  idleDamageMult?: number
  statPerCompletion?: number
  /** Vantage crit chance as a fraction, or a [min, max] roll range (percent points). */
  vantageCritChance?: number | [number, number]
}

export const classDefinitions: ClassDefinition[] = [
  // RED (Voltkin) - VANGUARD ARCHETYPE
  // Aggression, vantage synergy, crit amplification
  // All scale with Str (primary Vanguard stat)
  // -
  { id: 'vanguard',      scalingStat: 'Str', name: "Vanguard",     description: "Spearhead of the assault. Vantage builds faster and army swells with each blow.",       vantagePerTap: 1,   armyPerSecond: 2,   flatStats: { Str: 1, Con: 1 },   weight: 100, critDamage: 0.05,  doubleCrit: 1 },
  { id: 'berserker',     scalingStat: 'Str', name: "Berserker",    description: "Unleashes raw fury. Devastating crits when vantage peaks.",                          critChance: 0.05,   vantage99DmgMult: 1.5,   flatStats: { Str: 2 },            weight: 90,  critDamage: 0.10,  doubleCrit: 1 },
  { id: 'pyromancer',    scalingStat: 'Int', name: "Pyromancer",   description: "Burns through enemy ranks with relentless army pressure and vantage fuels the flames.", armyPerSecond: 2,  vantagePerTap: 1,   flatStats: { Int: 1, Spi: 1 },    weight: 85,  critDamage: 0.0,   doubleCrit: 1 },
  { id: 'blademaster',   scalingStat: 'Dex', name: "Blademaster",  description: "Precision and speed. Gains vantage rapidly and strikes true.",                       vantageAutoRate: 0.5, vantagePerTap: 1,   flatStats: { Dex: 2 },            weight: 80,  critDamage: 0.06,  doubleCrit: 0 },
  { id: 'warlord',       scalingStat: 'Con', name: "Warlord",      description: "Commands armies from the front. Starts strong and grows faster.",                    armyPerSecond: 2,   flatStats: { Str: 1, Con: 1 },    weight: 75,  critDamage: 0.04,  doubleCrit: 0 },
  { id: 'ravager',       scalingStat: 'Str', name: "Ravager",      description: "Relentless aggression. High crit rate that devastates at max vantage.",              critChance: 0.08,   vantage99DmgMult: 2.0,   flatStats: { Str: 2, Dex: 1 },    weight: 70,  critDamage: 0.12,  doubleCrit: 1 },
  { id: 'fury',          scalingStat: 'Str', name: "Fury",         description: "Boundless rage breaks the vantage cap. Every tap fuels the fire.",                   vantagePerTap: 2,   flatStats: { Str: 2 },            weight: 65,  critDamage: 0.0,   doubleCrit: 1 },
  { id: 'inferno',       scalingStat: 'Int', name: "Inferno",      description: "Scorched-earth tactics. Armies surge as crits blaze through the ranks.",               critChance: 0.04,   armyPerSecond: 2,   flatStats: { Int: 2, Str: 1 },   weight: 60,  critDamage: 0.08,  doubleCrit: 0 },
  { id: 'tempest',       scalingStat: 'Dex', name: "Tempest",      description: "A storm of strikes. Vantage builds on its own and crits cut deep.",                  vantageAutoRate: 1.0, critChance: 0.05,   flatStats: { Dex: 2, Spi: 1 },   weight: 55,  critDamage: 0.05,  doubleCrit: 1 },
  { id: 'onslaught',     scalingStat: 'Str', name: "Onslaught",    description: "The final charge. Maximum vantage devastation with overwhelming armies.",            vantage99DmgMult: 3.0, armyPerSecond: 2,  flatStats: { Str: 3 },            weight: 50,  critDamage: 0.0,   doubleCrit: 1 },

  // -
  // BLUE (Ashbeam) - TACTICIAN ARCHETYPE
  // Precision, crit chance, vantage crit, support
  // Scale with Dex (precision/aim stat)
  // -
  { id: 'tactician',     scalingStat: 'Dex', name: "Tactician",    description: "Calculates every angle. Boosts crit chance and precise vantage strikes.",             critChance: [10, 15],   vantageCritChance: [5, 10],   flatStats: { Dex: 1, Str: 1 },   weight: 100 },
  { id: 'ranger',        scalingStat: 'Dex', name: "Ranger",       description: "Keen-eyed and steady. Crit rate rises and preferred stats grow faster.",              critChance: [10, 15],   preferredStatBonus: 0.02,   flatStats: { Dex: 2 },            weight: 90 },
  { id: 'gunslinger',    scalingStat: 'Dex', name: "Gunslinger",   description: "Quick on the draw. Vantage crits hit hard with steady idle damage.",                  vantageCritChance: [5, 10],  idleDamageMult: 1.25,   flatStats: { Dex: 1, Str: 1 },   weight: 85 },
  { id: 'spotter',       scalingStat: 'Dex', name: "Spotter",      description: "Finds weak points. Balanced crit and vantage crit enhancement.",                      critChance: [10, 15],   vantageCritChance: [5, 10],   flatStats: { Dex: 1, Str: 1 },   weight: 80 },
  { id: 'strategist',    scalingStat: 'Str', name: "Strategist",   description: "Plans ahead. Bigger starting armies and accelerated preferred stats.",                armyPerSecond: 2,  preferredStatBonus: 0.02,   flatStats: { Str: 1, Dex: 1 },   weight: 75 },
  { id: 'sharpshooter',  scalingStat: 'Dex', name: "Sharpshooter", description: "Flawless aim. High crit rate with devastating vantage crits.",                        critChance: [10, 15],   vantageCritChance: [5, 10],   flatStats: { Dex: 2, Str: 1 },   weight: 70 },
  { id: 'patrol',        scalingStat: 'Str', name: "Patrol",       description: "Never sleeps. Idle damage rises and armies start larger.",                             armyPerSecond: 2,   flatStats: { Str: 1, Con: 1 },   weight: 65 },
  { id: 'falcon',        scalingStat: 'Dex', name: "Falcon",       description: "Swoops from above. Deadly accuracy with rare vantage crits.",                         critChance: [10, 15],   vantageCritChance: [5, 10],   flatStats: { Dex: 2, Str: 1 },   weight: 60 },
  { id: 'scope',         scalingStat: 'Dex', name: "Scope",        description: "Zeroed in. Extreme vantage crit precision with solid base crit.",                     vantageCritChance: [5, 10],  critChance: [10, 15],   flatStats: { Dex: 2, Str: 1 },   weight: 55 },
  { id: 'ace',           scalingStat: 'Dex', name: "Ace",          description: "The best of the best. Maximum crit stats on every front.",                             critChance: [10, 15],   vantageCritChance: [5, 10],   flatStats: { Dex: 2, Str: 2 },   weight: 50 },

  // -
  // ORANGE (Crypsis) - ROGUE ARCHETYPE
  // Final damage % increase, stat growth, trickster
  // Scale with Dex (finesse) or Int (cunning)
  // DamageMult = flat % increase to all outgoing damage (similar to reds/blues style)
  // Note: damageMult is now a rollable gem modifier, not a class property
  // -
  { id: 'rogue',         scalingStat: 'Dex', name: "Rogue",        description: "Strikes from the shadows. Bonus final damage and stats per completion.",              statPerCompletion: 0.015,   flatStats: { Dex: 1, Int: 1 },   weight: 100 },
  { id: 'assassin',      scalingStat: 'Dex', name: "Assassin",     description: "Eliminates weak targets. Critical strikes and bonus final damage.",                     critChance: 0.04,   flatStats: { Dex: 2 },            weight: 90 },
  { id: 'trickster',     scalingStat: 'Int', name: "Trickster",    description: "Deceives and steals. Bonus stats per completion and final damage.",                    statPerCompletion: 0.03,   flatStats: { Int: 1, Dex: 1 },   weight: 85 },
  { id: 'scout',         scalingStat: 'Dex', name: "Scout",        description: "Recon expert. Accelerated leveling and final damage.",                                 flatStats: { Dex: 1, Spi: 1 },   weight: 80 },
  { id: 'bandit',        scalingStat: 'Dex', name: "Bandit",       description: "Plunders without mercy. Bonus final damage with stat growth.",                         statPerCompletion: 0.02,   flatStats: { Str: 1, Dex: 1 },   weight: 75 },
  { id: 'shadowblade',   scalingStat: 'Dex', name: "Shadowblade",  description: "Lethal from the dark. Premium stat growth and final damage.",                          statPerCompletion: 0.04, flatStats: { Dex: 2, Int: 1 },   weight: 70 },
  { id: 'poacher',       scalingStat: 'Dex', name: "Poacher",      description: "Hunts for profit. Bonus final damage and stats per completion.",                      statPerCompletion: 0.035,   flatStats: { Dex: 2, Con: 1 },   weight: 65 },
  { id: 'marauder',      scalingStat: 'Str', name: "Marauder",     description: "Ravages the land. Premium final damage and stat bonuses.",                             statPerCompletion: 0.03,   flatStats: { Str: 2, Int: 1 },   weight: 60 },
  { id: 'swashbuckler',  scalingStat: 'Dex', name: "Swashbuckler", description: "Flaunts and fights. Bonus final damage and XP.",                                      flatStats: { Dex: 2, Spi: 1 },   weight: 55 },
  { id: 'corsair',       scalingStat: 'Int', name: "Corsair",      description: "King of the seas. Top final damage with stat acceleration.",                          statPerCompletion: 0.02,   flatStats: { Str: 1, Dex: 2, Int: 1 }, weight: 50 },

  // -
  // CYAN (Spectra) - MYSTIC ARCHETYPE
  // Stat growth, XP acceleration, per-vantage/per-army scaling
  // Scale with Int (arcane) or Spi (essence)
  // -
  { id: 'mystic',        scalingStat: 'Int', name: "Mystic",       description: "Attuned to arcane forces. Bonus stats per completion and faster growth.",             statPerCompletion: 0.02,   flatStats: { Int: 2, Spi: 1 },   weight: 100 },
  { id: 'arcanist',      scalingStat: 'Int', name: "Arcanist",     description: "Master of the weave. Preferred stats flourish and intellect sharpens.",               preferredStatBonus: 0.02,   flatStats: { Int: 2 },            weight: 90 },
  { id: 'enchanter',     scalingStat: 'Spi', name: "Enchanter",    description: "Empowers with magic. Stats grow on completion and armies swell.",                     statPerCompletion: 0.03, armyPerSecond: 2,  flatStats: { Int: 1, Spi: 1 },   weight: 85 },
  { id: 'sage',          scalingStat: 'Spi', name: "Sage",         description: "Ancient wisdom. Rapid leveling and steady stat accumulation.",                        statPerCompletion: 0.015,   flatStats: { Spi: 2, Int: 1 },   weight: 80 },
  { id: 'oracle',        scalingStat: 'Spi', name: "Oracle",       description: "Foresees victory. Preferred stats surge and idle damage compounds.",                  preferredStatBonus: 0.03,  idleDamageMult: 1.2,   flatStats: { Spi: 2 },            weight: 75 },
  { id: 'luminari',      scalingStat: 'Int', name: "Luminari",     description: "Radiant power. Exceptional stat growth per completion and accelerated XP.",           statPerCompletion: 0.04,   flatStats: { Int: 2, Spi: 2 },   weight: 70 },
  { id: 'seer',          scalingStat: 'Spi', name: "Seer",         description: "Beyond the veil. Preferred stats skyrocket alongside completion bonuses.",            preferredStatBonus: 0.04,  statPerCompletion: 0.02,   flatStats: { Spi: 2, Int: 1 },   weight: 65 },
  { id: 'weaver',        scalingStat: 'Spi', name: "Weaver",       description: "Weaves reality itself. Accelerates stat growth with each completion.",                statPerCompletion: 0.02,   flatStats: { Int: 1, Spi: 1, Dex: 1 }, weight: 60 },
  { id: 'luminary',      scalingStat: 'Int', name: "Luminary",     description: "A beacon of power. Massive idle damage and unmatched XP gains.",                       flatStats: { Str: 1, Spi: 1, Int: 1, Con: 1, Dex: 1 }, weight: 55 },
  { id: 'aether',        scalingStat: 'Int', name: "Æther",        description: "Primordial essence. Stats scale with completions.",                                    statPerCompletion: 0.03, flatStats: { Int: 2, Spi: 2 }, weight: 50 },

  // -
  // PURPLE (Hellshift) - BRAWLER ARCHETYPE
  // Army growth, per-army stats, sustain, brawling
  // Scale with Str (power) or Con (endurance)
  // -
  { id: 'brawler',       scalingStat: 'Str', name: "Brawler",      description: "Throws the first punch. Bigger armies that grow faster.",                              armyPerSecond: 2,   flatStats: { Str: 2, Con: 1 },   weight: 100 },
  { id: 'juggernaut',    scalingStat: 'Con', name: "Juggernaut",   description: "Unstoppable force. Colossal starting armies that crush the opposition.",               armyPerSecond: 2,   flatStats: { Con: 2, Str: 1 },   weight: 90 },
  { id: 'reaver',        scalingStat: 'Str', name: "Reaver",       description: "Feeds on battle. Relentless army generation.",                                          armyPerSecond: 2,  flatStats: { Str: 2 },            weight: 85 },
  { id: 'pugilist',      scalingStat: 'Str', name: "Pugilist",     description: "Fists of fury. Extra vantage on every tap and armies that swell rapidly.",             vantagePerTap: 1,    armyPerSecond: 2,   flatStats: { Str: 1, Dex: 1 },   weight: 80 },
  { id: 'gladiator',     scalingStat: 'Str', name: "Gladiator",    description: "Arena champion. Steady vantage generation and a strong starting army.",                vantageAutoRate: 0.5, armyPerSecond: 2, flatStats: { Str: 2 },            weight: 75 },
  { id: 'brute',         scalingStat: 'Str', name: "Brute",        description: "Overwhelming force. Massive army lead that sustains itself.",                           armyPerSecond: 2,   flatStats: { Str: 2, Con: 2 },   weight: 70 },
  { id: 'colossus',      scalingStat: 'Con', name: "Colossus",     description: "Towering might. Army self-generates and starts with a formidable presence.",            armyPerSecond: 2,   flatStats: { Con: 3 },            weight: 65 },
  { id: 'ironclad',      scalingStat: 'Con', name: "Ironclad",     description: "Fortress of strength. Colossal starting army and sustained growth.",                   armyPerSecond: 2,   flatStats: { Con: 2, Str: 1 },   weight: 60 },
  { id: 'ravager_brute', scalingStat: 'Str', name: "Ravager",      description: "Battles rage eternal. Accelerated vantage generation.",                                 vantageAutoRate: 1.0,  flatStats: { Str: 2, Con: 1 },   weight: 55 },
  { id: 'titan',         scalingStat: 'Con', name: "Titan",        description: "The might of mountains. Absolute army supremacy.",                                     armyPerSecond: 2,   flatStats: { Str: 2, Con: 2 },   weight: 50 },

  // ------------------------------------------------
  // BLACK (Kailin) - EXECUTOR ARCHETYPE
  // Endgame power, stat growth, idle damage, vantage cap
  // Scale with total stats (jack of all trades) or Int/Spi
  // ------------------------------------------------
  { id: 'executor',      scalingStat: 'total', name: "Executor",     description: "Passes final judgment. Gains stats per completion and amplifies idle damage.",         statPerCompletion: 0.04,   flatStats: { Str: 1, Spi: 1, Int: 1, Con: 1, Dex: 1 }, weight: 100 },
  { id: 'voidcaller',    scalingStat: 'Int',   name: "Voidcaller",   description: "Calls upon the void. Massive idle damage and vantage devastation.",                   idleDamageMult: 1.5,  vantage99DmgMult: 1.5,   flatStats: { Int: 2, Spi: 1 },   weight: 90 },
  { id: 'doombringer',   scalingStat: 'total', name: "Doombringer",  description: "Brings doom. Stats grow per completion and idle damage builds.",                      statPerCompletion: 0.04,   flatStats: { Str: 2, Int: 1 },   weight: 85 },
  { id: 'judge',         scalingStat: 'total', name: "Judge",        description: "Verdict of annihilation. Stats grow per completion with preferred stat acceleration.", statPerCompletion: 0.04, preferredStatBonus: 0.02,   flatStats: { Str: 1, Int: 1, Spi: 1 }, weight: 80 },
  { id: 'harbinger',     scalingStat: 'Spi',   name: "Harbinger",    description: "Foretells the end. Massive idle damage with deadly crits.",                            idleDamageMult: 1.5,  critChance: 0.04,   flatStats: { Int: 2, Spi: 1 },   weight: 75 },
  { id: 'reaper',        scalingStat: 'total', name: "Reaper",       description: "Grim harvest. Premium idle damage and stat growth.",                                  statPerCompletion: 0.03,   flatStats: { Str: 2, Dex: 1 },   weight: 70 },
  { id: 'inquisitor',    scalingStat: 'Spi',   name: "Inquisitor",   description: "Relentless pursuit. Exceptional stat growth and preferred stats.",                     statPerCompletion: 0.05, preferredStatBonus: 0.03,   flatStats: { Spi: 2, Int: 2 },   weight: 65 },
  { id: 'fallen',        scalingStat: 'total', name: "Fallen",       description: "Cast down from grace. Premium idle damage and vantage cap broken.",                   flatStats: { Str: 2, Int: 1, Spi: 1 }, weight: 60 },
  { id: 'nightfall',     scalingStat: 'Int',   name: "Nightfall",    description: "The darkness descends. Max stat growth and preferred stat acceleration.",              statPerCompletion: 0.06, preferredStatBonus: 0.04,   flatStats: { Int: 2, Spi: 2, Con: 1 }, weight: 55 },
  { id: 'eclipse',       scalingStat: 'total', name: "Eclipse",      description: "All light fades. Ultimate stat growth and idle devastation.",                          statPerCompletion: 0.08,   flatStats: { Str: 2, Spi: 2, Int: 2, Con: 2, Dex: 2 }, weight: 50 }
];

/**
 * Gem modifier definitions — rollable affixes on gems.
 * Each gem can roll 0-2 of these modifiers at random on creation.
 * Values are tier-scaled using the `perTier` step.
 *
 * Special rules:
 *  - vantageCapBoost: 5% legendary chance on any color, random value 5-10
 *  - All modifiers can roll on any color gem
 */
export interface GemModifierDef {
  label: string
  base: number
  perTier: number
  maxTier: number
  cssClass: string | null
  format: (val: number) => string
}

export const GEM_MODIFIER_DEFS: Record<string, GemModifierDef> = {
  damageMult: {
    label: 'Final Dmg',
    base: 0.015,
    perTier: 0.01,
    maxTier: 5,
    cssClass: null,
    format: (val) => `+${(val * 100).toFixed(1)}%`
  },
  vantageCapBoost: {
    label: 'Vantage Cap',
    base: 5,
    perTier: 0,
    maxTier: 5,
    cssClass: 'mod-legendary',
    format: (val) => `+${val}`
  },
  statPerCompletion: {
    label: 'Mystic Aura',
    base: 0.10,
    perTier: 0,
    maxTier: 5,
    cssClass: 'mod-mystic',
    format: (val) => `+${(val * 100).toFixed(0)}% stats/completion`
  },
  preferredStatBonus: {
    label: 'Preferred',
    base: 0.05,
    perTier: 0.01,
    maxTier: 5,
    cssClass: null,
    format: (val) => `+${(val * 100).toFixed(0)}% preferred stat`
  }
}

export const STANDARD_BUFF_TYPES: string[] = ['damageMult', 'preferredStatBonus']

// Re-export as abilityDefinitions for backward compatibility
export const abilityDefinitions = classDefinitions;

export const ALL_GEMS: Record<string, string[]> = {
  blacks: [
    "assets/Gems/blacks/materia-core-1780653614761.png",
    "assets/Gems/blacks/materia-core-1780653751143.png",
    "assets/Gems/blacks/materia-core-1780653847921.png",
    "assets/Gems/blacks/materia-core-1780653867359.png",
    "assets/Gems/blacks/materia-core-1780653923419.png",
    "assets/Gems/blacks/materia-core-1780653947527.png",
    "assets/Gems/blacks/materia-core-1780654094413.png",
    "assets/Gems/blacks/materia-core-1780654142455.png",
    "assets/Gems/blacks/materia-core-1780654403003.png",
    "assets/Gems/blacks/materia-core-1780654432200.png"
  ],
  blues: [
    "assets/Gems/blues/materia-core-1780651221732.png",
    "assets/Gems/blues/materia-core-1780651248408.png",
    "assets/Gems/blues/materia-core-1780651265953.png",
    "assets/Gems/blues/materia-core-1780651284853.png",
    "assets/Gems/blues/materia-core-1780651316373.png",
    "assets/Gems/blues/materia-core-1780651364204.png",
    "assets/Gems/blues/materia-core-1780651385876.png",
    "assets/Gems/blues/materia-core-1780651436405.png",
    "assets/Gems/blues/materia-core-1780651459344.png",
    "assets/Gems/blues/materia-core-1780651478366.png"
  ],
  cyans: [
    "assets/Gems/cyans/materia-core-1780652076197.png",
    "assets/Gems/cyans/materia-core-1780652095470.png",
    "assets/Gems/cyans/materia-core-1780652135247.png",
    "assets/Gems/cyans/materia-core-1780652186126.png",
    "assets/Gems/cyans/materia-core-1780652205483.png",
    "assets/Gems/cyans/materia-core-1780652228545.png",
    "assets/Gems/cyans/materia-core-1780652275608.png",
    "assets/Gems/cyans/materia-core-1780652301084.png",
    "assets/Gems/cyans/materia-core-1780652384594.png",
    "assets/Gems/cyans/materia-core-1780652475879.png"
  ],
  oranges: [
    "assets/Gems/oranges/materia-core-1780073809443.png",
    "assets/Gems/oranges/materia-core-1780073862942.png",
    "assets/Gems/oranges/materia-core-1780073922365.png",
    "assets/Gems/oranges/materia-core-1780077698614.png",
    "assets/Gems/oranges/materia-core-1780651784521.png",
    "assets/Gems/oranges/materia-core-1780651804530.png",
    "assets/Gems/oranges/materia-core-1780651825800.png",
    "assets/Gems/oranges/materia-core-1780651849219.png",
    "assets/Gems/oranges/materia-core-1780651892384.png",
    "assets/Gems/oranges/materia-core-1780651918989.png"
  ],
  purples: [
    "assets/Gems/purples/materia-core-1780652694671.png",
    "assets/Gems/purples/materia-core-1780652736203.png",
    "assets/Gems/purples/materia-core-1780652763601.png",
    "assets/Gems/purples/materia-core-1780652788323.png",
    "assets/Gems/purples/materia-core-1780652832284.png",
    "assets/Gems/purples/materia-core-1780652857776.png",
    "assets/Gems/purples/materia-core-1780652930425.png",
    "assets/Gems/purples/materia-core-1780653010094.png",
    "assets/Gems/purples/materia-core-1780653373583.png",
    "assets/Gems/purples/materia-core-1780653395854.png"
  ],
  reds: [
    "assets/Gems/reds/materia-core-1780071403812.png",
    "assets/Gems/reds/materia-core-1780071479034.png",
    "assets/Gems/reds/materia-core-1780072390477.png",
    "assets/Gems/reds/materia-core-1780072718676.png",
    "assets/Gems/reds/materia-core-1780072782066.png",
    "assets/Gems/reds/materia-core-1780072985495.png",
    "assets/Gems/reds/materia-core-1780073104437.png",
    "assets/Gems/reds/materia-core-1780073259638.png",
    "assets/Gems/reds/materia-core-1780073636668.png",
    "assets/Gems/reds/materia-core-1780073660912.png"
  ]
}

export interface LocalImages {
  portraits: string[]
  bars: string[]
  starred: string[]
}

// Character visual asset paths (portraits, bars, starred animations)
export const localImages: Record<string, LocalImages> = {
  Voltkin: {
    portraits: [
      "assets/Voltkin_Portraits/p_1778866771799.png",
      "assets/Voltkin_Portraits/p_1778867016157.png",
      "assets/Voltkin_Portraits/p_1778867313046.png",
      "assets/Voltkin_Portraits/p_1778869794595.png",
      "assets/Voltkin_Portraits/p_1778869934942.png",
      "assets/Voltkin_Portraits/p_1778870084641.png",
      "assets/Voltkin_Portraits/p_1778870249814.png",
      "assets/Voltkin_Portraits/p_1778870435097.png",
      "assets/Voltkin_Portraits/p_1778870607914.png",
      "assets/Voltkin_Portraits/p_1778870766212.png",
      "assets/Voltkin_Portraits/p_1778870948341.png",
      "assets/Voltkin_Portraits/p_1778871123675.png",
      "assets/Voltkin_Portraits/p_1778871297371.png",
      "assets/Voltkin_Portraits/p_1778871448670.png",
      "assets/Voltkin_Portraits/p_1778871623099.png",
      "assets/Voltkin_Portraits/p_1778871967384.png",
      "assets/Voltkin_Portraits/p_1778872127841.png",
      "assets/Voltkin_Portraits/p_1778872301590.png",
      "assets/Voltkin_Portraits/p_1778872498047.png",
      "assets/Voltkin_Portraits/p_1778872675985.png",
      "assets/Voltkin_Portraits/p_1778872848029.png",
      "assets/Voltkin_Portraits/p_1778873032979.png",
      "assets/Voltkin_Portraits/p_1778873216698.png"
    ],
    bars: [
      "assets/Voltkin_Bars/scene_1778877404137.png",
      "assets/Voltkin_Bars/side_1778877779896.png",
      "assets/Voltkin_Bars/side_1778877951345.png",
      "assets/Voltkin_Bars/side_1778878128921.png",
      "assets/Voltkin_Bars/side_1778878297625.png",
      "assets/Voltkin_Bars/side_1778879032009.png",
      "assets/Voltkin_Bars/side_1778879096042.png",
      "assets/Voltkin_Bars/side_1778879170609.png",
      "assets/Voltkin_Bars/side_1778879171579.png",
      "assets/Voltkin_Bars/side_1778879248415.png",
      "assets/Voltkin_Bars/side_1778879249586.png",
      "assets/Voltkin_Bars/side_1778879343504.png",
      "assets/Voltkin_Bars/side_1778879425023.png",
      "assets/Voltkin_Bars/side_1778879509434.png",
      "assets/Voltkin_Bars/side_1778879600324.png",
      "assets/Voltkin_Bars/side_1778879611276.png",
      "assets/Voltkin_Bars/side_1778879675592.png",
      "assets/Voltkin_Bars/side_1778879685482.png",
      "assets/Voltkin_Bars/side_1778899063676.png",
      "assets/Voltkin_Bars/side_1778899248381.png",
      "assets/Voltkin_Bars/side_1778899431689.png",
      "assets/Voltkin_Bars/side_1778899630216.png",
      "assets/Voltkin_Bars/side_1778899842801.png"
    ],
    starred: [
      "assets/Starred/Voltkin_Starred/4d6bc52c1c985178c394cbd65b355c26.mp4",
      "assets/Starred/Voltkin_Starred/5c8da532955f49df79027015d1473f14.mp4",
      "assets/Starred/Voltkin_Starred/7d1412d8d2163e89c035a9b4b224110e.mp4",
      "assets/Starred/Voltkin_Starred/16e3032a78e66ccd7a9703db9c153b45.mp4",
      "assets/Starred/Voltkin_Starred/485acae11019bccf72f4469552659b0f.mp4",
      "assets/Starred/Voltkin_Starred/0708a2947c0ba92021a4bc15ff16496f.mp4",
      "assets/Starred/Voltkin_Starred/664431ad8b112fd838aa485b455a0a54.mp4",
      "assets/Starred/Voltkin_Starred/1976225da61b929a0c226cde42860f92.mp4",
      "assets/Starred/Voltkin_Starred/a74ef65c7fb96034e5e7a4dfd192fe98.mp4",
      "assets/Starred/Voltkin_Starred/ed8a90b7de91aee0cb36d71c575b121a.mp4"
    ]
  },
  Ashbeam: {
    portraits: [
      "assets/Ashbeam_Portraits/p_1778866663977.png",
      "assets/Ashbeam_Portraits/p_1778867065654.png",
      "assets/Ashbeam_Portraits/p_1778867195562.png",
      "assets/Ashbeam_Portraits/p_1778867720816.png",
      "assets/Ashbeam_Portraits/p_1778869576113.png",
      "assets/Ashbeam_Portraits/p_1778869678484.png",
      "assets/Ashbeam_Portraits/p_1778869818480.png",
      "assets/Ashbeam_Portraits/p_1778869952809.png",
      "assets/Ashbeam_Portraits/p_1778870110191.png",
      "assets/Ashbeam_Portraits/p_1778870276194.png",
      "assets/Ashbeam_Portraits/p_1778870466942.png",
      "assets/Ashbeam_Portraits/p_1778870635003.png",
      "assets/Ashbeam_Portraits/p_1778870804086.png",
      "assets/Ashbeam_Portraits/p_1778870973885.png",
      "assets/Ashbeam_Portraits/p_1778871151577.png",
      "assets/Ashbeam_Portraits/p_1778871320157.png",
      "assets/Ashbeam_Portraits/p_1778871479024.png",
      "assets/Ashbeam_Portraits/p_1778871654254.png",
      "assets/Ashbeam_Portraits/p_1778871825415.png",
      "assets/Ashbeam_Portraits/p_1778871988773.png",
      "assets/Ashbeam_Portraits/p_1778872161581.png",
      "assets/Ashbeam_Portraits/p_1778872521284.png",
      "assets/Ashbeam_Portraits/p_1778872710839.png",
      "assets/Ashbeam_Portraits/p_1778872876484.png",
      "assets/Ashbeam_Portraits/p_1778873063956.png"
    ],
    bars: [
      "assets/Ashbeam_Bars/bar_1778876983518.png",
      "assets/Ashbeam_Bars/post_1778878721834.png",
      "assets/Ashbeam_Bars/scene_1778877262133.png",
      "assets/Ashbeam_Bars/scene_1778877473663.png",
      "assets/Ashbeam_Bars/side_1778877643672.png",
      "assets/Ashbeam_Bars/side_1778877801008.png",
      "assets/Ashbeam_Bars/side_1778877982972.png",
      "assets/Ashbeam_Bars/side_1778878155315.png",
      "assets/Ashbeam_Bars/side_1778878323184.png",
      "assets/Ashbeam_Bars/side_1778878858008.png",
      "assets/Ashbeam_Bars/side_1778878950827.png",
      "assets/Ashbeam_Bars/side_1778878957157.png",
      "assets/Ashbeam_Bars/side_1778879035985.png",
      "assets/Ashbeam_Bars/side_1778879118760.png",
      "assets/Ashbeam_Bars/side_1778879355254.png",
      "assets/Ashbeam_Bars/side_1778879530783.png",
      "assets/Ashbeam_Bars/side_1778879629024.png",
      "assets/Ashbeam_Bars/side_1778879701496.png",
      "assets/Ashbeam_Bars/side_1778899088421.png",
      "assets/Ashbeam_Bars/side_1778899274898.png",
      "assets/Ashbeam_Bars/side_1778899458027.png",
      "assets/Ashbeam_Bars/side_1778899670036.png",
      "assets/Ashbeam_Bars/side_1778899877781.png"
    ],
    starred: [
      "assets/Starred/Ashbeam_Starred/0b055e9cd8cd4aafd2bc7963a8cceddd.mp4",
      "assets/Starred/Ashbeam_Starred/5cdff70cd9961bf6cb626fab82cbf75d.mp4",
      "assets/Starred/Ashbeam_Starred/974a4fb8fabb1e4ee8a50312f746ed34.mp4",
      "assets/Starred/Ashbeam_Starred/5903b1e162933762f7d839b8dab1b6bc.mp4",
      "assets/Starred/Ashbeam_Starred/8768c0a4d54ff8dc4a8c1bda88ce8bd2.mp4",
      "assets/Starred/Ashbeam_Starred/ab4e859fa26e7de5f64aba76e9c783ce.mp4",
      "assets/Starred/Ashbeam_Starred/c30d7e2f8f81869b7c3e77c7a8916c07.mp4",
      "assets/Starred/Ashbeam_Starred/c69937ee4b00097ff7d2cb2b7f9641d6.mp4",
      "assets/Starred/Ashbeam_Starred/d35b4f365047160cf7819ba0c5890420.mp4",
      "assets/Starred/Ashbeam_Starred/f865a7275257695d902aaede4d3a8469.mp4"
    ]
  },
  Crypsis: {
    portraits: [
      "assets/Crypsis_Portraits/p_1778866681842.png",
      "assets/Crypsis_Portraits/p_1778867091478.png",
      "assets/Crypsis_Portraits/p_1778869702523.png",
      "assets/Crypsis_Portraits/p_1778869842056.png",
      "assets/Crypsis_Portraits/p_1778869977759.png",
      "assets/Crypsis_Portraits/p_1778870139227.png",
      "assets/Crypsis_Portraits/p_1778870313136.png",
      "assets/Crypsis_Portraits/p_1778870493385.png",
      "assets/Crypsis_Portraits/p_1778870659249.png",
      "assets/Crypsis_Portraits/p_1778870825761.png",
      "assets/Crypsis_Portraits/p_1778871176699.png",
      "assets/Crypsis_Portraits/p_1778871347531.png",
      "assets/Crypsis_Portraits/p_1778871504592.png",
      "assets/Crypsis_Portraits/p_1778871689200.png",
      "assets/Crypsis_Portraits/p_1778871853729.png",
      "assets/Crypsis_Portraits/p_1778872018289.png",
      "assets/Crypsis_Portraits/p_1778872182719.png",
      "assets/Crypsis_Portraits/p_1778872373725.png",
      "assets/Crypsis_Portraits/p_1778872549867.png",
      "assets/Crypsis_Portraits/p_1778872735001.png",
      "assets/Crypsis_Portraits/p_1778872907707.png",
      "assets/Crypsis_Portraits/p_1778873101005.png"
    ],
    bars: [
      "assets/Crypsis_Bars/bar_1778877003152.png",
      "assets/Crypsis_Bars/post_1778878741857.png",
      "assets/Crypsis_Bars/scene_1778877291672.png",
      "assets/Crypsis_Bars/side_1778877664111.png",
      "assets/Crypsis_Bars/side_1778877833168.png",
      "assets/Crypsis_Bars/side_1778878005567.png",
      "assets/Crypsis_Bars/side_1778878197875.png",
      "assets/Crypsis_Bars/side_1778878346225.png",
      "assets/Crypsis_Bars/side_1778878497342.png",
      "assets/Crypsis_Bars/side_1778878876842.png",
      "assets/Crypsis_Bars/side_1778878969630.png",
      "assets/Crypsis_Bars/side_1778879122492.png",
      "assets/Crypsis_Bars/side_1778879193923.png",
      "assets/Crypsis_Bars/side_1778879198276.png",
      "assets/Crypsis_Bars/side_1778879269932.png",
      "assets/Crypsis_Bars/side_1778879283664.png",
      "assets/Crypsis_Bars/side_1778879377717.png",
      "assets/Crypsis_Bars/side_1778879451606.png",
      "assets/Crypsis_Bars/side_1778879453219.png",
      "assets/Crypsis_Bars/side_1778879546599.png",
      "assets/Crypsis_Bars/side_1778879635567.png",
      "assets/Crypsis_Bars/side_1778879708335.png",
      "assets/Crypsis_Bars/side_1778899117665.png",
      "assets/Crypsis_Bars/side_1778899314702.png",
      "assets/Crypsis_Bars/side_1778899495334.png",
      "assets/Crypsis_Bars/side_1778899714271.png",
      "assets/Crypsis_Bars/side_1778899910740.png"
    ],
    starred: [
      "assets/Starred/Crypsis_Starred/1cf16562d57d3d032e6194d9d9d9f336.mp4",
      "assets/Starred/Crypsis_Starred/3aa3c300d9f8e5d8b11ea3d18ebdf499.mp4",
      "assets/Starred/Crypsis_Starred/04f3a683effe5080c59ead725222875a.mp4",
      "assets/Starred/Crypsis_Starred/7f3d58eed311deaee98bb22a6a2f4014.mp4",
      "assets/Starred/Crypsis_Starred/73b62bc020c97e869183204100517d7d.mp4",
      "assets/Starred/Crypsis_Starred/a714f41ee1b1e3ac312c8280135e019f.mp4",
      "assets/Starred/Crypsis_Starred/b18aba32005182fe56824a1edb5d4ba6.mp4",
      "assets/Starred/Crypsis_Starred/c817dc0d7c925c7c886825222a1e87b7.mp4",
      "assets/Starred/Crypsis_Starred/e4e4cbffe0511474927fd26ed62c272b.mp4",
      "assets/Starred/Crypsis_Starred/ed5994a03305132c392ae4f32f6cc092.mp4"
    ]
  },
  Spectra: {
    portraits: [
      "assets/Spectra_Portraits/p_1778866744231.png",
      "assets/Spectra_Portraits/p_1778867000573.png",
      "assets/Spectra_Portraits/p_1778867293932.png",
      "assets/Spectra_Portraits/p_1778869774815.png",
      "assets/Spectra_Portraits/p_1778869905358.png",
      "assets/Spectra_Portraits/p_1778870057844.png",
      "assets/Spectra_Portraits/p_1778870227848.png",
      "assets/Spectra_Portraits/p_1778870414650.png",
      "assets/Spectra_Portraits/p_1778870580273.png",
      "assets/Spectra_Portraits/p_1778870740308.png",
      "assets/Spectra_Portraits/p_1778870921165.png",
      "assets/Spectra_Portraits/p_1778871083228.png",
      "assets/Spectra_Portraits/p_1778871267245.png",
      "assets/Spectra_Portraits/p_1778871424600.png",
      "assets/Spectra_Portraits/p_1778871598459.png",
      "assets/Spectra_Portraits/p_1778872104667.png",
      "assets/Spectra_Portraits/p_1778872266665.png",
      "assets/Spectra_Portraits/p_1778872473210.png",
      "assets/Spectra_Portraits/p_1778872824365.png",
      "assets/Spectra_Portraits/p_1778873009706.png",
      "assets/Spectra_Portraits/p_1778873186278.png"
    ],
    bars: [
      "assets/Spectra_Bars/bar_1778877059432.png",
      "assets/Spectra_Bars/scene_1778877375231.png",
      "assets/Spectra_Bars/side_1778877752504.png",
      "assets/Spectra_Bars/side_1778877917249.png",
      "assets/Spectra_Bars/side_1778878097094.png",
      "assets/Spectra_Bars/side_1778878270960.png",
      "assets/Spectra_Bars/side_1778878431251.png",
      "assets/Spectra_Bars/side_1778878570408.png",
      "assets/Spectra_Bars/side_1778878925472.png",
      "assets/Spectra_Bars/side_1778878928984.png",
      "assets/Spectra_Bars/side_1778879000288.png",
      "assets/Spectra_Bars/side_1778879087274.png",
      "assets/Spectra_Bars/side_1778879326813.png",
      "assets/Spectra_Bars/side_1778879419956.png",
      "assets/Spectra_Bars/side_1778879519979.png",
      "assets/Spectra_Bars/side_1778899033626.png",
      "assets/Spectra_Bars/side_1778899222517.png",
      "assets/Spectra_Bars/side_1778899402160.png",
      "assets/Spectra_Bars/side_1778899602753.png",
      "assets/Spectra_Bars/side_1778899804607.png"
    ],
    starred: [
      "assets/Starred/Spectra_Starred/0cd7732a8b256a008ed8a42ea493387a.mp4",
      "assets/Starred/Spectra_Starred/3c2bccd452561422ce4ce57bfe696f3f.mp4",
      "assets/Starred/Spectra_Starred/08f39cfd87751537c964d254b8b12764.mp4",
      "assets/Starred/Spectra_Starred/9b6b5b8534780253c35b7ed8e9f3e69a.mp4",
      "assets/Starred/Spectra_Starred/9e86f3a66fd69d1d89fd0d5e92bf7d8c.mp4",
      "assets/Starred/Spectra_Starred/77e5f9eea9b36d2c8ca9648515707abe.mp4",
      "assets/Starred/Spectra_Starred/a82bf036527d5f22080736f925fc1031.mp4",
      "assets/Starred/Spectra_Starred/a510681a7623760d8f9282ac19946c8f.mp4",
      "assets/Starred/Spectra_Starred/c6bb16b69e7eeaf74002ebfdff13561d.mp4",
      "assets/Starred/Spectra_Starred/eb2cc19ae63b7549eb1a74e6f5c04be9.mp4"
    ]
  },
  Hellshift: {
    portraits: [
      "assets/Hellshift_Portraits/p_1778869625436.png",
      "assets/Hellshift_Portraits/p_1778869723284.png",
      "assets/Hellshift_Portraits/p_1778869864312.png",
      "assets/Hellshift_Portraits/p_1778870007880.png",
      "assets/Hellshift_Portraits/p_1778870170781.png",
      "assets/Hellshift_Portraits/p_1778870347316.png",
      "assets/Hellshift_Portraits/p_1778870525153.png",
      "assets/Hellshift_Portraits/p_1778870685866.png",
      "assets/Hellshift_Portraits/p_1778870867280.png",
      "assets/Hellshift_Portraits/p_1778871024130.png",
      "assets/Hellshift_Portraits/p_1778871205088.png",
      "assets/Hellshift_Portraits/p_1778871375593.png",
      "assets/Hellshift_Portraits/p_1778871531214.png",
      "assets/Hellshift_Portraits/p_1778871711133.png",
      "assets/Hellshift_Portraits/p_1778871878392.png",
      "assets/Hellshift_Portraits/p_1778872039790.png",
      "assets/Hellshift_Portraits/p_1778872217471.png",
      "assets/Hellshift_Portraits/p_1778872407960.png",
      "assets/Hellshift_Portraits/p_1778872930200.png",
      "assets/Hellshift_Portraits/p_1778873132140.png"
    ],
    bars: [
      "assets/Hellshift_Bars/bar_1778877019566.png",
      "assets/Hellshift_Bars/post_1778878760382.png",
      "assets/Hellshift_Bars/scene_1778877332808.png",
      "assets/Hellshift_Bars/side_1778877697600.png",
      "assets/Hellshift_Bars/side_1778877861099.png",
      "assets/Hellshift_Bars/side_1778878041915.png",
      "assets/Hellshift_Bars/side_1778878370356.png",
      "assets/Hellshift_Bars/side_1778878524961.png",
      "assets/Hellshift_Bars/side_1778878902503.png",
      "assets/Hellshift_Bars/side_1778878904194.png",
      "assets/Hellshift_Bars/side_1778878976441.png",
      "assets/Hellshift_Bars/side_1778879055523.png",
      "assets/Hellshift_Bars/side_1778879060339.png",
      "assets/Hellshift_Bars/side_1778879298082.png",
      "assets/Hellshift_Bars/side_1778879384622.png",
      "assets/Hellshift_Bars/side_1778879577559.png",
      "assets/Hellshift_Bars/side_1778879652235.png",
      "assets/Hellshift_Bars/side_1778899149384.png",
      "assets/Hellshift_Bars/side_1778899347178.png",
      "assets/Hellshift_Bars/side_1778899535173.png",
      "assets/Hellshift_Bars/side_1778899744456.png",
      "assets/Hellshift_Bars/side_1778899946656.png"
    ],
    starred: [
      "assets/Starred/Hellshift_Starred/0e365bda5ac45061577e32a8f5c10bce.mp4",
      "assets/Starred/Hellshift_Starred/4b125b554b5b4e8667250f3e700e0595.mp4",
      "assets/Starred/Hellshift_Starred/67a7ec601082da25df8881cf17835695.mp4",
      "assets/Starred/Hellshift_Starred/80cd44e2e51d90faf89d658c3149ac86.mp4",
      "assets/Starred/Hellshift_Starred/94c5a6098f9ac21244e53e2fa4d742ad.mp4",
      "assets/Starred/Hellshift_Starred/0491d824aaf04d2fe59f2b73791aa92b.mp4",
      "assets/Starred/Hellshift_Starred/342213a18414c3d030c45b19b2c250f1.mp4",
      "assets/Starred/Hellshift_Starred/442562cd3ab3aa241722c237c28ae7cb.mp4",
      "assets/Starred/Hellshift_Starred/9272116f309e314bb39877466da55cb9.mp4",
      "assets/Starred/Hellshift_Starred/b1967b8f656ecc5b955ce311ec80ee8b.mp4"
    ]
  },
  Kailin: {
    portraits: [
      "assets/Kailin_Portraits/p_1778866978646.png",
      "assets/Kailin_Portraits/p_1778869753907.png",
      "assets/Kailin_Portraits/p_1778869883185.png",
      "assets/Kailin_Portraits/p_1778870032348.png",
      "assets/Kailin_Portraits/p_1778870197044.png",
      "assets/Kailin_Portraits/p_1778870384648.png",
      "assets/Kailin_Portraits/p_1778870551819.png",
      "assets/Kailin_Portraits/p_1778870710035.png",
      "assets/Kailin_Portraits/p_1778870888116.png",
      "assets/Kailin_Portraits/p_1778871053885.png",
      "assets/Kailin_Portraits/p_1778871228661.png",
      "assets/Kailin_Portraits/p_1778871398595.png",
      "assets/Kailin_Portraits/p_1778871570594.png",
      "assets/Kailin_Portraits/p_1778871747744.png",
      "assets/Kailin_Portraits/p_1778871914205.png",
      "assets/Kailin_Portraits/p_1778872071070.png",
      "assets/Kailin_Portraits/p_1778872241532.png",
      "assets/Kailin_Portraits/p_1778872441953.png",
      "assets/Kailin_Portraits/p_1778872610185.png",
      "assets/Kailin_Portraits/p_1778872971264.png",
      "assets/Kailin_Portraits/p_1778873155107.png",
      "assets/Kailin_Portraits/p_1778874581745.png"
    ],
    bars: [
      "assets/Kailin_Bars/scene_1778877350796.png",
      "assets/Kailin_Bars/side_1778877719741.png",
      "assets/Kailin_Bars/side_1778877882862.png",
      "assets/Kailin_Bars/side_1778878062095.png",
      "assets/Kailin_Bars/side_1778878548909.png",
      "assets/Kailin_Bars/side_1778879007864.png",
      "assets/Kailin_Bars/side_1778879075993.png",
      "assets/Kailin_Bars/side_1778879141068.png",
      "assets/Kailin_Bars/side_1778879143645.png",
      "assets/Kailin_Bars/side_1778879222153.png",
      "assets/Kailin_Bars/side_1778879308717.png",
      "assets/Kailin_Bars/side_1778879402639.png",
      "assets/Kailin_Bars/side_1778879477656.png",
      "assets/Kailin_Bars/side_1778879485976.png",
      "assets/Kailin_Bars/side_1778879582227.png",
      "assets/Kailin_Bars/side_1778879657947.png",
      "assets/Kailin_Bars/side_1778899007920.png",
      "assets/Kailin_Bars/side_1778899193759.png",
      "assets/Kailin_Bars/side_1778899373468.png",
      "assets/Kailin_Bars/side_1778899560765.png",
      "assets/Kailin_Bars/side_1778899776006.png",
      "assets/Kailin_Bars/side_1778899974082.png"
    ],
    starred: [
      "assets/Starred/Kailin_Starred/1b9b1f18c341198a56b1424243e2a963.mp4",
      "assets/Starred/Kailin_Starred/1dab5516fea6aebd5420375d4fd83fca.mp4",
      "assets/Starred/Kailin_Starred/02696f78a8c5ee60f9dcfe02d31e1faf.mp4",
      "assets/Starred/Kailin_Starred/3896f46f4df54f604631d14250de6556.mp4",
      "assets/Starred/Kailin_Starred/9075f791413e2ee73bf406f092ca29b0.mp4",
      "assets/Starred/Kailin_Starred/5355668ba00547c2198b482fc8b0c366.mp4",
      "assets/Starred/Kailin_Starred/c7dc85bf4e89f5af9459aa1ca34c6511.mp4",
      "assets/Starred/Kailin_Starred/c9639d1e8e34da3bc5c3023e9da6d5c0.mp4",
      "assets/Starred/Kailin_Starred/cdbefbaab14256a4ee2e77da9ed08b7d.mp4",
      "assets/Starred/Kailin_Starred/e84146083330b4b775c437262e8b427f.mp4"
    ]
  }
}
