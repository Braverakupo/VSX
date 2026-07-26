// src/systems/gemSystem.js
// Pure gem logic — rolling, modifiers, naming, equip/unequip.
// No Vue imports. Receives entity data, returns results.

import { ALL_GEMS, GEMS_PER_COLOR, classDefinitions, GEM_MODIFIER_DEFS, STANDARD_BUFF_TYPES, charTemplates } from '../config/gameData.js'
import { GemEntity } from '../entities/GemEntity.js'
import { getGemClassDef, getModifierValue } from './combatSystem.js'

const STATS = ['Str', 'Spi', 'Int', 'Con', 'Dex']

/**
 * Roll random modifiers for a gem based on its tier.
 * Every gem gets:
 *   1. Guaranteed 1st: Completion/s — random stat target, random value 0.01-0.05
 *   2. Guaranteed 2 more standard buffs (random from pool excluding legendary)
 *   3. Chance rolls for 4th (80%), 5th (50%), 6th (25%) — random standard buffs, stops on first failure
 *   4. Separate 5% chance each for legendary 7th-slot: vantageCapBoost, statPerCompletion
 * @param {Object} gem - GemEntity
 * @returns {Array<{type: string, value: number, targetStat?: string}>}
 */
export function rollModifiers(gem) {
  const rolled = []

  // ── 1. Guaranteed first stat: Completion/s ──
  // Random stat target, equal 20% chance for .01 / .02 / .03 / .04 / .05
  const targetStat = STATS[Math.floor(Math.random() * STATS.length)]
  const completionOptions = [0.01, 0.02, 0.03, 0.04, 0.05]
  const completionValue = completionOptions[Math.floor(Math.random() * completionOptions.length)]
  rolled.push({ type: 'completionStat', value: completionValue, targetStat })

  // Helper: roll a random standard buff with tier scaling (discrete for preferredStatBonus)
  function rollStandardBuff() {
    const type = STANDARD_BUFF_TYPES[Math.floor(Math.random() * STANDARD_BUFF_TYPES.length)]
    const def = GEM_MODIFIER_DEFS[type]
    if (!def) return null
    // preferredStatBonus uses discrete values .05-.09 with equal 20% chance
    if (type === 'preferredStatBonus') {
      const options = [0.05, 0.06, 0.07, 0.08, 0.09]
      return { type, value: options[Math.floor(Math.random() * options.length)] }
    }
    const value = def.base + (gem.tier - 1) * def.perTier
    return { type, value: Math.round(value * 10000) / 10000 }
  }

  // ── 2. Guaranteed 2 standard buffs (slots 2-3) ──
  for (let i = 0; i < 2; i++) {
    const buff = rollStandardBuff()
    if (buff) rolled.push(buff)
  }

  // ── 3. Chance rolls for 4th, 5th, 6th (stops on first failure) ──
  const extraChances = [0.8, 0.5, 0.25]
  for (const chance of extraChances) {
    if (Math.random() < chance) {
      const buff = rollStandardBuff()
      if (buff) rolled.push(buff)
    } else {
      break
    }
  }

  // ── 4. Legendary 7th slot: vantageCapBoost (5% chance) ──
  if (Math.random() < 0.05) {
    const value = Math.floor(Math.random() * 6) + 5
    rolled.push({ type: 'vantageCapBoost', value })
  }

  // ── 5. Legendary 7th slot: statPerCompletion / Mystic Aura (5% chance) ──
  if (Math.random() < 0.05) {
    rolled.push({ type: 'statPerCompletion', value: 0.10 })
  }

  return rolled
}

/**
 * Generate a human-readable gem name based on color, tier, and class.
 * @param {Object} gem - GemEntity
 * @returns {string}
 */
export function generateGemName(gem) {
  const classDef = getGemClassDef(gem)
  if (classDef) {
    return classDef.name
  }
  const colorLabels = {
    reds: 'Ruby', blues: 'Sapphire', oranges: 'Topaz',
    cyans: 'Aquamarine', purples: 'Amethyst', blacks: 'Onyx'
  }
  const colorLabel = colorLabels[gem.color] || gem.color
  const tierLabels = ["", "Lesser ", "Greater ", "Superior ", "Flawless ", "Perfect "]
  const prefix = tierLabels[gem.tier] || `T${gem.tier} `
  const suffixes = ["Gem", "Jewel", "Orb", "Materia", "Core", "Essence"]
  const suffix = suffixes[gem.gemIdx % suffixes.length] || "Gem"
  return prefix + suffix + " of " + colorLabel
}

/**
 * Roll a random class weighted by each class's weight.
 * @returns {string|null}
 */
export function rollAbilityForColor() {
  const pool = classDefinitions
  if (pool.length === 0) return null
  const totalWeight = pool.reduce((s, c) => s + c.weight, 0)
  let roll = Math.random() * totalWeight
  for (const cls of pool) {
    roll -= cls.weight
    if (roll <= 0) return cls.id
  }
  return pool[pool.length - 1].id
}

/**
 * Get a gem's DPS for comparison/sorting.
 * @param {Object} gem - GemEntity
 * @returns {number}
 */
export function getGemDPS(gem) {
  if (!gem || !gem.dmg || !gem.cd) return 0
  return gem.dmg / gem.cd
}

/**
 * Auto-dismantle: sort all non-equipped gems by DPS, keep top `keepCount`.
 * @param {Object} collectedGems - InventoryEntity
 * @param {Object} heroRegistry - { heroName: CharacterEntity }
 * @param {number} [keepCount=70]
 * @returns {number} number dismantled
 */
