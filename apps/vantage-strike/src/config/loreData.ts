// src/config/loreData.ts
// VANTAGE STRIKE universe lore — typed constants transcribed from
// plans/HIBABBBBBBBE.txt (universe bible). Gameplay data (themes,
// medals, classes) stays in gameData.ts / jobMedalData.ts.
// Convention: string-keyed records by hero name (like FACTIONS).

export interface CharacterLore {
  realName: string
  aliases: string[]
  role: string
  mech: string
  mechSpec: string
  philosophy: string
  hardcoreTenet: string
  background: string
  personality: string
  animeInspirations: string[]
  signatureClassId: string
  relationships: string
}

export const CHAR_LORE: Record<string, CharacterLore> = {
  Voltkin: {
    realName: 'Sera Raze',
    aliases: ['Rina "Volt" Kai'],
    role: 'Engineer, Shock Trooper, Artillery Specialist',
    mech: 'Rhino-L7 / Thunder-Wasp',
    mechSpec: 'Custom-built disruptor mech — modular turrets, deployable mines, a mobile forge for mid-battle crafting; EMP and electropulse shockwave warfare.',
    philosophy: 'Disruption for Fun / Disruption is Truth.',
    hardcoreTenet: 'Rebellion',
    background: 'Prodigy engineer and the first to join Ashbeam after the escape from Arcadia — she built her first wargear from the salvaged wreckage of their destroyed home.',
    personality: 'Energetic, foul-mouthed, and rebellious — the raw energy of chaos and individuality. Fiercely loyal to her "family" and the squad\'s primary mechanic.',
    animeInspirations: ['Yumeko (Kakegurui)', 'Mad Moxxi (Borderlands)'],
    signatureClassId: 'vanguard',
    relationships: 'Childhood best friend of Hellshift, their bond "forged in the fires of their destroyed home." First recruit under Ashbeam — teases Hellshift, breaks mechs, gets them repaired.'
  },
  Ashbeam: {
    realName: 'Kaori Tenjou',
    aliases: ['Elara Vahn'],
    role: 'Squad Leader, Tactical Commander, Sniper-Tactician',
    mech: 'Izanami S-Type',
    mechSpec: 'Sleek stealth unit — cloaking, a long-range railgun, and advanced terrain mapping systems for ghost-silent precision.',
    philosophy: 'The world is already burning. You either take the shot — or become the ash.',
    hardcoreTenet: 'Discipline — the "living Codex"',
    background: 'Assumed command after the squad\'s first mission during the Fall of Arcadia ended in disaster. A recon survivor of tactical brilliance, she carries intense secret guilt for the losses of the cataclysm.',
    personality: 'Stoic, cold, and calculating — leading through unwavering presence rather than volume. The "big sister" of the group, rarely wasting words.',
    animeInspirations: ['Re-L Mayer (Ergo Proxy)', 'Kallen Kozuki (Code Geass)', 'Yoo Mina (CounterSide)'],
    signatureClassId: 'tactician',
    relationships: 'Biological older sister of Hellshift. Founding survivor with Voltkin after the escape; quietly mentors Spectra\'s growth.'
  },
  Crypsis: {
    realName: 'Dr. Illya Voss',
    aliases: ['Often listed as Unknown'],
    role: 'Combat Economist, Resource Strategist, Logistics Commander',
    mech: 'Ledger-X7 / Nightshade-M',
    mechSpec: 'Minimalist recon-finance unit — AI projection, crypto-siphoning modules, and real-time asset tracking; strikes and vanishes behind optical camouflage.',
    philosophy: 'The true war is won through economic attrition, not brute strength.',
    hardcoreTenet: 'Surgical Focus',
    background: 'Former employee of a private economic warfare firm; defected after witnessing unethical resource depletion. Hired directly by Ashbeam as a detached, professional counterpoint to the trauma-bonded founders.',
    personality: 'Aloof, analytical, and surgical in thought and speech. Operates from behind the lines on data-driven decisions.',
    animeInspirations: [],
    signatureClassId: 'rogue',
    relationships: 'The "Outsider" — hired, not a survivor of the Fall of Arcadia. Her loyalty to leadership is based on "witnessed proof," not trauma-forged bonds.'
  },
  Spectra: {
    realName: 'Minami Yurei',
    aliases: ['Lyra Solsana'],
    role: 'Scout, Close-Quarters Operative, Support/Psionic Specialist',
    mech: 'Kage-9 / Aegis-Unit',
    mechSpec: 'Agile "ghost dancer" — energy blades, wall-running, and reactive stealth plating; generates energy shields and psionic fields to protect allies.',
    philosophy: 'Embody the ability to see the hidden truths and strike at the heart of what matters most.',
    hardcoreTenet: 'Spiritual Resilience',
    background: 'Rescued by the squad after being abandoned in a ruined arcology. Hailing from Caelith Prime, she carries deep spiritual roots and the moral compass that anchors the squad.',
    personality: 'Quiet, poetic, and empathic — speaks in riddles and moves like a shadow. Teaches the squad the importance of understanding loss.',
    animeInspirations: [],
    signatureClassId: 'mystic',
    relationships: 'The "middle sibling" and mediator. Pre-squad duo with Kailin — they fled their pasts and survived the wastes together. Trained by Hellshift; quietly mentored by Ashbeam.'
  },
  Hellshift: {
    realName: 'Ryo Kazama',
    aliases: ['Kael Vahn'],
    role: 'Vanguard, Heavy Assault, Recon-Strike Hybrid',
    mech: 'Cerberus Mk-X',
    mechSpec: 'Lithe, panther-like transforming mech — deep crimson plating, twin plasma blades, and high-speed boosters for vertical terrain control and ambushes.',
    philosophy: 'Endure loss and transform it into unshakable resolve.',
    hardcoreTenet: 'Resilience',
    background: 'Younger brother of Ashbeam. After losing his family to a rogue faction during the Fall of Arcadia, he found a second chance at family within the squad.',
    personality: 'Brave and intense with a protective "big brother" energy — channels grief into protective fury. A tactical mind sharpened by loss.',
    animeInspirations: [],
    signatureClassId: 'brawler',
    relationships: 'Biological younger brother of Ashbeam. Childhood best friend of Voltkin — their bond "forged in the fires of their destroyed home." Actively trains Spectra to sharpen her combat skills.'
  },
  Kailin: {
    realName: 'Kailin',
    aliases: ['Formerly Halorise'],
    role: 'Assassin, Knight-Errant',
    mech: 'Wraith-Blade',
    mechSpec: 'High-speed, lightweight duelist mech armed with "Vantage"-tech blades for high-stakes, precise assassinations.',
    philosophy: 'Heresy and self-liberation — reject old systems and define your own path to mastery.',
    hardcoreTenet: 'Defiance',
    background: 'A Knight-Errant who abandoned his title after uncovering a "great betrayal" within his corrupt Iron Order on Caelith Prime.',
    personality: 'A "heretic" who has rejected old systems to define his own path toward mastery — the individual\'s journey outside failed systems.',
    animeInspirations: [],
    signatureClassId: 'executor',
    relationships: 'Forged a bond with Spectra as they fled their pasts and survived the wastes together — the Caelith Prime duo.'
  }
}

