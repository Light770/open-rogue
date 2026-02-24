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
  dashTimer: number
  dashDirection: Vector2
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

type TileType = 'wall' | 'floor' | 'door' | 'stairs' | 'water' | 'lava' | 'spikes' | 'fire_pit'
type RoomType = 'start' | 'normal' | 'treasure' | 'boss' | 'secret' | 'event' | 'elite'
type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'special' | 'dormant' | 'telegraph' | 'recover'
type EnemyType = 'skeleton' | 'slime' | 'spider' | 'wraith' | 'bone_knight' | 'shadow_bat' | 'corrupted_soul' | 'void_walker' | 'abyss_terror' | 'boss_grak' | 'boss_seraphine' | 'boss_malachar' | 'elite_skeleton' | 'elite_wraith' | 'elite_void_walker'
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
  backpack: (GameItem | null)[] // 8 slots
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

type GameState = 'menu' | 'intro' | 'playing' | 'paused' | 'dialogue' | 'level_complete' | 'game_over' | 'victory' | 'boss_intro' | 'run_summary'

// ==================== ACHIEVEMENT SYSTEM ====================
interface Achievement {
  id: string
  name: string
  description: string
  unlocked: boolean
  icon: string
}

// ==================== RUN STATISTICS ====================
interface RunStats {
  kills: number
  damageDealt: number
  damageTaken: number
  bossesDefeated: number
  itemsCollected: number
  highestCombo: number
  floorsCleared: number
  timeElapsed: number
  criticalHits: number
  dashesUsed: number
}

// ==================== UNLOCK SYSTEM ====================
interface PermanentUnlocks {
  startingWeapons: string[]
  startingItems: string[]
  achievements: string[]
  totalSouls: number
  runsCompleted: number
  bossesKilled: number
}

// ==================== ROOM EVENT ====================
interface RoomEvent {
  type: 'merchant' | 'shrine' | 'trapped_adventurer' | 'mystery_box'
  x: number
  y: number
  used: boolean
}

// ==================== SETTINGS SYSTEM ====================
interface GameSettings {
  masterVolume: number // 0-1
  sfxVolume: number
  musicVolume: number
  screenShake: boolean
  showDamageNumbers: boolean
  showMinimap: boolean
  particleQuality: 'low' | 'medium' | 'high'
  showTutorial: boolean
}

// ==================== TUTORIAL SYSTEM ====================
interface TutorialStep {
  id: string
  title: string
  description: string
  highlight?: string // element to highlight
  action?: string // expected action to complete
}

// ==================== MOBILE CONTROLS ====================
interface TouchControl {
  active: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
}

// ==================== SAVE DATA ====================
interface SaveData {
  permanentUnlocks: PermanentUnlocks
  achievements: string[]
  settings: GameSettings
  timestamp: number
}

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

// Default settings
const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.5,
  screenShake: true,
  showDamageNumbers: true,
  showMinimap: true,
  particleQuality: 'high',
  showTutorial: true
}

// Tutorial steps for new players
const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'move', title: 'Movement', description: 'Use WASD or arrow keys to move around the dungeon', action: 'move' },
  { id: 'attack', title: 'Combat', description: 'Press SPACE or J to attack enemies nearby', action: 'attack' },
  { id: 'dash', title: 'Dash', description: 'Press SHIFT to dash quickly. Use it to dodge attacks!', action: 'dash' },
  { id: 'inventory', title: 'Inventory', description: 'Press I to open your inventory and equip items', highlight: 'inventory' },
  { id: 'skills', title: 'Skills', description: 'Press K to open the skill tree and unlock powerful abilities', highlight: 'skills' },
  { id: 'minimap', title: 'Navigation', description: 'Check the minimap in the corner. Gold = treasure, Red = boss!', highlight: 'minimap' }
]

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

// Enemy data - balanced for challenging but fair gameplay
// Speed is in pixels-per-second for smooth movement
const ENEMY_DATA: Record<EnemyType, { health: number; damage: number; speed: number; xp: number; color: string }> = {
  // Tier 1 enemies (Floors 1-3) - Introduction difficulty
  skeleton: { health: 40, damage: 12, speed: 100, xp: 12, color: '#d4d4aa' },
  slime: { health: 30, damage: 8, speed: 90, xp: 8, color: '#44ff44' },
  spider: { health: 35, damage: 15, speed: 180, xp: 18, color: '#8800aa' },
  // Tier 2 enemies (Floors 4-6) - Moderate difficulty
  wraith: { health: 55, damage: 20, speed: 130, xp: 28, color: '#8888ff' },
  bone_knight: { health: 80, damage: 25, speed: 85, xp: 38, color: '#aaaaaa' },
  shadow_bat: { health: 25, damage: 12, speed: 200, xp: 15, color: '#330033' },
  // Tier 3 enemies (Floors 7-10) - High difficulty
  corrupted_soul: { health: 70, damage: 22, speed: 140, xp: 42, color: '#ff44ff' },
  void_walker: { health: 90, damage: 30, speed: 130, xp: 55, color: '#4400aa' },
  abyss_terror: { health: 120, damage: 35, speed: 95, xp: 70, color: '#aa0044' },
  // Elite enemies - Found in elite rooms, drop guaranteed rare items
  elite_skeleton: { health: 180, damage: 22, speed: 120, xp: 80, color: '#ffdd44' },
  elite_wraith: { health: 150, damage: 30, speed: 150, xp: 100, color: '#44ffff' },
  elite_void_walker: { health: 200, damage: 40, speed: 140, xp: 120, color: '#ff44ff' },
  // Bosses - Significant challenges
  boss_grak: { health: 500, damage: 30, speed: 85, xp: 150, color: '#aa6600' },
  boss_seraphine: { health: 650, damage: 35, speed: 110, xp: 250, color: '#aa88ff' },
  boss_malachar: { health: 900, damage: 45, speed: 95, xp: 400, color: '#440044' }
}

