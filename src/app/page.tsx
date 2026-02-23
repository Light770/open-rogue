'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

// ==================== TYPES ====================
interface Vector2 {
  x: number
  y: number
}

interface Entity {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  active: boolean
}

interface Player extends Entity {
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  attackCooldown: number
  dashCooldown: number
  invincibleTime: number
  damage: number
  speed: number
  level: number
  xp: number
  xpToNext: number
  facing: Vector2
  isAttacking: boolean
  attackFrame: number
  souls: number
  hasKey: boolean
  combo: number
  comboTimer: number
  critChance: number
}

interface Enemy extends Entity {
  type: EnemyType
  health: number
  maxHealth: number
  damage: number
  speed: number
  attackCooldown: number
  state: EnemyState
  stateTimer: number
  targetX: number
  targetY: number
  xpValue: number
  color: string
  isBoss: boolean
  phase?: number
  specialAttackTimer?: number
  attackPattern?: number
  alertOthers?: boolean
  lastSeenPlayerX?: number
  lastSeenPlayerY?: number
  wanderAngle?: number
  chargeTarget?: Vector2
  teleportCooldown?: number
  spawnCooldown?: number
  // Room-based system
  homeRoomIndex?: number
  isAwake?: boolean
  // Telegraph system
  telegraphTimer?: number
  telegraphType?: string
  telegraphAngle?: number
  telegraphSize?: number
  // Pattern system
  pattern?: EnemyPattern
  // Movement constraints
  roomBounds?: { minX: number; minY: number; maxX: number; maxY: number }
}

interface Projectile {
  x: number
  y: number
  velocityX: number
  velocityY: number
  damage: number
  active: boolean
  fromPlayer: boolean
  size: number
  color: string
  lifetime: number
}

interface Item {
  x: number
  y: number
  type: ItemType
  active: boolean
}

interface Particle {
  x: number
  y: number
  velocityX: number
  velocityY: number
  life: number
  maxLife: number
  color: string
  size: number
}

interface FloatingText {
  x: number
  y: number
  text: string
  color: string
  life: number
  maxLife: number
  velocityY: number
}

interface Room {
  x: number
  y: number
  width: number
  height: number
  type: RoomType
  visited: boolean
}

interface Tile {
  type: TileType
  revealed: boolean
}

type TileType = 'wall' | 'floor' | 'door' | 'stairs' | 'water' | 'lava'
type RoomType = 'start' | 'normal' | 'treasure' | 'boss' | 'secret'
type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'special' | 'dormant' | 'telegraph' | 'recover'
type EnemyType = 'skeleton' | 'slime' | 'spider' | 'wraith' | 'bone_knight' | 'shadow_bat' | 'corrupted_soul' | 'void_walker' | 'abyss_terror' | 'boss_grak' | 'boss_seraphine' | 'boss_malachar'
type ItemType = 'health_potion' | 'mana_potion' | 'key' | 'sword_upgrade' | 'soul_essence' | 'armor' | 'speed_boost'

// ==================== NEW ITEM & SKILL SYSTEM TYPES ====================

// Item rarity levels
type ItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'curse'

// Item categories
type ItemCategory = 'weapon' | 'artifact' | 'curse' | 'consumable' | 'trinket'

// Skill branches
type SkillBranch = 'warlord' | 'spellblade' | 'shadow'

// Interface for game items with full properties
interface GameItem {
  id: string
  name: string
  category: ItemCategory
  rarity: ItemRarity
  description: string
  icon: string // emoji or icon identifier
  effects: ItemEffect[]
  synergies?: string[] // names of items this synergizes with
  synergyEffect?: string // description of synergy bonus
}

// Item effects
interface ItemEffect {
  type: 'stat_modifier' | 'on_hit' | 'on_kill' | 'on_damage_taken' | 'passive' | 'active'
  stat?: 'damage' | 'speed' | 'maxHealth' | 'maxMana' | 'critChance' | 'attackSpeed' | 'lifesteal' | 'dodge' | 'armor'
  value?: number
  operation?: 'add' | 'multiply' | 'set'
  trigger?: string
}

// Skill definition
interface Skill {
  id: string
  name: string
  branch: SkillBranch
  tier: number // 1, 2, or 3
  cost: number
  description: string
  icon: string
  effects: SkillEffect[]
  requires?: string[] // skill ids that must be unlocked first
}

// Skill effects
interface SkillEffect {
  type: 'stat_modifier' | 'ability' | 'passive'
  stat?: 'damage' | 'speed' | 'maxHealth' | 'maxMana' | 'critChance' | 'attackSpeed' | 'lifesteal' | 'dodge' | 'armor' | 'manaCost' | 'xpGain'
  value?: number
  operation?: 'add' | 'multiply' | 'set'
  trigger?: string
  special?: string // for unique abilities
}

// Player inventory
interface Inventory {
  weapon: GameItem | null
  artifacts: (GameItem | null)[] // 3 slots
  trinket: GameItem | null
  curse: GameItem | null
  consumables: (GameItem | null)[] // 4 slots
  backpack: GameItem[] // 8 slots
}

// Player skills
interface PlayerSkills {
  points: number
  unlocked: string[] // skill ids
}

// Synergy state
interface ActiveSynergy {
  name: string
  items: string[]
  effect: string
}

// Enemy pattern for learnable behaviors
interface EnemyPattern {
  step: number
  timer: number
  direction: Vector2
  targetPos: Vector2
}

type GameState = 'menu' | 'intro' | 'playing' | 'paused' | 'dialogue' | 'level_complete' | 'game_over' | 'victory'

// ==================== CONSTANTS ====================
const TILE_SIZE = 32
const MAP_WIDTH = 60
const MAP_HEIGHT = 40

const COLORS = {
  wall: '#1a1a2e',
  wallHighlight: '#2d2d44',
  floor: '#16213e',
  floorAlt: '#1a2744',
  player: '#e94560',
  playerGlow: '#ff6b6b',
  stairs: '#ffd700',
  door: '#8b4513',
  water: '#1e90ff',
  lava: '#ff4500',
  fog: '#0a0a0f',
  ui: {
    background: 'rgba(0, 0, 0, 0.8)',
    health: '#e94560',
    mana: '#4da6ff',
    xp: '#ffd700',
    text: '#ffffff',
    accent: '#e94560'
  }
}

const STORY = {
  intro: [
    "Centuries ago, the kingdom of Eldoria stood as a beacon of light",
    "in a world cloaked in shadow. But greed led the king's mages",
    "to open the Abyss Gate, seeking forbidden power.",
    "",
    "What emerged was MALACHAR, the Abyss Lord.",
    "In a single night, the kingdom fell.",
    "",
    "Only the Shadow Knights stood against him.",
    "Now, only one remains.",
    "",
    "You are KIRA, last of your order.",
    "The Gate must be sealed...",
    "or all will be consumed by darkness."
  ],
  floors: {
    1: "THE DUNGEONS\nWhere the kingdom's prisoners once rotted, now crawling with undead.",
    4: "THE CATACOMBS\nAncient tombs desecrated by Malachar's influence.",
    7: "THE ABYSS DEPTHS\nReality itself bends here, close to the Gate.",
    10: "THE ABYSS THRONE\nMalachar's domain, where the Gate awaits."
  },
  bosses: {
    grak: "The Jailer still keeps his keys... even in death.",
    seraphine: "Once the king's most trusted advisor, now bound to the Abyss forever.",
    malachar: "You dare challenge me, mortal? I have consumed empires!"
  },
  victory: "The Gate is sealed. Malachar's essence disperses into the void.\nEldoria is avenged, and the world is safe... for now.\nBut darkness never truly dies. It merely waits.",
  defeat: "Another Shadow Knight falls. The Gate remains open,\nand the world slowly succumbs to the Abyss...\nBut hope persists. Another will rise."
}

// Enemy speeds are now multiplied by 80 for pixel-per-second movement
const ENEMY_DATA: Record<EnemyType, { health: number; damage: number; speed: number; xp: number; color: string }> = {
  skeleton: { health: 30, damage: 8, speed: 120, xp: 15, color: '#d4d4aa' },
  slime: { health: 20, damage: 5, speed: 100, xp: 10, color: '#44ff44' },
  spider: { health: 25, damage: 10, speed: 200, xp: 20, color: '#8800aa' },
  wraith: { health: 40, damage: 15, speed: 140, xp: 30, color: '#8888ff' },
  bone_knight: { health: 60, damage: 20, speed: 100, xp: 40, color: '#aaaaaa' },
  shadow_bat: { health: 15, damage: 8, speed: 180, xp: 15, color: '#330033' },
  corrupted_soul: { health: 50, damage: 18, speed: 130, xp: 45, color: '#ff44ff' },
  void_walker: { health: 70, damage: 25, speed: 150, xp: 55, color: '#4400aa' },
  abyss_terror: { health: 90, damage: 30, speed: 110, xp: 70, color: '#aa0044' },
  boss_grak: { health: 300, damage: 25, speed: 90, xp: 200, color: '#aa6600' },
  boss_seraphine: { health: 400, damage: 30, speed: 120, xp: 300, color: '#aa88ff' },
  boss_malachar: { health: 600, damage: 40, speed: 100, xp: 500, color: '#440044' }
}

// ==================== ITEM DATABASE ====================
const ITEM_DATABASE: GameItem[] = [
  // === WEAPONS ===
  {
    id: 'twin_blades',
    name: 'Twin Blades',
    category: 'weapon',
    rarity: 'rare',
    description: 'Attack twice for 60% damage each. Speed over power.',
    icon: '⚔️',
    effects: [
      { type: 'passive', special: 'twin_strike' }
    ]
  },
  {
    id: 'heavy_cleaver',
    name: 'Heavy Cleaver',
    category: 'weapon',
    rarity: 'rare',
    description: '+80% damage, -50% attack speed, cleaves nearby enemies.',
    icon: '🪓',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 0.8, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'attackSpeed', value: 0.5, operation: 'multiply' },
      { type: 'passive', special: 'cleave' }
    ]
  },
  {
    id: 'rapier',
    name: 'Rapier',
    category: 'weapon',
    rarity: 'rare',
    description: '+40% attack speed, -20% damage, +30% crit chance.',
    icon: '🗡️',
    effects: [
      { type: 'stat_modifier', stat: 'attackSpeed', value: 0.4, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'damage', value: -0.2, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'critChance', value: 0.3, operation: 'add' }
    ]
  },
  {
    id: 'soul_reaper',
    name: 'Soul Reaper',
    category: 'weapon',
    rarity: 'legendary',
    description: 'Killed enemies drop soul orbs that heal and restore mana.',
    icon: '💀',
    effects: [
      { type: 'on_kill', special: 'soul_orbs' }
    ],
    synergies: ['soul_harvester'],
    synergyEffect: 'Soul orbs restore 5 mana each'
  },
  {
    id: 'void_edge',
    name: 'Void Edge',
    category: 'weapon',
    rarity: 'legendary',
    description: 'Attacks ignore 50% of enemy defense.',
    icon: '🌑',
    effects: [
      { type: 'passive', special: 'armor_penetration', value: 0.5 }
    ]
  },
  {
    id: 'blood_debt',
    name: 'Blood Debt',
    category: 'weapon',
    rarity: 'legendary',
    description: '+50% damage, but lose 1 HP per attack.',
    icon: '🩸',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 0.5, operation: 'multiply' },
      { type: 'on_hit', special: 'self_damage', value: 1 }
    ],
    synergies: ['vampire_fang'],
    synergyEffect: 'Lifesteal increased to 25% and offsets Blood Debt HP loss'
  },

  // === ARTIFACTS ===
  {
    id: 'rage_stone',
    name: 'Rage Stone',
    category: 'artifact',
    rarity: 'rare',
    description: 'Every 5th attack deals 200% damage.',
    icon: '🔴',
    effects: [
      { type: 'passive', special: 'combo_damage', trigger: '5', value: 2 }
    ]
  },
  {
    id: 'echo_amulet',
    name: 'Echo Amulet',
    category: 'artifact',
    rarity: 'rare',
    description: '20% chance for attacks to chain to a nearby enemy.',
    icon: '📿',
    effects: [
      { type: 'on_hit', special: 'chain_attack', value: 0.2 }
    ],
    synergies: ['twin_blades'],
    synergyEffect: 'Each blade hit can chain independently'
  },
  {
    id: 'shield_charm',
    name: 'Shield Charm',
    category: 'artifact',
    rarity: 'rare',
    description: 'Block the first hit each room. Recharges between rooms.',
    icon: '🛡️',
    effects: [
      { type: 'passive', special: 'room_shield' }
    ]
  },
  {
    id: 'thorn_mail',
    name: 'Thorn Mail',
    category: 'artifact',
    rarity: 'rare',
    description: 'Reflect 25% of damage taken back to the attacker.',
    icon: '🌿',
    effects: [
      { type: 'on_damage_taken', special: 'thorns', value: 0.25 }
    ]
  },
  {
    id: 'vampire_fang',
    name: 'Vampire Fang',
    category: 'artifact',
    rarity: 'legendary',
    description: 'Lifesteal 10% of damage dealt.',
    icon: '🦷',
    effects: [
      { type: 'stat_modifier', stat: 'lifesteal', value: 0.1, operation: 'add' }
    ],
    synergies: ['blood_debt', 'berserker'],
    synergyEffect: 'Blood Baron: Lifesteal 25% and survive fatal blow once'
  },
  {
    id: 'hourglass',
    name: 'Hourglass',
    category: 'artifact',
    rarity: 'legendary',
    description: 'First 3 seconds in each room: time slows 50% for enemies.',
    icon: '⏳',
    effects: [
      { type: 'passive', special: 'time_slow', value: 3 }
    ]
  },
  {
    id: 'chaos_orb',
    name: 'Chaos Orb',
    category: 'artifact',
    rarity: 'legendary',
    description: 'Random powerful buff each room (attack/speed/defense/mana).',
    icon: '🔮',
    effects: [
      { type: 'passive', special: 'random_buff' }
    ]
  },

  // === CURSES ===
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    category: 'curse',
    rarity: 'curse',
    description: '+100% damage, but maximum HP becomes 2.',
    icon: '💥',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 1, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'maxHealth', value: 2, operation: 'set' }
    ],
    synergies: ['last_stand', 'evasion'],
    synergyEffect: 'Speed Demon: +150% total damage with speed buffs'
  },
  {
    id: 'berserkers_pact',
    name: "Berserker's Pact",
    category: 'curse',
    rarity: 'curse',
    description: '+150% damage, but cannot heal by any means.',
    icon: '😤',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 1.5, operation: 'multiply' },
      { type: 'passive', special: 'no_healing' }
    ]
  },
  {
    id: 'fragile_ego',
    name: 'Fragile Ego',
    category: 'curse',
    rarity: 'curse',
    description: 'Double all stats, but taking damage halves them for 5 seconds.',
    icon: '💔',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 2, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'speed', value: 2, operation: 'multiply' },
      { type: 'on_damage_taken', special: 'stat_halve', value: 5 }
    ]
  },
  {
    id: 'debt_collector',
    name: 'Debt Collector',
    category: 'curse',
    rarity: 'curse',
    description: 'Start with 500 souls, lose 50 per room cleared.',
    icon: '💰',
    effects: [
      { type: 'passive', special: 'soul_debt', value: 500 }
    ]
  },
  {
    id: 'double_edge',
    name: 'Double Edge',
    category: 'curse',
    rarity: 'curse',
    description: '+50% damage dealt, +30% damage taken.',
    icon: '⚡',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 0.5, operation: 'multiply' },
      { type: 'passive', special: 'damage_vulnerability', value: 0.3 }
    ]
  },

  // === CONSUMABLES ===
  {
    id: 'bomb',
    name: 'Bomb',
    category: 'consumable',
    rarity: 'common',
    description: 'Deal 100 damage to all enemies in a radius.',
    icon: '💣',
    effects: [
      { type: 'active', special: 'explosion', value: 100 }
    ]
  },
  {
    id: 'teleport_stone',
    name: 'Teleport Stone',
    category: 'consumable',
    rarity: 'common',
    description: 'Instantly teleport to a random safe location.',
    icon: '💠',
    effects: [
      { type: 'active', special: 'teleport' }
    ]
  },
  {
    id: 'freeze_scroll',
    name: 'Freeze Scroll',
    category: 'consumable',
    rarity: 'uncommon',
    description: 'Freeze all enemies in the room for 3 seconds.',
    icon: '❄️',
    effects: [
      { type: 'active', special: 'freeze_all', value: 3 }
    ]
  },
  {
    id: 'polymorph_potion',
    name: 'Polymorph Potion',
    category: 'consumable',
    rarity: 'rare',
    description: 'Transform the strongest enemy into a weak slime.',
    icon: '🧪',
    effects: [
      { type: 'active', special: 'polymorph' }
    ]
  },
  {
    id: 'summon_scroll',
    name: 'Scroll of Summoning',
    category: 'consumable',
    rarity: 'rare',
    description: 'Summon a friendly skeleton ally for this floor.',
    icon: '📜',
    effects: [
      { type: 'active', special: 'summon_ally' }
    ]
  },
  {
    id: 'blank_scroll',
    name: 'Blank Scroll',
    category: 'consumable',
    rarity: 'legendary',
    description: 'Copy the last consumable you used this floor.',
    icon: '📋',
    effects: [
      { type: 'active', special: 'copy_consumable' }
    ]
  },

  // === TRINKETS ===
  {
    id: 'iron_shard',
    name: 'Iron Shard',
    category: 'trinket',
    rarity: 'common',
    description: '+5 maximum HP.',
    icon: '🔷',
    effects: [
      { type: 'stat_modifier', stat: 'maxHealth', value: 5, operation: 'add' }
    ]
  },
  {
    id: 'swift_feather',
    name: 'Swift Feather',
    category: 'trinket',
    rarity: 'common',
    description: '+3% movement speed.',
    icon: '🪶',
    effects: [
      { type: 'stat_modifier', stat: 'speed', value: 0.03, operation: 'add' }
    ]
  },
  {
    id: 'lucky_coin',
    name: 'Lucky Coin',
    category: 'trinket',
    rarity: 'common',
    description: '+2% critical hit chance.',
    icon: '🪙',
    effects: [
      { type: 'stat_modifier', stat: 'critChance', value: 0.02, operation: 'add' }
    ]
  },
  {
    id: 'mana_gem',
    name: 'Mana Gem',
    category: 'trinket',
    rarity: 'common',
    description: '+5 maximum mana.',
    icon: '💎',
    effects: [
      { type: 'stat_modifier', stat: 'maxMana', value: 5, operation: 'add' }
    ]
  },
  {
    id: 'soul_fragment',
    name: 'Soul Fragment',
    category: 'trinket',
    rarity: 'uncommon',
    description: '+10% XP gain from kills.',
    icon: '✨',
    effects: [
      { type: 'stat_modifier', stat: 'xpGain', value: 0.1, operation: 'add' }
    ]
  },
  {
    id: 'sharp_stone',
    name: 'Sharp Stone',
    category: 'trinket',
    rarity: 'uncommon',
    description: '+3 base damage.',
    icon: '🪨',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 3, operation: 'add' }
    ]
  }
]

