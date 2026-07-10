// ============================================================
// 免疫风暴 — 游戏全局常量
// ============================================================

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 700;

// --- 阵地 ---
const ARENA = {
  RADIUS: 200,
  MEMBRANE_WIDTH: 6,
  MEMBRANE_COLOR: 0x88bbff,
  NUCLEUS_RADIUS: 40,
  NUCLEUS_HP: 300,
  NUCLEUS_COLOR: 0x4a5f8e,
  INITIAL_ATP: 500,
};

const ARENA_POSITIONS = {
  PLAYER: { x: 300, y: 350 },
  AI: { x: 900, y: 350 },
};

// --- 六边形网格 ---
const HEX = {
  SIZE: 28,
  GRID_RADIUS: 6,
};

// --- 塔 ---
const TOWERS = {
  MACROPHAGE: { name: '巨噬细胞', cost: 100, damage: 12, attackSpeed: 1000, range: 40, hp: 80, color: 0x44aa88, type: 'melee' },
  BCELL:      { name: 'B细胞',     cost: 150, damage: 8,  attackSpeed: 800,  range: 180, hp: 40, color: 0x4488dd, type: 'ranged' },
  COMPLEMENT: { name: '补体系统', cost: 250, damage: 5,  attackSpeed: 1500, range: 120, hp: 60, color: 0xdd8844, type: 'aoe' },
};

// --- 怪物 ---
const MONSTERS = {
  STAPH:  { name: '葡萄球菌', hp: 30, speed: 60,  damageNucleus: 5,  damageTower: 0, atpReward: 5,  color: 0xd4a017, radius: 10, type: 'basic' },
  STREP:  { name: '链球菌',   hp: 15, speed: 110, damageNucleus: 3,  damageTower: 0, atpReward: 3,  color: 0x66bb44, radius: 7,  type: 'fast' },
  PHAGE:  { name: '噬菌体',   hp: 50, speed: 55,  damageNucleus: 8,  damageTower: 5, atpReward: 10, color: 0x8844aa, radius: 12, type: 'towerHunter' },
};

// --- 波次 ---
const WAVES = [
  { staph: 6,  strep: 0, phage: 0 },
  { staph: 6,  strep: 3, phage: 0 },
  { staph: 8,  strep: 4, phage: 2 },
  { staph: 10, strep: 6, phage: 3 },
  { staph: 12, strep: 8, phage: 4 },
  { staph: 14, strep: 10, phage: 5 },
  { staph: 16, strep: 12, phage: 6 },
  { staph: 20, strep: 14, phage: 8 },
];

const WAVE_INTERVAL = 15000;
const CALM_EVERY = 2;
const CALM_DURATION = 10000;
const CALM_ATP_REWARD = 20;

// --- 道具 ---
const ITEMS = {
  INFLAMMATION: { name: '炎症因子', cost: 80,  duration: 8000,  effect: 'enlarge', color: 0xff6666 },
  TOXIN:        { name: '细菌毒素', cost: 120, duration: 3000,  effect: 'stun',    color: 0x66ff66 },
  SIGNAL_JAM:   { name: '信号干扰', cost: 100, duration: 6000,  effect: 'confuse', color: 0x6666ff },
};
const MAX_ITEM_SLOTS = 2;
const ITEM_COOLDOWN = 2000;