// ==================== ITEM DATABASE ====================
// Items are balanced for meaningful choices and risk/reward
// Icons use generated images from /icons/ folder
const ITEM_DATABASE: GameItem[] = [
  // === WEAPONS ===
  {
    id: 'twin_blades',
    name: 'Twin Blades',
    category: 'weapon',
    rarity: 'rare',
    description: 'Attack twice for 55% damage each. Speed over power.',
    icon: '/icons/weapons/iron_sword.png',
    effects: [
      { type: 'passive', special: 'twin_strike' }
    ]
  },
  {
    id: 'heavy_cleaver',
    name: 'Heavy Cleaver',
    category: 'weapon',
    rarity: 'rare',
    description: '+60% damage, -40% attack speed, cleaves nearby enemies.',
    icon: '/icons/weapons/thunder_hammer.png',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 0.6, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'attackSpeed', value: 0.6, operation: 'multiply' },
      { type: 'passive', special: 'cleave' }
    ]
  },
  {
    id: 'rapier',
    name: 'Rapier',
    category: 'weapon',
    rarity: 'rare',
    description: '+35% attack speed, -15% damage, +20% crit chance.',
    icon: '/icons/weapons/shadow_dagger.png',
    effects: [
      { type: 'stat_modifier', stat: 'attackSpeed', value: 0.35, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'damage', value: -0.15, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'critChance', value: 0.2, operation: 'add' }
    ]
  },
  {
    id: 'soul_reaper',
    name: 'Soul Reaper',
    category: 'weapon',
    rarity: 'legendary',
    description: 'Killed enemies drop soul orbs that heal and restore mana.',
    icon: '/icons/weapons/blood_reaver.png',
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
    description: 'Attacks ignore 40% of enemy defense.',
    icon: '/icons/weapons/arcane_staff.png',
    effects: [
      { type: 'passive', special: 'armor_penetration', value: 0.4 }
    ]
  },
  {
    id: 'blood_debt',
    name: 'Blood Debt',
    category: 'weapon',
    rarity: 'legendary',
    description: '+45% damage, but lose 2 HP per attack.',
    icon: '/icons/weapons/flame_blade.png',
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
    icon: '/icons/artifacts/arcane_orb.png',
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
    icon: '/icons/artifacts/ankh_of_eternity.png',
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
    icon: '/icons/skills/ice_barrier.png',
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
    icon: '/icons/artifacts/deaths_embrace.png',
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
    icon: '/icons/skills/lifesteal.png',
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
    icon: '/icons/artifacts/chronoshift_hourglass.png',
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
    icon: '/icons/artifacts/arcane_orb.png',
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
    icon: '/icons/curses/cursed_heart.png',
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
    icon: '/icons/curses/bleeding_eye.png',
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
    icon: '/icons/curses/chains_of_burden.png',
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
    icon: '/icons/trinkets/lucky_coin.png',
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
    icon: '/icons/skills/critical_strike.png',
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
    icon: '/icons/consumables/bomb.png',
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
    icon: '/icons/skills/blink.png',
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
    icon: '/icons/skills/ice_barrier.png',
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
    icon: '/icons/consumables/mana_potion.png',
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
    icon: '/icons/consumables/scroll_of_light.png',
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
    icon: '/icons/consumables/scroll_of_light.png',
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
    icon: '/icons/trinkets/dragon_scale.png',
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
    icon: '/icons/skills/swiftness.png',
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
    icon: '/icons/trinkets/lucky_coin.png',
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
    icon: '/icons/trinkets/emerald_ring.png',
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
    icon: '/icons/skills/arcane_power.png',
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
    icon: '/icons/skills/strength.png',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 3, operation: 'add' }
    ]
  },

  // === NEW WEAPONS ===
  {
    id: 'phantom_blade',
    name: 'Phantom Blade',
    category: 'weapon',
    rarity: 'legendary',
    description: 'Attacks pass through walls. +20% attack speed.',
    icon: '/icons/weapons/shadow_dagger.png',
    effects: [
      { type: 'passive', special: 'phase_attack' },
      { type: 'stat_modifier', stat: 'attackSpeed', value: 0.2, operation: 'multiply' }
    ]
  },
  {
    id: 'storm_breaker',
    name: 'Storm Breaker',
    category: 'weapon',
    rarity: 'rare',
    description: '15% chance to chain lightning to 2 nearby enemies.',
    icon: '/icons/weapons/thunder_hammer.png',
    effects: [
      { type: 'on_hit', special: 'chain_lightning', value: 0.15 }
    ]
  },
  {
    id: 'frost_edge',
    name: 'Frost Edge',
    category: 'weapon',
    rarity: 'rare',
    description: 'Hits slow enemies by 30% for 2 seconds.',
    icon: '/icons/weapons/arcane_staff.png',
    effects: [
      { type: 'on_hit', special: 'slow', value: 0.3, trigger: '2' }
    ]
  },

  // === NEW ARTIFACTS ===
  {
    id: 'mirror_shield',
    name: 'Mirror Shield',
    category: 'artifact',
    rarity: 'rare',
    description: 'First attack each room is reflected back at the attacker.',
    icon: '/icons/skills/ice_barrier.png',
    effects: [
      { type: 'passive', special: 'first_attack_reflect' }
    ]
  },
  {
    id: 'berserker_glove',
    name: 'Berserker Glove',
    category: 'artifact',
    rarity: 'rare',
    description: '+5% damage for each hit taken in the room (max 50%).',
    icon: '/icons/skills/fire_fury.png',
    effects: [
      { type: 'on_damage_taken', special: 'rage_stacks', value: 0.05 }
    ]
  },
  {
    id: 'ghost_cloak',
    name: 'Ghost Cloak',
    category: 'artifact',
    rarity: 'legendary',
    description: 'Dash grants 1 second of invincibility.',
    icon: '/icons/skills/stealth.png',
    effects: [
      { type: 'passive', special: 'dash_invincible' }
    ]
  },
  {
    id: 'magnet_ring',
    name: 'Magnet Ring',
    category: 'artifact',
    rarity: 'uncommon',
    description: 'Automatically collect nearby items and XP.',
    icon: '/icons/trinkets/emerald_ring.png',
    effects: [
      { type: 'passive', special: 'magnet' }
    ]
  },
  {
    id: 'crit_gem',
    name: 'Critical Gem',
    category: 'artifact',
    rarity: 'rare',
    description: 'Critical hits deal 3x damage instead of 2x.',
    icon: '/icons/skills/critical_strike.png',
    effects: [
      { type: 'passive', special: 'crit_multiplier', value: 3 }
    ]
  },

  // === NEW TRINKETS ===
  {
    id: 'old_coin',
    name: 'Old Coin',
    category: 'trinket',
    rarity: 'common',
    description: '+5% chance for enemies to drop health potions.',
    icon: '/icons/trinkets/lucky_coin.png',
    effects: [
      { type: 'passive', special: 'potion_drop', value: 0.05 }
    ]
  },
  {
    id: 'rusty_key',
    name: 'Rusty Key',
    category: 'trinket',
    rarity: 'common',
    description: '+15% chance for treasure rooms to appear.',
    icon: '/icons/trinkets/lucky_coin.png',
    effects: [
      { type: 'passive', special: 'more_treasure' }
    ]
  },
  {
    id: 'warrior_pendant',
    name: 'Warrior Pendant',
    category: 'trinket',
    rarity: 'uncommon',
    description: '+8 base damage, -5% speed.',
    icon: '/icons/skills/strength.png',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 8, operation: 'add' },
      { type: 'stat_modifier', stat: 'speed', value: -0.05, operation: 'multiply' }
    ]
  },
  {
    id: 'assassin_ring',
    name: 'Assassin Ring',
    category: 'trinket',
    rarity: 'uncommon',
    description: '+10% crit chance, -10% damage.',
    icon: '/icons/skills/critical_strike.png',
    effects: [
      { type: 'stat_modifier', stat: 'critChance', value: 0.1, operation: 'add' },
      { type: 'stat_modifier', stat: 'damage', value: -0.1, operation: 'multiply' }
    ]
  },

  // === NEW CURSES ===
  {
    id: 'shadow_pact',
    name: 'Shadow Pact',
    category: 'curse',
    rarity: 'curse',
    description: '+80% damage, but your health drains slowly (2 HP/sec).',
    icon: '/icons/curses/cursed_heart.png',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 0.8, operation: 'multiply' },
      { type: 'passive', special: 'health_drain', value: 2 }
    ]
  },
  {
    id: 'chaos_blessing',
    name: 'Chaos Blessing',
    category: 'curse',
    rarity: 'curse',
    description: 'Randomly gain +50% damage OR -30% damage each room.',
    icon: '/icons/artifacts/arcane_orb.png',
    effects: [
      { type: 'passive', special: 'random_damage' }
    ]
  },

  // === NEW CONSUMABLES ===
  {
    id: 'mega_bomb',
    name: 'Mega Bomb',
    category: 'consumable',
    rarity: 'rare',
    description: 'Deal 200 damage to all enemies on screen.',
    icon: '/icons/consumables/bomb.png',
    effects: [
      { type: 'active', special: 'mega_explosion', value: 200 }
    ]
  },
  {
    id: 'shield_potion',
    name: 'Shield Potion',
    category: 'consumable',
    rarity: 'uncommon',
    description: 'Gain a shield that absorbs 50 damage for 10 seconds.',
    icon: '/icons/consumables/health_potion.png',
    effects: [
      { type: 'active', special: 'shield', value: 50 }
    ]
  }
]