// ==================== SKILL TREE DATABASE ====================
const SKILL_DATABASE: Skill[] = [
  // === WARLORD BRANCH (Strength/Melee) ===
  {
    id: 'heavy_strikes',
    name: 'Heavy Strikes',
    branch: 'warlord',
    tier: 1,
    cost: 1,
    description: '+25% damage, -10% attack speed.',
    icon: '💪',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 0.25, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'attackSpeed', value: -0.1, operation: 'multiply' }
    ]
  },
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    branch: 'warlord',
    tier: 1,
    cost: 2,
    description: 'Heal 5% of damage dealt.',
    icon: '🩸',
    effects: [
      { type: 'stat_modifier', stat: 'lifesteal', value: 0.05, operation: 'add' }
    ]
  },
  {
    id: 'fortress',
    name: 'Fortress',
    branch: 'warlord',
    tier: 1,
    cost: 1,
    description: '+30% max HP, -15% speed.',
    icon: '🏰',
    effects: [
      { type: 'stat_modifier', stat: 'maxHealth', value: 0.3, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'speed', value: -0.15, operation: 'multiply' }
    ]
  },
  {
    id: 'berserker',
    name: 'Berserker',
    branch: 'warlord',
    tier: 2,
    cost: 2,
    description: '+50% damage when below 30% HP.',
    icon: '😠',
    effects: [
      { type: 'passive', special: 'low_hp_damage', trigger: '0.3', value: 0.5 }
    ],
    requires: ['heavy_strikes']
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    branch: 'warlord',
    tier: 2,
    cost: 2,
    description: 'Reduce all damage taken by 20%.',
    icon: '🛡️',
    effects: [
      { type: 'stat_modifier', stat: 'armor', value: 0.2, operation: 'add' }
    ],
    requires: ['fortress']
  },
  {
    id: 'last_stand',
    name: 'Last Stand',
    branch: 'warlord',
    tier: 3,
    cost: 3,
    description: 'Survive a fatal blow once per floor.',
    icon: '⚡',
    effects: [
      { type: 'ability', special: 'cheat_death' }
    ],
    requires: ['berserker', 'iron_will']
  },

  // === SPELLBLADE BRANCH (Magic Hybrid) ===
  {
    id: 'arcane_strike',
    name: 'Arcane Strike',
    branch: 'spellblade',
    tier: 1,
    cost: 1,
    description: 'Attacks cost 5 mana but deal +50% damage.',
    icon: '✴️',
    effects: [
      { type: 'passive', special: 'mana_attack', value: 5 },
      { type: 'stat_modifier', stat: 'damage', value: 0.5, operation: 'multiply' }
    ]
  },
  {
    id: 'mana_siphon',
    name: 'Mana Siphon',
    branch: 'spellblade',
    tier: 1,
    cost: 2,
    description: 'Restore 3 mana per hit.',
    icon: '💧',
    effects: [
      { type: 'on_hit', special: 'mana_gain', value: 3 }
    ]
  },
  {
    id: 'soul_harvester',
    name: 'Soul Harvester',
    branch: 'spellblade',
    tier: 1,
    cost: 1,
    description: 'Gain 2 mana per enemy kill.',
    icon: '👻',
    effects: [
      { type: 'on_kill', special: 'mana_on_kill', value: 2 }
    ]
  },
  {
    id: 'elemental_blade',
    name: 'Elemental Blade',
    branch: 'spellblade',
    tier: 2,
    cost: 2,
    description: '25% chance to inflict burn, freeze, or shock.',
    icon: '🔥',
    effects: [
      { type: 'on_hit', special: 'elemental_effect', value: 0.25 }
    ],
    requires: ['arcane_strike']
  },
  {
    id: 'spell_echo',
    name: 'Spell Echo',
    branch: 'spellblade',
    tier: 2,
    cost: 3,
    description: '15% chance to attack twice instantly.',
    icon: '🔁',
    effects: [
      { type: 'passive', special: 'double_attack', value: 0.15 }
    ],
    requires: ['mana_siphon']
  },
  {
    id: 'archmage',
    name: 'Archmage',
    branch: 'spellblade',
    tier: 3,
    cost: 2,
    description: '-30% mana costs for all abilities.',
    icon: '🧙',
    effects: [
      { type: 'stat_modifier', stat: 'manaCost', value: 0.3, operation: 'multiply' }
    ],
    requires: ['elemental_blade', 'spell_echo']
  },

  // === SHADOW BRANCH (Agility/Utility) ===
  {
    id: 'swift_feet',
    name: 'Swift Feet',
    branch: 'shadow',
    tier: 1,
    cost: 1,
    description: '+25% movement speed.',
    icon: '👟',
    effects: [
      { type: 'stat_modifier', stat: 'speed', value: 0.25, operation: 'multiply' }
    ]
  },
  {
    id: 'shadow_step',
    name: 'Shadow Step',
    branch: 'shadow',
    tier: 1,
    cost: 2,
    description: 'Dash has 2 charges and 50% less cooldown.',
    icon: '👤',
    effects: [
      { type: 'ability', special: 'double_dash' }
    ]
  },
  {
    id: 'evasion',
    name: 'Evasion',
    branch: 'shadow',
    tier: 1,
    cost: 2,
    description: '20% dodge chance.',
    icon: '💨',
    effects: [
      { type: 'stat_modifier', stat: 'dodge', value: 0.2, operation: 'add' }
    ]
  },
  {
    id: 'backstab',
    name: 'Backstab',
    branch: 'shadow',
    tier: 2,
    cost: 2,
    description: '+100% damage when attacking from behind.',
    icon: '🗡️',
    effects: [
      { type: 'passive', special: 'backstab_damage', value: 1 }
    ],
    requires: ['swift_feet']
  },
  {
    id: 'vanish',
    name: 'Vanish',
    branch: 'shadow',
    tier: 2,
    cost: 2,
    description: 'After killing an enemy, become invisible for 2 seconds.',
    icon: '🌫️',
    effects: [
      { type: 'on_kill', special: 'invisibility', value: 2 }
    ],
    requires: ['shadow_step']
  },
  {
    id: 'phantom',
    name: 'Phantom',
    branch: 'shadow',
    tier: 3,
    cost: 3,
    description: '10% chance to phase through any attack.',
    icon: '👻',
    effects: [
      { type: 'passive', special: 'phase_through', value: 0.1 }
    ],
    requires: ['backstab', 'vanish']
  }
]

// ==================== SYNERGY DEFINITIONS ====================
const SYNERGIES = [
  {
    name: 'Blood Baron',
    items: ['vampire_fang', 'blood_debt'],
    effect: 'Lifesteal increased to 25% and Blood Debt HP loss is nullified'
  },
  {
    name: 'Speed Demon',
    items: ['glass_cannon', 'swift_feet'],
    effect: 'Total damage bonus increased to +150%'
  },
  {
    name: 'Echo Chamber',
    items: ['echo_amulet', 'twin_blades'],
    effect: 'Each blade hit can chain to nearby enemies'
  },
  {
    name: 'Soul Engine',
    items: ['soul_harvester', 'soul_reaper'],
    effect: 'Soul orbs also restore 5 mana each'
  },
  {
    name: 'Blade Dancer',
    items: ['shadow_step', 'twin_blades'],
    effect: 'Dash hits all nearby enemies with both blades'
  },
  {
    name: 'Assassin King',
    items: ['backstab', 'rapier'],
    effect: 'Backstab hits are guaranteed criticals'
  },
  {
    name: 'Undying',
    items: ['last_stand', 'vampire_fang'],
    effect: 'When surviving fatal blow, heal to 50% HP'
  }
]

// ==================== UTILITY FUNCTIONS ====================
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function normalize(x: number, y: number): Vector2 {
  const len = Math.sqrt(x * x + y * y)
  return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 }
}

function rectsIntersect(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2
}

// ==================== DUNGEON GENERATOR ====================
class DungeonGenerator {
  tiles: Tile[][]
  rooms: Room[] = []
  seed: number

  constructor(seed: number) {
    this.seed = seed
    this.tiles = []
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.tiles[y] = []
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.tiles[y][x] = { type: 'wall', revealed: false }
      }
    }
  }

  generate(floor: number): { tiles: Tile[][], rooms: Room[], startX: number, startY: number, stairsX: number, stairsY: number } {
    const random = seededRandom(this.seed)
    this.rooms = []
    
    // Clear map
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.tiles[y][x] = { type: 'wall', revealed: false }
      }
    }

    // Generate rooms with guaranteed placement
    const numRooms = 8 + Math.floor(floor / 2)
    let stairsX = 0, stairsY = 0
    let startX = 0, startY = 0

    // Grid-based room placement for better distribution
    const gridCols = 4
    const gridRows = 3
    const cellWidth = Math.floor((MAP_WIDTH - 4) / gridCols)
    const cellHeight = Math.floor((MAP_HEIGHT - 4) / gridRows)
    
    const placedRooms: { room: Room; gridX: number; gridY: number }[] = []

    // Try to place at least one room per grid cell
    for (let gy = 0; gy < gridRows && this.rooms.length < numRooms; gy++) {
      for (let gx = 0; gx < gridCols && this.rooms.length < numRooms; gx++) {
        // Try multiple times to place a room in this cell
        for (let attempt = 0; attempt < 5; attempt++) {
          const width = 5 + Math.floor(random() * 4)
          const height = 5 + Math.floor(random() * 4)
          const x = 2 + gx * cellWidth + Math.floor(random() * (cellWidth - width - 2))
          const y = 2 + gy * cellHeight + Math.floor(random() * (cellHeight - height - 2))

          if (!this.roomOverlaps(x, y, width, height)) {
            const room: Room = {
              x, y, width, height,
              type: this.rooms.length === 0 ? 'start' : 'normal',
              visited: false
            }
            this.rooms.push(room)
            this.carveRoom(room)
            placedRooms.push({ room, gridX: gx, gridY: gy })
            break
          }
        }
      }
    }

    // Add extra rooms if needed
    for (let i = this.rooms.length; i < numRooms; i++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const width = 5 + Math.floor(random() * 5)
        const height = 5 + Math.floor(random() * 5)
        const x = 2 + Math.floor(random() * (MAP_WIDTH - width - 4))
        const y = 2 + Math.floor(random() * (MAP_HEIGHT - height - 4))

        if (!this.roomOverlaps(x, y, width, height)) {
          const room: Room = {
            x, y, width, height,
            type: 'normal',
            visited: false
          }
          this.rooms.push(room)
          this.carveRoom(room)
          break
        }
      }
    }

    // If no rooms were placed, create a fallback simple layout
    if (this.rooms.length === 0) {
      const fallbackRoom: Room = { x: 5, y: 5, width: 8, height: 8, type: 'start', visited: false }
      this.rooms.push(fallbackRoom)
      this.carveRoom(fallbackRoom)
    }

    // Find the furthest room from start for boss room
    const startRoom = this.rooms[0]
    let maxDist = 0
    let bossRoomIndex = this.rooms.length - 1

    for (let i = 1; i < this.rooms.length; i++) {
      const dist = distance(
        startRoom.x + startRoom.width / 2,
        startRoom.y + startRoom.height / 2,
        this.rooms[i].x + this.rooms[i].width / 2,
        this.rooms[i].y + this.rooms[i].height / 2
      )
      if (dist > maxDist) {
        maxDist = dist
        bossRoomIndex = i
      }
    }

    // Assign room types
    this.rooms[0].type = 'start'
    this.rooms[bossRoomIndex].type = 'boss'
    
    // Add treasure rooms randomly
    for (let i = 1; i < this.rooms.length; i++) {
      if (this.rooms[i].type === 'normal' && random() < 0.2) {
        this.rooms[i].type = 'treasure'
      }
    }

    // Connect all rooms using minimum spanning tree approach
    this.connectAllRooms(random)

    // Verify connectivity and fix any disconnected rooms
    this.ensureConnectivity()

    // Set start and stairs positions
    startX = (startRoom.x + Math.floor(startRoom.width / 2)) * TILE_SIZE
    startY = (startRoom.y + Math.floor(startRoom.height / 2)) * TILE_SIZE

    const bossRoom = this.rooms[bossRoomIndex]
    const sx = bossRoom.x + Math.floor(bossRoom.width / 2)
    const sy = bossRoom.y + Math.floor(bossRoom.height / 2)
    this.tiles[sy][sx].type = 'stairs'
    stairsX = sx * TILE_SIZE
    stairsY = sy * TILE_SIZE

    return { tiles: this.tiles, rooms: this.rooms, startX, startY, stairsX, stairsY }
  }

  private connectAllRooms(random: () => number): void {
    if (this.rooms.length < 2) return

    // Connect rooms in order, but also add some extra connections for variety
    for (let i = 1; i < this.rooms.length; i++) {
      const prev = this.rooms[i - 1]
      const curr = this.rooms[i]
      this.connectRooms(prev, curr)
    }

    // Add extra connections for more interesting layouts
    const extraConnections = Math.floor(this.rooms.length / 3)
    for (let i = 0; i < extraConnections; i++) {
      const r1 = Math.floor(random() * this.rooms.length)
      let r2 = Math.floor(random() * this.rooms.length)
      while (r2 === r1) {
        r2 = Math.floor(random() * this.rooms.length)
      }
      this.connectRooms(this.rooms[r1], this.rooms[r2])
    }
  }

  private connectRooms(room1: Room, room2: Room): void {
    const x1 = room1.x + Math.floor(room1.width / 2)
    const y1 = room1.y + Math.floor(room1.height / 2)
    const x2 = room2.x + Math.floor(room2.width / 2)
    const y2 = room2.y + Math.floor(room2.height / 2)

    // L-shaped corridor
    if (Math.random() < 0.5) {
      this.carveHorizontalCorridor(x1, x2, y1)
      this.carveVerticalCorridor(y1, y2, x2)
    } else {
      this.carveVerticalCorridor(y1, y2, x1)
      this.carveHorizontalCorridor(x1, x2, y2)
    }
  }

  private ensureConnectivity(): void {
    // Use flood fill to check if all rooms are connected
    if (this.rooms.length === 0) return

    const startRoom = this.rooms[0]
    const startX = startRoom.x + Math.floor(startRoom.width / 2)
    const startY = startRoom.y + Math.floor(startRoom.height / 2)
    
    // Flood fill from start
    const visited = new Set<string>()
    const queue: [number, number][] = [[startX, startY]]
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!
      const key = `${x},${y}`
      
      if (visited.has(key)) continue
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) continue
      if (this.tiles[y][x].type === 'wall') continue
      
      visited.add(key)
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }

    // Check each room and connect if not reachable
    for (const room of this.rooms) {
      const roomCenterX = room.x + Math.floor(room.width / 2)
      const roomCenterY = room.y + Math.floor(room.height / 2)
      
      if (!visited.has(`${roomCenterX},${roomCenterY}`)) {
        // Find closest connected room and connect to it
        let closestDist = Infinity
        let closestRoom: Room | null = null
        
        for (const otherRoom of this.rooms) {
          if (otherRoom === room) continue
          const otherCenterX = otherRoom.x + Math.floor(otherRoom.width / 2)
          const otherCenterY = otherRoom.y + Math.floor(otherRoom.height / 2)
          
          if (visited.has(`${otherCenterX},${otherCenterY}`)) {
            const dist = distance(roomCenterX, roomCenterY, otherCenterX, otherCenterY)
            if (dist < closestDist) {
              closestDist = dist
              closestRoom = otherRoom
            }
          }
        }
        
        if (closestRoom) {
          this.connectRooms(room, closestRoom)
        }
      }
    }
  }

  private roomOverlaps(x: number, y: number, width: number, height: number): boolean {
    for (const room of this.rooms) {
      if (x < room.x + room.width + 2 && x + width + 2 > room.x &&
          y < room.y + room.height + 2 && y + height + 2 > room.y) {
        return true
      }
    }
    return false
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
          this.tiles[y][x].type = 'floor'
        }
      }
    }
  }

  private carveHorizontalCorridor(x1: number, x2: number, y: number): void {
    const startX = Math.min(x1, x2)
    const endX = Math.max(x1, x2)
    for (let x = startX; x <= endX; x++) {
      if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
        this.tiles[y][x].type = 'floor'
        // Make corridor 2 tiles wide for easier navigation
        if (y + 1 < MAP_HEIGHT) this.tiles[y + 1][x].type = 'floor'
      }
    }
  }

  private carveVerticalCorridor(y1: number, y2: number, x: number): void {
    const startY = Math.min(y1, y2)
    const endY = Math.max(y1, y2)
    for (let y = startY; y <= endY; y++) {
      if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
        this.tiles[y][x].type = 'floor'
        // Make corridor 2 tiles wide for easier navigation
        if (x + 1 < MAP_WIDTH) this.tiles[y][x + 1].type = 'floor'
      }
    }
  }
}