// ─── Codex doctrine ─────────────────────────────────────────────
export interface CodexPillar {
  title: string
  subtitle: string
  verse: string
  essence: string
  triad: string[]
}

export const CODEX: Record<'vantage' | 'strike' | 'unyieldingEdge', CodexPillar> = {
  vantage: {
    title: 'VANTAGE',
    subtitle: 'Clarity. Control. Vision.',
    verse: 'To have vantage is to rise above the noise, to see through the storm. You\'re not lost in the chaos — you\'re the one who shapes it.',
    essence: 'Gnosis — the perfect internal state',
    triad: ['Clarity', 'Control', 'Vision']
  },
  strike: {
    title: 'STRIKE',
    subtitle: 'Precision. Power. Relentless.',
    verse: 'A strike is one perfect, decisive moment — where every ounce of force converges in an instant. When the hammer falls, it falls with meaning, and the world is forced to listen.',
    essence: 'Praxis — the resultant external force',
    triad: ['Precision', 'Power', 'Relentless']
  },
  unyieldingEdge: {
    title: 'VANTAGE STRIKE',
    subtitle: 'The Unyielding Edge',
    verse: 'The embodiment of clarity and power. A warrior\'s philosophy for transforming the internal self — stand firm, never compromise, and push forward with indomitable resolve.',
    essence: 'The synthesis of Gnosis and Praxis',
    triad: ['Mental', 'Physical', 'Tactical']
  }
}