// ==================== SKILL TREE DATABASE ====================
// Skills are balanced for meaningful choices and progression
// Icons use generated images from /icons/skills/ folder
const SKILL_DATABASE: Skill[] = [
  // === WARLORD BRANCH (Strength/Melee) ===
  {
    id: 'heavy_strikes',
    name: 'Heavy Strikes',
    branch: 'warlord',
    tier: 1,
    cost: 1,
    description: '+20% damage, -15% attack speed.',
    icon: '/icons/skills/strength.png',
    effects: [
      { type: 'stat_modifier', stat: 'damage', value: 0.2, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'attackSpeed', value: -0.15, operation: 'multiply' }
    ]
  },
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    branch: 'warlord',
    tier: 1,
    cost: 2,
    description: 'Heal 4% of damage dealt.',
    icon: '/icons/skills/lifesteal.png',
    effects: [
      { type: 'stat_modifier', stat: 'lifesteal', value: 0.04, operation: 'add' }
    ]
  },
  {
    id: 'fortress',
    name: 'Fortress',
    branch: 'warlord',
    tier: 1,
    cost: 1,
    description: '+25% max HP, -12% speed.',
    icon: '/icons/skills/vitality.png',
    effects: [
      { type: 'stat_modifier', stat: 'maxHealth', value: 0.25, operation: 'multiply' },
      { type: 'stat_modifier', stat: 'speed', value: -0.12, operation: 'multiply' }
    ]
  },
  {
    id: 'berserker',
    name: 'Berserker',
    branch: 'warlord',
    tier: 2,
    cost: 2,
    description: '+40% damage when below 35% HP.',
    icon: '/icons/skills/fire_fury.png',
    effects: [
      { type: 'passive', special: 'low_hp_damage', trigger: '0.35', value: 0.4 }
    ],
    requires: ['heavy_strikes']
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    branch: 'warlord',
    tier: 2,
    cost: 2,
    description: 'Reduce all damage taken by 15%.',
    icon: '/icons/skills/ice_barrier.png',
    effects: [
      { type: 'stat_modifier', stat: 'armor', value: 0.15, operation: 'add' }
    ],
    requires: ['fortress']
  },
  {
    id: 'last_stand',
    name: 'Last Stand',
    branch: 'warlord',
    tier: 3,
    cost: 3,
    description: 'Survive a fatal blow once per floor at 1 HP.',
    icon: '/icons/skills/critical_strike.png',
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
    description: 'Attacks cost 4 mana but deal +35% damage.',
    icon: '/icons/skills/arcane_power.png',
    effects: [
      { type: 'passive', special: 'mana_attack', value: 4 },
      { type: 'stat_modifier', stat: 'damage', value: 0.35, operation: 'multiply' }
    ]
  },
  {
    id: 'mana_siphon',
    name: 'Mana Siphon',
    branch: 'spellblade',
    tier: 1,
    cost: 2,
    description: 'Restore 2 mana per hit.',
    icon: '/icons/consumables/mana_potion.png',
    effects: [
      { type: 'on_hit', special: 'mana_gain', value: 2 }
    ]
  },
  {
    id: 'soul_harvester',
    name: 'Soul Harvester',
    branch: 'spellblade',
    tier: 1,
    cost: 1,
    description: 'Gain 2 mana per enemy kill.',
    icon: '/icons/artifacts/deaths_embrace.png',
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
    description: '20% chance to inflict burn, freeze, or shock.',
    icon: '/icons/skills/fire_fury.png',
    effects: [
      { type: 'on_hit', special: 'elemental_effect', value: 0.2 }
    ],
    requires: ['arcane_strike']
  },
  {
    id: 'spell_echo',
    name: 'Spell Echo',
    branch: 'spellblade',
    tier: 2,
    cost: 2,
    description: '12% chance to attack twice instantly.',
    icon: '/icons/skills/spellblade_branch.png',
    effects: [
      { type: 'passive', special: 'double_attack', value: 0.12 }
    ],
    requires: ['mana_siphon']
  },
  {
    id: 'archmage',
    name: 'Archmage',
    branch: 'spellblade',
    tier: 3,
    cost: 3,
    description: '-25% mana costs for all abilities.',
    icon: '/icons/skills/spellblade_branch.png',
    effects: [
      { type: 'stat_modifier', stat: 'manaCost', value: 0.25, operation: 'multiply' }
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
    description: '+20% movement speed.',
    icon: '/icons/skills/swiftness.png',
    effects: [
      { type: 'stat_modifier', stat: 'speed', value: 0.2, operation: 'multiply' }
    ]
  },
  {
    id: 'shadow_step',
    name: 'Shadow Step',
    branch: 'shadow',
    tier: 1,
    cost: 2,
    description: 'Dash has 2 charges and 40% less cooldown.',
    icon: '/icons/skills/shadow_branch.png',
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
    description: '15% dodge chance.',
    icon: '/icons/skills/stealth.png',
    effects: [
      { type: 'stat_modifier', stat: 'dodge', value: 0.15, operation: 'add' }
    ]
  },
  {
    id: 'backstab',
    name: 'Backstab',
    branch: 'shadow',
    tier: 2,
    cost: 2,
    description: '+75% damage when attacking from behind.',
    icon: '/icons/weapons/shadow_dagger.png',
    effects: [
      { type: 'passive', special: 'backstab_damage', value: 0.75 }
    ],
    requires: ['swift_feet']
  },
  {
    id: 'vanish',
    name: 'Vanish',
    branch: 'shadow',
    tier: 2,
    cost: 2,
    description: 'After killing an enemy, become invisible for 1.5 seconds.',
    icon: '/icons/skills/stealth.png',
    effects: [
      { type: 'on_kill', special: 'invisibility', value: 1.5 }
    ],
    requires: ['shadow_step']
  },
  {
    id: 'phantom',
    name: 'Phantom',
    branch: 'shadow',
    tier: 3,
    cost: 3,
    description: '8% chance to phase through any attack.',
    icon: '/icons/skills/shadow_branch.png',
    effects: [
      { type: 'passive', special: 'phase_through', value: 0.08 }
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

  // ===== NEW: Core Feel & Feedback Systems =====
  const hitPauseRef = useRef(0) // Hit pause duration
  const lowHpPulseRef = useRef(0) // Low HP heartbeat effect
  const bossIntroRef = useRef<{ active: boolean; bossName: string; bossTitle: string; timer: number }>({ active: false, bossName: '', bossTitle: '', timer: 0 })
  const damageFlashRef = useRef(0) // Red flash on damage

  // ===== NEW: Run Statistics =====
  const runStatsRef = useRef<RunStats>({
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
    bossesDefeated: 0,
    itemsCollected: 0,
    highestCombo: 0,
    floorsCleared: 0,
    timeElapsed: 0,
    criticalHits: 0,
    dashesUsed: 0
  })
  const [showRunSummary, setShowRunSummary] = useState(false)

  // ===== NEW: Achievement System =====
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: 'first_blood', name: 'First Blood', description: 'Defeat your first enemy', unlocked: false, icon: '⚔️' },
    { id: 'combo_master', name: 'Combo Master', description: 'Reach a 10x combo', unlocked: false, icon: '🔥' },
    { id: 'boss_slayer', name: 'Boss Slayer', description: 'Defeat a boss', unlocked: false, icon: '👑' },
    { id: 'survivor', name: 'Survivor', description: 'Clear 5 floors', unlocked: false, icon: '💪' },
    { id: 'collector', name: 'Collector', description: 'Collect 10 items in one run', unlocked: false, icon: '📦' },
    { id: 'glass_cannon', name: 'Glass Cannon', description: 'Defeat a boss with Glass Cannon curse', unlocked: false, icon: '💔' },
    { id: 'speedrun', name: 'Speed Demon', description: 'Clear floor 10 in under 15 minutes', unlocked: false, icon: '⚡' },
    { id: 'perfectionist', name: 'Perfectionist', description: 'Defeat a boss without taking damage', unlocked: false, icon: '✨' }
  ])

  // ===== NEW: Permanent Unlocks (Meta-progression) =====
  const [permanentUnlocks, setPermanentUnlocks] = useState<PermanentUnlocks>({
    startingWeapons: [],
    startingItems: [],
    achievements: [],
    totalSouls: 0,
    runsCompleted: 0,
    bossesKilled: 0
  })
  const [isHydrated, setIsHydrated] = useState(false)

  // ===== NEW: Room Events =====
  const roomEventsRef = useRef<RoomEvent[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [currentEvent, setCurrentEvent] = useState<RoomEvent | null>(null)

  // ===== NEW: Endless Mode =====
  const [endlessMode, setEndlessMode] = useState(false)
  const endlessCycleRef = useRef(1)

  // ===== PRODUCTION: Settings System =====
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)

  // ===== PRODUCTION: Tutorial System =====
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const tutorialCompletedRef = useRef<Set<string>>(new Set())

  // ===== PRODUCTION: Audio System =====
  const audioContextRef = useRef<AudioContext | null>(null)
  const soundEnabledRef = useRef(true)

  // ===== PRODUCTION: Mobile Touch Controls =====
  const [isMobile, setIsMobile] = useState(false)
  const touchJoystickRef = useRef<TouchControl>({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 })
  const touchAttackRef = useRef(false)
  const touchDashRef = useRef(false)

  // Inventory and Skill System State
  const [showInventory, setShowInventory] = useState(false)
  const [showSkillTree, setShowSkillTree] = useState(false)
  const [itemChoice, setItemChoice] = useState<GameItem[]>([])
  const [showItemChoice, setShowItemChoice] = useState(false)
  const [activeSynergies, setActiveSynergies] = useState<ActiveSynergy[]>([])
  const [selectedSlot, setSelectedSlot] = useState<{ category: string, index?: number } | null>(null)
  const [inventoryVersion, setInventoryVersion] = useState(0)
  
  // Inventory ref (persists across floors)
  const inventoryRef = useRef<Inventory>({
    weapon: null,
    artifacts: [null, null, null],
    trinket: null,
    curse: null,
    consumables: [null, null, null, null],
    backpack: [null, null, null, null, null, null, null, null]
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
  
  // Game difficulty configuration
  const DIFFICULTY = {
    // Player base stats
    playerBaseHealth: 80,
    playerBaseMana: 40,
    playerBaseDamage: 12,
    playerBaseSpeed: 160,
    playerBaseCritChance: 0.05,
    // Player cooldowns
    dashCooldown: 2.0,
    dashManaCost: 15,
    dashSpeedMultiplier: 2.5,
    attackCooldown: 0.45,
    invincibilityDuration: 0.25,
    // Level up scaling
    healthPerLevel: 8,
    damagePerLevel: 2,
    critPerLevel: 0.015,
    manaRegenRate: 4,
    // Enemy scaling per floor
    enemyHealthScaling: 0.15,
    enemyDamageScaling: 0.10,
    // Room generation
    baseEnemiesPerRoom: 2,
    maxExtraEnemies: 2,
    enemiesPerFloorBonus: 0.3,
    // Economy
    xpScaling: 1.4
  }

  // Game data refs
  const playerRef = useRef<Player>({
    x: 0, y: 0, width: 24, height: 24,
    velocityX: 0, velocityY: 0, active: true,
    health: 80, maxHealth: 80,
    mana: 40, maxMana: 40,
    attackCooldown: 0, dashCooldown: 0,
    invincibleTime: 0, damage: 12, speed: 160,
    level: 1, xp: 0, xpToNext: 45,
    facing: { x: 1, y: 0 },
    isAttacking: false, attackFrame: 0,
    souls: 0, hasKey: false,
    combo: 0, comboTimer: 0, critChance: 0.05,
    dashTimer: 0, dashDirection: { x: 0, y: 0 }
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

  // ===== PRODUCTION: Audio System =====
  const playSound = useCallback((type: 'hit' | 'attack' | 'pickup' | 'levelup' | 'dash' | 'damage' | 'boss' | 'death' | 'menu' | 'step') => {
    if (!soundEnabledRef.current || settings.masterVolume === 0) return

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      const volume = settings.masterVolume * settings.sfxVolume

      // Sound definitions with different waveforms and frequencies
      switch (type) {
        case 'attack':
          oscillator.type = 'sawtooth'
          oscillator.frequency.setValueAtTime(220, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.1)
          gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.1)
          break
        case 'hit':
          oscillator.type = 'square'
          oscillator.frequency.setValueAtTime(150, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15)
          gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.15)
          break
        case 'damage':
          oscillator.type = 'sawtooth'
          oscillator.frequency.setValueAtTime(100, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3)
          gainNode.gain.setValueAtTime(volume * 0.5, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.3)
          break
        case 'pickup':
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(440, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1)
          gainNode.gain.setValueAtTime(volume * 0.25, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.15)
          break
        case 'levelup':
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(523, ctx.currentTime)
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
          gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.4)
          break
        case 'dash':
          oscillator.type = 'triangle'
          oscillator.frequency.setValueAtTime(300, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1)
          gainNode.gain.setValueAtTime(volume * 0.2, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.1)
          break
        case 'boss':
          oscillator.type = 'sawtooth'
          oscillator.frequency.setValueAtTime(80, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5)
          gainNode.gain.setValueAtTime(volume * 0.6, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.5)
          break
        case 'death':
          oscillator.type = 'sawtooth'
          oscillator.frequency.setValueAtTime(200, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.8)
          gainNode.gain.setValueAtTime(volume * 0.5, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.8)
          break
        case 'menu':
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(660, ctx.currentTime)
          gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.05)
          break
        case 'step':
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(80 + Math.random() * 20, ctx.currentTime)
          gainNode.gain.setValueAtTime(volume * 0.05, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.05)
          break
      }
    } catch {
      // Audio not supported, fail silently
    }
  }, [settings.masterVolume, settings.sfxVolume])

  // ===== PRODUCTION: Update settings =====
  const updateSettings = useCallback((newSettings: Partial<GameSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem('abyss_settings', JSON.stringify(updated))
      return updated
    })
  }, [])

  // ===== PRODUCTION: Save game progress =====
  const saveProgress = useCallback(() => {
    const saveData: SaveData = {
      permanentUnlocks,
      achievements: achievements.filter(a => a.unlocked).map(a => a.id),
      settings,
      timestamp: Date.now()
    }
    localStorage.setItem('abyss_save', JSON.stringify(saveData))
  }, [permanentUnlocks, achievements, settings])

  // ===== PRODUCTION: Tutorial completion tracking =====
  const completeTutorialStep = useCallback((stepId: string) => {
    if (tutorialCompletedRef.current.has(stepId)) return
    tutorialCompletedRef.current.add(stepId)

    const nextStep = tutorialStep + 1
    if (nextStep < TUTORIAL_STEPS.length) {
      setTutorialStep(nextStep)
    } else {
      setShowTutorial(false)
      updateSettings({ showTutorial: false })
    }
  }, [tutorialStep, updateSettings])

  // ===== PRODUCTION: Load saved data after mount (fixes hydration) =====
  useEffect(() => {
    // Load saved unlocks
    try {
      const savedUnlocks = localStorage.getItem('abyss_unlocks')
      if (savedUnlocks) {
        setPermanentUnlocks(JSON.parse(savedUnlocks))
      }
    } catch {
      // Ignore localStorage errors
    }

    // Load saved settings
    try {
      const savedSettings = localStorage.getItem('abyss_settings')
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }))
      }
    } catch {
      // Ignore localStorage errors
    }

    // Load saved achievements
    try {
      const savedAchievements = localStorage.getItem('abyss_achievements')
      if (savedAchievements) {
        const unlockedIds = JSON.parse(savedAchievements) as string[]
        setAchievements(prev => prev.map(a => ({
          ...a,
          unlocked: unlockedIds.includes(a.id)
        })))
      }
    } catch {
      // Ignore localStorage errors
    }

    setIsHydrated(true)
  }, [])

  // ===== PRODUCTION: Detect mobile device =====
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
      
      // Enemy count scales with floor number for increased difficulty
      const floorBonus = Math.floor(floorNum * DIFFICULTY.enemiesPerFloorBonus)
      const enemyCount = room.type === 'boss' ? 1 : 
                         room.type === 'treasure' ? 0 : 
                         DIFFICULTY.baseEnemiesPerRoom + floorBonus + Math.floor(random() * DIFFICULTY.maxExtraEnemies)
      
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
          // Regular enemies based on floor with more variety
          if (floorNum <= 3) {
            const types: EnemyType[] = ['skeleton', 'slime', 'spider']
            enemyType = types[Math.floor(random() * types.length)]
          } else if (floorNum <= 6) {
            // Mix of tier 1 and tier 2 enemies
            const types: EnemyType[] = ['skeleton', 'wraith', 'bone_knight', 'shadow_bat', 'spider']
            enemyType = types[Math.floor(random() * types.length)]
          } else {
            // Mix of all tiers, heavier on tier 3
            const types: EnemyType[] = ['corrupted_soul', 'void_walker', 'abyss_terror', 'bone_knight', 'wraith']
            enemyType = types[Math.floor(random() * types.length)]
          }
        }
        
        const data = ENEMY_DATA[enemyType]
        
        // Enemy scaling with floor - stronger enemies on higher floors
        const healthScale = 1 + (floorNum - 1) * DIFFICULTY.enemyHealthScaling
        const damageScale = 1 + (floorNum - 1) * DIFFICULTY.enemyDamageScaling
        
        enemiesRef.current.push({
          x: ex, y: ey,
          width: isBossRoom ? 48 : 24,
          height: isBossRoom ? 48 : 24,
          velocityX: 0, velocityY: 0,
          active: true,
          type: enemyType,
          health: Math.floor(data.health * healthScale),
          maxHealth: Math.floor(data.health * healthScale),
          damage: Math.floor(data.damage * damageScale),
          speed: data.speed,
          attackCooldown: 0,
          state: 'dormant', // Start dormant
          stateTimer: 0,
          targetX: ex, targetY: ey,
          xpValue: Math.floor(data.xp * (1 + floorNum * 0.1)), // XP scales with floor
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

      // ===== NEW: Add environmental hazards to some rooms =====
      if (room.type === 'normal' && floorNum >= 2 && random() < 0.25) {
        // Add spike tiles
        const numHazards = 1 + Math.floor(random() * 3)
        for (let h = 0; h < numHazards; h++) {
          const hx = room.x + 1 + Math.floor(random() * (room.width - 2))
          const hy = room.y + 1 + Math.floor(random() * (room.height - 2))
          if (tilesRef.current[hy]?.[hx]?.type === 'floor') {
            tilesRef.current[hy][hx].type = random() < 0.5 ? 'spikes' : 'fire_pit'
          }
        }
      }

      // ===== NEW: Add room events to event rooms =====
      if (room.type === 'event') {
        const eventTypes: ('merchant' | 'shrine' | 'trapped_adventurer' | 'mystery_box')[] =
          ['merchant', 'shrine', 'trapped_adventurer', 'mystery_box']
        const evtType = eventTypes[Math.floor(random() * eventTypes.length)]
        roomEventsRef.current.push({
          type: evtType,
          x: (room.x + room.width / 2) * TILE_SIZE,
          y: (room.y + room.height / 2) * TILE_SIZE,
          used: false
        })
      }
    }

    // Reveal starting area
    revealArea(startX, startY, 5)
    
    setFloor(floorNum)
  }, [])

  // Define startNewGame before it's used
  const startNewGame = useCallback(() => {
    // Reset player stats using difficulty config
    playerRef.current = {
      x: 0, y: 0, width: 24, height: 24,
      velocityX: 0, velocityY: 0, active: true,
      health: DIFFICULTY.playerBaseHealth,
      maxHealth: DIFFICULTY.playerBaseHealth,
      mana: DIFFICULTY.playerBaseMana,
      maxMana: DIFFICULTY.playerBaseMana,
      attackCooldown: 0, dashCooldown: 0,
      invincibleTime: 0, 
      damage: DIFFICULTY.playerBaseDamage, 
      speed: DIFFICULTY.playerBaseSpeed,
      level: 1, xp: 0, xpToNext: 45,
      facing: { x: 1, y: 0 },
      isAttacking: false, attackFrame: 0,
      souls: 0, hasKey: false,
      combo: 0, comboTimer: 0, 
      critChance: DIFFICULTY.playerBaseCritChance,
      dashTimer: 0, dashDirection: { x: 0, y: 0 }
    }
    
    // Reset inventory
    inventoryRef.current = {
      weapon: null,
      artifacts: [null, null, null],
      trinket: null,
      curse: null,
      consumables: [null, null, null, null],
      backpack: [null, null, null, null, null, null, null, null]
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

    // ===== NEW: Reset run stats =====
    runStatsRef.current = {
      kills: 0,
      damageDealt: 0,
      damageTaken: 0,
      bossesDefeated: 0,
      itemsCollected: 0,
      highestCombo: 0,
      floorsCleared: 0,
      timeElapsed: 0,
      criticalHits: 0,
      dashesUsed: 0
    }
    setShowRunSummary(false)

    // Reset new systems
    hitPauseRef.current = 0
    lowHpPulseRef.current = 0
    bossIntroRef.current = { active: false, bossName: '', bossTitle: '', timer: 0 }
    damageFlashRef.current = 0
    roomEventsRef.current = []
    setShowEventModal(false)
    setCurrentEvent(null)
    setEndlessMode(false)
    endlessCycleRef.current = 1

    // ===== PRODUCTION: Tutorial check for first-time players =====
    if (settings.showTutorial && permanentUnlocks.runsCompleted === 0) {
      setShowTutorial(true)
      setTutorialStep(0)
      tutorialCompletedRef.current = new Set()
    }

    // Show intro
    setDialogueText(STORY.intro)
    setDialogueIndex(0)
    gameStateRef.current = 'dialogue'
    setGameState('dialogue')
    setShowStory(true)

    // Play menu sound
    playSound('menu')

    initGame(1)
  }, [settings.showTutorial, permanentUnlocks.runsCompleted, playSound])

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

  // ===== NEW: Achievement unlock helper =====
  const unlockAchievement = useCallback((id: string) => {
    setAchievements(prev => {
      const updated = prev.map(a =>
        a.id === id && !a.unlocked ? { ...a, unlocked: true } : a
      )
      // Check if any new achievement was unlocked
      const newlyUnlocked = updated.find(a => a.id === id && a.unlocked)
      if (newlyUnlocked && !permanentUnlocks.achievements.includes(id)) {
        // Save to permanent unlocks
        const newUnlocks = {
          ...permanentUnlocks,
          achievements: [...permanentUnlocks.achievements, id]
        }
        setPermanentUnlocks(newUnlocks)
        localStorage.setItem('abyss_unlocks', JSON.stringify(newUnlocks))
        // Show achievement notification
        floatingTextsRef.current.push({
          x: playerRef.current.x + playerRef.current.width / 2,
          y: playerRef.current.y - 50,
          text: `🏆 ${newlyUnlocked.name}`,
          color: '#ffd700',
          life: 3,
          maxLife: 3,
          velocityY: -30
        })
      }
      return updated
    })
  }, [permanentUnlocks])

  // ===== NEW: Save permanent unlocks =====
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('abyss_unlocks', JSON.stringify(permanentUnlocks))
    }
  }, [permanentUnlocks])
  
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
    
    // Helper to find first empty slot in backpack
    const findEmptyBackpackSlot = () => inventory.backpack.findIndex(s => s === null)

    if (item.category === 'weapon') {
      // Move existing weapon to backpack if any
      if (inventory.weapon) {
        const slot = findEmptyBackpackSlot()
        if (slot >= 0) inventory.backpack[slot] = inventory.weapon
      }
      inventory.weapon = item
    } else if (item.category === 'artifact') {
      // Find empty artifact slot
      const emptySlot = inventory.artifacts.findIndex(a => a === null)
      if (emptySlot >= 0) {
        inventory.artifacts[emptySlot] = item
      } else {
        // All slots full, add to backpack
        const slot = findEmptyBackpackSlot()
        if (slot >= 0) inventory.backpack[slot] = item
      }
    } else if (item.category === 'trinket') {
      if (inventory.trinket) {
        const slot = findEmptyBackpackSlot()
        if (slot >= 0) inventory.backpack[slot] = inventory.trinket
      }
      inventory.trinket = item
    } else if (item.category === 'curse') {
      if (inventory.curse) {
        const slot = findEmptyBackpackSlot()
        if (slot >= 0) inventory.backpack[slot] = inventory.curse
      }
      inventory.curse = item
    } else if (item.category === 'consumable') {
      const emptySlot = inventory.consumables.findIndex(c => c === null)
      if (emptySlot >= 0) {
        inventory.consumables[emptySlot] = item
      } else {
        const slot = findEmptyBackpackSlot()
        if (slot >= 0) inventory.backpack[slot] = item
      }
    }
    
    // Recalculate stats and check synergies
    recalculateStats()
    checkSynergies()
  }, [recalculateStats, checkSynergies])
  
  const handleSlotClick = useCallback((category: string, index?: number) => {
    const inventory = inventoryRef.current

    if (!selectedSlot) {
      // Select the slot if it has an item
      let item = null
      if (category === 'weapon') item = inventory.weapon
      else if (category === 'artifacts') item = inventory.artifacts[index!]
      else if (category === 'trinket') item = inventory.trinket
      else if (category === 'curse') item = inventory.curse
      else if (category === 'consumables') item = inventory.consumables[index!]
      else if (category === 'backpack') item = inventory.backpack[index!]

      if (item) {
        setSelectedSlot({ category, index })
      }
      return
    }

    // Swapping logic
    if (selectedSlot.category === category && selectedSlot.index === index) {
      setSelectedSlot(null)
      return
    }

    // Helper to get item from a slot
    const getItemAt = (cat: string, idx?: number) => {
      if (cat === 'weapon') return inventory.weapon
      if (cat === 'artifacts') return inventory.artifacts[idx!]
      if (cat === 'trinket') return inventory.trinket
      if (cat === 'curse') return inventory.curse
      if (cat === 'consumables') return inventory.consumables[idx!]
      if (cat === 'backpack') return inventory.backpack[idx!]
      return null
    }

    // Helper to set item in a slot
    const setItemAt = (cat: string, item: GameItem | null, idx?: number) => {
      if (cat === 'weapon') inventory.weapon = item
      else if (cat === 'artifacts') inventory.artifacts[idx!] = item
      else if (cat === 'trinket') inventory.trinket = item
      else if (cat === 'curse') inventory.curse = item
      else if (cat === 'consumables') inventory.consumables[idx!] = item
      else if (cat === 'backpack') inventory.backpack[idx!] = item
    }

    const item1 = getItemAt(selectedSlot.category, selectedSlot.index)
    const item2 = getItemAt(category, index)

    // Validation: Check if item1 can go into category
    if (item1 && category !== 'backpack') {
        if (category === 'weapon' && item1.category !== 'weapon') return
        if (category === 'artifacts' && item1.category !== 'artifact') return
        if (category === 'trinket' && item1.category !== 'trinket') return
        if (category === 'curse' && item1.category !== 'curse') return
        if (category === 'consumables' && item1.category !== 'consumable') return
    }
    
    // Validation: Check if item2 can go into selectedSlot.category
    if (item2 && selectedSlot.category !== 'backpack') {
        if (selectedSlot.category === 'weapon' && item2.category !== 'weapon') return
        if (selectedSlot.category === 'artifacts' && item2.category !== 'artifact') return
        if (selectedSlot.category === 'trinket' && item2.category !== 'trinket') return
        if (selectedSlot.category === 'curse' && item2.category !== 'curse') return
        if (selectedSlot.category === 'consumables' && item2.category !== 'consumable') return
    }

    // Swap
    setItemAt(selectedSlot.category, item2, selectedSlot.index)
    setItemAt(category, item1, index)

    setSelectedSlot(null)
    setInventoryVersion(v => v + 1)
    recalculateStats()
    checkSynergies()
  }, [selectedSlot, recalculateStats, checkSynergies])
  
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
    
    // ===== NEW: Show use indicator =====
    floatingTextsRef.current.push({
      x: player.x,
      y: player.y - 20,
      text: `Used ${consumable.name}`,
      color: consumable.rarity === 'legendary' ? '#ff00ff' : '#ffffff',
      life: 1.0,
      maxLife: 1.0,
      velocityY: -30
    })
    playSound('levelup') // Use levelup sound as a "special use" sound

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

      // ===== NEW: Track elapsed time =====
      runStatsRef.current.timeElapsed += dt

      // ===== NEW: Hit pause - skip update if paused =====
      if (hitPauseRef.current > 0) {
        hitPauseRef.current -= dt
        return // Skip frame
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

      // ===== PRODUCTION: Mobile touch controls =====
      if (touchJoystickRef.current.active) {
        const dx = touchJoystickRef.current.currentX - touchJoystickRef.current.startX
        const dy = touchJoystickRef.current.currentY - touchJoystickRef.current.startY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 10) {
          moveX = dx / dist
          moveY = dy / dist
        }
      }

      // ===== PRODUCTION: Tutorial tracking for movement =====
      if ((moveX !== 0 || moveY !== 0) && showTutorial) {
        completeTutorialStep('move')
      }

      // Normalize diagonal movement
      const moveLen = Math.sqrt(moveX * moveX + moveY * moveY)
      if (moveLen > 0) {
        moveX /= moveLen
        moveY /= moveLen
        player.facing = { x: moveX, y: moveY }
      }

      // Apply velocity with speed modifiers
      if (player.dashTimer > 0) {
        player.dashTimer -= dt
        const dashSpeed = player.speed * DIFFICULTY.dashSpeedMultiplier
        player.velocityX = player.dashDirection.x * dashSpeed
        player.velocityY = player.dashDirection.y * dashSpeed
      } else {
        const speedMult = statModifiersRef.current.speedMultiplier
        player.velocityX = moveX * player.speed * speedMult
        player.velocityY = moveY * player.speed * speedMult
      }

      // ===== PRODUCTION: Touch attack/dash handling =====
      if (touchAttackRef.current && player.attackCooldown <= 0) {
        keysRef.current.add(' ')
      }
      if (touchDashRef.current && player.dashCooldown <= 0) {
        keysRef.current.add('shift')
      }

      // Dash - uses difficulty config values
      if (keys.has('shift') && player.dashCooldown <= 0 && player.mana >= DIFFICULTY.dashManaCost) {
        // Dash in facing direction (works even when stationary)
        player.dashTimer = 0.2 // Dash lasts for 0.2 seconds
        player.dashDirection = { x: player.facing.x, y: player.facing.y }
        player.dashCooldown = DIFFICULTY.dashCooldown
        player.mana -= DIFFICULTY.dashManaCost
        player.invincibleTime = DIFFICULTY.invincibilityDuration

        // ===== NEW: Track dash usage =====
        runStatsRef.current.dashesUsed++

        // ===== PRODUCTION: Play dash sound and tutorial =====
        playSound('dash')
        if (showTutorial) completeTutorialStep('dash')

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
      
      // Attack - uses difficulty config values
      if (keys.has('j') || keys.has('z') || keys.has(' ')) {
        if (player.attackCooldown <= 0) {
          player.isAttacking = true
          player.attackFrame = 0
          // Apply attack speed modifier
          player.attackCooldown = DIFFICULTY.attackCooldown * statModifiersRef.current.attackSpeedMultiplier

          // ===== PRODUCTION: Play attack sound =====
          playSound('attack')

          // ===== PRODUCTION: Tutorial tracking =====
          if (showTutorial) completeTutorialStep('attack')

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

              // ===== PRODUCTION: Play hit sound =====
              playSound('hit')

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

                // ===== NEW: Track stats =====
                runStatsRef.current.kills++
                runStatsRef.current.damageDealt += damage
                if (isCritical) runStatsRef.current.criticalHits++
                if (player.combo > runStatsRef.current.highestCombo) {
                  runStatsRef.current.highestCombo = player.combo
                }

                // ===== NEW: Achievement checks =====
                if (runStatsRef.current.kills === 1) unlockAchievement('first_blood')
                if (player.combo >= 10) unlockAchievement('combo_master')

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
                  runStatsRef.current.bossesDefeated++
                  unlockAchievement('boss_slayer')
                  screenShakeRef.current = { intensity: 15, duration: 0.5 }

                  // Update permanent stats
                  setPermanentUnlocks(prev => ({
                    ...prev,
                    bossesKilled: prev.bossesKilled + 1
                  }))

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

                // ===== NEW: Elite enemy drops =====
                if (enemy.type.startsWith('elite')) {
                  // Guaranteed rare drop for elites
                  const eliteDrop = getRandomItems('rare', 1)
                  if (eliteDrop.length > 0) {
                    setItemChoice(eliteDrop)
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
      
      // Level up - uses difficulty config values
      while (player.xp >= player.xpToNext) {
        player.xp -= player.xpToNext
        player.level++
        player.maxHealth += DIFFICULTY.healthPerLevel
        player.health = Math.min(player.maxHealth + statModifiersRef.current.maxHealthBonus, player.health + DIFFICULTY.healthPerLevel)
        player.damage += DIFFICULTY.damagePerLevel
        player.critChance = Math.min(0.4, player.critChance + DIFFICULTY.critPerLevel)
        player.xpToNext = Math.floor(player.xpToNext * DIFFICULTY.xpScaling)

        // Award skill point on level up
        skillsRef.current.points += 1

        // ===== PRODUCTION: Play level up sound =====
        playSound('levelup')

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

      // ===== NEW: Environmental hazard damage =====
      const hazardTileX = Math.floor((player.x + player.width / 2) / TILE_SIZE)
      const hazardTileY = Math.floor((player.y + player.height / 2) / TILE_SIZE)
      const currentTile = tilesRef.current[hazardTileY]?.[hazardTileX]
      if (currentTile && player.invincibleTime <= 0) {
        if (currentTile.type === 'spikes') {
          // Spikes deal damage every 0.5 seconds
          const spikeDamage = 5 + floor * 2
          player.health -= spikeDamage
          player.invincibleTime = 0.5
          runStatsRef.current.damageTaken += spikeDamage
          hitPauseRef.current = 0.03
          damageFlashRef.current = 0.1
          floatingTextsRef.current.push({
            x: player.x + player.width / 2,
            y: player.y - 10,
            text: `-${spikeDamage}`,
            color: '#ff8888',
            life: 0.8,
            maxLife: 0.8,
            velocityY: -40
          })
          // Spike particles
          for (let i = 0; i < 5; i++) {
            particlesRef.current.push({
              x: player.x + player.width / 2,
              y: player.y + player.height,
              velocityX: (Math.random() - 0.5) * 50,
              velocityY: -50 - Math.random() * 30,
              life: 0.3,
              maxLife: 0.3,
              color: '#888888',
              size: 3
            })
          }
          if (player.health <= 0) {
            runStatsRef.current.floorsCleared = floor
            setPlayerSouls(player.souls)
            setPlayerLevel(player.level)
            setShowRunSummary(true)
            gameStateRef.current = 'run_summary'
            setGameState('run_summary')
          }
        } else if (currentTile.type === 'fire_pit') {
          // Fire deals damage over time and can burn
          const fireDamage = 3 + floor
          player.health -= fireDamage
          player.invincibleTime = 0.3
          runStatsRef.current.damageTaken += fireDamage
          hitPauseRef.current = 0.02
          damageFlashRef.current = 0.15
          floatingTextsRef.current.push({
            x: player.x + player.width / 2,
            y: player.y - 10,
            text: `-${fireDamage}`,
            color: '#ff6600',
            life: 0.8,
            maxLife: 0.8,
            velocityY: -40
          })
          // Fire particles
          for (let i = 0; i < 3; i++) {
            particlesRef.current.push({
              x: player.x + player.width / 2,
              y: player.y + player.height / 2,
              velocityX: (Math.random() - 0.5) * 80,
              velocityY: -60 - Math.random() * 40,
              life: 0.4,
              maxLife: 0.4,
              color: Math.random() < 0.5 ? '#ff4400' : '#ffaa00',
              size: 4
            })
          }
          if (player.health <= 0) {
            runStatsRef.current.floorsCleared = floor
            setPlayerSouls(player.souls)
            setPlayerLevel(player.level)
            setShowRunSummary(true)
            gameStateRef.current = 'run_summary'
            setGameState('run_summary')
          }
        }
      }

      // Combo timer
      player.comboTimer = Math.max(0, player.comboTimer - dt)
      if (player.comboTimer <= 0) {
        player.combo = 0
      }

      // Screen shake
      screenShakeRef.current.duration = Math.max(0, screenShakeRef.current.duration - dt)

      // Mana regen - uses difficulty config
      player.mana = Math.min(player.maxMana + statModifiersRef.current.maxManaBonus, player.mana + DIFFICULTY.manaRegenRate * dt)

      // Reveal fog of war
      revealArea(player.x + player.width / 2, player.y + player.height / 2, 6)

      // Update camera
      cameraRef.current.x = player.x - canvas.width / 2 + player.width / 2
      cameraRef.current.y = player.y - canvas.height / 2 + player.height / 2

      // ===== NEW: Check for room events =====
      for (const roomEvent of roomEventsRef.current) {
        if (roomEvent.used) continue
        const distToEvent = distance(player.x + player.width / 2, player.y + player.height / 2, roomEvent.x, roomEvent.y)
        if (distToEvent < 40) {
          setCurrentEvent(roomEvent)
          setShowEventModal(true)
          break
        }
      }

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

            // ===== PRODUCTION: Boss intro =====
            if (enemy.isBoss) {
              const bossNames: Record<string, { name: string; title: string }> = {
                boss_grak: { name: 'GRAK', title: 'The Jailer of the Abyss' },
                boss_seraphine: { name: 'SERAPHINE', title: 'The Corrupted Sage' },
                boss_malachar: { name: 'MALACHAR', title: 'Lord of the Abyss' }
              }
              const bossInfo = bossNames[enemy.type] || { name: 'BOSS', title: 'Unknown Entity' }
              bossIntroRef.current = {
                active: true,
                bossName: bossInfo.name,
                bossTitle: bossInfo.title,
                timer: 2.5
              }
              playSound('boss')
            }

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
          // Check for dodge
          if (Math.random() < statModifiersRef.current.dodge) {
            // Dodged!
            floatingTextsRef.current.push({
              x: player.x + player.width / 2,
              y: player.y - 10,
              text: 'DODGE!',
              color: '#00ffff',
              life: 1,
              maxLife: 1,
              velocityY: -50
            })
            return
          }

          // Calculate damage after armor
          const actualDamage = Math.max(1, Math.floor(enemy.damage * (1 - statModifiersRef.current.armor)))
          player.health -= actualDamage
          player.invincibleTime = DIFFICULTY.invincibilityDuration + 0.25 // Extended grace period

          // ===== NEW: Hit pause for combat feel =====
          hitPauseRef.current = 0.05 // 50ms hit pause
          damageFlashRef.current = 0.2 // Red flash

          // Track damage taken
          runStatsRef.current.damageTaken += actualDamage

          // Directional screen shake (shake toward damage source)
          const shakeDir = normalize(player.x - enemy.x, player.y - enemy.y)
          screenShakeRef.current = {
            intensity: 8,
            duration: 0.2
          }

          for (let i = 0; i < 8; i++) {
            particlesRef.current.push({
              x: player.x + player.width / 2,
              y: player.y + player.height / 2,
              velocityX: (Math.random() - 0.5) * 150 + shakeDir.x * 50,
              velocityY: (Math.random() - 0.5) * 150 + shakeDir.y * 50,
              life: 0.5, maxLife: 0.5,
              color: '#ff0000', size: 5
            })
          }

          // Damage number
          floatingTextsRef.current.push({
            x: player.x + player.width / 2,
            y: player.y - 10,
            text: `-${actualDamage}`,
            color: '#ff4444',
            life: 1,
            maxLife: 1,
            velocityY: -60
          })

          // ===== PRODUCTION: Play damage sound =====
          playSound('damage')

          if (player.health <= 0) {
            // ===== PRODUCTION: Play death sound =====
            playSound('death')

            // ===== NEW: Run summary on death =====
            runStatsRef.current.floorsCleared = floor
            setPlayerSouls(player.souls)
            setPlayerLevel(player.level)

            // Update permanent stats
            setPermanentUnlocks(prev => ({
              ...prev,
              totalSouls: prev.totalSouls + player.souls,
              runsCompleted: prev.runsCompleted + 1
            }))

            setShowRunSummary(true)
            gameStateRef.current = 'run_summary'
            setGameState('run_summary')
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
            // Check dodge
            if (Math.random() < statModifiersRef.current.dodge) {
              floatingTextsRef.current.push({
                x: proj.x,
                y: proj.y - 10,
                text: 'DODGE!',
                color: '#00ffff',
                life: 1,
                maxLife: 1,
                velocityY: -50
              })
              proj.active = false
              continue
            }

            const actualDamage = Math.max(1, Math.floor(proj.damage * (1 - statModifiersRef.current.armor)))
            player.health -= actualDamage
            player.invincibleTime = DIFFICULTY.invincibilityDuration + 0.25
            proj.active = false

            // Track damage
            runStatsRef.current.damageTaken += actualDamage
            hitPauseRef.current = 0.05
            damageFlashRef.current = 0.2

            if (player.health <= 0) {
              runStatsRef.current.floorsCleared = floor
              setPlayerSouls(player.souls)
              setPlayerLevel(player.level)
              setPermanentUnlocks(prev => ({
                ...prev,
                totalSouls: prev.totalSouls + player.souls,
                runsCompleted: prev.runsCompleted + 1
              }))
              setShowRunSummary(true)
              gameStateRef.current = 'run_summary'
              setGameState('run_summary')
            }
          }
        }
      }

      // Update items
      for (const item of itemsRef.current) {
        if (!item.active) continue

        if (distance(item.x, item.y, player.x + player.width / 2, player.y + player.height / 2) < 30) {
          item.active = false

          // Track item collection
          runStatsRef.current.itemsCollected++

          // ===== PRODUCTION: Play pickup sound =====
          playSound('pickup')

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
      // ===== NEW: Hit pause - skip rendering update if paused =====
      if (hitPauseRef.current > 0) {
        hitPauseRef.current -= 0.016 // Approximate frame time
      }

      // Clear
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, width, height)

      // Guard: Don't render if dungeon not initialized
      if (!tilesRef.current || tilesRef.current.length === 0) {
        return
      }

      const camera = cameraRef.current
      const player = playerRef.current

      // ===== NEW: Damage flash effect =====
      if (damageFlashRef.current > 0) {
        damageFlashRef.current -= 0.016
        ctx.fillStyle = `rgba(255, 0, 0, ${damageFlashRef.current * 0.3})`
        ctx.fillRect(0, 0, width, height)
      }

      // ===== NEW: Low HP heartbeat pulse =====
      const healthPercent = player.health / (player.maxHealth + statModifiersRef.current.maxHealthBonus)
      if (healthPercent < 0.3) {
        lowHpPulseRef.current += 0.1
        const pulseIntensity = Math.sin(lowHpPulseRef.current) * 0.15 + 0.1
        ctx.fillStyle = `rgba(255, 0, 0, ${pulseIntensity * (0.3 - healthPercent)})`
        ctx.fillRect(0, 0, width, height)
        // Vignette effect at low HP
        const gradient = ctx.createRadialGradient(width/2, height/2, height * 0.3, width/2, height/2, height)
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
        gradient.addColorStop(1, `rgba(100, 0, 0, ${(0.3 - healthPercent) * 0.8}`)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
      }

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
            case 'spikes':
              // Floor background
              ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt
              ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE)
              // Spikes
              ctx.fillStyle = '#666666'
              const spikeSize = 6
              for (let sy = 0; sy < 3; sy++) {
                for (let sx = 0; sx < 3; sx++) {
                  const spikeX = screenX + 5 + sx * 10
                  const spikeY = screenY + 5 + sy * 10
                  ctx.beginPath()
                  ctx.moveTo(spikeX, spikeY + spikeSize)
                  ctx.lineTo(spikeX + spikeSize / 2, spikeY)
                  ctx.lineTo(spikeX + spikeSize, spikeY + spikeSize)
                  ctx.closePath()
                  ctx.fill()
                }
              }
              // Warning glow
              ctx.fillStyle = 'rgba(255, 100, 100, 0.15)'
              ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE)
              break
            case 'fire_pit':
              // Floor background
              ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt
              ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE)
              // Fire pit base
              ctx.fillStyle = '#442200'
              ctx.beginPath()
              ctx.ellipse(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2 + 4, 12, 8, 0, 0, Math.PI * 2)
              ctx.fill()
              // Animated flames
              const flameTime = Date.now() / 100
              ctx.fillStyle = '#ff6600'
              for (let f = 0; f < 3; f++) {
                const flameHeight = 8 + Math.sin(flameTime + f * 2) * 3
                ctx.beginPath()
                ctx.ellipse(
                  screenX + TILE_SIZE / 2 + (f - 1) * 6,
                  screenY + TILE_SIZE / 2 - flameHeight / 2,
                  4, flameHeight / 2,
                  0, 0, Math.PI * 2
                )
                ctx.fill()
              }
              // Inner flame
              ctx.fillStyle = '#ffaa00'
              ctx.beginPath()
              ctx.ellipse(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2 - 4, 5, 6, 0, 0, Math.PI * 2)
              ctx.fill()
              // Warning glow
              ctx.fillStyle = 'rgba(255, 100, 0, 0.15)'
              ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE)
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
      
      // Minimap - IMPROVED with room type colors
      const mapSize = 120
      const mapX = width - mapSize - 10
      const mapY = height - mapSize - 10

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(mapX, mapY, mapSize, mapSize)
      ctx.strokeStyle = COLORS.ui.accent
      ctx.strokeRect(mapX, mapY, mapSize, mapSize)

      const scale = mapSize / (MAP_WIDTH * TILE_SIZE)
      const playerTileX = Math.floor(player.x / TILE_SIZE)
      const playerTileY = Math.floor(player.y / TILE_SIZE)

      // ===== NEW: Room type colors on minimap =====
      const roomColors: Record<RoomType, string> = {
        start: 'rgba(100, 200, 100, 0.4)',
        normal: 'rgba(100, 100, 100, 0.4)',
        treasure: 'rgba(255, 215, 0, 0.5)',
        boss: 'rgba(255, 50, 50, 0.5)',
        secret: 'rgba(150, 50, 200, 0.5)',
        event: 'rgba(100, 200, 255, 0.5)',
        elite: 'rgba(255, 165, 0, 0.5)'
      }

      // Draw rooms on minimap with type colors
      for (const room of roomsRef.current) {
        const roomColor = roomColors[room.type] || 'rgba(100, 100, 100, 0.3)'
        ctx.fillStyle = room.visited ? roomColor : 'rgba(50, 50, 50, 0.2)'
        ctx.fillRect(
          mapX + room.x * TILE_SIZE * scale,
          mapY + room.y * TILE_SIZE * scale,
          room.width * TILE_SIZE * scale,
          room.height * TILE_SIZE * scale
        )
        // Room border for special rooms
        if (room.type !== 'normal' && room.visited) {
          ctx.strokeStyle = room.type === 'boss' ? '#ff0000' :
                           room.type === 'treasure' ? '#ffd700' :
                           room.type === 'elite' ? '#ff8800' : '#666'
          ctx.lineWidth = 1
          ctx.strokeRect(
            mapX + room.x * TILE_SIZE * scale,
            mapY + room.y * TILE_SIZE * scale,
            room.width * TILE_SIZE * scale,
            room.height * TILE_SIZE * scale
          )
        }
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
        ctx.fillStyle = enemy.isBoss ? '#ff0000' :
                       enemy.type.startsWith('elite') ? '#ff8800' : '#ff6666'
        ctx.beginPath()
        ctx.arc(
          mapX + enemy.x * scale + enemy.width / 2 * scale,
          mapY + enemy.y * scale + enemy.height / 2 * scale,
          enemy.isBoss ? 4 : 2, 0, Math.PI * 2
        )
        ctx.fill()
      }

      // ===== NEW: Skill cooldown display =====
      const skillPoints = skillsRef.current.points
      if (skillPoints > 0) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)'
        ctx.font = 'bold 14px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(`⚡ ${skillPoints} SP`, width - 20, height - 130)
      }

      // Dash cooldown indicator
      const dashCooldownPercent = Math.max(0, 1 - player.dashCooldown / DIFFICULTY.dashCooldown)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(10, height - 70, 60, 20)
      ctx.fillStyle = dashCooldownPercent >= 1 ? '#4da6ff' : `rgba(77, 166, 255, ${dashCooldownPercent})`
      ctx.fillRect(10, height - 70, 60 * dashCooldownPercent, 20)
      ctx.strokeStyle = '#4da6ff'
      ctx.strokeRect(10, height - 70, 60, 20)
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(dashCooldownPercent >= 1 ? 'DASH' : `${Math.ceil(player.dashCooldown)}s`, 40, height - 55)
      
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
      
      // ===== MINECRAFT-STYLE CONSUMABLE HOTBAR =====
      const hotbarSlotSize = 50
      const hotbarPadding = 4
      const hotbarSlots = 4
      const hotbarWidth = (hotbarSlotSize + hotbarPadding) * hotbarSlots + hotbarPadding
      const hotbarX = (width - hotbarWidth) / 2
      const hotbarY = height - 70

      // Hotbar background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(hotbarX - 5, hotbarY - 5, hotbarWidth + 10, hotbarSlotSize + 20)

      // Draw each consumable slot
      const inventory = inventoryRef.current
      for (let i = 0; i < hotbarSlots; i++) {
        const slotX = hotbarX + i * (hotbarSlotSize + hotbarPadding) + hotbarPadding
        const slotY = hotbarY
        const consumable = inventory.consumables[i]

        // Slot background
        ctx.fillStyle = 'rgba(50, 50, 60, 0.8)'
        ctx.fillRect(slotX, slotY, hotbarSlotSize, hotbarSlotSize)

        // Slot border
        ctx.strokeStyle = consumable ? '#ffd700' : '#444466'
        ctx.lineWidth = 2
        ctx.strokeRect(slotX, slotY, hotbarSlotSize, hotbarSlotSize)

        // Keybinding indicator
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`${i + 1}`, slotX + hotbarSlotSize / 2, slotY - 5)

        // Consumable icon
        if (consumable) {
          // Draw a simple icon representation
          ctx.fillStyle = consumable.rarity === 'legendary' ? '#ff00ff' :
                         consumable.rarity === 'rare' ? '#4488ff' :
                         consumable.rarity === 'uncommon' ? '#44ff44' : '#aaaaaa'
          
          // Draw item shape based on type
          const centerX = slotX + hotbarSlotSize / 2
          const centerY = slotY + hotbarSlotSize / 2
          
          ctx.beginPath()
          ctx.arc(centerX, centerY, 15, 0, Math.PI * 2)
          ctx.fill()

          // Draw icon letter
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 14px monospace'
          ctx.fillText(consumable.name.charAt(0), centerX, centerY + 5)
        }

        // Cooldown overlay for empty slots or active items
        if (!consumable) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
          ctx.fillRect(slotX, slotY, hotbarSlotSize, hotbarSlotSize)
        }
      }

      // Controls hint (moved up to not overlap with hotbar)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(10, height - 95, 200, 40)
      ctx.fillStyle = '#888888'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('WASD: Move | SPACE/J: Attack', 15, height - 80)
      ctx.fillText('SHIFT: Dash | I: Inventory', 15, height - 65)
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

  // ===== PRODUCTION: Settings Screen =====
  const renderSettings = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-50">
      <div className="bg-gray-900 border-2 border-cyan-600 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-cyan-500/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-cyan-400">SETTINGS</h2>
          <button
            onClick={() => {
              setShowSettings(false)
              if (gameStateRef.current === 'paused') {
                setGameState('paused')
              }
            }}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Master Volume */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-gray-300">Master Volume</label>
              <span className="text-cyan-400">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.masterVolume * 100}
              onChange={(e) => updateSettings({ masterVolume: parseInt(e.target.value) / 100 })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* SFX Volume */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-gray-300">Sound Effects</label>
              <span className="text-cyan-400">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.sfxVolume * 100}
              onChange={(e) => updateSettings({ sfxVolume: parseInt(e.target.value) / 100 })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Screen Shake Toggle */}
          <div className="flex items-center justify-between py-2">
            <label className="text-gray-300">Screen Shake</label>
            <button
              onClick={() => updateSettings({ screenShake: !settings.screenShake })}
              className={`w-12 h-6 rounded-full transition-colors ${settings.screenShake ? 'bg-cyan-500' : 'bg-gray-600'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${settings.screenShake ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Damage Numbers Toggle */}
          <div className="flex items-center justify-between py-2">
            <label className="text-gray-300">Damage Numbers</label>
            <button
              onClick={() => updateSettings({ showDamageNumbers: !settings.showDamageNumbers })}
              className={`w-12 h-6 rounded-full transition-colors ${settings.showDamageNumbers ? 'bg-cyan-500' : 'bg-gray-600'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${settings.showDamageNumbers ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Minimap Toggle */}
          <div className="flex items-center justify-between py-2">
            <label className="text-gray-300">Show Minimap</label>
            <button
              onClick={() => updateSettings({ showMinimap: !settings.showMinimap })}
              className={`w-12 h-6 rounded-full transition-colors ${settings.showMinimap ? 'bg-cyan-500' : 'bg-gray-600'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${settings.showMinimap ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Particle Quality */}
          <div className="space-y-2">
            <label className="text-gray-300">Particle Quality</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => updateSettings({ particleQuality: q })}
                  className={`flex-1 py-2 rounded-lg transition-colors ${settings.particleQuality === q ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                >
                  {q.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tutorial Reset */}
          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={() => {
                updateSettings({ showTutorial: true })
                setShowSettings(false)
              }}
              className="w-full py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reset Tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ===== PRODUCTION: Tutorial Overlay =====
  const renderTutorial = () => {
    if (!showTutorial || tutorialStep >= TUTORIAL_STEPS.length) return null
    const step = TUTORIAL_STEPS[tutorialStep]

    return (
      <div className="fixed inset-0 pointer-events-none z-40">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 border-2 border-yellow-500 rounded-xl p-6 max-w-sm text-center pointer-events-auto">
          <div className="text-yellow-400 text-sm mb-2">
            TUTORIAL {tutorialStep + 1}/{TUTORIAL_STEPS.length}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
          <p className="text-gray-300 mb-4">{step.description}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowTutorial(false)}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
            >
              Skip
            </button>
            <button
              onClick={() => {
                if (tutorialStep + 1 < TUTORIAL_STEPS.length) {
                  setTutorialStep(tutorialStep + 1)
                } else {
                  setShowTutorial(false)
                  updateSettings({ showTutorial: false })
                }
              }}
              className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== PRODUCTION: Mobile Touch Controls =====
  const renderMobileControls = () => {
    if (!isMobile || gameState !== 'playing') return null

    return (
      <div className="fixed inset-0 pointer-events-none z-30">
        {/* Virtual Joystick */}
        <div
          className="absolute bottom-24 left-8 w-32 h-32 rounded-full bg-gray-800/50 border-2 border-gray-600 pointer-events-auto"
          onTouchStart={(e) => {
            const touch = e.touches[0]
            const rect = e.currentTarget.getBoundingClientRect()
            touchJoystickRef.current = {
              active: true,
              startX: rect.left + rect.width / 2,
              startY: rect.top + rect.height / 2,
              currentX: touch.clientX,
              currentY: touch.clientY
            }
          }}
          onTouchMove={(e) => {
            if (touchJoystickRef.current.active) {
              const touch = e.touches[0]
              touchJoystickRef.current.currentX = touch.clientX
              touchJoystickRef.current.currentY = touch.clientY
            }
          }}
          onTouchEnd={() => {
            touchJoystickRef.current.active = false
          }}
        >
          <div
            className="absolute w-12 h-12 rounded-full bg-cyan-500/70 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: touchJoystickRef.current.active
                ? `${Math.min(1, Math.max(-1, (touchJoystickRef.current.currentX - touchJoystickRef.current.startX) / 48)) * 40 + 50}%`
                : '50%',
              top: touchJoystickRef.current.active
                ? `${Math.min(1, Math.max(-1, (touchJoystickRef.current.currentY - touchJoystickRef.current.startY) / 48)) * 40 + 50}%`
                : '50%'
            }}
          />
        </div>

        {/* Attack Button */}
        <div
          className="absolute bottom-24 right-24 w-20 h-20 rounded-full bg-red-600/70 border-2 border-red-400 flex items-center justify-center pointer-events-auto active:bg-red-500"
          onTouchStart={() => { touchAttackRef.current = true }}
          onTouchEnd={() => { touchAttackRef.current = false }}
        >
          <span className="text-3xl">⚔️</span>
        </div>

        {/* Dash Button */}
        <div
          className="absolute bottom-24 right-4 w-16 h-16 rounded-full bg-blue-600/70 border-2 border-blue-400 flex items-center justify-center pointer-events-auto active:bg-blue-500"
          onTouchStart={() => { touchDashRef.current = true }}
          onTouchEnd={() => { touchDashRef.current = false }}
        >
          <span className="text-2xl">💨</span>
        </div>

        {/* Inventory Button */}
        <div
          className="absolute top-4 right-4 w-12 h-12 rounded-lg bg-purple-600/70 border-2 border-purple-400 flex items-center justify-center pointer-events-auto active:bg-purple-500"
          onTouchStart={() => {
            setShowInventory(true)
            gameStateRef.current = 'paused'
            setGameState('paused')
          }}
        >
          <span className="text-xl">📦</span>
        </div>
      </div>
    )
  }

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
        <br />
        <button
          onClick={() => setShowSettings(true)}
          className="px-12 py-3 bg-gray-700 text-gray-300 text-lg font-bold rounded-lg hover:bg-gray-600 transition-all"
        >
          SETTINGS
        </button>
      </div>

      {/* Stats display for returning players */}
      {permanentUnlocks.runsCompleted > 0 && (
        <div className="mt-8 bg-gray-800/50 rounded-lg p-4 text-sm">
          <p className="text-gray-400 text-center mb-2">Your Stats</p>
          <div className="flex gap-8 justify-center">
            <p className="text-gray-300">Runs: <span className="text-purple-400 font-bold">{permanentUnlocks.runsCompleted}</span></p>
            <p className="text-gray-300">Bosses: <span className="text-red-400 font-bold">{permanentUnlocks.bossesKilled}</span></p>
            <p className="text-gray-300">Souls: <span className="text-yellow-400 font-bold">{permanentUnlocks.totalSouls}</span></p>
          </div>
        </div>
      )}

      {/* Achievements display */}
      {permanentUnlocks.achievements.length > 0 && (
        <div className="mt-4 flex gap-2 justify-center">
          {permanentUnlocks.achievements.slice(0, 5).map(id => {
            const achievement = achievements.find(a => a.id === id)
            return achievement ? (
              <span key={id} className="text-2xl" title={achievement.name}>{achievement.icon}</span>
            ) : null
          })}
          {permanentUnlocks.achievements.length > 5 && (
            <span className="text-gray-400 text-sm">+{permanentUnlocks.achievements.length - 5} more</span>
          )}
        </div>
      )}

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

      {/* Run stats preview */}
      <div className="bg-gray-800/80 rounded-lg p-4 mb-6 text-sm">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <p className="text-gray-400">Floor: <span className="text-white">{floor}</span></p>
          <p className="text-gray-400">Kills: <span className="text-red-400">{runStatsRef.current.kills}</span></p>
          <p className="text-gray-400">Level: <span className="text-yellow-400">{playerLevel}</span></p>
          <p className="text-gray-400">Combo: <span className="text-cyan-400">{runStatsRef.current.highestCombo}x</span></p>
        </div>
      </div>

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
            setShowSettings(true)
          }}
          className="px-8 py-3 bg-cyan-600 text-white text-lg font-bold rounded-lg hover:bg-cyan-500 transition-all"
        >
          SETTINGS
        </button>
        <br />
        <button
          onClick={() => {
            saveProgress()
            gameStateRef.current = 'menu'
            setGameState('menu')
          }}
          className="px-8 py-3 bg-gray-600 text-white text-lg font-bold rounded-lg hover:bg-gray-500 transition-all"
        >
          SAVE & QUIT
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
            // ===== NEW: Endless mode option =====
            setEndlessMode(true)
            endlessCycleRef.current = 2
            initGame(1)
            gameStateRef.current = 'playing'
            setGameState('playing')
          }}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-red-600 text-white text-lg font-bold rounded-lg hover:from-purple-500 hover:to-red-500 transition-all mr-4"
        >
          ENDLESS MODE
        </button>
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

  // ===== NEW: Run Summary Screen =====
  const renderRunSummary = () => {
    const stats = runStatsRef.current
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black z-50">
        <h2 className="text-5xl font-bold text-red-500 mb-2">RUN COMPLETE</h2>
        <p className="text-gray-500 text-lg mb-6">The Abyss claims another soul...</p>

        <div className="bg-gray-800/80 border-2 border-red-600 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
          <h3 className="text-xl font-bold text-red-400 mb-4 text-center border-b border-gray-600 pb-2">
            STATISTICS
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-gray-400">Floor Reached: <span className="text-white font-bold">{stats.floorsCleared}</span></p>
              <p className="text-gray-400">Enemies Slain: <span className="text-red-400 font-bold">{stats.kills}</span></p>
              <p className="text-gray-400">Damage Dealt: <span className="text-yellow-400 font-bold">{Math.floor(stats.damageDealt)}</span></p>
              <p className="text-gray-400">Critical Hits: <span className="text-orange-400 font-bold">{stats.criticalHits}</span></p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400">Time: <span className="text-white font-bold">{formatTime(stats.timeElapsed)}</span></p>
              <p className="text-gray-400">Damage Taken: <span className="text-red-400 font-bold">{Math.floor(stats.damageTaken)}</span></p>
              <p className="text-gray-400">Bosses Defeated: <span className="text-purple-400 font-bold">{stats.bossesDefeated}</span></p>
              <p className="text-gray-400">Best Combo: <span className="text-cyan-400 font-bold">{stats.highestCombo}x</span></p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-600">
            <p className="text-gray-400 text-center">Items Collected: <span className="text-green-400 font-bold">{stats.itemsCollected}</span></p>
            <p className="text-gray-400 text-center mt-2">Souls: <span className="text-purple-400 font-bold">{playerSouls}</span></p>
          </div>
        </div>

        {/* Achievements earned this run */}
        {achievements.filter(a => a.unlocked).length > 0 && (
          <div className="mt-4 bg-gray-800/60 rounded-lg p-4 max-w-lg w-full mx-4">
            <h4 className="text-sm font-semibold text-yellow-400 mb-2">ACHIEVEMENTS EARNED</h4>
            <div className="flex flex-wrap gap-2 justify-center">
              {achievements.filter(a => a.unlocked).map(a => (
                <span key={a.id} className="bg-gray-700 px-2 py-1 rounded text-sm">
                  {a.icon} {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
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
      </div>
    )
  }

  // ===== NEW: Boss Intro Card =====
  const renderBossIntro = () => {
    const bossInfo = bossIntroRef.current
    if (!bossInfo.active) return null

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/95 z-50">
        <div className="animate-pulse">
          <p className="text-red-500 text-2xl tracking-widest mb-4">⚠️ WARNING ⚠️</p>
        </div>
        <h2 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-500 mb-4 animate-bounce">
          {bossInfo.bossName}
        </h2>
        <p className="text-2xl text-gray-400 italic mb-8">{bossInfo.bossTitle}</p>
        <div className="w-64 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent mb-8"></div>
      </div>
    )
  }

  // ===== NEW: Achievement Display Component =====
  const renderAchievementPopup = () => null // Handled in floating text

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
    
    const renderItemSlot = (item: GameItem | null, slotName: string, category: string, index?: number) => {
      const isSelected = selectedSlot?.category === category && selectedSlot?.index === index
      return (
        <div 
          key={`${category}-${index ?? 0}`}
          onClick={() => handleSlotClick(category, index)}
          className={`w-16 h-16 border-2 rounded-lg flex items-center justify-center cursor-pointer hover:brightness-125 transition-all 
            ${item ? rarityColors[item.rarity] : 'border-gray-600 bg-gray-800/50'} 
            ${isSelected ? 'ring-4 ring-yellow-400 scale-105 z-10' : ''}`}
          title={item ? `${item.name}\n${item.description}` : slotName}
        >
          {item ? (
            <img src={item.icon} alt={item.name} className="w-12 h-12 object-contain" />
          ) : (
            <span className="text-gray-500 text-2xl">+</span>
          )}
        </div>
      )
    }
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-50">
        <div className="bg-gray-900 border-2 border-purple-600 rounded-xl p-6 max-w-4xl w-full mx-4 shadow-2xl shadow-purple-500/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-purple-400">INVENTORY</h2>
            <button 
              onClick={() => {
                setShowInventory(false)
                setSelectedSlot(null)
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
                {renderItemSlot(inventory.weapon, 'Weapon', 'weapon')}
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase">Artifacts</p>
                <div className="flex gap-2">
                  {inventory.artifacts.map((a, i) => renderItemSlot(a, 'Artifact', 'artifacts', i))}
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase">Trinket</p>
                {renderItemSlot(inventory.trinket, 'Trinket', 'trinket')}
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase">Curse</p>
                {renderItemSlot(inventory.curse, 'Curse', 'curse')}
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
                {inventory.consumables.map((c, i) => renderItemSlot(c, `Slot ${i + 1}`, 'consumables', i))}
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
              <div className="grid grid-cols-4 gap-2">
                {inventory.backpack.map((item, i) => renderItemSlot(item, 'Backpack', 'backpack', i))}
              </div>
            </div>
          </div>
          
          {/* Controls hint */}
          <div className="mt-4 text-center text-gray-500 text-xs">
            <p>Click an item to select, then click another slot to swap | Press <span className="text-gray-300">I</span> to close</p>
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
          <div className="w-8 h-8 mx-auto">
            <img src={skill.icon} alt={skill.name} className="w-full h-full object-contain" />
          </div>
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
                    <span key={id} className="text-sm bg-gray-700 px-2 py-1 rounded flex items-center gap-1">
                      <img src={skill.icon} alt={skill.name} className="w-4 h-4 object-contain" />
                      {skill.name}
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
                <div className="w-16 h-16 mx-auto mb-2">
                  <img src={item.icon} alt={item.name} className="w-full h-full object-contain" />
                </div>
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
      {/* eslint-disable-next-line react-hooks/refs */}
      {gameState === 'paused' && !showInventory && !showSkillTree && !showSettings && renderPause()}
      {gameState === 'game_over' && renderGameOver()}
      {gameState === 'victory' && renderVictory()}
      {/* eslint-disable-next-line react-hooks/refs */}
      {gameState === 'run_summary' && renderRunSummary()}
      {/* eslint-disable-next-line react-hooks/refs */}
      {gameState === 'boss_intro' && renderBossIntro()}

      {/* Inventory and Skill Tree overlays */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {showInventory && renderInventory()}
      {/* eslint-disable-next-line react-hooks/refs */}
      {showSkillTree && renderSkillTree()}
      {showItemChoice && renderItemChoice()}

      {/* ===== PRODUCTION: New UI overlays ===== */}
      {showSettings && renderSettings()}
      {showTutorial && gameState === 'playing' && renderTutorial()}
      {/* eslint-disable-next-line react-hooks/refs */}
      {renderMobileControls()}

      {/* HUD controls hint */}
      {gameState === 'playing' && (
        <div className="fixed bottom-2 right-2 text-gray-600 text-xs bg-black/50 px-2 py-1 rounded">
          <span className="text-gray-400">I</span> Inventory | <span className="text-gray-400">K</span> Skills | <span className="text-gray-400">ESC</span> Pause
        </div>
      )}
    </div>
  )
}