// ==================== MAIN GAME COMPONENT ====================
export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef<GameState>('menu')
  const animationFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  
  // Game state
  const [gameState, setGameState] = useState<GameState>('menu')
  const [floor, setFloor] = useState(1)
  const [dialogueText, setDialogueText] = useState<string[]>([])
  const [dialogueIndex, setDialogueIndex] = useState(0)
  const [showStory, setShowStory] = useState(false)
  const [storyText, setStoryText] = useState('')
  const [playerSouls, setPlayerSouls] = useState(0)
  const [playerLevel, setPlayerLevel] = useState(1)

  // Inventory and Skill System State
  const [showInventory, setShowInventory] = useState(false)
  const [showSkillTree, setShowSkillTree] = useState(false)
  const [itemChoice, setItemChoice] = useState<GameItem[]>([])
  const [showItemChoice, setShowItemChoice] = useState(false)
  const [activeSynergies, setActiveSynergies] = useState<ActiveSynergy[]>([])
  
  // Inventory ref (persists across floors)
  const inventoryRef = useRef<Inventory>({
    weapon: null,
    artifacts: [null, null, null],
    trinket: null,
    curse: null,
    consumables: [null, null, null, null],
    backpack: []
  })
  
  // Skills ref
  const skillsRef = useRef<PlayerSkills>({
    points: 0,
    unlocked: []
  })
  
  // Player stat modifiers (computed from items + skills)
  const statModifiersRef = useRef({
    damageMultiplier: 1,
    speedMultiplier: 1,
    maxHealthBonus: 0,
    maxManaBonus: 0,
    critChanceBonus: 0,
    lifesteal: 0,
    armor: 0,
    dodge: 0,
    attackSpeedMultiplier: 1,
    xpGainMultiplier: 1,
    manaCostMultiplier: 1
  })

  // Game data refs
  const playerRef = useRef<Player>({
    x: 0, y: 0, width: 24, height: 24,
    velocityX: 0, velocityY: 0, active: true,
    health: 100, maxHealth: 100,
    mana: 50, maxMana: 50,
    attackCooldown: 0, dashCooldown: 0,
    invincibleTime: 0, damage: 15, speed: 180,
    level: 1, xp: 0, xpToNext: 50,
    facing: { x: 1, y: 0 },
    isAttacking: false, attackFrame: 0,
    souls: 0, hasKey: false,
    combo: 0, comboTimer: 0, critChance: 0.1
  })

  const tilesRef = useRef<Tile[][]>([])
  const roomsRef = useRef<Room[]>([])
  const enemiesRef = useRef<Enemy[]>([])
  const projectilesRef = useRef<Projectile[]>([])
  const itemsRef = useRef<Item[]>([])
  const particlesRef = useRef<Particle[]>([])
  const floatingTextsRef = useRef<FloatingText[]>([])
  const keysRef = useRef<Set<string>>(new Set())
  const cameraRef = useRef({ x: 0, y: 0 })
  const stairsRef = useRef({ x: 0, y: 0 })
  const screenShakeRef = useRef({ intensity: 0, duration: 0 })
  const visitedTreasureRoomsRef = useRef<Set<number>>(new Set())

  // Initialize game
  const initGame = useCallback((floorNum: number = 1) => {
    // Helper function for revealing areas
    const revealArea = (cx: number, cy: number, radius: number) => {
      const tileX = Math.floor(cx / TILE_SIZE)
      const tileY = Math.floor(cy / TILE_SIZE)
      
      for (let y = tileY - radius; y <= tileY + radius; y++) {
        for (let x = tileX - radius; x <= tileX + radius; x++) {
          if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
            if (distance(x, y, tileX, tileY) <= radius) {
              tilesRef.current[y][x].revealed = true
            }
          }
        }
      }
    }

    const seed = Date.now()
    const generator = new DungeonGenerator(seed)
    const { tiles, rooms, startX, startY, stairsX, stairsY } = generator.generate(floorNum)
    
    tilesRef.current = tiles
    roomsRef.current = rooms
    stairsRef.current = { x: stairsX, y: stairsY }
    
    // Reset player position
    const player = playerRef.current
    player.x = startX
    player.y = startY
    player.velocityX = 0
    player.velocityY = 0
    
    // Generate enemies
    enemiesRef.current = []
    projectilesRef.current = []
    itemsRef.current = []
    particlesRef.current = []
    floatingTextsRef.current = []
    screenShakeRef.current = { intensity: 0, duration: 0 }
    visitedTreasureRoomsRef.current = new Set()
    
    const random = seededRandom(seed + floorNum * 1000)
    
    // Store room index for each room for enemy assignment
    const roomIndices: number[] = []
    for (let i = 0; i < rooms.length; i++) {
      roomIndices.push(i)
    }
    
    for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
      const room = rooms[roomIndex]
      if (room.type === 'start') continue
      
      const enemyCount = room.type === 'boss' ? 1 : 
                         room.type === 'treasure' ? 0 : 
                         2 + Math.floor(random() * 3)
      
      // Calculate room bounds for enemy containment
      const roomBounds = {
        minX: room.x * TILE_SIZE,
        minY: room.y * TILE_SIZE,
        maxX: (room.x + room.width) * TILE_SIZE,
        maxY: (room.y + room.height) * TILE_SIZE
      }
      
      for (let i = 0; i < enemyCount; i++) {
        const ex = (room.x + 1 + random() * (room.width - 2)) * TILE_SIZE
        const ey = (room.y + 1 + random() * (room.height - 2)) * TILE_SIZE
        
        let enemyType: EnemyType
        const isBossRoom = room.type === 'boss'
        
        if (isBossRoom) {
          // Boss selection based on floor
          if (floorNum === 3) enemyType = 'boss_grak'
          else if (floorNum === 6) enemyType = 'boss_seraphine'
          else if (floorNum === 10) enemyType = 'boss_malachar'
          else enemyType = 'boss_grak'
        } else {
          // Regular enemies based on floor
          if (floorNum <= 3) {
            const types: EnemyType[] = ['skeleton', 'slime', 'spider']
            enemyType = types[Math.floor(random() * types.length)]
          } else if (floorNum <= 6) {
            const types: EnemyType[] = ['wraith', 'bone_knight', 'shadow_bat']
            enemyType = types[Math.floor(random() * types.length)]
          } else {
            const types: EnemyType[] = ['corrupted_soul', 'void_walker', 'abyss_terror']
            enemyType = types[Math.floor(random() * types.length)]
          }
        }
        
        const data = ENEMY_DATA[enemyType]
        enemiesRef.current.push({
          x: ex, y: ey,
          width: isBossRoom ? 48 : 24,
          height: isBossRoom ? 48 : 24,
          velocityX: 0, velocityY: 0,
          active: true,
          type: enemyType,
          health: data.health * (1 + (floorNum - 1) * 0.1),
          maxHealth: data.health * (1 + (floorNum - 1) * 0.1),
          damage: data.damage * (1 + (floorNum - 1) * 0.05),
          speed: data.speed,
          attackCooldown: 0,
          state: 'dormant', // Start dormant
          stateTimer: 0,
          targetX: ex, targetY: ey,
          xpValue: data.xp,
          color: data.color,
          isBoss: isBossRoom,
          phase: 1,
          specialAttackTimer: 0,
          // Room-based system
          homeRoomIndex: roomIndex,
          isAwake: false,
          roomBounds: roomBounds,
          // Pattern system
          pattern: { step: 0, timer: 0, direction: { x: 0, y: 0 }, targetPos: { x: ex, y: ey } }
        })
      }
      
      // Add items
      if (room.type === 'treasure' || random() < 0.2) {
        const ix = (room.x + 1 + random() * (room.width - 2)) * TILE_SIZE
        const iy = (room.y + 1 + random() * (room.height - 2)) * TILE_SIZE
        const itemTypes: ItemType[] = ['health_potion', 'mana_potion', 'soul_essence']
        if (room.type === 'treasure') itemTypes.push('sword_upgrade', 'armor', 'speed_boost')
        
        itemsRef.current.push({
          x: ix, y: iy,
          type: itemTypes[Math.floor(random() * itemTypes.length)],
          active: true
        })
      }
    }

    // Reveal starting area
    revealArea(startX, startY, 5)
    
    setFloor(floorNum)
  }, [])

  // Define startNewGame before it's used
  const startNewGame = useCallback(() => {
    // Reset player stats
    playerRef.current = {
      x: 0, y: 0, width: 24, height: 24,
      velocityX: 0, velocityY: 0, active: true,
      health: 100, maxHealth: 100,
      mana: 50, maxMana: 50,
      attackCooldown: 0, dashCooldown: 0,
      invincibleTime: 0, damage: 15, speed: 180,
      level: 1, xp: 0, xpToNext: 50,
      facing: { x: 1, y: 0 },
      isAttacking: false, attackFrame: 0,
      souls: 0, hasKey: false,
      combo: 0, comboTimer: 0, critChance: 0.1
    }
    
    // Reset inventory
    inventoryRef.current = {
      weapon: null,
      artifacts: [null, null, null],
      trinket: null,
      curse: null,
      consumables: [null, null, null, null],
      backpack: []
    }
    
    // Reset skills
    skillsRef.current = {
      points: 0,
      unlocked: []
    }
    
    // Reset stat modifiers
    statModifiersRef.current = {
      damageMultiplier: 1,
      speedMultiplier: 1,
      maxHealthBonus: 0,
      maxManaBonus: 0,
      critChanceBonus: 0,
      lifesteal: 0,
      armor: 0,
      dodge: 0,
      attackSpeedMultiplier: 1,
      xpGainMultiplier: 1,
      manaCostMultiplier: 1
    }
    
    // Reset synergies
    setActiveSynergies([])
    
    // Show intro
    setDialogueText(STORY.intro)
    setDialogueIndex(0)
    gameStateRef.current = 'dialogue'
    setGameState('dialogue')
    setShowStory(true)
    
    initGame(1)
  }, [])

  // ==================== INVENTORY HELPER FUNCTIONS ====================
  
  // Get item by ID from database
  const getItemById = useCallback((id: string): GameItem | undefined => {
    return ITEM_DATABASE.find(item => item.id === id)
  }, [])
  
  // Get random items by rarity
  const getRandomItems = useCallback((rarity: ItemRarity, count: number): GameItem[] => {
    const filtered = ITEM_DATABASE.filter(item => item.rarity === rarity)
    const result: GameItem[] = []
    for (let i = 0; i < count && filtered.length > 0; i++) {
      const idx = Math.floor(Math.random() * filtered.length)
      result.push(filtered.splice(idx, 1)[0])
    }
    return result
  }, [])
  
  // Recalculate player stats from items and skills (defined before equipItem)
  const recalculateStats = useCallback(() => {
    const inventory = inventoryRef.current
    const skills = skillsRef.current
    const mods = statModifiersRef.current
    const player = playerRef.current
    
    // Reset to base values
    mods.damageMultiplier = 1
    mods.speedMultiplier = 1
    mods.maxHealthBonus = 0
    mods.maxManaBonus = 0
    mods.critChanceBonus = 0
    mods.lifesteal = 0
    mods.armor = 0
    mods.dodge = 0
    mods.attackSpeedMultiplier = 1
    mods.xpGainMultiplier = 1
    mods.manaCostMultiplier = 1
    
    // Process all equipped items
    const processItemEffects = (item: GameItem | null) => {
      if (!item) return
      for (const effect of item.effects) {
        if (effect.type === 'stat_modifier' && effect.stat && effect.value !== undefined) {
          if (effect.operation === 'multiply') {
            switch (effect.stat) {
              case 'damage': mods.damageMultiplier *= (1 + effect.value); break
              case 'speed': mods.speedMultiplier *= (1 + effect.value); break
              case 'attackSpeed': mods.attackSpeedMultiplier *= (1 + effect.value); break
              case 'maxHealth': mods.maxHealthBonus += player.maxHealth * effect.value; break
              case 'maxMana': mods.maxManaBonus += player.maxMana * effect.value; break
            }
          } else if (effect.operation === 'add') {
            switch (effect.stat) {
              case 'damage': mods.damageMultiplier += effect.value; break
              case 'speed': mods.speedMultiplier += effect.value; break
              case 'maxHealth': mods.maxHealthBonus += effect.value; break
              case 'maxMana': mods.maxManaBonus += effect.value; break
              case 'critChance': mods.critChanceBonus += effect.value; break
              case 'lifesteal': mods.lifesteal += effect.value; break
              case 'armor': mods.armor += effect.value; break
              case 'dodge': mods.dodge += effect.value; break
              case 'xpGain': mods.xpGainMultiplier += effect.value; break
            }
          } else if (effect.operation === 'set') {
            switch (effect.stat) {
              case 'maxHealth': mods.maxHealthBonus = effect.value - player.maxHealth; break
              case 'maxMana': mods.maxManaBonus = effect.value - player.maxMana; break
            }
          }
        }
      }
    }
    
    // Process equipped items
    processItemEffects(inventory.weapon)
    inventory.artifacts.forEach(processItemEffects)
    processItemEffects(inventory.trinket)
    processItemEffects(inventory.curse)
    
    // Process skills
    for (const skillId of skills.unlocked) {
      const skill = SKILL_DATABASE.find(s => s.id === skillId)
      if (!skill) continue
      for (const effect of skill.effects) {
        if (effect.type === 'stat_modifier' && effect.stat && effect.value !== undefined) {
          if (effect.operation === 'multiply') {
            switch (effect.stat) {
              case 'damage': mods.damageMultiplier *= (1 + effect.value); break
              case 'speed': mods.speedMultiplier *= (1 + effect.value); break
              case 'attackSpeed': mods.attackSpeedMultiplier *= (1 + effect.value); break
              case 'manaCost': mods.manaCostMultiplier *= effect.value; break
            }
          } else if (effect.operation === 'add') {
            switch (effect.stat) {
              case 'damage': mods.damageMultiplier += effect.value; break
              case 'speed': mods.speedMultiplier += effect.value; break
              case 'maxHealth': mods.maxHealthBonus += effect.value; break
              case 'maxMana': mods.maxManaBonus += effect.value; break
              case 'critChance': mods.critChanceBonus += effect.value; break
              case 'lifesteal': mods.lifesteal += effect.value; break
              case 'armor': mods.armor += effect.value; break
              case 'dodge': mods.dodge += effect.value; break
              case 'xpGain': mods.xpGainMultiplier += effect.value; break
            }
          }
        }
      }
    }
  }, [])
  
  // Check and activate synergies (defined before equipItem)
  const checkSynergies = useCallback(() => {
    const inventory = inventoryRef.current
    const skills = skillsRef.current
    const newSynergies: ActiveSynergy[] = []
    
    // Get all equipped item IDs
    const equippedIds: string[] = []
    if (inventory.weapon) equippedIds.push(inventory.weapon.id)
    inventory.artifacts.forEach(a => { if (a) equippedIds.push(a.id) })
    if (inventory.trinket) equippedIds.push(inventory.trinket.id)
    if (inventory.curse) equippedIds.push(inventory.curse.id)
    
    // Add skill IDs
    equippedIds.push(...skills.unlocked)
    
    // Check each synergy
    for (const synergy of SYNERGIES) {
      const hasAllItems = synergy.items.every(itemId => equippedIds.includes(itemId))
      if (hasAllItems) {
        newSynergies.push({
          name: synergy.name,
          items: synergy.items,
          effect: synergy.effect
        })
      }
    }
    
    setActiveSynergies(newSynergies)
  }, [])
  
  // Equip an item to appropriate slot
  const equipItem = useCallback((item: GameItem) => {
    const inventory = inventoryRef.current
    
    if (item.category === 'weapon') {
      // Move existing weapon to backpack if any
      if (inventory.weapon) {
        inventory.backpack.push(inventory.weapon)
      }
      inventory.weapon = item
    } else if (item.category === 'artifact') {
      // Find empty artifact slot
      const emptySlot = inventory.artifacts.findIndex(a => a === null)
      if (emptySlot >= 0) {
        inventory.artifacts[emptySlot] = item
      } else {
        // All slots full, add to backpack
        inventory.backpack.push(item)
      }
    } else if (item.category === 'trinket') {
      if (inventory.trinket) {
        inventory.backpack.push(inventory.trinket)
      }
      inventory.trinket = item
    } else if (item.category === 'curse') {
      if (inventory.curse) {
        inventory.backpack.push(inventory.curse)
      }
      inventory.curse = item
    } else if (item.category === 'consumable') {
      const emptySlot = inventory.consumables.findIndex(c => c === null)
      if (emptySlot >= 0) {
        inventory.consumables[emptySlot] = item
      } else {
        inventory.backpack.push(item)
      }
    }
    
    // Recalculate stats and check synergies
    recalculateStats()
    checkSynergies()
  }, [recalculateStats, checkSynergies])
  
  // Unlock a skill
  const unlockSkill = useCallback((skillId: string) => {
    const skills = skillsRef.current
    const skill = SKILL_DATABASE.find(s => s.id === skillId)
    
    if (!skill) return false
    if (skills.unlocked.includes(skillId)) return false
    if (skills.points < skill.cost) return false
    
    // Check requirements
    if (skill.requires) {
      const hasAllReqs = skill.requires.every(reqId => skills.unlocked.includes(reqId))
      if (!hasAllReqs) return false
    }
    
    // Unlock the skill
    skills.points -= skill.cost
    skills.unlocked.push(skillId)
    
    // Recalculate stats
    recalculateStats()
    checkSynergies()
    
    return true
  }, [recalculateStats, checkSynergies])
  
  // Activate a consumable
  const activateConsumable = useCallback((slotIndex: number) => {
    const inventory = inventoryRef.current
    const consumable = inventory.consumables[slotIndex]
    if (!consumable) return
    
    const player = playerRef.current
    const enemies = enemiesRef.current
    
    // Execute consumable effect
    for (const effect of consumable.effects) {
      if (effect.type === 'active') {
        if (effect.special === 'explosion' && effect.value) {
          // Deal damage to all nearby enemies
          const damage = effect.value
          for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i]
            if (!enemy.active) continue
            const dist = distance(player.x, player.y, enemy.x, enemy.y)
            if (dist < 150) {
              enemy.health -= damage
              if (enemy.health <= 0) {
                enemy.active = false
              }
            }
          }
          screenShakeRef.current = { intensity: 10, duration: 0.3 }
        } else if (effect.special === 'teleport') {
          // Teleport to random safe location
          const rooms = roomsRef.current
          const room = rooms[Math.floor(Math.random() * rooms.length)]
          if (room) {
            player.x = (room.x + room.width / 2) * TILE_SIZE
            player.y = (room.y + room.height / 2) * TILE_SIZE
          }
        } else if (effect.special === 'freeze_all' && effect.value) {
          // Freeze all enemies
          const freezeDuration = effect.value
          for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i]
            if (enemy.active) {
              enemy.state = 'idle'
              enemy.stateTimer = freezeDuration
            }
          }
        } else if (effect.special === 'heal') {
          player.health = Math.min(player.maxHealth, player.health + (effect.value || 30))
        } else if (effect.special === 'restore_mana') {
          player.mana = Math.min(player.maxMana, player.mana + (effect.value || 25))
        }
      }
    }
    
    // Remove consumable
    inventory.consumables[slotIndex] = null
  }, [])

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      
      // Escape - toggle pause/inventory/skill tree
      if (e.key === 'Escape') {
        if (showInventory) {
          setShowInventory(false)
          if (gameStateRef.current === 'paused') {
            gameStateRef.current = 'playing'
            setGameState('playing')
          }
        } else if (showSkillTree) {
          setShowSkillTree(false)
          if (gameStateRef.current === 'paused') {
            gameStateRef.current = 'playing'
            setGameState('playing')
          }
        } else if (gameStateRef.current === 'playing') {
          gameStateRef.current = 'paused'
          setGameState('paused')
        } else if (gameStateRef.current === 'paused') {
          gameStateRef.current = 'playing'
          setGameState('playing')
        }
      }
      
      // I - Toggle inventory
      if (e.key.toLowerCase() === 'i' && gameStateRef.current === 'playing') {
        setShowInventory(true)
        setShowSkillTree(false)
        gameStateRef.current = 'paused'
        setGameState('paused')
      }
      
      // K - Toggle skill tree
      if (e.key.toLowerCase() === 'k' && gameStateRef.current === 'playing') {
        setShowSkillTree(true)
        setShowInventory(false)
        gameStateRef.current = 'paused'
        setGameState('paused')
      }
      
      // Number keys for consumables (1-4)
      if (e.key >= '1' && e.key <= '4' && gameStateRef.current === 'playing') {
        activateConsumable(parseInt(e.key) - 1)
      }
      
      if (e.key === ' ' && gameStateRef.current === 'menu') {
        startNewGame()
      }
      
      if (e.key === 'Enter' && gameStateRef.current === 'dialogue') {
        if (dialogueIndex < dialogueText.length - 1) {
          setDialogueIndex(dialogueIndex + 1)
        } else {
          gameStateRef.current = 'playing'
          setGameState('playing')
          setShowStory(false)
        }
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [dialogueIndex, dialogueText, startNewGame, showInventory, showSkillTree, activateConsumable])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const gameLoop = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = currentTime
      
      if (gameStateRef.current === 'playing') {
        update(deltaTime)
      }
      
      render(ctx, canvas.width, canvas.height)
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }
    
    const update = (dt: number) => {
      // Guard: Don't update if dungeon not initialized
      if (!tilesRef.current || tilesRef.current.length === 0) {
        return
      }
      
      // Helper function for revealing fog of war
      const revealArea = (cx: number, cy: number, radius: number) => {
        const tileX = Math.floor(cx / TILE_SIZE)
        const tileY = Math.floor(cy / TILE_SIZE)
        
        for (let y = tileY - radius; y <= tileY + radius; y++) {
          for (let x = tileX - radius; x <= tileX + radius; x++) {
            if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
              const tile = tilesRef.current[y]?.[x]
              if (tile && distance(x, y, tileX, tileY) <= radius) {
                tile.revealed = true
              }
            }
          }
        }
      }
      
      const player = playerRef.current
      const keys = keysRef.current
      
      // Player input
      let moveX = 0, moveY = 0
      if (keys.has('w') || keys.has('arrowup')) moveY = -1
      if (keys.has('s') || keys.has('arrowdown')) moveY = 1
      if (keys.has('a') || keys.has('arrowleft')) moveX = -1
      if (keys.has('d') || keys.has('arrowright')) moveX = 1
      
      // Normalize diagonal movement
      const moveLen = Math.sqrt(moveX * moveX + moveY * moveY)
      if (moveLen > 0) {
        moveX /= moveLen
        moveY /= moveLen
        player.facing = { x: moveX, y: moveY }
      }
      
      // Apply velocity with speed modifiers
      const speedMult = statModifiersRef.current.speedMultiplier
      player.velocityX = moveX * player.speed * speedMult
      player.velocityY = moveY * player.speed * speedMult
      
      // Dash
      if (keys.has('shift') && player.dashCooldown <= 0 && player.mana >= 10) {
        player.velocityX *= 3
        player.velocityY *= 3
        player.dashCooldown = 1.5
        player.mana -= 10
        player.invincibleTime = 0.3
        
        // Dash particles
        for (let i = 0; i < 10; i++) {
          particlesRef.current.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            velocityX: (Math.random() - 0.5) * 100,
            velocityY: (Math.random() - 0.5) * 100,
            life: 0.5,
            maxLife: 0.5,
            color: '#4da6ff',
            size: 4
          })
        }
      }
      
      // Attack
      if (keys.has('j') || keys.has('z') || keys.has(' ')) {
        if (player.attackCooldown <= 0) {
          player.isAttacking = true
          player.attackFrame = 0
          // Apply attack speed modifier
          player.attackCooldown = 0.4 * statModifiersRef.current.attackSpeedMultiplier
          
          // Attack hitbox
          const attackRange = 40
          const attackX = player.x + player.width / 2 + player.facing.x * attackRange
          const attackY = player.y + player.height / 2 + player.facing.y * attackRange
          
          // Check enemy hits
          for (const enemy of enemiesRef.current) {
            if (!enemy.active) continue
            if (distance(attackX, attackY, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2) < attackRange + enemy.width / 2) {
              // Calculate damage with combo, critical, and item modifiers
              const mods = statModifiersRef.current
              const totalCritChance = player.critChance + mods.critChanceBonus
              const isCritical = Math.random() < totalCritChance
              let damage = player.damage * mods.damageMultiplier
              
              // Combo bonus
              if (player.comboTimer > 0) {
                player.combo++
                damage *= (1 + player.combo * 0.1) // 10% bonus per combo
              } else {
                player.combo = 1
              }
              player.comboTimer = 2 // 2 second combo window
              
              // Critical hit
              if (isCritical) {
                damage *= 2
                screenShakeRef.current = { intensity: 8, duration: 0.15 }
              } else {
                screenShakeRef.current = { intensity: 3, duration: 0.08 }
              }
              
              enemy.health -= damage
              
              // Lifesteal effect
              if (mods.lifesteal > 0) {
                const healAmount = damage * mods.lifesteal
                player.health = Math.min(player.maxHealth + mods.maxHealthBonus, player.health + healAmount)
                // Lifesteal visual effect
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  velocityX: (player.x - enemy.x) * 0.1,
                  velocityY: (player.y - enemy.y) * 0.1,
                  life: 0.4,
                  maxLife: 0.4,
                  color: '#ff44ff',
                  size: 6
                })
              }
              
              // Floating damage number
              floatingTextsRef.current.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y,
                text: isCritical ? `${Math.floor(damage)}!` : `${Math.floor(damage)}`,
                color: isCritical ? '#ffff00' : '#ffffff',
                life: 1,
                maxLife: 1,
                velocityY: -60
              })
              
              // Hit particles
              const particleCount = isCritical ? 10 : 5
              for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  velocityX: (Math.random() - 0.5) * (isCritical ? 200 : 150),
                  velocityY: (Math.random() - 0.5) * (isCritical ? 200 : 150),
                  life: isCritical ? 0.5 : 0.3,
                  maxLife: isCritical ? 0.5 : 0.3,
                  color: isCritical ? '#ffff00' : '#ff4444',
                  size: isCritical ? 5 : 3
                })
              }
              
              if (enemy.health <= 0) {
                enemy.active = false
                
                // Bonus XP for combo kills with XP gain multiplier
                const xpMult = statModifiersRef.current.xpGainMultiplier
                const bonusXp = Math.floor(enemy.xpValue * (1 + player.combo * 0.2) * xpMult)
                player.xp += bonusXp
                player.souls += bonusXp
                
                // Combo text
                if (player.combo > 1) {
                  floatingTextsRef.current.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y - 30,
                    text: `${player.combo}x COMBO!`,
                    color: '#ff8800',
                    life: 1.5,
                    maxLife: 1.5,
                    velocityY: -40
                  })
                }
                
                // Death particles
                for (let i = 0; i < 15; i++) {
                  particlesRef.current.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    velocityX: (Math.random() - 0.5) * 200,
                    velocityY: (Math.random() - 0.5) * 200,
                    life: 0.8,
                    maxLife: 0.8,
                    color: enemy.color,
                    size: 5
                  })
                }
                
                // Extra screen shake for boss kills
                if (enemy.isBoss) {
                  screenShakeRef.current = { intensity: 15, duration: 0.5 }
                  
                  // Drop item choice for boss kill
                  const itemDrops = getRandomItems('legendary', 1)
                    .concat(getRandomItems('rare', 2))
                  if (itemDrops.length > 0) {
                    setItemChoice(itemDrops.slice(0, 3))
                    setShowItemChoice(true)
                    gameStateRef.current = 'paused'
                    setGameState('paused')
                  }
                }
              }
            }
          }
        }
      }
      
      // Update attack animation
      if (player.isAttacking) {
        player.attackFrame += dt * 10
        if (player.attackFrame >= 3) {
          player.isAttacking = false
        }
      }
      
      // Level up
      while (player.xp >= player.xpToNext) {
        player.xp -= player.xpToNext
        player.level++
        player.maxHealth += 10
        player.health = player.maxHealth
        player.damage += 3
        player.critChance = Math.min(0.5, player.critChance + 0.02) // +2% crit, max 50%
        player.xpToNext = Math.floor(player.xpToNext * 1.5)
        
        // Award skill point on level up
        skillsRef.current.points += 1
        
        // Level up effect
        floatingTextsRef.current.push({
          x: player.x + player.width / 2,
          y: player.y - 20,
          text: `LEVEL UP! Lv.${player.level} (+1 Skill Point)`,
          color: '#00ff00',
          life: 2,
          maxLife: 2,
          velocityY: -30
        })
        
        // Level up particles
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2
          particlesRef.current.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            velocityX: Math.cos(angle) * 100,
            velocityY: Math.sin(angle) * 100,
            life: 1,
            maxLife: 1,
            color: '#00ff00',
            size: 4
          })
        }
        
        screenShakeRef.current = { intensity: 5, duration: 0.2 }
      }
      
      // Apply movement with collision
      const newX = player.x + player.velocityX * dt
      const newY = player.y + player.velocityY * dt
      
      // Collision detection
      const playerTileX = Math.floor((newX + player.width / 2) / TILE_SIZE)
      const playerTileY = Math.floor((newY + player.height / 2) / TILE_SIZE)
      
      let canMoveX = true, canMoveY = true
      
      // Check X movement
      const checkTileX = Math.floor((newX + player.width / 2 + Math.sign(player.velocityX) * player.width / 2) / TILE_SIZE)
      if (checkTileX >= 0 && checkTileX < MAP_WIDTH && playerTileY >= 0 && playerTileY < MAP_HEIGHT) {
        const tile = tilesRef.current[playerTileY]?.[checkTileX]
        if (tile && tile.type === 'wall') {
          canMoveX = false
        }
      }
      
      // Check Y movement
      const checkTileY = Math.floor((newY + player.height / 2 + Math.sign(player.velocityY) * player.height / 2) / TILE_SIZE)
      if (playerTileX >= 0 && playerTileX < MAP_WIDTH && checkTileY >= 0 && checkTileY < MAP_HEIGHT) {
        const tile = tilesRef.current[checkTileY]?.[playerTileX]
        if (tile && tile.type === 'wall') {
          canMoveY = false
        }
      }
      
      if (canMoveX) player.x = newX
      if (canMoveY) player.y = newY
      
      // Clamp to map bounds
      player.x = clamp(player.x, 0, MAP_WIDTH * TILE_SIZE - player.width)
      player.y = clamp(player.y, 0, MAP_HEIGHT * TILE_SIZE - player.height)
      
      // Cooldowns
      player.attackCooldown = Math.max(0, player.attackCooldown - dt)
      player.dashCooldown = Math.max(0, player.dashCooldown - dt)
      player.invincibleTime = Math.max(0, player.invincibleTime - dt)
      
      // Combo timer
      player.comboTimer = Math.max(0, player.comboTimer - dt)
      if (player.comboTimer <= 0) {
        player.combo = 0
      }
      
      // Screen shake
      screenShakeRef.current.duration = Math.max(0, screenShakeRef.current.duration - dt)
      
      // Mana regen
      player.mana = Math.min(player.maxMana, player.mana + 5 * dt)
      
      // Reveal fog of war
      revealArea(player.x + player.width / 2, player.y + player.height / 2, 6)
      
      // Update camera
      cameraRef.current.x = player.x - canvas.width / 2 + player.width / 2
      cameraRef.current.y = player.y - canvas.height / 2 + player.height / 2
      
      // Check for treasure room entry
      for (let roomIndex = 0; roomIndex < roomsRef.current.length; roomIndex++) {
        const room = roomsRef.current[roomIndex]
        if (room.type !== 'treasure') continue
        if (visitedTreasureRoomsRef.current.has(roomIndex)) continue
        
        const roomMinX = room.x * TILE_SIZE
        const roomMinY = room.y * TILE_SIZE
        const roomMaxX = (room.x + room.width) * TILE_SIZE
        const roomMaxY = (room.y + room.height) * TILE_SIZE
        
        if (player.x >= roomMinX && player.x <= roomMaxX &&
            player.y >= roomMinY && player.y <= roomMaxY) {
          // Player entered treasure room for first time
          visitedTreasureRoomsRef.current.add(roomIndex)
          room.visited = true
          
          // Drop item choice for treasure room
          const itemDrops = getRandomItems('rare', 2)
            .concat(getRandomItems('uncommon', 1))
          if (itemDrops.length > 0) {
            setItemChoice(itemDrops.slice(0, 3))
            setShowItemChoice(true)
            gameStateRef.current = 'paused'
            setGameState('paused')
          }
          break
        }
      }
      
      // Check stairs
      const stairsTileX = Math.floor(stairsRef.current.x / TILE_SIZE)
      const stairsTileY = Math.floor(stairsRef.current.y / TILE_SIZE)
      const playerTileX2 = Math.floor((player.x + player.width / 2) / TILE_SIZE)
      const playerTileY2 = Math.floor((player.y + player.height / 2) / TILE_SIZE)
      
      if (playerTileX2 === stairsTileX && playerTileY2 === stairsTileY && enemiesRef.current.every(e => !e.active)) {
        // Check if all enemies are dead
        const allEnemiesDead = enemiesRef.current.every(e => !e.active)
        if (allEnemiesDead) {
          // Check for boss victory
          const wasBoss = floor === 3 || floor === 6 || floor === 10
          
          if (floor >= 10) {
            // Victory!
            setPlayerSouls(player.souls)
            setPlayerLevel(player.level)
            gameStateRef.current = 'victory'
            setGameState('victory')
          } else {
            // Show floor transition
            const floorKey = (floor + 1) as keyof typeof STORY.floors
            if (STORY.floors[floorKey]) {
              setStoryText(STORY.floors[floorKey])
              setShowStory(true)
              setTimeout(() => {
                setShowStory(false)
                initGame(floor + 1)
              }, 3000)
            } else {
              initGame(floor + 1)
            }
          }
        }
      }
      
      // Update enemies with learnable patterns
      for (const enemy of enemiesRef.current) {
        if (!enemy.active) continue
        
        // Base calculations
        const distToPlayer = distance(enemy.x, enemy.y, player.x, player.y)
        const dirToPlayer = normalize(player.x - enemy.x, player.y - enemy.y)
        
        // Update timers
        enemy.stateTimer -= dt
        enemy.attackCooldown -= dt
        enemy.teleportCooldown = Math.max(0, (enemy.teleportCooldown || 0) - dt)
        enemy.spawnCooldown = Math.max(0, (enemy.spawnCooldown || 0) - dt)
        enemy.telegraphTimer = Math.max(0, (enemy.telegraphTimer || 0) - dt)
        
        if (enemy.isBoss) {
          enemy.specialAttackTimer = (enemy.specialAttackTimer || 0) - dt
        }
        
        // Check if player entered enemy's room
        if (!enemy.isAwake && enemy.roomBounds) {
          const bounds = enemy.roomBounds
          const playerInRoom = player.x >= bounds.minX && player.x <= bounds.maxX &&
                              player.y >= bounds.minY && player.y <= bounds.maxY
          if (playerInRoom) {
            enemy.isAwake = true
            enemy.state = 'idle'
            enemy.stateTimer = 0.3 // Brief wake-up pause
            // Alert animation particles
            for (let i = 0; i < 5; i++) {
              particlesRef.current.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                velocityX: (Math.random() - 0.5) * 50,
                velocityY: -50 - Math.random() * 30,
                life: 0.5,
                maxLife: 0.5,
                color: '#ffff00',
                size: 3
              })
            }
          }
        }
        
        // Dormant enemies just idle
        if (!enemy.isAwake) {
          enemy.velocityX = 0
          enemy.velocityY = 0
          continue
        }
        
        // Execute type-specific patterns
        updateEnemyPattern(enemy, player, distToPlayer, dirToPlayer, dt)
        
        // Apply velocity with room boundary constraints
        if (enemy.roomBounds && !enemy.isBoss) {
          const bounds = enemy.roomBounds
          // Predict next position
          let newX = enemy.x + enemy.velocityX * dt
          let newY = enemy.y + enemy.velocityY * dt
          
          // Constrain to room bounds with padding
          const padding = 16
          newX = clamp(newX, bounds.minX + padding, bounds.maxX - enemy.width - padding)
          newY = clamp(newY, bounds.minY + padding, bounds.maxY - enemy.height - padding)
          
          // Check tile collision
          const tileX = Math.floor((newX + enemy.width / 2) / TILE_SIZE)
          const tileY = Math.floor((newY + enemy.height / 2) / TILE_SIZE)
          
          if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
            const tile = tilesRef.current[tileY]?.[tileX]
            if (tile && tile.type !== 'wall') {
              enemy.x = newX
              enemy.y = newY
            } else {
              // Slide along walls
              const tileXOnly = Math.floor((enemy.x + enemy.width / 2 + enemy.velocityX * dt) / TILE_SIZE)
              const tileYOnly = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE)
              if (tilesRef.current[tileYOnly]?.[tileXOnly]?.type !== 'wall') {
                enemy.x += enemy.velocityX * dt
              }
              const tileXOnly2 = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE)
              const tileYOnly2 = Math.floor((enemy.y + enemy.height / 2 + enemy.velocityY * dt) / TILE_SIZE)
              if (tilesRef.current[tileYOnly2]?.[tileXOnly2]?.type !== 'wall') {
                enemy.y += enemy.velocityY * dt
              }
            }
          }
        } else {
          // Bosses can move freely
          const newX = enemy.x + enemy.velocityX * dt
          const newY = enemy.y + enemy.velocityY * dt
          const tileX = Math.floor((newX + enemy.width / 2) / TILE_SIZE)
          const tileY = Math.floor((newY + enemy.height / 2) / TILE_SIZE)
          
          if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
            const tile = tilesRef.current[tileY]?.[tileX]
            if (tile && tile.type !== 'wall') {
              enemy.x = newX
              enemy.y = newY
            }
          }
        }
        
        enemy.x = clamp(enemy.x, 0, MAP_WIDTH * TILE_SIZE - enemy.width)
        enemy.y = clamp(enemy.y, 0, MAP_HEIGHT * TILE_SIZE - enemy.height)
      }
      
      // Main pattern update function
      function updateEnemyPattern(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number) {
        // Initialize pattern if needed
        if (!enemy.pattern) {
          enemy.pattern = { step: 0, timer: 0, direction: { x: 0, y: 0 }, targetPos: { x: enemy.x, y: enemy.y } }
        }
        
        const pattern = enemy.pattern
        
        switch (enemy.type) {
          case 'skeleton':
            pattern_Skeleton(enemy, player, distToPlayer, dirToPlayer, dt, pattern)
            break
          case 'slime':
            pattern_Slime(enemy, player, distToPlayer, dirToPlayer, dt, pattern)
            break
          case 'spider':
            pattern_Spider(enemy, player, distToPlayer, dirToPlayer, dt, pattern)
            break
          case 'wraith':
            pattern_Wraith(enemy, player, distToPlayer, dirToPlayer, dt, pattern)
            break
          case 'bone_knight':
            pattern_BoneKnight(enemy, player, distToPlayer, dirToPlayer, dt, pattern)
            break
          case 'shadow_bat':
            pattern_ShadowBat(enemy, player, distToPlayer, dirToPlayer, dt, pattern)
            break
          case 'corrupted_soul':
            pattern_CorruptedSoul(enemy, player, distToPlayer, dirToPlayer, dt, pattern)
            break
          case 'void_walker':
            pattern_VoidWalker(enemy, player, distToPlayer, dirToPlayer, dt, pattern)
            break
          case 'abyss_terror':
            pattern_AbyssTerror(enemy, player, distToPlayer, dirToPlayer, dt, pattern)
            break
          case 'boss_grak':
          case 'boss_seraphine':
          case 'boss_malachar':
            pattern_Boss(enemy, player, distToPlayer, dirToPlayer, dt, pattern)
            break
        }
      }
      
      // ========== SKELETON - Aggressive Sentinel ==========
      // Pattern: Alert → Approach → Telegraph (raise sword) → Wide slash → Pause
      function pattern_Skeleton(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number, pattern: EnemyPattern) {
        pattern.timer -= dt
        
        switch (enemy.state) {
          case 'idle':
            // Detect player
            if (distToPlayer < 300) {
              // Alert nearby allies first
              for (const other of enemiesRef.current) {
                if (other !== enemy && other.active && other.isAwake && 
                    distance(enemy.x, enemy.y, other.x, other.y) < 200) {
                  other.state = 'chase'
                }
              }
              enemy.state = 'chase'
              // Wake-up particles
              for (let i = 0; i < 8; i++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                  velocityX: (Math.random() - 0.5) * 80, velocityY: (Math.random() - 0.5) * 80,
                  life: 0.3, maxLife: 0.3, color: '#ffff00', size: 3
                })
              }
            }
            break
            
          case 'chase':
            // Fast direct approach - skeleton is aggressive
            enemy.velocityX = dirToPlayer.x * enemy.speed
            enemy.velocityY = dirToPlayer.y * enemy.speed
            
            // Enter telegraph when close enough
            if (distToPlayer < 60) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.35 // Shorter telegraph for faster combat
              enemy.telegraphType = 'slash'
              enemy.telegraphAngle = Math.atan2(dirToPlayer.y, dirToPlayer.x)
              enemy.telegraphSize = 50
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            
            if (distToPlayer > 400) enemy.state = 'idle'
            break
            
          case 'telegraph':
            // Show warning - enemy is preparing attack
            if (enemy.telegraphTimer <= 0) {
              enemy.state = 'attack'
              enemy.stateTimer = 0.15
            }
            break
            
          case 'attack':
            // Execute wide slash - step forward during attack
            enemy.velocityX = dirToPlayer.x * enemy.speed * 0.3
            enemy.velocityY = dirToPlayer.y * enemy.speed * 0.3
            if (enemy.stateTimer <= 0) {
              // Hit check with wide arc
              const attackAngle = enemy.telegraphAngle || 0
              for (let arc = -0.5; arc <= 0.5; arc += 0.25) {
                const checkAngle = attackAngle + arc
                const checkX = enemy.x + enemy.width / 2 + Math.cos(checkAngle) * 50
                const checkY = enemy.y + enemy.height / 2 + Math.sin(checkAngle) * 50
                if (distance(checkX, checkY, player.x + player.width / 2, player.y + player.height / 2) < 35) {
                  dealDamageToPlayer(enemy, player)
                  break
                }
              }
              enemy.state = 'recover'
              enemy.stateTimer = 0.6 // Punish window
              enemy.attackCooldown = 1.2
            }
            break
            
          case 'recover':
            // Vulnerable period - player can attack safely
            enemy.velocityX = 0
            enemy.velocityY = 0
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
            
          case 'flee':
            if (enemy.health > enemy.maxHealth * 0.3) {
              enemy.state = 'chase'
            } else {
              enemy.velocityX = -dirToPlayer.x * enemy.speed * 1.2
              enemy.velocityY = -dirToPlayer.y * enemy.speed * 1.2
            }
            break
        }
        
        // Flee when critically low
        if (enemy.health < enemy.maxHealth * 0.2 && enemy.state !== 'flee' && enemy.state !== 'recover') {
          enemy.state = 'flee'
        }
      }
      
      // ========== SLIME - Bouncing Ambusher ==========
      // Pattern: Bouncy approach → Telegraph (stretch) → Jump to predicted position → Splat → Reform
      function pattern_Slime(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number, pattern: EnemyPattern) {
        pattern.timer -= dt
        enemy.wanderAngle = (enemy.wanderAngle || 0) + dt * 4 // Faster bounce
        
        switch (enemy.state) {
          case 'idle':
            if (distToPlayer < 300) {
              enemy.state = 'chase'
            }
            break
            
          case 'chase':
            // Bouncy movement toward player - very obvious bounce pattern
            const bounce = Math.sin(enemy.wanderAngle * 3) * 0.6
            const bounceY = Math.cos(enemy.wanderAngle * 4) * 0.3
            enemy.velocityX = (dirToPlayer.x + bounce) * enemy.speed * 1.2
            enemy.velocityY = (dirToPlayer.y + bounceY) * enemy.speed * 1.2
            
            // Telegraph jump
            if (distToPlayer < 120 && enemy.attackCooldown <= 0) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.3
              enemy.telegraphType = 'jump'
              // Predict player position
              pattern.targetPos = {
                x: player.x + player.velocityX * 0.4,
                y: player.y + player.velocityY * 0.4
              }
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            break
            
          case 'telegraph':
            // Stretching animation - shake in place
            if (enemy.telegraphTimer <= 0) {
              enemy.state = 'attack'
              enemy.stateTimer = 0.25
              // Jump toward predicted position - FAST
              const jumpDir = normalize(pattern.targetPos.x - enemy.x, pattern.targetPos.y - enemy.y)
              enemy.velocityX = jumpDir.x * enemy.speed * 5
              enemy.velocityY = jumpDir.y * enemy.speed * 5
            }
            break
            
          case 'attack':
            // In air / landing
            if (enemy.stateTimer <= 0) {
              // Splat on landing - check if player is nearby
              if (distance(enemy.x, enemy.y, player.x, player.y) < 45) {
                dealDamageToPlayer(enemy, player)
              }
              // Splat particles
              for (let i = 0; i < 12; i++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  velocityX: (Math.random() - 0.5) * 150,
                  velocityY: (Math.random() - 0.5) * 150,
                  life: 0.4,
                  maxLife: 0.4,
                  color: enemy.color,
                  size: 5
                })
              }
              enemy.state = 'recover'
              enemy.stateTimer = 0.5 // Reform time
              enemy.attackCooldown = 1.5
            }
            break
            
          case 'recover':
            enemy.velocityX *= 0.7
            enemy.velocityY *= 0.7
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // ========== SPIDER - Circular Strafer ==========
      // Pattern: Fast circular strafe around player → Telegraph (stop + glow) → Quick lunge → Brief pause
      function pattern_Spider(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number, pattern: EnemyPattern) {
        enemy.wanderAngle = (enemy.wanderAngle || Math.random() * Math.PI * 2) + dt
        
        switch (enemy.state) {
          case 'idle':
            if (distToPlayer < 350) {
              enemy.state = 'chase'
              pattern.step = Math.random() * 360
              pattern.timer = 1.5 + Math.random() * 0.5 // Time until first lunge
            }
            break
            
          case 'chase':
            // FAST circular strafing pattern - very noticeable!
            pattern.step = (pattern.step || 0) % 360
            pattern.step += dt * 200 // Much faster rotation - 200 degrees per second!
            const strafeAngle = (pattern.step * Math.PI) / 180
            const strafeRadius = 100 // Distance from player
            const targetX = player.x + Math.cos(strafeAngle) * strafeRadius
            const targetY = player.y + Math.sin(strafeAngle) * strafeRadius
            const moveDir = normalize(targetX - enemy.x, targetY - enemy.y)
            
            // Move very fast while strafing
            enemy.velocityX = moveDir.x * enemy.speed * 1.3
            enemy.velocityY = moveDir.y * enemy.speed * 1.3
            
            // Telegraph lunge - spider stops suddenly
            pattern.timer -= dt
            if (pattern.timer <= 0 && distToPlayer < 150 && distToPlayer > 40) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.25 // Short telegraph
              enemy.telegraphType = 'lunge'
              enemy.telegraphAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
              enemy.velocityX = 0
              enemy.velocityY = 0
              pattern.timer = 2 + Math.random() * 0.5 // Time between lunges
            }
            break
            
          case 'telegraph':
            // Rearing back - visible shake
            enemy.x += (Math.random() - 0.5) * 3
            enemy.y += (Math.random() - 0.5) * 3
            if (enemy.telegraphTimer <= 0) {
              enemy.state = 'attack'
              enemy.stateTimer = 0.2
              // FAST lunge in straight line
              enemy.velocityX = Math.cos(enemy.telegraphAngle!) * enemy.speed * 4
              enemy.velocityY = Math.sin(enemy.telegraphAngle!) * enemy.speed * 4
              // Lunge particles
              for (let i = 0; i < 6; i++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                  velocityX: -Math.cos(enemy.telegraphAngle!) * 50 + (Math.random() - 0.5) * 30,
                  velocityY: -Math.sin(enemy.telegraphAngle!) * 50 + (Math.random() - 0.5) * 30,
                  life: 0.2, maxLife: 0.2, color: '#aa00ff', size: 4
                })
              }
            }
            break
            
          case 'attack':
            if (enemy.stateTimer <= 0) {
              // Check hit during lunge
              if (distToPlayer < 40) {
                dealDamageToPlayer(enemy, player)
              }
              enemy.state = 'recover'
              enemy.stateTimer = 0.4
            }
            break
            
          case 'recover':
            enemy.velocityX *= 0.6
            enemy.velocityY *= 0.6
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // ========== WRAITH - Phasing Caster ==========
      // Pattern: Maintain distance → Telegraph (charge orb) → Fire projectile → Phase back
      function pattern_Wraith(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number, pattern: EnemyPattern) {
        switch (enemy.state) {
          case 'idle':
            if (distToPlayer < 350) {
              enemy.state = 'chase'
            }
            break
            
          case 'chase':
            // Keep optimal distance (100-180 range) - fast movement
            if (distToPlayer < 100) {
              // Back away quickly
              enemy.velocityX = -dirToPlayer.x * enemy.speed * 1.2
              enemy.velocityY = -dirToPlayer.y * enemy.speed * 1.2
            } else if (distToPlayer > 180) {
              // Approach
              enemy.velocityX = dirToPlayer.x * enemy.speed
              enemy.velocityY = dirToPlayer.y * enemy.speed
            } else {
              // Fast circular strafe
              enemy.wanderAngle = (enemy.wanderAngle || 0) + dt * 3
              enemy.velocityX = Math.cos(enemy.wanderAngle) * enemy.speed * 0.8
              enemy.velocityY = Math.sin(enemy.wanderAngle) * enemy.speed * 0.8
            }
            
            // Telegraph magic attack
            if (enemy.attackCooldown <= 0 && distToPlayer < 250) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.5
              enemy.telegraphType = 'magic'
              enemy.telegraphSize = 20
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            break
            
          case 'telegraph':
            // Charging orb - visible shake
            enemy.x += (Math.random() - 0.5) * 2
            enemy.y += (Math.random() - 0.5) * 2
            if (enemy.telegraphTimer <= 0) {
              enemy.state = 'attack'
              enemy.stateTimer = 0.15
            }
            break
            
          case 'attack':
            // Fire projectile
            projectilesRef.current.push({
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height / 2,
              velocityX: dirToPlayer.x * 200,
              velocityY: dirToPlayer.y * 200,
              damage: enemy.damage,
              active: true,
              fromPlayer: false,
              size: 10,
              color: '#8888ff',
              lifetime: 3
            })
            // Cast particles
            for (let i = 0; i < 8; i++) {
              particlesRef.current.push({
                x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                velocityX: (Math.random() - 0.5) * 100, velocityY: (Math.random() - 0.5) * 100,
                life: 0.3, maxLife: 0.3, color: '#8888ff', size: 4
              })
            }
            enemy.state = 'recover'
            enemy.stateTimer = 0.4
            enemy.attackCooldown = 2
            break
            
          case 'recover':
            // Phase backwards
            enemy.velocityX = -dirToPlayer.x * enemy.speed * 0.8
            enemy.velocityY = -dirToPlayer.y * enemy.speed * 0.8
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // ========== BONE KNIGHT - Heavy Charger ==========
      // Pattern: Advance slowly → Telegraph (raise sword) → Charge in straight line → Stun on wall hit
      function pattern_BoneKnight(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number, pattern: EnemyPattern) {
        switch (enemy.state) {
          case 'idle':
            if (distToPlayer < 350) {
              enemy.state = 'chase'
            }
            break
            
          case 'chase':
            // Slow advance with shield raised - heavy but steady
            enemy.velocityX = dirToPlayer.x * enemy.speed * 0.7
            enemy.velocityY = dirToPlayer.y * enemy.speed * 0.7
            
            // Telegraph charge - main attack
            if (distToPlayer > 60 && distToPlayer < 200 && enemy.attackCooldown <= 0) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.6 // Telegraph duration
              enemy.telegraphType = 'charge'
              enemy.chargeTarget = { x: player.x, y: player.y }
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            
            // Normal melee when close
            if (distToPlayer < 45 && enemy.attackCooldown <= 0) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.25
              enemy.telegraphType = 'slash'
              enemy.telegraphAngle = Math.atan2(dirToPlayer.y, dirToPlayer.x)
            }
            
            if (distToPlayer > 450) enemy.state = 'idle'
            break
            
          case 'telegraph':
            // Shake while preparing
            if (enemy.telegraphType === 'charge') {
              enemy.x += (Math.random() - 0.5) * 2
            }
            if (enemy.telegraphTimer <= 0) {
              if (enemy.telegraphType === 'charge') {
                enemy.state = 'attack'
                enemy.stateTimer = 0.8
                const chargeDir = normalize(enemy.chargeTarget!.x - enemy.x, enemy.chargeTarget!.y - enemy.y)
                // FAST charge!
                enemy.velocityX = chargeDir.x * enemy.speed * 5
                enemy.velocityY = chargeDir.y * enemy.speed * 5
                // Charge particles
                for (let i = 0; i < 8; i++) {
                  particlesRef.current.push({
                    x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                    velocityX: -chargeDir.x * 80 + (Math.random() - 0.5) * 40,
                    velocityY: -chargeDir.y * 80 + (Math.random() - 0.5) * 40,
                    life: 0.3, maxLife: 0.3, color: '#888888', size: 4
                  })
                }
              } else {
                // Melee attack
                if (distToPlayer < 55) {
                  dealDamageToPlayer(enemy, player)
                }
                enemy.state = 'recover'
                enemy.stateTimer = 0.4
                enemy.attackCooldown = 1.2
              }
            }
            break
            
          case 'attack':
            // Charging - check for wall collision or player hit
            if (distToPlayer < 40) {
              dealDamageToPlayer(enemy, player)
            }
            
            // Check if hit wall
            const tileX = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE)
            const tileY = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE)
            if (tilesRef.current[tileY]?.[tileX]?.type === 'wall' || enemy.stateTimer <= 0) {
              // Stun on wall hit
              enemy.state = 'recover'
              enemy.stateTimer = 1.2 // Long punish window
              enemy.attackCooldown = 2.5
              enemy.velocityX = 0
              enemy.velocityY = 0
              screenShakeRef.current = { intensity: 8, duration: 0.3 }
              // Stun particles
              for (let i = 0; i < 10; i++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                  velocityX: (Math.random() - 0.5) * 100, velocityY: (Math.random() - 0.5) * 100,
                  life: 0.4, maxLife: 0.4, color: '#ffffff', size: 4
                })
              }
            }
            break
            
          case 'recover':
            enemy.velocityX *= 0.85
            enemy.velocityY *= 0.85
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // ========== SHADOW BAT - Erratic Flyer ==========
      // Pattern: Fast erratic flight → Telegraph (stop + screech) → Dive attack → Return to flight
      function pattern_ShadowBat(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number, pattern: EnemyPattern) {
        enemy.wanderAngle = (enemy.wanderAngle || Math.random() * Math.PI * 2) + dt * 5 // Faster erratic
        
        switch (enemy.state) {
          case 'idle':
            if (distToPlayer < 300) {
              enemy.state = 'chase'
            }
            break
            
          case 'chase':
            // FAST erratic figure-8 flight pattern - very noticeable!
            const wobbleX = Math.sin(enemy.wanderAngle * 2) * 0.8
            const wobbleY = Math.cos(enemy.wanderAngle * 3) * 0.8
            enemy.velocityX = (dirToPlayer.x * 0.5 + wobbleX) * enemy.speed * 1.2
            enemy.velocityY = (dirToPlayer.y * 0.5 + wobbleY) * enemy.speed * 1.2
            
            // Telegraph dive
            if (distToPlayer < 130 && enemy.attackCooldown <= 0) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.25
              enemy.telegraphType = 'dive'
              enemy.telegraphAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            break
            
          case 'telegraph':
            // Hover in place before diving
            enemy.x += (Math.random() - 0.5) * 4
            enemy.y += (Math.random() - 0.5) * 4
            if (enemy.telegraphTimer <= 0) {
              enemy.state = 'attack'
              enemy.stateTimer = 0.3
              // FAST dive
              enemy.velocityX = Math.cos(enemy.telegraphAngle!) * enemy.speed * 3
              enemy.velocityY = Math.sin(enemy.telegraphAngle!) * enemy.speed * 3
            }
            break
            
          case 'attack':
            if (enemy.stateTimer <= 0) {
              if (distToPlayer < 35) {
                dealDamageToPlayer(enemy, player)
              }
              enemy.state = 'recover'
              enemy.stateTimer = 0.35
              enemy.attackCooldown = 1.5
            }
            break
            
          case 'recover':
            enemy.velocityX *= 0.75
            enemy.velocityY *= 0.75
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // ========== CORRUPTED SOUL - Teleporting Caster ==========
      // Pattern: Teleport near player → Telegraph (orb charge) → Fan shot → Brief pause → Repeat
      function pattern_CorruptedSoul(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number, pattern: EnemyPattern) {
        switch (enemy.state) {
          case 'idle':
            if (distToPlayer < 350) {
              enemy.state = 'chase'
            }
            break
            
          case 'chase':
            // Slow drift toward player
            enemy.velocityX = dirToPlayer.x * enemy.speed * 0.4
            enemy.velocityY = dirToPlayer.y * enemy.speed * 0.4
            
            // Teleport if far away - very noticeable!
            if (distToPlayer > 120 && (enemy.teleportCooldown || 0) <= 0) {
              // Teleport near player
              enemy.x = player.x + (Math.random() - 0.5) * 150
              enemy.y = player.y + (Math.random() - 0.5) * 150
              enemy.teleportCooldown = 2.5
              
              // Teleport particles - big visual effect
              for (let i = 0; i < 15; i++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  velocityX: (Math.random() - 0.5) * 150,
                  velocityY: (Math.random() - 0.5) * 150,
                  life: 0.5,
                  maxLife: 0.5,
                  color: '#ff44ff',
                  size: 6
                })
              }
            }
            
            // Telegraph fan shot
            if (enemy.attackCooldown <= 0 && distToPlayer < 280) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.4
              enemy.telegraphType = 'triple'
              enemy.telegraphAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            break
            
          case 'telegraph':
            // Shake while charging
            enemy.x += (Math.random() - 0.5) * 3
            enemy.y += (Math.random() - 0.5) * 3
            if (enemy.telegraphTimer <= 0) {
              enemy.state = 'attack'
              enemy.stateTimer = 0.1
            }
            break
            
          case 'attack':
            // Fire 5 projectiles in fan - more coverage
            const baseAngle = enemy.telegraphAngle || 0
            for (let i = -2; i <= 2; i++) {
              const angle = baseAngle + i * 0.25
              projectilesRef.current.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                velocityX: Math.cos(angle) * 160,
                velocityY: Math.sin(angle) * 160,
                damage: enemy.damage * 0.6,
                active: true,
                fromPlayer: false,
                size: 7,
                color: '#ff44ff',
                lifetime: 2.5
              })
            }
            // Cast particles
            for (let i = 0; i < 10; i++) {
              particlesRef.current.push({
                x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                velocityX: (Math.random() - 0.5) * 120, velocityY: (Math.random() - 0.5) * 120,
                life: 0.4, maxLife: 0.4, color: '#ff44ff', size: 5
              })
            }
            enemy.state = 'recover'
            enemy.stateTimer = 0.4
            enemy.attackCooldown = 1.8
            break
            
          case 'recover':
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // ========== VOID WALKER - Blink Striker ==========
      // Pattern: Blink behind player → Visible telegraph → Slash → Blink away → Pause
      function pattern_VoidWalker(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number, pattern: EnemyPattern) {
        switch (enemy.state) {
          case 'idle':
            if (distToPlayer < 350) {
              enemy.state = 'chase'
            }
            break
            
          case 'chase':
            // Slow approach - menacing
            enemy.velocityX = dirToPlayer.x * enemy.speed * 0.3
            enemy.velocityY = dirToPlayer.y * enemy.speed * 0.3
            
            // Blink attack sequence - very noticeable!
            if ((enemy.teleportCooldown || 0) <= 0) {
              // Blink behind player
              enemy.x = player.x - dirToPlayer.x * 55
              enemy.y = player.y - dirToPlayer.y * 55
              enemy.teleportCooldown = 2.2
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.35 // Brief visibility before attack
              enemy.telegraphType = 'slash'
              
              // Void particles - big effect
              for (let i = 0; i < 15; i++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  velocityX: (Math.random() - 0.5) * 180,
                  velocityY: (Math.random() - 0.5) * 180,
                  life: 0.6,
                  maxLife: 0.6,
                  color: '#8800ff',
                  size: 5
                })
              }
            }
            break
            
          case 'telegraph':
            // Visible and preparing to strike - shake
            enemy.x += (Math.random() - 0.5) * 3
            enemy.y += (Math.random() - 0.5) * 3
            enemy.velocityX = 0
            enemy.velocityY = 0
            if (enemy.telegraphTimer <= 0) {
              enemy.state = 'attack'
              enemy.stateTimer = 0.15
            }
            break
            
          case 'attack':
            // Quick slash
            enemy.velocityX = dirToPlayer.x * enemy.speed * 0.5
            enemy.velocityY = dirToPlayer.y * enemy.speed * 0.5
            if (enemy.stateTimer <= 0) {
              if (distToPlayer < 50) {
                dealDamageToPlayer(enemy, player)
              }
              // Blink away
              enemy.x = player.x + (Math.random() - 0.5) * 250
              enemy.y = player.y + (Math.random() - 0.5) * 250
              // Escape particles
              for (let i = 0; i < 10; i++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                  velocityX: (Math.random() - 0.5) * 120, velocityY: (Math.random() - 0.5) * 120,
                  life: 0.4, maxLife: 0.4, color: '#4400aa', size: 4
                })
              }
              enemy.state = 'recover'
              enemy.stateTimer = 0.6
              enemy.attackCooldown = 1.2
            }
            break
            
          case 'recover':
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // ========== ABYSS TERROR - Minion Spawner ==========
      // Pattern: Slow approach → Telegraph (pulse) → Spawn minions OR Telegraph (expand) → Shockwave
      function pattern_AbyssTerror(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number, pattern: EnemyPattern) {
        switch (enemy.state) {
          case 'idle':
            if (distToPlayer < 400) {
              enemy.state = 'chase'
            }
            break
            
          case 'chase':
            // Slow but menacing approach
            enemy.velocityX = dirToPlayer.x * enemy.speed * 0.8
            enemy.velocityY = dirToPlayer.y * enemy.speed * 0.8
            
            // Spawn minions
            if ((enemy.spawnCooldown || 0) <= 0 && enemiesRef.current.filter(e => e.active).length < 10) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.5
              enemy.telegraphType = 'spawn'
              enemy.telegraphSize = 60
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            
            // Shockwave attack
            if (distToPlayer < 100 && enemy.attackCooldown <= 0) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.6
              enemy.telegraphType = 'shockwave'
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            break
            
          case 'telegraph':
            // Shake while preparing
            enemy.x += (Math.random() - 0.5) * 4
            enemy.y += (Math.random() - 0.5) * 4
            if (enemy.telegraphTimer <= 0) {
              if (enemy.telegraphType === 'spawn') {
                // Spawn 2 shadow bats - faster minions
                for (let i = 0; i < 2; i++) {
                  const miniEnemy: Enemy = {
                    x: enemy.x + (Math.random() - 0.5) * 50,
                    y: enemy.y + (Math.random() - 0.5) * 50,
                    width: 16, height: 16,
                    velocityX: 0, velocityY: 0,
                    active: true,
                    type: 'shadow_bat',
                    health: 15, maxHealth: 15,
                    damage: 5, speed: 220,
                    attackCooldown: 0,
                    state: 'chase',
                    stateTimer: 0,
                    targetX: 0, targetY: 0,
                    xpValue: 5,
                    color: '#aa0044',
                    isBoss: false,
                    isAwake: true,
                    roomBounds: enemy.roomBounds
                  }
                  enemiesRef.current.push(miniEnemy)
                }
                // Spawn particles
                for (let i = 0; i < 12; i++) {
                  particlesRef.current.push({
                    x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                    velocityX: (Math.random() - 0.5) * 120, velocityY: (Math.random() - 0.5) * 120,
                    life: 0.5, maxLife: 0.5, color: '#ff0000', size: 5
                  })
                }
                enemy.spawnCooldown = 4
              } else {
                // Shockwave - 16 projectiles in all directions
                for (let i = 0; i < 16; i++) {
                  const angle = (i / 16) * Math.PI * 2
                  projectilesRef.current.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    velocityX: Math.cos(angle) * 150,
                    velocityY: Math.sin(angle) * 150,
                    damage: enemy.damage * 0.5,
                    active: true,
                    fromPlayer: false,
                    size: 7,
                    color: '#ff0000',
                    lifetime: 1.5
                  })
                }
                screenShakeRef.current = { intensity: 8, duration: 0.3 }
                enemy.attackCooldown = 2.5
              }
              enemy.state = 'recover'
              enemy.stateTimer = 0.4
            }
            break
            
          case 'recover':
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // ========== BOSS PATTERNS ==========
      function pattern_Boss(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number, pattern: EnemyPattern) {
        // Update phase based on health
        const healthPercent = enemy.health / enemy.maxHealth
        if (healthPercent < 0.3) enemy.phase = 3
        else if (healthPercent < 0.6) enemy.phase = 2
        else enemy.phase = 1
        
        enemy.attackPattern = enemy.attackPattern || 0
        
        // Boss specific patterns
        if (enemy.type === 'boss_grak') {
          bossPattern_Grak(enemy, player, distToPlayer, dirToPlayer, dt)
        } else if (enemy.type === 'boss_seraphine') {
          bossPattern_Seraphine(enemy, player, distToPlayer, dirToPlayer, dt)
        } else if (enemy.type === 'boss_malachar') {
          bossPattern_Malachar(enemy, player, distToPlayer, dirToPlayer, dt)
        }
      }
      
      // Grak: Heavy melee fighter - FAST and AGGRESSIVE
      function bossPattern_Grak(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number) {
        switch (enemy.state) {
          case 'idle':
          case 'chase':
            // Fast chase - Grak is relentless
            enemy.velocityX = dirToPlayer.x * enemy.speed * 1.2
            enemy.velocityY = dirToPlayer.y * enemy.speed * 1.2
            
            // Overhead smash - main attack
            if (distToPlayer < 70 && enemy.attackCooldown <= 0) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.5
              enemy.telegraphType = 'smash'
              enemy.telegraphSize = 70
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            
            // Chain sweep (special) - range attack
            if ((enemy.specialAttackTimer || 0) <= 0 && distToPlayer > 50) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.4
              enemy.telegraphType = 'chain_sweep'
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            break
            
          case 'telegraph':
            // Shake while preparing
            enemy.x += (Math.random() - 0.5) * 3
            enemy.y += (Math.random() - 0.5) * 3
            if (enemy.telegraphTimer <= 0) {
              if (enemy.telegraphType === 'smash') {
                // Ground smash with damage
                if (distToPlayer < 55) {
                  dealDamageToPlayer(enemy, player)
                }
                screenShakeRef.current = { intensity: 12, duration: 0.4 }
                // Smash particles
                for (let i = 0; i < 15; i++) {
                  particlesRef.current.push({
                    x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                    velocityX: (Math.random() - 0.5) * 150, velocityY: (Math.random() - 0.5) * 150,
                    life: 0.5, maxLife: 0.5, color: '#ff8800', size: 5
                  })
                }
                enemy.state = 'recover'
                enemy.stateTimer = 0.6
                enemy.attackCooldown = 1.5
              } else if (enemy.telegraphType === 'chain_sweep') {
                // 360 chain attack - more projectiles
                for (let i = 0; i < 12; i++) {
                  const angle = (i / 12) * Math.PI * 2
                  projectilesRef.current.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    velocityX: Math.cos(angle) * 140,
                    velocityY: Math.sin(angle) * 140,
                    damage: enemy.damage * 0.4,
                    active: true,
                    fromPlayer: false,
                    size: 10,
                    color: '#888888',
                    lifetime: 2
                  })
                }
                screenShakeRef.current = { intensity: 10, duration: 0.3 }
                enemy.state = 'recover'
                enemy.stateTimer = 0.7
                enemy.specialAttackTimer = 3 - enemy.phase! * 0.5
              }
            }
            break
            
          case 'recover':
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // Seraphine: Magical ranged - FAST and ELUSIVE
      function bossPattern_Seraphine(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number) {
        enemy.wanderAngle = (enemy.wanderAngle || 0) + dt * 2 // Faster strafe
        
        switch (enemy.state) {
          case 'chase':
            // Keep distance - fast movement
            if (distToPlayer < 100) {
              enemy.velocityX = -dirToPlayer.x * enemy.speed * 1.3
              enemy.velocityY = -dirToPlayer.y * enemy.speed * 1.3
            } else if (distToPlayer > 200) {
              enemy.velocityX = dirToPlayer.x * enemy.speed
              enemy.velocityY = dirToPlayer.y * enemy.speed
            } else {
              // Fast circular strafe
              enemy.velocityX = Math.cos(enemy.wanderAngle * 2) * enemy.speed * 1.2
              enemy.velocityY = Math.sin(enemy.wanderAngle * 2) * enemy.speed * 1.2
            }
            
            // Teleport when too close
            if (distToPlayer < 50 && (enemy.teleportCooldown || 0) <= 0) {
              enemy.x = player.x + (Math.random() - 0.5) * 250
              enemy.y = player.y + (Math.random() - 0.5) * 250
              enemy.teleportCooldown = 1.5
              // Teleport particles
              for (let i = 0; i < 20; i++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  velocityX: (Math.random() - 0.5) * 150,
                  velocityY: (Math.random() - 0.5) * 150,
                  life: 0.5, maxLife: 0.5,
                  color: '#aa88ff', size: 6
                })
              }
            }
            
            // Magic attack
            if ((enemy.specialAttackTimer || 0) <= 0) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.4
              enemy.telegraphType = 'magic_barrage'
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            break
            
          case 'telegraph':
            // Shake while charging
            enemy.x += (Math.random() - 0.5) * 3
            enemy.y += (Math.random() - 0.5) * 3
            if (enemy.telegraphTimer <= 0) {
              // Fire homing projectiles - more based on phase
              for (let i = 0; i < (3 + enemy.phase!); i++) {
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x) + (Math.random() - 0.5) * 0.3
                projectilesRef.current.push({
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  velocityX: Math.cos(angle) * 160,
                  velocityY: Math.sin(angle) * 160,
                  damage: enemy.damage * 0.5,
                  active: true,
                  fromPlayer: false,
                  size: 9,
                  color: '#aa88ff',
                  lifetime: 3
                })
              }
              // Cast particles
              for (let i = 0; i < 10; i++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                  velocityX: (Math.random() - 0.5) * 100, velocityY: (Math.random() - 0.5) * 100,
                  life: 0.3, maxLife: 0.3, color: '#ff88ff', size: 4
                })
              }
              enemy.state = 'recover'
              enemy.stateTimer = 0.25
              enemy.specialAttackTimer = 2.5 - enemy.phase! * 0.5
            }
            break
            
          case 'recover':
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // Malachar: Multi-phase final boss - FAST and DEVASTATING
      function bossPattern_Malachar(enemy: Enemy, player: Player, distToPlayer: number, dirToPlayer: Vector2, dt: number) {
        const speedMult = enemy.phase === 3 ? 1.6 : enemy.phase === 2 ? 1.3 : 1.1
        
        switch (enemy.state) {
          case 'chase':
            // Fast chase - The Abyss Lord is relentless
            enemy.velocityX = dirToPlayer.x * enemy.speed * speedMult
            enemy.velocityY = dirToPlayer.y * enemy.speed * speedMult
            
            // Melee when close
            if (distToPlayer < 55 && enemy.attackCooldown <= 0) {
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.25
              enemy.telegraphType = 'slash'
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            
            // Special attack pattern - more frequent
            if ((enemy.specialAttackTimer || 0) <= 0) {
              enemy.attackPattern = ((enemy.attackPattern || 0) + 1) % 4
              enemy.state = 'telegraph'
              enemy.telegraphTimer = 0.45
              enemy.telegraphType = 'special'
              enemy.velocityX = 0
              enemy.velocityY = 0
            }
            break
            
          case 'telegraph':
            // Shake while preparing
            enemy.x += (Math.random() - 0.5) * 4
            enemy.y += (Math.random() - 0.5) * 4
            if (enemy.telegraphTimer <= 0) {
              if (enemy.telegraphType === 'slash') {
                if (distToPlayer < 60) {
                  dealDamageToPlayer(enemy, player)
                }
                // Slash particles
                for (let i = 0; i < 8; i++) {
                  particlesRef.current.push({
                    x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                    velocityX: dirToPlayer.x * 100 + (Math.random() - 0.5) * 50,
                    velocityY: dirToPlayer.y * 100 + (Math.random() - 0.5) * 50,
                    life: 0.3, maxLife: 0.3, color: '#ff0000', size: 5
                  })
                }
                enemy.state = 'recover'
                enemy.stateTimer = 0.35
                enemy.attackCooldown = 1.2
              } else {
                // Execute pattern based on attackPattern
                const pattern = enemy.attackPattern || 0
                if (pattern === 0) {
                  // Spiral - 20 projectiles
                  for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 2
                    projectilesRef.current.push({
                      x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                      velocityX: Math.cos(angle) * 130, velocityY: Math.sin(angle) * 130,
                      damage: enemy.damage * 0.4, active: true, fromPlayer: false,
                      size: 8, color: '#ff00ff', lifetime: 3
                    })
                  }
                } else if (pattern === 1) {
                  // Twin beams - more projectiles
                  for (let i = 0; i < 12; i++) {
                    projectilesRef.current.push({
                      x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                      velocityX: dirToPlayer.x * 200, velocityY: dirToPlayer.y * 200,
                      damage: enemy.damage * 0.3, active: true, fromPlayer: false,
                      size: 7, color: '#ff0000', lifetime: 1.5
                    })
                  }
                } else if (pattern === 2 && enemy.phase! >= 2) {
                  // Summon - stronger minions
                  for (let i = 0; i < enemy.phase! + 1; i++) {
                    const miniEnemy: Enemy = {
                      x: enemy.x + (Math.random() - 0.5) * 100,
                      y: enemy.y + (Math.random() - 0.5) * 100,
                      width: 20, height: 20, velocityX: 0, velocityY: 0,
                      active: true, type: 'corrupted_soul',
                      health: 35, maxHealth: 35, damage: 14, speed: 150,
                      attackCooldown: 0, state: 'chase', stateTimer: 0,
                      targetX: 0, targetY: 0, xpValue: 30, color: '#ff44ff',
                      isBoss: false, isAwake: true, roomBounds: enemy.roomBounds
                    }
                    enemiesRef.current.push(miniEnemy)
                  }
                  // Summon particles
                  for (let i = 0; i < 15; i++) {
                    particlesRef.current.push({
                      x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                      velocityX: (Math.random() - 0.5) * 150, velocityY: (Math.random() - 0.5) * 150,
                      life: 0.5, maxLife: 0.5, color: '#aa00aa', size: 5
                    })
                  }
                } else {
                  // Reality shatter - 24 projectiles
                  for (let i = 0; i < 24; i++) {
                    const angle = (i / 24) * Math.PI * 2
                    const speed = 110 + Math.random() * 50
                    projectilesRef.current.push({
                      x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                      velocityX: Math.cos(angle) * speed, velocityY: Math.sin(angle) * speed,
                      damage: enemy.damage * 0.35, active: true, fromPlayer: false,
                      size: 7, color: '#440044', lifetime: 3
                    })
                  }
                }
                screenShakeRef.current = { intensity: 12, duration: 0.5 }
                enemy.state = 'recover'
                enemy.stateTimer = 0.35
                enemy.specialAttackTimer = 2 - enemy.phase! * 0.3
              }
            }
            break
            
          case 'recover':
            if (enemy.stateTimer <= 0) {
              enemy.state = 'chase'
            }
            break
        }
      }
      
      // Helper: Deal damage to player
      function dealDamageToPlayer(enemy: Enemy, player: Player) {
        if (player.invincibleTime <= 0) {
          player.health -= enemy.damage
          player.invincibleTime = 0.5
          screenShakeRef.current = { intensity: 5, duration: 0.15 }
          
          for (let i = 0; i < 6; i++) {
            particlesRef.current.push({
              x: player.x + player.width / 2,
              y: player.y + player.height / 2,
              velocityX: (Math.random() - 0.5) * 120,
              velocityY: (Math.random() - 0.5) * 120,
              life: 0.4, maxLife: 0.4,
              color: '#ff0000', size: 4
            })
          }
          
          if (player.health <= 0) {
            setPlayerSouls(player.souls)
            setPlayerLevel(player.level)
            gameStateRef.current = 'game_over'
            setGameState('game_over')
          }
        }
      }
      
      // Update projectiles
      for (const proj of projectilesRef.current) {
        if (!proj.active) continue
        
        proj.x += proj.velocityX * dt
        proj.y += proj.velocityY * dt
        proj.lifetime -= dt
        
        if (proj.lifetime <= 0) {
          proj.active = false
          continue
        }
        
        // Check collision with walls
        const projTileX = Math.floor(proj.x / TILE_SIZE)
        const projTileY = Math.floor(proj.y / TILE_SIZE)
        const projTile = tilesRef.current[projTileY]?.[projTileX]
        if (projTileX < 0 || projTileX >= MAP_WIDTH || projTileY < 0 || projTileY >= MAP_HEIGHT ||
            (projTile && projTile.type === 'wall')) {
          proj.active = false
          continue
        }
        
        // Check collision with player (enemy projectiles)
        if (!proj.fromPlayer && player.invincibleTime <= 0) {
          if (distance(proj.x, proj.y, player.x + player.width / 2, player.y + player.height / 2) < player.width / 2 + proj.size) {
            player.health -= proj.damage
            player.invincibleTime = 0.5
            proj.active = false
            
            if (player.health <= 0) {
              setPlayerSouls(player.souls)
              setPlayerLevel(player.level)
              gameStateRef.current = 'game_over'
              setGameState('game_over')
            }
          }
        }
      }
      
      // Update items
      for (const item of itemsRef.current) {
        if (!item.active) continue
        
        if (distance(item.x, item.y, player.x + player.width / 2, player.y + player.height / 2) < 30) {
          item.active = false
          
          switch (item.type) {
            case 'health_potion':
              player.health = Math.min(player.maxHealth, player.health + 30)
              break
            case 'mana_potion':
              player.mana = Math.min(player.maxMana, player.mana + 25)
              break
            case 'sword_upgrade':
              player.damage += 5
              break
            case 'armor':
              player.maxHealth += 20
              player.health += 20
              break
            case 'speed_boost':
              player.speed += 20
              break
            case 'soul_essence':
              player.souls += 50
              player.xp += 25
              break
            case 'key':
              player.hasKey = true
              break
          }
          
          // Pickup particles
          for (let i = 0; i < 8; i++) {
            particlesRef.current.push({
              x: item.x,
              y: item.y,
              velocityX: (Math.random() - 0.5) * 100,
              velocityY: (Math.random() - 0.5) * 100,
              life: 0.5,
              maxLife: 0.5,
              color: '#ffd700',
              size: 3
            })
          }
        }
      }
      
      // Update particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.velocityX * dt
        p.y += p.velocityY * dt
        p.life -= dt
        return p.life > 0
      })
      
      // Update floating texts
      floatingTextsRef.current = floatingTextsRef.current.filter(t => {
        t.y += t.velocityY * dt
        t.life -= dt
        return t.life > 0
      })
    }
    
    const render = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Clear
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, width, height)
      
      // Guard: Don't render if dungeon not initialized
      if (!tilesRef.current || tilesRef.current.length === 0) {
        return
      }
      
      const camera = cameraRef.current
      const player = playerRef.current
      
      // Apply screen shake
      let shakeX = 0, shakeY = 0
      if (screenShakeRef.current.duration > 0) {
        shakeX = (Math.random() - 0.5) * screenShakeRef.current.intensity * 2
        shakeY = (Math.random() - 0.5) * screenShakeRef.current.intensity * 2
      }
      
      ctx.save()
      ctx.translate(shakeX, shakeY)
      
      // Render tiles
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tile = tilesRef.current[y]?.[x]
          if (!tile) continue
          if (!tile.revealed) continue
          
          const screenX = x * TILE_SIZE - camera.x
          const screenY = y * TILE_SIZE - camera.y
          
          // Skip if off screen
          if (screenX < -TILE_SIZE || screenX > width || screenY < -TILE_SIZE || screenY > height) continue
          
          switch (tile.type) {
            case 'wall':
              ctx.fillStyle = COLORS.wall
              ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE)
              ctx.fillStyle = COLORS.wallHighlight
              ctx.fillRect(screenX, screenY, TILE_SIZE, 4)
              ctx.fillRect(screenX, screenY, 4, TILE_SIZE)
              break
            case 'floor':
              ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt
              ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE)
              break
            case 'stairs':
              ctx.fillStyle = COLORS.floor
              ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE)
              ctx.fillStyle = COLORS.stairs
              ctx.fillRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8)
              // Glow effect
              ctx.fillStyle = 'rgba(255, 215, 0, 0.2)'
              ctx.beginPath()
              ctx.arc(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2, 20, 0, Math.PI * 2)
              ctx.fill()
              break
          }
        }
      }
      
      // Render items
      for (const item of itemsRef.current) {
        if (!item.active) continue
        
        const screenX = item.x - camera.x
        const screenY = item.y - camera.y
        
        if (screenX < -20 || screenX > width + 20 || screenY < -20 || screenY > height + 20) continue
        
        ctx.save()
        ctx.translate(screenX, screenY)
        
        // Item glow
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'
        ctx.beginPath()
        ctx.arc(0, 0, 15, 0, Math.PI * 2)
        ctx.fill()
        
        switch (item.type) {
          case 'health_potion':
            ctx.fillStyle = '#ff4444'
            ctx.beginPath()
            ctx.arc(0, 0, 8, 0, Math.PI * 2)
            ctx.fill()
            break
          case 'mana_potion':
            ctx.fillStyle = '#4444ff'
            ctx.beginPath()
            ctx.arc(0, 0, 8, 0, Math.PI * 2)
            ctx.fill()
            break
          case 'sword_upgrade':
            ctx.fillStyle = '#ffaa00'
            ctx.fillRect(-6, -10, 4, 20)
            ctx.fillRect(-10, -6, 12, 4)
            break
          case 'soul_essence':
            ctx.fillStyle = '#aa44ff'
            ctx.beginPath()
            ctx.arc(0, 0, 8, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.arc(-2, -2, 3, 0, Math.PI * 2)
            ctx.fill()
            break
          case 'armor':
            ctx.fillStyle = '#888888'
            ctx.fillRect(-6, -8, 12, 16)
            ctx.fillStyle = '#aaaaaa'
            ctx.fillRect(-4, -6, 8, 12)
            break
          case 'speed_boost':
            ctx.fillStyle = '#00ff88'
            ctx.beginPath()
            ctx.moveTo(0, -10)
            ctx.lineTo(8, 10)
            ctx.lineTo(0, 2)
            ctx.lineTo(-8, 10)
            ctx.closePath()
            ctx.fill()
            break
          case 'key':
            ctx.fillStyle = '#ffd700'
            ctx.beginPath()
            ctx.arc(0, -4, 6, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillRect(-2, 0, 4, 10)
            break
        }
        
        ctx.restore()
      }
      
      // Render enemies
      for (const enemy of enemiesRef.current) {
        if (!enemy.active) continue
        
        const screenX = enemy.x - camera.x
        const screenY = enemy.y - camera.y
        
        if (screenX < -50 || screenX > width + 50 || screenY < -50 || screenY > height + 50) continue
        
        ctx.save()
        ctx.translate(screenX + enemy.width / 2, screenY + enemy.height / 2)
        
        // Boss glow
        if (enemy.isBoss) {
          ctx.fillStyle = `rgba(${enemy.color === '#aa6600' ? '170, 102, 0' : enemy.color === '#aa88ff' ? '170, 136, 255' : '68, 0, 68'}, 0.3)`
          ctx.beginPath()
          ctx.arc(0, 0, enemy.width, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // Enemy body
        ctx.fillStyle = enemy.color
        
        switch (enemy.type) {
          case 'skeleton':
            ctx.fillRect(-10, -12, 20, 24)
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(-6, -8, 4, 4)
            ctx.fillRect(2, -8, 4, 4)
            break
          case 'slime':
            ctx.beginPath()
            ctx.ellipse(0, 4, 12, 10, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#88ff88'
            ctx.beginPath()
            ctx.arc(-4, 0, 3, 0, Math.PI * 2)
            ctx.arc(4, 0, 3, 0, Math.PI * 2)
            ctx.fill()
            break
          case 'spider':
            ctx.beginPath()
            ctx.arc(0, 0, 10, 0, Math.PI * 2)
            ctx.fill()
            // Legs
            ctx.strokeStyle = enemy.color
            ctx.lineWidth = 2
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2
              ctx.beginPath()
              ctx.moveTo(0, 0)
              ctx.lineTo(Math.cos(angle) * 18, Math.sin(angle) * 18)
              ctx.stroke()
            }
            break
          case 'wraith':
            ctx.beginPath()
            ctx.moveTo(-12, -10)
            ctx.lineTo(12, -10)
            ctx.lineTo(8, 12)
            ctx.lineTo(0, 8)
            ctx.lineTo(-8, 12)
            ctx.closePath()
            ctx.fill()
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.arc(-4, -4, 3, 0, Math.PI * 2)
            ctx.arc(4, -4, 3, 0, Math.PI * 2)
            ctx.fill()
            break
          case 'bone_knight':
            ctx.fillRect(-10, -12, 20, 24)
            ctx.fillStyle = '#666666'
            ctx.fillRect(-14, -4, 8, 20) // Sword
            ctx.fillStyle = '#aa0000'
            ctx.fillRect(-8, -10, 16, 4) // Helmet
            break
          case 'shadow_bat':
            ctx.beginPath()
            ctx.moveTo(0, -8)
            ctx.lineTo(15, 5)
            ctx.lineTo(0, 0)
            ctx.lineTo(-15, 5)
            ctx.closePath()
            ctx.fill()
            break
          case 'corrupted_soul':
            ctx.fillStyle = enemy.color
            ctx.beginPath()
            ctx.arc(0, 0, 12, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#000000'
            ctx.beginPath()
            ctx.arc(-4, -2, 4, 0, Math.PI * 2)
            ctx.arc(4, -2, 4, 0, Math.PI * 2)
            ctx.fill()
            break
          case 'void_walker':
            ctx.fillRect(-12, -14, 24, 28)
            ctx.fillStyle = '#8800ff'
            ctx.fillRect(-8, -10, 6, 8)
            ctx.fillRect(2, -10, 6, 8)
            break
          case 'abyss_terror':
            ctx.beginPath()
            ctx.moveTo(0, -15)
            ctx.lineTo(15, 10)
            ctx.lineTo(-15, 10)
            ctx.closePath()
            ctx.fill()
            ctx.fillStyle = '#ff0000'
            ctx.beginPath()
            ctx.arc(0, 0, 5, 0, Math.PI * 2)
            ctx.fill()
            break
          // Bosses
          case 'boss_grak':
            ctx.fillRect(-22, -24, 44, 48)
            ctx.fillStyle = '#ffaa00'
            ctx.fillRect(-18, -20, 10, 8) // Left eye
            ctx.fillRect(8, -20, 10, 8) // Right eye
            ctx.fillStyle = '#440000'
            ctx.fillRect(-20, 4, 40, 8) // Mouth
            // Chains
            ctx.strokeStyle = '#888888'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(-22, 0)
            ctx.lineTo(-35, -10)
            ctx.moveTo(22, 0)
            ctx.lineTo(35, -10)
            ctx.stroke()
            break
          case 'boss_seraphine':
            ctx.beginPath()
            ctx.ellipse(0, 0, 20, 24, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.arc(-8, -5, 5, 0, Math.PI * 2)
            ctx.arc(8, -5, 5, 0, Math.PI * 2)
            ctx.fill()
            // Magical aura
            ctx.strokeStyle = '#ff88ff'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(0, 0, 28, 0, Math.PI * 2)
            ctx.stroke()
            break
          case 'boss_malachar':
            ctx.beginPath()
            ctx.moveTo(0, -30)
            ctx.lineTo(25, 20)
            ctx.lineTo(-25, 20)
            ctx.closePath()
            ctx.fill()
            // Crown
            ctx.fillStyle = '#ffd700'
            ctx.beginPath()
            ctx.moveTo(-15, -25)
            ctx.lineTo(-10, -35)
            ctx.lineTo(0, -28)
            ctx.lineTo(10, -35)
            ctx.lineTo(15, -25)
            ctx.closePath()
            ctx.fill()
            // Eyes
            ctx.fillStyle = '#ff0000'
            ctx.beginPath()
            ctx.arc(-8, -5, 5, 0, Math.PI * 2)
            ctx.arc(8, -5, 5, 0, Math.PI * 2)
            ctx.fill()
            // Dark aura
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(0, 0, 35, 0, Math.PI * 2)
            ctx.stroke()
            break
          default:
            ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height)
        }
        
        // Dormant indicator (dim when not awake)
        if (!enemy.isAwake) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
          ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height)
        }
        
        // Telegraph visualization - shows attack warnings
        if (enemy.state === 'telegraph' && enemy.telegraphTimer && enemy.telegraphTimer > 0) {
          const telegraphProgress = 1 - (enemy.telegraphTimer / (enemy.telegraphTimer + 0.3)) // How far along the telegraph is
          ctx.globalAlpha = 0.5 + telegraphProgress * 0.3
          
          switch (enemy.telegraphType) {
            case 'slash':
              // Wide arc warning
              ctx.strokeStyle = '#ff0000'
              ctx.lineWidth = 3
              ctx.beginPath()
              const slashAngle = enemy.telegraphAngle || 0
              ctx.arc(0, 0, 40, slashAngle - 0.5, slashAngle + 0.5)
              ctx.stroke()
              // Danger cone
              ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
              ctx.beginPath()
              ctx.moveTo(0, 0)
              ctx.arc(0, 0, 50, slashAngle - 0.5, slashAngle + 0.5)
              ctx.closePath()
              ctx.fill()
              break
              
            case 'jump':
            case 'dive':
            case 'lunge':
              // Target area warning
              ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
              ctx.beginPath()
              ctx.arc(0, 0, 30 + telegraphProgress * 10, 0, Math.PI * 2)
              ctx.fill()
              ctx.strokeStyle = '#ff0000'
              ctx.lineWidth = 2
              ctx.beginPath()
              ctx.arc(0, 0, 30 + telegraphProgress * 10, 0, Math.PI * 2)
              ctx.stroke()
              break
              
            case 'charge':
              // Line warning showing charge direction
              ctx.strokeStyle = '#ff0000'
              ctx.lineWidth = 4
              ctx.setLineDash([5, 5])
              const chargeAngle = enemy.telegraphAngle || 0
              ctx.beginPath()
              ctx.moveTo(0, 0)
              ctx.lineTo(Math.cos(chargeAngle) * 150, Math.sin(chargeAngle) * 150)
              ctx.stroke()
              ctx.setLineDash([])
              // Danger zone
              ctx.fillStyle = 'rgba(255, 0, 0, 0.15)'
              ctx.beginPath()
              ctx.moveTo(0, -20)
              ctx.lineTo(150, -20)
              ctx.lineTo(150, 20)
              ctx.lineTo(0, 20)
              ctx.closePath()
              ctx.fill()
              break
              
            case 'magic':
            case 'triple':
            case 'magic_barrage':
              // Charging orb visualization
              ctx.fillStyle = enemy.type === 'corrupted_soul' ? '#ff44ff' : '#8888ff'
              const orbSize = 10 + telegraphProgress * 15
              for (let i = 0; i < 3; i++) {
                const orbAngle = (i - 1) * 0.4
                ctx.beginPath()
                ctx.arc(Math.cos(orbAngle) * 20, Math.sin(orbAngle) * 20, orbSize, 0, Math.PI * 2)
                ctx.fill()
              }
              // Warning ring
              ctx.strokeStyle = enemy.type === 'corrupted_soul' ? '#ff44ff' : '#8888ff'
              ctx.lineWidth = 2
              ctx.beginPath()
              ctx.arc(0, 0, 50 + telegraphProgress * 20, 0, Math.PI * 2)
              ctx.stroke()
              break
              
            case 'smash':
              // Ground smash warning
              ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
              ctx.beginPath()
              ctx.arc(0, 0, 60 + telegraphProgress * 15, 0, Math.PI * 2)
              ctx.fill()
              ctx.strokeStyle = '#ff0000'
              ctx.lineWidth = 3
              ctx.beginPath()
              ctx.arc(0, 0, 60 + telegraphProgress * 15, 0, Math.PI * 2)
              ctx.stroke()
              break
              
            case 'chain_sweep':
            case 'shockwave':
            case 'spawn':
              // 360 attack warning
              ctx.strokeStyle = '#ff0000'
              ctx.lineWidth = 3
              ctx.setLineDash([8, 4])
              ctx.beginPath()
              ctx.arc(0, 0, enemy.telegraphSize || 50, 0, Math.PI * 2)
              ctx.stroke()
              ctx.setLineDash([])
              // Pulsing danger zone
              const pulseSize = (enemy.telegraphSize || 50) + Math.sin(Date.now() / 100) * 10
              ctx.fillStyle = 'rgba(255, 0, 0, 0.15)'
              ctx.beginPath()
              ctx.arc(0, 0, pulseSize, 0, Math.PI * 2)
              ctx.fill()
              break
              
            default:
              // Generic warning
              ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
              ctx.beginPath()
              ctx.arc(0, 0, 30, 0, Math.PI * 2)
              ctx.fill()
          }
          
          ctx.globalAlpha = 1
        }
        
        // Recover state indicator (vulnerable)
        if (enemy.state === 'recover') {
          ctx.strokeStyle = '#00ff00'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(0, 0, enemy.width, 0, Math.PI * 2)
          ctx.stroke()
        }
        
        ctx.restore()
        
        // Health bar for enemies
        if (enemy.health < enemy.maxHealth) {
          const barWidth = enemy.width
          const barHeight = 4
          const healthPercent = enemy.health / enemy.maxHealth
          
          ctx.fillStyle = '#333333'
          ctx.fillRect(screenX, screenY - 10, barWidth, barHeight)
          ctx.fillStyle = enemy.isBoss ? '#ff0000' : '#ff4444'
          ctx.fillRect(screenX, screenY - 10, barWidth * healthPercent, barHeight)
        }
      }
      
      // Render player
      const playerScreenX = player.x - camera.x + player.width / 2
      const playerScreenY = player.y - camera.y + player.height / 2
      
      ctx.save()
      ctx.translate(playerScreenX, playerScreenY)
      
      // Player glow
      if (player.invincibleTime > 0) {
        ctx.fillStyle = 'rgba(77, 166, 255, 0.4)'
        ctx.beginPath()
        ctx.arc(0, 0, 20, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // Player body
      ctx.fillStyle = player.invincibleTime > 0 && Math.floor(Date.now() / 50) % 2 === 0 
        ? '#ffffff' 
        : COLORS.player
      ctx.fillRect(-10, -12, 20, 24)
      
      // Player details
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(-4, -4, 3, 0, Math.PI * 2)
      ctx.arc(4, -4, 3, 0, Math.PI * 2)
      ctx.fill()
      
      // Player direction indicator
      ctx.fillStyle = COLORS.playerGlow
      ctx.fillRect(-2, 8, 4, 6)
      
      // Attack animation
      if (player.isAttacking) {
        const attackAngle = Math.atan2(player.facing.y, player.facing.x)
        ctx.rotate(attackAngle)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.beginPath()
        ctx.moveTo(10, -8)
        ctx.lineTo(40, 0)
        ctx.lineTo(10, 8)
        ctx.closePath()
        ctx.fill()
      }
      
      ctx.restore()
      
      // Render projectiles
      for (const proj of projectilesRef.current) {
        if (!proj.active) continue
        
        const screenX = proj.x - camera.x
        const screenY = proj.y - camera.y
        
        ctx.fillStyle = proj.color
        ctx.beginPath()
        ctx.arc(screenX, screenY, proj.size, 0, Math.PI * 2)
        ctx.fill()
        
        // Trail
        ctx.fillStyle = `${proj.color}44`
        ctx.beginPath()
        ctx.arc(screenX - proj.velocityX * 0.02, screenY - proj.velocityY * 0.02, proj.size * 0.7, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // Render particles
      for (const particle of particlesRef.current) {
        const screenX = particle.x - camera.x
        const screenY = particle.y - camera.y
        const alpha = particle.life / particle.maxLife
        
        ctx.fillStyle = particle.color
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(screenX, screenY, particle.size * alpha, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      
      // Render floating texts
      for (const text of floatingTextsRef.current) {
        const screenX = text.x - camera.x
        const screenY = text.y - camera.y
        const alpha = text.life / text.maxLife
        
        ctx.globalAlpha = alpha
        ctx.fillStyle = text.color
        ctx.font = 'bold 16px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(text.text, screenX, screenY)
        
        // Outline
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.strokeText(text.text, screenX, screenY)
        ctx.fillText(text.text, screenX, screenY)
      }
      ctx.globalAlpha = 1
      ctx.textAlign = 'left'
      
      // Render fog of war
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tile = tilesRef.current[y]?.[x]
          if (!tile || tile.revealed) continue
          
          const screenX = x * TILE_SIZE - camera.x
          const screenY = y * TILE_SIZE - camera.y
          
          if (screenX < -TILE_SIZE || screenX > width || screenY < -TILE_SIZE || screenY > height) continue
          
          ctx.fillStyle = COLORS.fog
          ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE)
        }
      }
      
      // UI
      renderUI(ctx, width, height)
      
      ctx.restore()
    }
    
    const renderUI = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const player = playerRef.current
      
      // Health bar
      ctx.fillStyle = COLORS.ui.background
      ctx.fillRect(10, 10, 210, 30)
      ctx.strokeStyle = COLORS.ui.accent
      ctx.lineWidth = 2
      ctx.strokeRect(10, 10, 210, 30)
      
      ctx.fillStyle = COLORS.ui.health
      ctx.fillRect(15, 15, 200 * (player.health / player.maxHealth), 20)
      
      ctx.fillStyle = COLORS.ui.text
      ctx.font = 'bold 14px monospace'
      ctx.fillText(`HP: ${Math.ceil(player.health)}/${player.maxHealth}`, 20, 30)
      
      // Mana bar
      ctx.fillStyle = COLORS.ui.background
      ctx.fillRect(10, 45, 160, 20)
      ctx.strokeStyle = '#4da6ff'
      ctx.strokeRect(10, 45, 160, 20)
      
      ctx.fillStyle = COLORS.ui.mana
      ctx.fillRect(15, 50, 150 * (player.mana / player.maxMana), 10)
      
      ctx.fillStyle = COLORS.ui.text
      ctx.font = '12px monospace'
      ctx.fillText(`MP: ${Math.ceil(player.mana)}`, 20, 60)
      
      // XP bar
      ctx.fillStyle = COLORS.ui.background
      ctx.fillRect(10, 70, 160, 15)
      ctx.strokeStyle = COLORS.ui.xp
      ctx.strokeRect(10, 70, 160, 15)
      
      ctx.fillStyle = COLORS.ui.xp
      ctx.fillRect(15, 75, 150 * (player.xp / player.xpToNext), 5)
      
      ctx.fillStyle = COLORS.ui.text
      ctx.font = '10px monospace'
      ctx.fillText(`LV.${player.level} XP: ${player.xp}/${player.xpToNext}`, 20, 82)
      
      // Floor indicator
      ctx.fillStyle = COLORS.ui.background
      ctx.fillRect(width - 120, 10, 110, 30)
      ctx.strokeStyle = COLORS.ui.accent
      ctx.strokeRect(width - 120, 10, 110, 30)
      
      ctx.fillStyle = COLORS.ui.text
      ctx.font = 'bold 14px monospace'
      ctx.fillText(`FLOOR ${floor}`, width - 110, 30)
      
      // Souls counter
      ctx.fillStyle = COLORS.ui.background
      ctx.fillRect(width - 120, 45, 110, 25)
      
      ctx.fillStyle = '#aa44ff'
      ctx.beginPath()
      ctx.arc(width - 100, 57, 8, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = COLORS.ui.text
      ctx.font = 'bold 12px monospace'
      ctx.fillText(`${player.souls}`, width - 85, 62)
      
      // Minimap
      const mapSize = 120
      const mapX = width - mapSize - 10
      const mapY = height - mapSize - 10
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(mapX, mapY, mapSize, mapSize)
      ctx.strokeStyle = COLORS.ui.accent
      ctx.strokeRect(mapX, mapY, mapSize, mapSize)
      
      const scale = mapSize / (MAP_WIDTH * TILE_SIZE)
      const playerTileX = Math.floor(player.x / TILE_SIZE)
      const playerTileY = Math.floor(player.y / TILE_SIZE)
      
      // Draw rooms on minimap
      for (const room of roomsRef.current) {
        ctx.fillStyle = room.visited ? 'rgba(100, 100, 100, 0.5)' : 'rgba(50, 50, 50, 0.3)'
        ctx.fillRect(
          mapX + room.x * TILE_SIZE * scale,
          mapY + room.y * TILE_SIZE * scale,
          room.width * TILE_SIZE * scale,
          room.height * TILE_SIZE * scale
        )
      }
      
      // Draw revealed tiles on minimap
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tile = tilesRef.current[y]?.[x]
          if (!tile || !tile.revealed) continue
          
          const tileType = tile.type
          if (tileType === 'floor') {
            ctx.fillStyle = '#444466'
          } else if (tileType === 'stairs') {
            ctx.fillStyle = COLORS.stairs
          } else {
            continue
          }
          
          ctx.fillRect(
            mapX + x * TILE_SIZE * scale,
            mapY + y * TILE_SIZE * scale,
            TILE_SIZE * scale + 1,
            TILE_SIZE * scale + 1
          )
        }
      }
      
      // Player on minimap
      ctx.fillStyle = COLORS.player
      ctx.beginPath()
      ctx.arc(
        mapX + player.x * scale + player.width / 2 * scale,
        mapY + player.y * scale + player.height / 2 * scale,
        3, 0, Math.PI * 2
      )
      ctx.fill()
      
      // Enemies on minimap
      for (const enemy of enemiesRef.current) {
        if (!enemy.active) continue
        ctx.fillStyle = enemy.isBoss ? '#ff0000' : '#ff6666'
        ctx.beginPath()
        ctx.arc(
          mapX + enemy.x * scale + enemy.width / 2 * scale,
          mapY + enemy.y * scale + enemy.height / 2 * scale,
          enemy.isBoss ? 4 : 2, 0, Math.PI * 2
        )
        ctx.fill()
      }
      
      // Combo counter
      if (player.combo > 0 && player.comboTimer > 0) {
        const comboAlpha = Math.min(1, player.comboTimer)
        ctx.globalAlpha = comboAlpha
        ctx.fillStyle = '#ff8800'
        ctx.font = `bold ${20 + player.combo}px monospace`
        ctx.textAlign = 'center'
        ctx.fillText(`${player.combo}x COMBO`, width / 2, 60)
        
        // Combo timer bar
        const barWidth = 100
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(width / 2 - barWidth / 2, 70, barWidth, 5)
        ctx.fillStyle = '#ff8800'
        ctx.fillRect(width / 2 - barWidth / 2, 70, barWidth * (player.comboTimer / 2), 5)
        
        ctx.globalAlpha = 1
        ctx.textAlign = 'left'
      }
      
      // Controls hint
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(10, height - 50, 200, 40)
      ctx.fillStyle = '#888888'
      ctx.font = '10px monospace'
      ctx.fillText('WASD: Move | SPACE/J: Attack', 15, height - 35)
      ctx.fillText('SHIFT: Dash | ESC: Pause', 15, height - 20)
    }
    
    // Set canvas size
    const resize = () => {
      if (canvas) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }
    
    resize()
    window.addEventListener('resize', resize)
    
    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(gameLoop)
    
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [floor, initGame])

  // Menu screen
  const renderMenu = () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-purple-950 to-black z-50">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 mb-4 animate-pulse">
          SHADOWS OF THE ABYSS
        </h1>
        <p className="text-xl text-gray-400">A Roguelike Dungeon Exploration</p>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={startNewGame}
          className="px-12 py-4 bg-gradient-to-r from-red-600 to-purple-600 text-white text-xl font-bold rounded-lg hover:from-red-500 hover:to-purple-500 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50"
        >
          NEW GAME
        </button>
      </div>
      
      <div className="absolute bottom-8 text-gray-500 text-sm">
        <p>Press SPACE to start</p>
        <p className="mt-2 text-xs">WASD to move | SPACE/J to attack | SHIFT to dash</p>
      </div>
    </div>
  )

  // Dialogue overlay
  const renderDialogue = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
      <div className="max-w-2xl mx-4 p-8 bg-gray-900 border-2 border-purple-500 rounded-lg shadow-2xl">
        <div className="text-gray-300 text-lg leading-relaxed whitespace-pre-line mb-6">
          {dialogueText[dialogueIndex]}
        </div>
        <div className="text-gray-500 text-sm text-center">
          Press ENTER to continue...
        </div>
      </div>
    </div>
  )

  // Story overlay
  const renderStory = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-50">
      <div className="max-w-xl mx-4 text-center">
        <p className="text-2xl text-purple-300 leading-relaxed whitespace-pre-line animate-fade-in">
          {storyText}
        </p>
      </div>
    </div>
  )

  // Pause menu
  const renderPause = () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 z-50">
      <h2 className="text-4xl font-bold text-white mb-8">PAUSED</h2>
      <div className="space-y-4">
        <button
          onClick={() => {
            gameStateRef.current = 'playing'
            setGameState('playing')
          }}
          className="px-8 py-3 bg-purple-600 text-white text-lg font-bold rounded-lg hover:bg-purple-500 transition-all"
        >
          RESUME
        </button>
        <br />
        <button
          onClick={() => {
            gameStateRef.current = 'menu'
            setGameState('menu')
          }}
          className="px-8 py-3 bg-gray-600 text-white text-lg font-bold rounded-lg hover:bg-gray-500 transition-all"
        >
          MAIN MENU
        </button>
      </div>
    </div>
  )

  // Game over screen
  const renderGameOver = () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 z-50">
      <h2 className="text-5xl font-bold text-red-500 mb-4">DEFEATED</h2>
      <p className="text-gray-400 text-xl mb-8 max-w-md text-center whitespace-pre-line">
        {STORY.defeat}
      </p>
      <div className="space-y-4">
        <button
          onClick={() => {
            startNewGame()
          }}
          className="px-8 py-3 bg-red-600 text-white text-lg font-bold rounded-lg hover:bg-red-500 transition-all"
        >
          TRY AGAIN
        </button>
        <br />
        <button
          onClick={() => {
            gameStateRef.current = 'menu'
            setGameState('menu')
          }}
          className="px-8 py-3 bg-gray-600 text-white text-lg font-bold rounded-lg hover:bg-gray-500 transition-all"
        >
          MAIN MENU
        </button>
      </div>
      <div className="mt-8 text-gray-500">
        <p>Floor Reached: {floor}</p>
        <p>Souls Collected: {playerSouls}</p>
      </div>
    </div>
  )

  // Victory screen
  const renderVictory = () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-purple-900/90 to-black/90 z-50">
      <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-400 mb-4">
        VICTORY
      </h2>
      <p className="text-gray-300 text-xl mb-8 max-w-md text-center whitespace-pre-line">
        {STORY.victory}
      </p>
      <div className="space-y-4">
        <button
          onClick={() => {
            startNewGame()
          }}
          className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-purple-600 text-white text-lg font-bold rounded-lg hover:from-yellow-500 hover:to-purple-500 transition-all"
        >
          PLAY AGAIN
        </button>
        <br />
        <button
          onClick={() => {
            gameStateRef.current = 'menu'
            setGameState('menu')
          }}
          className="px-8 py-3 bg-gray-600 text-white text-lg font-bold rounded-lg hover:bg-gray-500 transition-all"
        >
          MAIN MENU
        </button>
      </div>
      <div className="mt-8 text-gray-400">
        <p>Final Level: {playerLevel}</p>
        <p>Souls Collected: {playerSouls}</p>
      </div>
    </div>
  )

  // Inventory screen
  const renderInventory = () => {
    const inventory = inventoryRef.current
    const player = playerRef.current
    
    const rarityColors: Record<ItemRarity, string> = {
      common: 'border-gray-500 bg-gray-800',
      uncommon: 'border-green-500 bg-green-900/50',
      rare: 'border-blue-500 bg-blue-900/50',
      legendary: 'border-purple-500 bg-purple-900/50',
      curse: 'border-red-500 bg-red-900/50'
    }
    
    const renderItemSlot = (item: GameItem | null, slotName: string, index?: number) => (
      <div 
        key={`${slotName}-${index}`}
        className={`w-16 h-16 border-2 rounded-lg flex items-center justify-center text-2xl cursor-pointer hover:brightness-125 transition-all ${item ? rarityColors[item.rarity] : 'border-gray-600 bg-gray-800/50'}`}
        title={item ? `${item.name}\n${item.description}` : slotName}
      >
        {item ? item.icon : '+'}
      </div>
    )
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-50">
        <div className="bg-gray-900 border-2 border-purple-600 rounded-xl p-6 max-w-4xl w-full mx-4 shadow-2xl shadow-purple-500/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-purple-400">INVENTORY</h2>
            <button 
              onClick={() => {
                setShowInventory(false)
                gameStateRef.current = 'playing'
                setGameState('playing')
              }}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            {/* Left column - Equipment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2">EQUIPMENT</h3>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase">Weapon</p>
                {renderItemSlot(inventory.weapon, 'Weapon')}
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase">Artifacts</p>
                <div className="flex gap-2">
                  {inventory.artifacts.map((a, i) => renderItemSlot(a, 'Artifact', i))}
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase">Trinket</p>
                {renderItemSlot(inventory.trinket, 'Trinket')}
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase">Curse</p>
                {renderItemSlot(inventory.curse, 'Curse')}
              </div>
            </div>
            
            {/* Middle column - Stats & Consumables */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2">STATS</h3>
              
              <div className="bg-gray-800 rounded-lg p-3 space-y-1 text-sm">
                <p className="text-gray-400">HP: <span className="text-red-400">{player.health}/{player.maxHealth + statModifiersRef.current.maxHealthBonus}</span></p>
                <p className="text-gray-400">Mana: <span className="text-blue-400">{player.mana}/{player.maxMana + statModifiersRef.current.maxManaBonus}</span></p>
                <p className="text-gray-400">Damage: <span className="text-yellow-400">{(player.damage * statModifiersRef.current.damageMultiplier).toFixed(1)}</span></p>
                <p className="text-gray-400">Speed: <span className="text-green-400">{(player.speed * statModifiersRef.current.speedMultiplier).toFixed(0)}</span></p>
                <p className="text-gray-400">Crit: <span className="text-orange-400">{((player.critChance + statModifiersRef.current.critChanceBonus) * 100).toFixed(0)}%</span></p>
                <p className="text-gray-400">Lifesteal: <span className="text-pink-400">{(statModifiersRef.current.lifesteal * 100).toFixed(0)}%</span></p>
                <p className="text-gray-400">Dodge: <span className="text-cyan-400">{(statModifiersRef.current.dodge * 100).toFixed(0)}%</span></p>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2 mt-4">CONSUMABLES (1-4)</h3>
              <div className="flex gap-2">
                {inventory.consumables.map((c, i) => renderItemSlot(c, `Slot ${i + 1}`, i))}
              </div>
            </div>
            
            {/* Right column - Synergies & Backpack */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2">SYNERGIES</h3>
              
              <div className="bg-gray-800 rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
                {activeSynergies.length === 0 ? (
                  <p className="text-gray-500 text-sm">No active synergies</p>
                ) : (
                  activeSynergies.map(s => (
                    <div key={s.name} className="text-sm">
                      <p className="text-purple-400 font-semibold">{s.name}</p>
                      <p className="text-gray-400 text-xs">{s.effect}</p>
                    </div>
                  ))
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2">BACKPACK</h3>
              <div className="grid grid-cols-4 gap-1">
                {inventory.backpack.slice(0, 8).map((item, i) => renderItemSlot(item, 'Backpack', i))}
                {inventory.backpack.length === 0 && (
                  <p className="text-gray-500 text-sm col-span-4">Empty</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Controls hint */}
          <div className="mt-4 text-center text-gray-500 text-xs">
            <p>Press <span className="text-gray-300">I</span> to close | <span className="text-gray-300">K</span> for Skills | <span className="text-gray-300">1-4</span> to use consumables</p>
          </div>
        </div>
      </div>
    )
  }

  // Skill tree screen
  const renderSkillTree = () => {
    const skills = skillsRef.current
    
    const renderSkillNode = (skill: Skill) => {
      const isUnlocked = skills.unlocked.includes(skill.id)
      const canUnlock = !isUnlocked && 
                       skills.points >= skill.cost && 
                       (!skill.requires || skill.requires.every(r => skills.unlocked.includes(r)))
      
      const branchColors: Record<SkillBranch, string> = {
        warlord: isUnlocked ? 'border-red-500 bg-red-900/50' : canUnlock ? 'border-red-400 bg-red-900/30' : 'border-gray-600 bg-gray-800/50',
        spellblade: isUnlocked ? 'border-blue-500 bg-blue-900/50' : canUnlock ? 'border-blue-400 bg-blue-900/30' : 'border-gray-600 bg-gray-800/50',
        shadow: isUnlocked ? 'border-cyan-500 bg-cyan-900/50' : canUnlock ? 'border-cyan-400 bg-cyan-900/30' : 'border-gray-600 bg-gray-800/50'
      }
      
      return (
        <div 
          key={skill.id}
          onClick={() => canUnlock && unlockSkill(skill.id)}
          className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${branchColors[skill.branch]} ${canUnlock ? 'hover:scale-105' : ''}`}
          title={`${skill.name}\n${skill.description}\nCost: ${skill.cost} points`}
        >
          <div className="text-2xl text-center">{skill.icon}</div>
          <p className="text-xs text-center mt-1 text-gray-300">{skill.name}</p>
          {isUnlocked && <p className="text-xs text-center text-green-400">✓</p>}
          {!isUnlocked && <p className="text-xs text-center text-gray-500">{skill.cost}pt</p>}
        </div>
      )
    }
    
    const renderBranch = (branch: SkillBranch, title: string, color: string) => {
      const branchSkills = SKILL_DATABASE.filter(s => s.branch === branch)
      const tier1 = branchSkills.filter(s => s.tier === 1)
      const tier2 = branchSkills.filter(s => s.tier === 2)
      const tier3 = branchSkills.filter(s => s.tier === 3)
      
      return (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className={`text-lg font-bold ${color} mb-4 text-center`}>{title}</h3>
          
          <div className="flex justify-center gap-2 mb-2">
            {tier1.map(s => renderSkillNode(s))}
          </div>
          <div className="flex justify-center gap-2 mb-2">
            {tier2.map(s => renderSkillNode(s))}
          </div>
          <div className="flex justify-center">
            {tier3.map(s => renderSkillNode(s))}
          </div>
        </div>
      )
    }
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-50">
        <div className="bg-gray-900 border-2 border-blue-600 rounded-xl p-6 max-w-4xl w-full mx-4 shadow-2xl shadow-blue-500/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-blue-400">SKILL TREE</h2>
            <div className="flex items-center gap-4">
              <span className="text-lg text-gray-300">Skill Points: <span className="text-yellow-400 font-bold">{skills.points}</span></span>
              <button 
                onClick={() => {
                  setShowSkillTree(false)
                  gameStateRef.current = 'playing'
                  setGameState('playing')
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {renderBranch('warlord', '⚔️ WARLORD', 'text-red-400')}
            {renderBranch('spellblade', '✨ SPELLBLADE', 'text-blue-400')}
            {renderBranch('shadow', '👤 SHADOW', 'text-cyan-400')}
          </div>
          
          {/* Unlocked skills summary */}
          <div className="mt-4 bg-gray-800 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">UNLOCKED SKILLS ({skills.unlocked.length})</h4>
            <div className="flex flex-wrap gap-2">
              {skills.unlocked.length === 0 ? (
                <p className="text-gray-500 text-sm">No skills unlocked yet</p>
              ) : (
                skills.unlocked.map(id => {
                  const skill = SKILL_DATABASE.find(s => s.id === id)
                  return skill ? (
                    <span key={id} className="text-sm bg-gray-700 px-2 py-1 rounded">
                      {skill.icon} {skill.name}
                    </span>
                  ) : null
                })
              )}
            </div>
          </div>
          
          {/* Controls hint */}
          <div className="mt-4 text-center text-gray-500 text-xs">
            <p>Press <span className="text-gray-300">K</span> to close | <span className="text-gray-300">I</span> for Inventory | Click to unlock skills</p>
          </div>
        </div>
      </div>
    )
  }

  // Item choice modal (after boss kills, treasure rooms)
  const renderItemChoice = () => {
    if (itemChoice.length === 0) return null
    
    const rarityColors: Record<ItemRarity, string> = {
      common: 'border-gray-500 hover:bg-gray-700',
      uncommon: 'border-green-500 hover:bg-green-900/50',
      rare: 'border-blue-500 hover:bg-blue-900/50',
      legendary: 'border-purple-500 hover:bg-purple-900/50',
      curse: 'border-red-500 hover:bg-red-900/50'
    }
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-50">
        <div className="bg-gray-900 border-2 border-yellow-600 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl shadow-yellow-500/20">
          <h2 className="text-2xl font-bold text-yellow-400 text-center mb-6">CHOOSE YOUR REWARD</h2>
          
          <div className="grid grid-cols-3 gap-4">
            {itemChoice.map((item, i) => (
              <div 
                key={i}
                onClick={() => {
                  equipItem(item)
                  setItemChoice([])
                  setShowItemChoice(false)
                  gameStateRef.current = 'playing'
                  setGameState('playing')
                }}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${rarityColors[item.rarity]}`}
              >
                <div className="text-4xl text-center mb-2">{item.icon}</div>
                <p className="text-lg font-bold text-center text-white">{item.name}</p>
                <p className="text-xs text-center text-gray-400 mt-1">{item.rarity.toUpperCase()}</p>
                <p className="text-xs text-center text-gray-300 mt-2">{item.description}</p>
              </div>
            ))}
          </div>
          
          <p className="mt-4 text-center text-gray-500 text-sm">Click an item to equip it</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block" />
      
      {gameState === 'menu' && renderMenu()}
      {gameState === 'dialogue' && showStory && renderDialogue()}
      {gameState === 'playing' && showStory && renderStory()}
      {gameState === 'paused' && !showInventory && !showSkillTree && renderPause()}
      {gameState === 'game_over' && renderGameOver()}
      {gameState === 'victory' && renderVictory()}
      
      {/* Inventory and Skill Tree overlays */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {showInventory && renderInventory()}
      {/* eslint-disable-next-line react-hooks/refs */}
      {showSkillTree && renderSkillTree()}
      {showItemChoice && renderItemChoice()}
      
      {/* HUD controls hint */}
      {gameState === 'playing' && (
        <div className="fixed bottom-2 right-2 text-gray-600 text-xs bg-black/50 px-2 py-1 rounded">
          <span className="text-gray-400">I</span> Inventory | <span className="text-gray-400">K</span> Skills
        </div>
      )}
    </div>
  )
}