// ─── Cosmology ──────────────────────────────────────────────────
export interface WorldLore {
  name: string
  role: string
  description: string
  symbolism: string
}

export const WORLDS: WorldLore[] = [
  {
    name: 'Arcadia',
    role: 'The Lost World',
    description: 'A techno-civilization addicted to optics, bureaucracy, and consensus — a once-idyllic utopia that hollowed itself out spiritually before its collapse.',
    symbolism: 'The shattered ordinary world; stale, hollow systems that must fall'
  },
  {
    name: 'The Obsidian Depths',
    role: 'The Crucible',
    description: 'The realm beneath Arcadia and the lair of The Forgeman — the abyss where the squad descends to confront ego, ignorance, and chaos.',
    symbolism: '"Belly of the whale" — the rite of passage that forges self-mastery'
  },
  {
    name: 'Obsidia',
    role: 'The Reborn Order',
    description: 'The new world forged from the destruction — the elemental aether, the "waters of the universe," where the individual rises through their own efforts.',
    symbolism: 'Self-becoming made real; authenticity rising from the ashes'
  }
]

export const FALL_OF_ARCADIA = {
  title: 'The Fall of Arcadia',
  agent: 'The Forgeman',
  trueIdentity: 'Varek Ironwake — Scribe-General, Strategist, and Founder of VANTAGE STRIKE',
  method: 'He sent a signal through the planet\'s "ancient veins," halting all machinery and collapsing the towers. Arcadia fractured from within — no external invasion.',
  paradox: 'The Forgeman\'s Paradox: destruction is a principled, necessary sacrifice. A hollow system must be torn down for a more authentic order to emerge — and Obsidia was forged from the fall.'
}

// ─── W.A.R.G.E.A.R. ─────────────────────────────────────────────
export const WARGEAR = {
  tagline: 'Psycho-spiritual anchors — conduits that bridge a pilot\'s internal state and their external impact on the battlefield.',
  ratingMax: 99,
  ratingMeaning: 'The VANTAGE Rating measures how perfectly a pilot is aligned with their Core Essence and Purpose.',
  ninetyNineForms: 'Pushing the VANTAGE Rating to 97–99 triggers the 99 Forms (Overcore) — a temporary metamorphosis of heightened speed and power with a unique cosmetic change. The ultimate proof of personal sovereignty.',
  formsAesthetic: 'Metamorphosis in the style of Onee Chanbara / Warframe'
}

export const VEIL_KIN = {
  title: 'The Veil Kin',
  description: 'A dogmatic, militant-spiritual organization that suppresses self-becoming. Their Veil Lords hoard Vantage technology to enforce global stagnation — but without Core Essence, they can never reach a rating of 99.',
  shadow: 'They are the mythic Shadow — a mirror of the hero\'s own fears, suppressed knowledge, and potential weaknesses.'
}

// ─── Quotes & tenets ────────────────────────────────────────────
export const SQUAD_MANDATE = 'Strike only when it matters. Speak only when it cuts through noise. Command through presence, not volume.'
export const ASHBEAM_CREED = 'The world is already burning. You either take the shot — or become the ash.'
export const HARDCORE_TENETS = ['Discipline', 'Resilience', 'Rebellion', 'Loyalty']