export function autoDismantleGems(collectedGems, heroRegistry, keepCount = 70) {
  const equippedIds = new Set()
  for (const name of Object.keys(heroRegistry)) {
    const hero = heroRegistry[name]
    if (!hero || !hero.gemSlots) continue
    for (const gemId of hero.gemSlots) {
      if (gemId) equippedIds.add(gemId)
    }
  }

  const allGems = collectedGems.getAll()
  const unequipped = allGems
    .filter(g => !equippedIds.has(g.id))
    .map(g => ({ gem: g, dps: getGemDPS(g) }))
    .sort((a, b) => b.dps - a.dps)

  const toDelete = unequipped.slice(keepCount)
  for (const { gem } of toDelete) {
    collectedGems.removeGem(gem.id)
  }
  return toDelete.length
}

/**
 * Auto-fill empty gem slots from global inventory using matching color gems.
 * @param {Object} heroRegistry
 * @param {Object} collectedGems - InventoryEntity
 */
export function autoEquipGems(heroRegistry, collectedGems) {
  const heroColorMap = {
    Voltkin: 'reds', Ashbeam: 'blues', Crypsis: 'oranges',
    Spectra: 'cyans', Hellshift: 'purples', Kailin: 'blacks'
  }
  for (const heroName of Object.keys(heroRegistry)) {
    const hero = heroRegistry[heroName]
    if (!hero) continue
    const color = heroColorMap[heroName]
    if (!color) continue

    const filledCount = hero.gemSlots.filter(s => s !== null).length
    if (filledCount >= GEMS_PER_COLOR) continue

    const equippedIds = new Set()
    for (const name of Object.keys(heroRegistry)) {
      const h = heroRegistry[name]
      if (h && h.gemSlots) {
        for (const gid of h.gemSlots) {
          if (gid) equippedIds.add(gid)
        }
      }
    }

    const availableGems = collectedGems.getAll()
      .filter(g => g.color === color && !equippedIds.has(g.id))

    for (let i = 0; i < hero.gemSlots.length && availableGems.length > 0; i++) {
      if (!hero.gemSlots[i]) {
        hero.gemSlots[i] = availableGems.shift().id
      }
    }
  }
}

/**
 * Auto-equip best gems for a specific hero from their personal inventory.
 * @param {string} heroName
 * @param {Object} heroRegistry
 * @returns {number} gems changed
 */
export function autoEquipCharGems(heroName, heroRegistry) {
  const hero = heroRegistry[heroName]
  if (!hero) return 0

  const heroCurrentIds = new Set(hero.gemSlots.filter(id => id !== null))
  const candidateGems = hero.inventory.getAll()
    .filter(g => heroCurrentIds.has(g.id) || hero.inventory.getGem(g.id) !== null)
    .map(g => ({ gem: g, dps: getGemDPS(g) }))
    .sort((a, b) => b.dps - a.dps)

  const bestGems = candidateGems.slice(0, GEMS_PER_COLOR)
  let changeCount = 0
  for (let i = 0; i < hero.gemSlots.length; i++) {
    if (hero.gemSlots[i] !== null) {
      hero.gemSlots[i] = null
      changeCount++
    }
  }
  let fillCount = 0
  for (let i = 0; i < hero.gemSlots.length && i < bestGems.length; i++) {
    hero.gemSlots[i] = bestGems[i].gem.id
    fillCount++
  }
  return fillCount
}

/**
 * Delete a gem from the entire game.
 * @param {string} gemId
 * @param {Object} heroRegistry
 * @param {Object} collectedGems - InventoryEntity
 */
export function deleteGem(gemId, heroRegistry, collectedGems) {
  if (!gemId) return
  for (const name of Object.keys(heroRegistry)) {
    const hero = heroRegistry[name]
    if (!hero || !hero.gemSlots) continue
    const idx = hero.gemSlots.indexOf(gemId)
    if (idx !== -1) hero.gemSlots[idx] = null
  }
  collectedGems.removeGem(gemId)
  for (const name of Object.keys(heroRegistry)) {
    const hero = heroRegistry[name]
    if (hero && hero.inventory) {
      hero.inventory.removeGem(gemId)
    }
  }
}

/**
 * Equip a gem to a hero's slot.
 * @param {string} heroName
 * @param {number} slotIndex
 * @param {string} gemId
 * @param {Object} heroRegistry
 * @returns {boolean}
 */
export function equipGem(heroName, slotIndex, gemId, heroRegistry) {
  const hero = heroRegistry[heroName]
  if (!hero) return false
  const gem = hero.inventory.getGem(gemId)
  if (!gem) return false

  const existingIdx = hero.gemSlots.indexOf(gemId)
  if (existingIdx !== -1) {
    const temp = hero.gemSlots[existingIdx]
    hero.gemSlots[existingIdx] = hero.gemSlots[slotIndex]
    hero.gemSlots[slotIndex] = temp
  } else {
    hero.gemSlots[slotIndex] = gemId
  }
  return true
}

/**
 * Unequip a gem from a hero's slot.
 * @param {string} heroName
 * @param {number} slotIndex
 * @param {Object} heroRegistry
 */
export function unequipGem(heroName, slotIndex, heroRegistry) {
  const hero = heroRegistry[heroName]
  if (!hero) return
  hero.gemSlots[slotIndex] = null
}

/**
 * Move a gem between hero slots (drag & drop).
 * @param {string} fromHero
 * @param {number} fromSlot
 * @param {string} toHero
 * @param {number} toSlot
 * @param {Object} heroRegistry
 * @returns {boolean}
 */
export function moveGem(fromHero, fromSlot, toHero, toSlot, heroRegistry) {
  const from = heroRegistry[fromHero]
  const to = heroRegistry[toHero]
  if (!from || !to) return false
  const temp = from.gemSlots[fromSlot]
  from.gemSlots[fromSlot] = to.gemSlots[toSlot]
  to.gemSlots[toSlot] = temp
  return true
}
