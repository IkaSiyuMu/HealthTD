# 免疫风暴 (Immune TD) MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 构建可玩的 1v1 PvPvE 塔防游戏 MVP，玩家 vs AI，Phaser 3 纯网页实现

**Architecture:** 单 HTML 入口，Phaser 3 CDN 引入，所有游戏逻辑在 Canvas 内渲染。玩家与 AI 在同一场景内并列运行。六边形网格系统管理塔位放置。基于事件的波次管理和资源系统驱动核心循环。

**Tech Stack:** Phaser 3 (CDN `//cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js`)，原生 JavaScript ES6 class，无构建工具

## Global Constraints

- 零构建工具：所有 JS 文件通过 `<script>` 标签顺序加载
- 手机/PC 浏览器兼容：Canvas 自适应视口，支持 touch/click 事件
- 所有常量集中管理在 `config.js`
- 使用 Phaser 3 Graphics API 绘制所有图形（无需外部图片资源）
- 阵地统一为 200px 半径环形区域
- 六边形网格仅覆盖膜内侧到核外侧的环形带
- 所有数值优先使用平衡文档中的初始值

---

## 文件结构

```
src/
├── js/
│   ├── config.js          # 游戏常量：塔/怪/阵地/波次/道具数值
│   ├── main.js            # Phaser Game 配置 + 启动
│   ├── scenes/
│   │   ├── BootScene.js   # 预加载（本 MVP 只用 Graphics，可留空）
│   │   ├── MenuScene.js   # 主菜单 → 开始按钮
│   │   ├── GameScene.js   # 核心玩法场景
│   │   └── ResultScene.js # 结算画面
│   ├── systems/
│   │   ├── HexGrid.js     # 六边形网格生成 + 渲染 + 点击检测
│   │   ├── WaveManager.js # 波次调度 + 怪物生成
│   │   ├── ATPManager.js  # ATP 资源管理 + UI 显示
│   │   └── ItemManager.js # 道具购买 + 释放 + 平静期
│   ├── entities/
│   │   ├── Nucleus.js     # 细胞核（生命值 + 受击 + 渲染）
│   │   ├── Tower.js       # 塔基类 + 3 种塔的配置
│   │   ├── Monster.js     # 怪物基类 + 3 种怪物类型
│   │   └── Bullet.js      # 弹体类
│   └── ai/
│       └── AIController.js # AI 决策逻辑
└── css/
    └── style.css          # 页面样式 + 字体
```

---

### Task 1: 项目骨架 + Phaser 启动

**Files:**
- Create: `index.html`
- Create: `src/css/style.css`
- Create: `src/js/config.js`
- Create: `src/js/main.js`
- Create: `src/js/scenes/BootScene.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: (none, first task)
- Produces: `GAME_WIDTH` / `GAME_HEIGHT` constants, Phaser config, BootScene stub

- [ ] **Step 1: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>免疫风暴 - Immune TD</title>
  <link rel="stylesheet" href="src/css/style.css">
  <script src="//cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
</head>
<body>
  <div id="game-container"></div>
  <script src="src/js/config.js"></script>
  <script src="src/js/main.js"></script>
  <script src="src/js/scenes/BootScene.js"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 style.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }
#game-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
canvas { display: block; }
```

- [ ] **Step 3: 创建 config.js**

```js
// ============================================================
// 免疫风暴 — 游戏全局常量
// ============================================================

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 700;

// --- 阵地 ---
const ARENA = {
  RADIUS: 200,            // 环形阵地半径 (px)
  MEMBRANE_WIDTH: 6,      // 膜描边宽度
  MEMBRANE_COLOR: 0x88bbff,
  NUCLEUS_RADIUS: 40,
  NUCLEUS_HP: 100,
  NUCLEUS_COLOR: 0x4a5f8e,
  INITIAL_ATP: 100,
};

// 左右阵地中心坐标
const ARENA_POSITIONS = {
  PLAYER: { x: 300, y: 350 },
  AI: { x: 900, y: 350 },
};

// --- 六边形网格 ---
const HEX = {
  SIZE: 28,              // 六边形边长
  GRID_RADIUS: 6,        // 网格生成半径（六边形数量）
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
  { staph: 5,  strep: 0, phage: 0 },
  { staph: 5,  strep: 2, phage: 0 },
  { staph: 6,  strep: 3, phage: 1 },
  { staph: 8,  strep: 4, phage: 2 },
  { staph: 5,  strep: 5, phage: 3 },
  { staph: 10, strep: 6, phage: 3 },
  { staph: 8,  strep: 8, phage: 4 },
  { staph: 10, strep: 8, phage: 5 },
];

const WAVE_INTERVAL = 15000;  // 波间间隔 ms
const CALM_EVERY = 2;         // 每 N 波后平静期
const CALM_DURATION = 10000;  // 平静期时长 ms
const CALM_ATP_REWARD = 20;

// --- 道具 ---
const ITEMS = {
  INFLAMMATION: { name: '炎症因子', cost: 80,  duration: 8000,  effect: 'enlarge', color: 0xff6666 },
  TOXIN:        { name: '细菌毒素', cost: 120, duration: 3000,  effect: 'stun',    color: 0x66ff66 },
  SIGNAL_JAM:   { name: '信号干扰', cost: 100, duration: 6000,  effect: 'confuse', color: 0x6666ff },
};
const MAX_ITEM_SLOTS = 2;
const ITEM_COOLDOWN = 2000;
```

- [ ] **Step 4: 创建 main.js**

```js
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#fde8e8',
  scene: [BootScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
```

- [ ] **Step 5: 创建 BootScene.js**

```js
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    // 本 MVP 无外部资源加载，直接跳转菜单
    this.scene.start('MenuScene');
  }
}
```

- [ ] **Step 6: 验证**

在浏览器打开 `index.html` → 看到淡粉色背景的 Phaser canvas（不报错即通过）。如果是空白页检查控制台 JS 错误。

- [ ] **Step 7: 提交**

```bash
git add -A && git commit -m "feat: 项目骨架 + Phaser 3 启动"
```

---

### Task 2: 六边形网格系统

**Files:**
- Create: `src/js/systems/HexGrid.js`
- Add script tag to `index.html`

**Interfaces:**
- Produces: `HexGrid` class with methods: `constructor(scene, centerX, centerY, radius)`, `getCells()`, `getCellAtPixel(x, y)`, `setOccupied(q, r, occupied)`, `render()`

- [ ] **Step 1: 创建 HexGrid.js**

```js
class HexGrid {
  constructor(scene, centerX, centerY, gridRadius, hexSize) {
    this.scene = scene;
    this.cx = centerX;
    this.cy = centerY;
    this.gridRadius = gridRadius;
    this.size = hexSize;
    this.cells = [];      // { q, r, x, y, occupied, buildable }
    this.graphics = scene.add.graphics();
    this._generate();
  }

  _generate() {
    // 轴向坐标 (q, r) 生成六边形网格
    for (let q = -this.gridRadius; q <= this.gridRadius; q++) {
      for (let r = -this.gridRadius; r <= this.gridRadius; r++) {
        if (Math.abs(q + r) > this.gridRadius) continue;
        const pos = this._hexToPixel(q, r);
        const dx = pos.x - this.cx;
        const dy = pos.y - this.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // 只保留环形带：核外 60px ~ 膜内 190px
        const minR = 55;
        const maxR = ARENA.RADIUS - 15;
        const buildable = dist >= minR && dist <= maxR;
        this.cells.push({ q, r, x: pos.x, y: pos.y, occupied: false, buildable });
      }
    }
  }

  _hexToPixel(q, r) {
    // 尖顶六边形 (pointy-top) 轴向坐标转像素
    const x = this.size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = this.size * (3 / 2 * r);
    return { x: x + this.cx, y: y + this.cy };
  }

  _pixelToHex(px, py) {
    const x = (px - this.cx) / this.size;
    const y = (py - this.cy) / this.size;
    const q = (Math.sqrt(3) / 3) * x - (1 / 3) * y;
    const r = (2 / 3) * y;
    return this._roundHex(q, r);
  }

  _roundHex(q, r) {
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return { q: rq, r: rr };
  }

  _hexCorner(cx, cy, i) {
    const angleDeg = 60 * i - 30;
    const angleRad = Math.PI / 180 * angleDeg;
    return { x: cx + this.size * Math.cos(angleRad), y: cy + this.size * Math.sin(angleRad) };
  }

  getCellAtPixel(px, py) {
    const hex = this._pixelToHex(px, py);
    return this.cells.find(c => c.q === hex.q && c.r === hex.r) || null;
  }

  setOccupied(q, r, val) {
    const cell = this.cells.find(c => c.q === q && c.r === r);
    if (cell) cell.occupied = val;
  }

  render() {
    this.graphics.clear();
    this.cells.forEach(c => {
      if (!c.buildable) return;
      const verts = [];
      for (let i = 0; i < 6; i++) {
        const corner = this._hexCorner(c.x, c.y, i);
        verts.push(corner.x, corner.y);
      }
      const fillColor = c.occupied ? 0x44dd88 : 0xccccff;
      const alpha = c.occupied ? 0.6 : 0.25;
      this.graphics.fillStyle(fillColor, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(verts[0], verts[1]);
      for (let i = 2; i < verts.length; i += 2) {
        this.graphics.lineTo(verts[i], verts[i + 1]);
      }
      this.graphics.closePath();
      this.graphics.fillPath();
      this.graphics.lineStyle(1, 0x8888cc, 0.3);
      this.graphics.strokePath();
    });
  }
}
```

- [ ] **Step 2: 在 index.html 添加 HexGrid 的 script 标签**

在 `main.js` 之后、`BootScene.js` 之前加载：

```html
<script src="src/js/systems/HexGrid.js"></script>
```

- [ ] **Step 3: 临时测试渲染**

在 `BootScene.create()` 中添加测试代码来验证 HexGrid 渲染：

```js
create() {
  // 测试 HexGrid
  const grid = new HexGrid(this, 300, 350, HEX.GRID_RADIUS, HEX.SIZE);
  grid.render();
  // 验证单元格数量
  console.log('Hex cells:', grid.cells.filter(c => c.buildable).length);
}
```

预期：控制台输出 `20-30` 个可建造格位，画面上显示六边形网格。

- [ ] **Step 4: 移除测试代码**，恢复 `BootScene.create()`

```js
create() { this.scene.start('MenuScene'); }
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 六边形网格生成 + 渲染"
```

---

### Task 3: 阵地渲染（GameScene + Nucleus + 膜）

**Files:**
- Create: `src/js/entities/Nucleus.js`
- Create: `src/js/scenes/MenuScene.js`
- Create: `src/js/scenes/GameScene.js`
- Update: `index.html` 添加 script 引用

**Interfaces:**
- Produces: `Nucleus` class, `MenuScene` (title + start button), `GameScene` (creates two arenas)

- [ ] **Step 1: 创建 Nucleus.js**

```js
class Nucleus {
  constructor(scene, x, y, radius, maxHp) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.graphics = scene.add.graphics();
    this.draw();
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.draw();
    // 受伤闪烁
    this.scene.tweens.add({
      targets: this.graphics,
      alpha: 0.5, yoyo: true, duration: 80,
    });
    return this.hp <= 0;
  }

  draw() {
    this.graphics.clear();
    // 外圈光晕
    this.graphics.fillStyle(0x4a5f8e, 0.15);
    this.graphics.fillCircle(this.x, this.y, this.radius + 12);
    // 主体
    this.graphics.fillStyle(ARENA.NUCLEUS_COLOR, 0.8);
    this.graphics.fillCircle(this.x, this.y, this.radius);
    // 高光
    this.graphics.fillStyle(0xffffff, 0.2);
    this.graphics.fillCircle(this.x - 8, this.y - 8, this.radius * 0.4);
    // HP 条 (低血量时变色)
    const hpRatio = this.hp / this.maxHp;
    const barW = 60, barH = 6;
    const barX = this.x - barW / 2, barY = this.y + this.radius + 10;
    this.graphics.fillStyle(0x333333, 0.6);
    this.graphics.fillRect(barX, barY, barW, barH);
    const hpColor = hpRatio > 0.5 ? 0x44dd88 : (hpRatio > 0.25 ? 0xddcc44 : 0xdd4444);
    this.graphics.fillStyle(hpColor, 0.9);
    this.graphics.fillRect(barX, barY, barW * hpRatio, barH);
  }

  destroy() { this.graphics.destroy(); }
}
```

- [ ] **Step 2: 创建 MenuScene.js**

```js
class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this.add.text(GAME_WIDTH / 2, 180, '🦠 免疫风暴', {
      fontSize: '48px', fontFamily: 'Arial', color: '#4a5f8e',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 240, 'Immune TD', {
      fontSize: '20px', color: '#8888aa',
    }).setOrigin(0.5);

    const btn = this.add.text(GAME_WIDTH / 2, 380, '[ 开始游戏 ]', {
      fontSize: '28px', color: '#ffffff', backgroundColor: '#4a5f8e',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setBackgroundColor('#5a6f9e'));
    btn.on('pointerout', () => btn.setBackgroundColor('#4a5f8e'));
    btn.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
```

- [ ] **Step 3: 创建 GameScene.js**（基础版：两个阵地 + Nucleus + HexGrid）

```js
class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this.bgColor = 0xfde8e8;

    // === 玩家阵地 (左) ===
    this._drawArena(ARENA_POSITIONS.PLAYER);
    this.playerNucleus = new Nucleus(this, ARENA_POSITIONS.PLAYER.x, ARENA_POSITIONS.PLAYER.y, ARENA.NUCLEUS_RADIUS, ARENA.NUCLEUS_HP);
    this.playerGrid = new HexGrid(this, ARENA_POSITIONS.PLAYER.x, ARENA_POSITIONS.PLAYER.y, HEX.GRID_RADIUS, HEX.SIZE);
    this.playerGrid.render();

    // === AI 阵地 (右) ===
    this._drawArena(ARENA_POSITIONS.AI);
    this.aiNucleus = new Nucleus(this, ARENA_POSITIONS.AI.x, ARENA_POSITIONS.AI.y, ARENA.NUCLEUS_RADIUS, ARENA.NUCLEUS_HP);
    this.aiGrid = new HexGrid(this, ARENA_POSITIONS.AI.x, ARENA_POSITIONS.AI.y, HEX.GRID_RADIUS, HEX.SIZE);
    this.aiGrid.render();
  }

  _drawArena(pos) {
    const g = this.add.graphics();
    // 细胞膜（外圈半透明环）
    g.lineStyle(ARENA.MEMBRANE_WIDTH, ARENA.MEMBRANE_COLOR, 0.6);
    g.strokeCircle(pos.x, pos.y, ARENA.RADIUS);
    // 膜外发光层
    g.fillStyle(ARENA.MEMBRANE_COLOR, 0.08);
    g.fillCircle(pos.x, pos.y, ARENA.RADIUS + 15);
    // 膜内淡色
    g.fillStyle(0xffffff, 0.05);
    g.fillCircle(pos.x, pos.y, ARENA.RADIUS - 3);
  }
}
```

- [ ] **Step 4: 在 index.html 添加新文件 script 标签**

```html
<script src="src/js/scenes/MenuScene.js"></script>
<script src="src/js/scenes/GameScene.js"></script>
<script src="src/js/entities/Nucleus.js"></script>
```

顺序：config.js → HexGrid → Nucleus → MenuScene → GameScene → main.js → BootScene

- [ ] **Step 5: 验证**

打开浏览器 → 点击"开始游戏" → 看到左右两个环形阵地，各有六边形网格 + 细胞核（带 HP 条）。

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat: 阵地渲染 + 细胞核 + 游戏场景"
```

---

### Task 4: 塔放置 + 塔基类

**Files:**
- Create: `src/js/entities/Tower.js`
- Update: `src/js/scenes/GameScene.js` — 添加建造 UI 和点击交互

**Interfaces:**
- Consumes: `HexGrid.getCellAtPixel()`, `HexGrid.setOccupied()`, `ATPManager` (将在 Task 8 创建，先用简单变量)
- Produces: `Tower` class with `update()` tick

- [ ] **Step 1: 创建 Tower.js**

```js
class Tower {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.config = config;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.lastAttack = 0;
    this.target = null;
    this.graphics = scene.add.graphics();
    this.draw();
  }

  draw() {
    this.graphics.clear();
    const r = 14;
    // 底座
    this.graphics.fillStyle(this.config.color, 0.8);
    this.graphics.fillCircle(this.x, this.y, r);
    // 边框
    this.graphics.lineStyle(2, 0xffffff, 0.4);
    this.graphics.strokeCircle(this.x, this.y, r);
    // 类型标记
    if (this.config.type === 'melee') {
      // 巨噬细胞 → 伪足突起
      this.graphics.fillStyle(0xffffff, 0.5);
      this.graphics.fillCircle(this.x + 8, this.y - 6, 5);
    } else if (this.config.type === 'ranged') {
      // B细胞 → Y形标记
      this.graphics.lineStyle(2, 0xffd700, 0.7);
      this.graphics.lineBetween(this.x, this.y - 6, this.x, this.y + 6);
      this.graphics.lineBetween(this.x, this.y - 6, this.x - 5, this.y);
      this.graphics.lineBetween(this.x, this.y - 6, this.x + 5, this.y);
    } else if (this.config.type === 'aoe') {
      // 补体 → 扩散环
      this.graphics.lineStyle(2, 0xffaa44, 0.5);
      this.graphics.strokeCircle(this.x, this.y, r + 6);
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.draw();
    return this.hp <= 0;
  }

  destroy() {
    this.graphics.destroy();
  }
}
```

- [ ] **Step 2: 在 GameScene 添加建造交互**

在 `GameScene.create()` 末尾添加：

```js
// 塔建造 UI
this.selectedTowerType = null;
this.buildMenuVisible = false;
this.buildMenu = this.add.graphics();

// 点击事件
this.input.on('pointerdown', (pointer) => {
  if (this.buildMenuVisible) {
    // 检测是否点击了菜单按钮
    this._handleBuildMenuClick(pointer.x, pointer.y);
    return;
  }
  // 检测是否点击了可建造六边形
  this._tryPlaceTower(pointer.x, pointer.y);
});
```

添加方法：

```js
_tryPlaceTower(px, py) {
  // 检查是否在玩家阵地范围内
  const dx = px - ARENA_POSITIONS.PLAYER.x;
  const dy = py - ARENA_POSITIONS.PLAYER.y;
  if (Math.sqrt(dx * dx + dy * dy) > ARENA.RADIUS) return;

  const cell = this.playerGrid.getCellAtPixel(px, py);
  if (!cell || !cell.buildable || cell.occupied) return;

  // 显示建造菜单
  this._showBuildMenu(cell);
}

_showBuildMenu(cell) {
  this.selectedCell = cell;
  this.buildMenuVisible = true;
  this.buildMenu.clear();

  const menuX = cell.x;
  const menuY = cell.y - 50;
  const types = [
    { key: 'MACROPHAGE', label: `巨噬细胞 (${TOWERS.MACROPHAGE.cost}ATP)`, color: 0x44aa88 },
    { key: 'BCELL', label: `B细胞 (${TOWERS.BCELL.cost}ATP)`, color: 0x4488dd },
    { key: 'COMPLEMENT', label: `补体系统 (${TOWERS.COMPLEMENT.cost}ATP)`, color: 0xdd8844 },
  ];

  // 背景框
  this.buildMenu.fillStyle(0x333333, 0.85);
  this.buildMenu.fillRoundedRect(menuX - 80, menuY - 5, 160, 70, 6);

  // 文字按钮
  types.forEach((t, i) => {
    const tx = menuX;
    const ty = menuY + 10 + i * 22;
    const txt = this.add.text(tx, ty, t.label, {
      fontSize: '13px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    txt._towerKey = t.key;
    txt.on('pointerdown', () => this._buildTower(t.key));
    this.buildMenuItems = this.buildMenuItems || [];
    this.buildMenuItems.push(txt);
  });
}

_buildTower(towerKey) {
  const config = TOWERS[towerKey];
  if (this.atp < config.cost) return; // ATP 检查
  this.atp -= config.cost;

  this.playerGrid.setOccupied(this.selectedCell.q, this.selectedCell.r, true);
  this.playerGrid.render();

  const tower = new Tower(this, this.selectedCell.x, this.selectedCell.y, config);
  this.playerTowers = this.playerTowers || [];
  this.playerTowers.push(tower);

  this._hideBuildMenu();
}

_hideBuildMenu() {
  this.buildMenuVisible = false;
  this.buildMenu.clear();
  if (this.buildMenuItems) {
    this.buildMenuItems.forEach(t => t.destroy());
    this.buildMenuItems = [];
  }
}
```

- [ ] **Step 3: 初始化 GameScene 的 ATP**

在 `GameScene.create()` 开头初始化 ATP：

```js
this.atp = ARENA.INITIAL_ATP;
```

- [ ] **Step 4: 在 index.html 添加 script**

```html
<script src="src/js/entities/Tower.js"></script>
```

- [ ] **Step 5: 验证**

打开游戏 → 点击六边形格位 → 弹出建造菜单 → 点击塔类型 → 塔出现在格位上，格位变绿

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat: 塔基类 + 六边形点击建造"
```

---

### Task 5: 怪物系统

**Files:**
- Create: `src/js/entities/Monster.js`
- Update: `GameScene.js` — 添加怪物生成入口点

**Interfaces:**
- Consumes: `ARENA_POSITIONS`, `MONSTERS` config
- Produces: `Monster` class, monster spawn entry points on membrane

- [ ] **Step 1: 创建 Monster.js**

```js
class Monster {
  constructor(scene, x, y, config, targetX, targetY) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.config = config;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;
    this.targetX = targetX;
    this.targetY = targetY;
    this.alive = true;
    this.reachedTarget = false;
    this.attackTimer = 0;
    this.attackInterval = 1000; // 每秒攻击一次
    this.graphics = scene.add.graphics();
    this.draw();
  }

  update(delta) {
    if (!this.alive) return;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      // 到达细胞核
      this.reachedTarget = true;
      return;
    }

    // 噬菌体逻辑：攻击最近的塔（在 GameScene.update 中设置 targetTower）

    // 移动
    const step = this.speed * (delta / 1000);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.draw();
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      this.graphics.destroy();
      return true; // 死亡
    }
    this.draw();
    return false;
  }

  draw() {
    if (!this.alive) return;
    this.graphics.clear();
    const r = this.config.radius || 10;

    if (this.config.type === 'fast') {
      // 链球菌 — 三个小圆串
      for (let i = -1; i <= 1; i++) {
        this.graphics.fillStyle(this.config.color, 0.8);
        this.graphics.fillCircle(this.x + i * 8, this.y, r * 0.6);
      }
    } else if (this.config.type === 'towerHunter') {
      // 噬菌体 — 几何形
      this.graphics.fillStyle(this.config.color, 0.8);
      this.graphics.fillRect(this.x - r, this.y - r, r * 2, r * 2);
      this.graphics.fillStyle(0xffffff, 0.3);
      this.graphics.fillRect(this.x - r * 0.3, this.y - r * 0.3, r * 0.6, r * 0.6);
    } else {
      // 葡萄球菌 — 圆球
      this.graphics.fillStyle(this.config.color, 0.85);
      this.graphics.fillCircle(this.x, this.y, r);
      this.graphics.fillStyle(0xffffff, 0.2);
      this.graphics.fillCircle(this.x - 3, this.y - 3, r * 0.4);
    }

    // HP 条（受伤时显示）
    if (this.hp < this.maxHp) {
      const barW = 20, barH = 3;
      this.graphics.fillStyle(0x333333, 0.6);
      this.graphics.fillRect(this.x - barW / 2, this.y - r - 6, barW, barH);
      this.graphics.fillStyle(0x44dd44, 0.8);
      this.graphics.fillRect(this.x - barW / 2, this.y - r - 6, barW * (this.hp / this.maxHp), barH);
    }
  }

  destroy() { this.graphics.destroy(); this.alive = false; }
}
```

- [ ] **Step 2: 生成怪物入口点**

在 `GameScene` 中添加方法：

```js
_getSpawnPoints(pos) {
  // 膜上均匀分布 6 个入口点
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i;
    points.push({
      x: pos.x + Math.cos(angle) * ARENA.RADIUS,
      y: pos.y + Math.sin(angle) * ARENA.RADIUS,
    });
  }
  return points;
}
```

- [ ] **Step 3: 在 index.html 添加 script**

```html
<script src="src/js/entities/Monster.js"></script>
```

- [ ] **Step 4: 验证**

在 `GameScene.create()` 中临时测试生成一个怪物：

```js
// 临时测试
const spawns = this._getSpawnPoints(ARENA_POSITIONS.PLAYER);
const testMonster = new Monster(
  this, spawns[0].x, spawns[0].y,
  MONSTERS.STAPH,
  ARENA_POSITIONS.PLAYER.x, ARENA_POSITIONS.PLAYER.y
);
this.monsters = [testMonster];
```

在 `GameScene.update(time, delta)` 中：

```js
update(time, delta) {
  if (this.monsters) {
    this.monsters.forEach(m => m.update(delta));
  }
}
```

预期：一个金色圆球从膜边缘移动到细胞核。

- [ ] **Step 5: 移除测试代码**，保留 `Monster` 类和方法结构

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat: 怪物类 + 3种怪物视觉 + 移动"
```

---

### Task 6: 战斗系统（塔攻击 + 怪物受伤）

**Files:**
- Create: `src/js/entities/Bullet.js`
- Update: `GameScene.js` — 战斗循环
- Update: `Tower.js` — 目标检测 + 攻击

**Interfaces:**
- Produces: `Bullet` class, tower targeting + firing, monster death → ATP reward callback

- [ ] **Step 1: 创建 Bullet.js**

```js
class Bullet {
  constructor(scene, fromX, fromY, target, speed, damage, color) {
    this.scene = scene;
    this.x = fromX;
    this.y = fromY;
    this.target = target;
    this.speed = speed || 300;
    this.damage = damage;
    this.alive = true;
    this.color = color || 0xffd700;
    this.graphics = scene.add.graphics();
    this.draw();
  }

  update(delta) {
    if (!this.alive || !this.target || !this.target.alive) {
      this.alive = false;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      this.target.takeDamage(this.damage);
      this.alive = false;
      return;
    }

    const step = this.speed * (delta / 1000);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.draw();
  }

  draw() {
    if (!this.alive) return;
    this.graphics.clear();
    // Y 形抗体弹体
    this.graphics.lineStyle(2, this.color, 0.9);
    const s = 4;
    this.graphics.lineBetween(this.x, this.y - s, this.x, this.y + s);
    this.graphics.lineBetween(this.x, this.y - s, this.x - s, this.y - s * 0.3);
    this.graphics.lineBetween(this.x, this.y - s, this.x + s, this.y - s * 0.3);
  }

  destroy() { this.graphics.destroy(); this.alive = false; }
}
```

- [ ] **Step 2: 更新 Tower.js — 添加攻击逻辑**

在 Tower 类中添加方法：

```js
update(time, delta, monsters, bullets) {
  if (this.hp <= 0) return;

  if (this.config.type === 'aoe') {
    // AOE 持续伤害（补体系统）
    monsters.forEach(m => {
      if (!m.alive) return;
      const dx = m.x - this.x, dy = m.y - this.y;
      if (Math.sqrt(dx * dx + dy * dy) <= this.config.range) {
        if (time - this.lastAttack >= this.config.attackSpeed) {
          m.takeDamage(this.config.damage);
        }
      }
    });
    this.lastAttack = time;
    return;
  }

  // 锁定目标
  this.target = null;
  let minDist = this.config.range;
  monsters.forEach(m => {
    if (!m.alive) return;
    const dx = m.x - this.x, dy = m.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= minDist) {
      minDist = dist;
      this.target = m;
    }
  });

  if (this.target && time - this.lastAttack >= this.config.attackSpeed) {
    this.lastAttack = time;
    const bullet = new Bullet(
      this.scene, this.x, this.y,
      this.target, 300, this.config.damage,
      0xffd700
    );
    bullets.push(bullet);
  }
}
```

- [ ] **Step 3: 在 GameScene 中组装战斗循环**

在 `GameScene.create()` 初始化：

```js
this.monsters = [];
this.bullets = [];
this.playerTowers = [];
```

在 `GameScene.update(time, delta)`：

```js
update(time, delta) {
  // 更新怪物
  this.monsters.forEach(m => m.update(delta));

  // 更新塔（攻击）
  this.playerTowers.forEach(t => {
    t.update(time, delta, this.monsters, this.bullets);
  });

  // 更新子弹
  this.bullets.forEach(b => b.update(delta));

  // 清理死亡/到达的怪物
  this.monsters = this.monsters.filter(m => {
    if (!m.alive) {
      // ATP 奖励（由 WaveManager 或回调处理）
      return false;
    }
    if (m.reachedTarget) {
      const destroyed = this.playerNucleus.takeDamage(m.config.damageNucleus);
      m.destroy();
      if (destroyed) this._gameOver('玩家');
      return false;
    }
    return true;
  });

  // 清理已完成子弹
  this.bullets = this.bullets.filter(b => {
    if (!b.alive) { b.destroy(); return false; }
    return true;
  });
}
```

- [ ] **Step 4: 在 index.html 添加 script**

```html
<script src="src/js/entities/Bullet.js"></script>
```

- [ ] **Step 5: 验证**

放置一座巨噬细胞 → 手动生成一个在范围内的怪物 → 塔发射 Y 形子弹 → 怪物掉血 → 怪物到达核时核掉血

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat: 战斗系统 - 塔攻击 + 子弹 + 伤害"
```

---

### Task 7: 波次管理 + ATP 经济

**Files:**
- Create: `src/js/systems/WaveManager.js`
- Create: `src/js/systems/ATPManager.js`
- Update: `GameScene.js` — 集成波次和 ATP

- [ ] **Step 1: 创建 WaveManager.js**

```js
class WaveManager {
  constructor(scene, spawnPlayerFn, spawnAiFn) {
    this.scene = scene;
    this.spawnPlayer = spawnPlayerFn;
    this.spawnAi = spawnAiFn;
    this.currentWave = -1;
    this.waveActive = false;
    this.spawnTimer = 0;
    this.spawnQueue = [];
    this.waveStartTime = 0;
    this.isCalm = false;
    this.calmStartTime = 0;
    this.onCalmStart = null;
    this.onCalmEnd = null;
  }

  start() {
    this.currentWave = -1;
    this._nextWave();
  }

  _nextWave() {
    this.currentWave++;
    if (this.currentWave >= WAVES.length) {
      // 所有波次完成 → 游戏结束，比血量
      if (this.scene.onAllWavesComplete) this.scene.onAllWavesComplete();
      return;
    }

    // 检查平静期
    if (this.currentWave > 0 && this.currentWave % CALM_EVERY === 0) {
      this._startCalm();
      return;
    }

    this._startWave();
  }

  _startCalm() {
    this.isCalm = true;
    this.calmStartTime = Date.now();
    if (this.onCalmStart) this.onCalmStart();

    this.scene.time.delayedCall(CALM_DURATION, () => {
      this.isCalm = false;
      if (this.onCalmEnd) this.onCalmEnd();
      this._startWave();
    });
  }

  _startWave() {
    this.waveActive = true;
    this.waveStartTime = Date.now();
    const wave = WAVES[this.currentWave];
    this.spawnQueue = [];

    for (let i = 0; i < wave.staph; i++) this.spawnQueue.push({ type: 'STAPH', delay: i * 600 });
    for (let i = 0; i < wave.strep; i++) this.spawnQueue.push({ type: 'STREP', delay: i * 400 });
    for (let i = 0; i < wave.phage; i++) this.spawnQueue.push({ type: 'PHAGE', delay: i * 800 });

    // 打乱队列顺序
    this.spawnQueue.sort((a, b) => a.delay - b.delay);
    // 加一点随机偏移
    this.spawnQueue.forEach(item => {
      item.delay += Math.random() * 300;
    });

    this.spawnTimer = 0;
    this.spawnIndex = 0;

    if (this.scene.onWaveStart) this.scene.onWaveStart(this.currentWave);
  }

  update(delta) {
    if (!this.waveActive || this.spawnIndex >= this.spawnQueue.length) return;

    this.spawnTimer += delta;
    const item = this.spawnQueue[this.spawnIndex];
    if (this.spawnTimer >= item.delay) {
      this.spawnPlayer(item.type);
      this.spawnAi(item.type);
      this.spawnIndex++;
    }
  }

  isWaveComplete() {
    if (!this.waveActive) return false;
    return this.spawnIndex >= this.spawnQueue.length;
  }
}
```

- [ ] **Step 2: 创建 ATPManager.js**

```js
class ATPManager {
  constructor(scene, x, y, label) {
    this.scene = scene;
    this.atp = ARENA.INITIAL_ATP;
    this.x = x;
    this.y = y;
    this.label = label;
    this.text = scene.add.text(x, y, '', {
      fontSize: '18px', fontFamily: 'Arial', color: '#4a5f8e', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.updateDisplay();
  }

  add(amount) {
    this.atp += amount;
    this.updateDisplay();
  }

  spend(amount) {
    if (this.atp < amount) return false;
    this.atp -= amount;
    this.updateDisplay();
    return true;
  }

  updateDisplay() {
    this.text.setText(`${this.label}: ${this.atp} ATP`);
  }

  destroy() { this.text.destroy(); }
}
```

- [ ] **Step 3: 集成到 GameScene**

在 `create()` 中：

```js
// ATP 管理器
this.playerATP = new ATPManager(this, ARENA_POSITIONS.PLAYER.x, 20, '玩家');
this.aiATP = new ATPManager(this, ARENA_POSITIONS.AI.x, 20, 'AI');

// 波次管理器 — 生成回调
this.waveManager = new WaveManager(
  this,
  (type) => this._spawnMonster(type, ARENA_POSITIONS.PLAYER),
  (type) => this._spawnMonster(type, ARENA_POSITIONS.AI),
);
this.waveManager.onCalmStart = () => this._onCalmStart();
this.waveManager.onCalmEnd = () => this._onCalmEnd();
```

添加 `_spawnMonster` 方法：

```js
_spawnMonster(type, arenaPos) {
  const config = MONSTERS[type];
  const spawns = this._getSpawnPoints(arenaPos);
  const spawn = spawns[Math.floor(Math.random() * spawns.length)];
  const monster = new Monster(
    this, spawn.x, spawn.y, config,
    arenaPos.x, arenaPos.y
  );
  monster.onDeath = () => {
    const atpMgr = arenaPos === ARENA_POSITIONS.PLAYER ? this.playerATP : this.aiATP;
    atpMgr.add(config.atpReward);
  };
  this.monsters.push(monster);
}
```

在 `update()` 中添加波次更新和怪物死亡的 ATP 奖励：

```js
this.waveManager.update(delta);

// 怪物死亡回调（在过滤死亡怪物时）
this.monsters = this.monsters.filter(m => {
  if (!m.alive) {
    if (m.onDeath) m.onDeath();
    return false;
  }
  // ... 原有到达检测
});
```

- [ ] **Step 4: 限制建造消耗 ATP**

更新 `GameScene._buildTower()`：

```js
_buildTower(towerKey) {
  const config = TOWERS[towerKey];
  if (!this.playerATP.spend(config.cost)) return;
  // ... 继续建造
}
```

- [ ] **Step 5: 在 index.html 添加 scripts**

```html
<script src="src/js/systems/WaveManager.js"></script>
<script src="src/js/systems/ATPManager.js"></script>
```

- [ ] **Step 6: 验证**

点击"开始游戏" → 第 1 波怪物从双方阵地生成 → 击杀后 ATP 增加 → 造塔消耗 ATP → 波次自动推进

- [ ] **Step 7: 提交**

```bash
git add -A && git commit -m "feat: 波次管理 + ATP 经济系统"
```

---

### Task 8: AI 对手

**Files:**
- Create: `src/js/ai/AIController.js`
- Update: `GameScene.js` — AI 决策触发

- [ ] **Step 1: 创建 AIController.js**

```js
class AIController {
  constructor(scene, grid, atpManager, nucleus) {
    this.scene = scene;
    this.grid = grid;
    this.atp = atpManager;
    this.nucleus = nucleus;
    this.towers = [];
    this.lastDecision = 0;
    this.decisionInterval = 2000; // 每 2 秒决策一次
    this.difficultyDelay = 500;   // 决策延迟（难度调节）
  }

  update(time, delta, monsters) {
    if (time - this.lastDecision < this.decisionInterval + this.difficultyDelay) return;
    this.lastDecision = time;

    // 决策规则
    if (this.atp.atp < 50) return; // 钱不够，等待

    // 1. 优先造塔补齐防守
    const towerCount = this.towers.length;
    if (towerCount < 4 && this.atp.atp >= 100) {
      this._buildTower();
      return;
    }

    // 2. 已有 4+ 塔 + 钱多 → 买道具（由 ItemManager 处理）
    if (towerCount >= 4 && this.atp.atp >= 120) {
      if (Math.random() < 0.4) {
        // 通知 scene 使用道具（在 ItemManager 中实现）
        if (this.scene.onAiUseItem) this.scene.onAiUseItem();
      }
    }
  }

  _buildTower() {
    // 找一个空闲的可建造格位
    const emptyCells = this.grid.cells.filter(c => c.buildable && !c.occupied);
    if (emptyCells.length === 0) return;

    // 选择靠近入口的格位（优先防守）
    emptyCells.sort((a, b) => {
      const distA = Math.abs(a.y - this.grid.cy);
      const distB = Math.abs(b.y - this.grid.cy);
      return distA - distB;
    });

    // 选择塔类型（根据现有塔比例）
    const types = Object.keys(TOWERS);
    const weights = [0.5, 0.3, 0.2]; // 巨噬细胞 50%, B细胞 30%, 补体 20%
    let r = Math.random(), idx = 0;
    for (let i = 0; i < weights.length; i++) {
      if (r < weights[i]) { idx = i; break; }
      r -= weights[i];
    }
    const towerKey = types[idx];
    const config = TOWERS[towerKey];
    if (!this.atp.spend(config.cost)) return;

    const cell = emptyCells[0];
    this.grid.setOccupied(cell.q, cell.r, true);
    this.grid.render();

    const tower = new Tower(this.scene, cell.x, cell.y, config);
    this.towers.push(tower);
  }

  updateTowers(time, delta, monsters, bullets) {
    this.towers.forEach(t => {
      t.update(time, delta, monsters, bullets);
    });
  }
}
```

- [ ] **Step 2: 在 GameScene 初始化 AI**

```js
this.aiController = new AIController(
  this,
  this.aiGrid,
  this.aiATP,
  this.aiNucleus
);
```

在 `update()` 中添加：

```js
// AI 决策
this.aiController.update(time, delta, this.monsters);
// AI 塔攻击
this.aiController.updateTowers(time, delta, this.monsters, this.bullets);
```

- [ ] **Step 3: 在 index.html 添加 script**

```html
<script src="src/js/ai/AIController.js"></script>
```

- [ ] **Step 4: 验证**

开始游戏 → AI 阵地自动建塔 → AI 塔攻击经过的怪物 → AI 塔随着波次推进逐渐增多

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: AI 对手 - 自动建造 + 防守"
```

---

### Task 9: 道具系统 + 平静期

**Files:**
- Create: `src/js/systems/ItemManager.js`
- Update: `GameScene.js` — 道具 UI + 平静期提示

- [ ] **Step 1: 创建 ItemManager.js**

```js
class ItemManager {
  constructor(scene, playerATP, aiATP, atpText) {
    this.scene = scene;
    this.playerATP = playerATP;
    this.aiATP = aiATP;
    this.slots = [];             // 玩家持有道具
    this.lastUseTime = 0;
    this.cooldown = ITEM_COOLDOWN;
    this.activeEffects = [];     // 生效中的效果
    this.graphics = scene.add.graphics();
    this.atpText = atpText;
  }

  purchase(itemKey) {
    if (this.slots.length >= MAX_ITEM_SLOTS) return false;
    const item = ITEMS[itemKey];
    if (!this.playerATP.spend(item.cost)) return false;
    this.slots.push({ ...item, key: itemKey });
    this.renderUI();
    return true;
  }

  useItem(index, targetSide) {
    const item = this.slots[index];
    if (!item) return;
    if (Date.now() - this.lastUseTime < this.cooldown) return;

    this.lastUseTime = Date.now();
    this.slots.splice(index, 1);

    // 应用效果
    const effect = {
      item: item,
      target: targetSide,
      startTime: Date.now(),
      duration: item.duration,
    };
    this.activeEffects.push(effect);
    this.renderUI();
  }

  isEffectActive(effectType, targetSide) {
    return this.activeEffects.some(e =>
      e.item.effect === effectType &&
      e.target === targetSide &&
      Date.now() - e.startTime < e.duration
    );
  }

  update() {
    // 清理过期效果
    this.activeEffects = this.activeEffects.filter(e =>
      Date.now() - e.startTime < e.duration
    );
  }

  renderUI() {
    this.graphics.clear();
    const startX = ARENA_POSITIONS.PLAYER.x - 80;
    const y = GAME_HEIGHT - 50;

    // 背景
    this.graphics.fillStyle(0x333333, 0.7);
    this.graphics.fillRoundedRect(startX - 10, y - 20, 180, 40, 6);

    this.scene.children.each(child => {
      if (child._isItemUI) child.destroy();
    });

    this.slots.forEach((item, i) => {
      const x = startX + i * 60;
      const txt = this.scene.add.text(x, y, `[${item.name}]`, {
        fontSize: '12px', color: '#ffffff', backgroundColor: '#666666',
        padding: { x: 6, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      txt._isItemUI = true;
      txt._itemIndex = i;
      txt.on('pointerdown', () => {
        this.useItem(i, 'ai');
      });
    });
  }

  /**
   * 获取某一方受道具影响的效果修正
   * @param {string} side - 'player' | 'ai'
   * @param {string} effectType - 'enlarge' | 'stun' | 'confuse'
   */
  getModifier(side, effectType) {
    return this.isEffectActive(effectType, side);
  }
}
```

- [ ] **Step 2: 在 GameScene.create 中初始化 ItemManager**

```js
this.itemManager = new ItemManager(this, this.playerATP, this.aiATP);

// AI 使用道具回调
this.aiController.scene.onAiUseItem = () => {
  // AI 随机购买道具并释放到玩家
  const itemKeys = Object.keys(ITEMS);
  const key = itemKeys[Math.floor(Math.random() * itemKeys.length)];
  if (this.aiATP.spend(ITEMS[key].cost)) {
    // AI 直接释放效果到玩家
    this.itemManager.activeEffects.push({
      item: ITEMS[key],
      target: 'player',
      startTime: Date.now(),
      duration: ITEMS[key].duration,
    });
  }
};
```

- [ ] **Step 3: 添加平静期 UI**

在 `GameScene` 添加方法：

```js
_onCalmStart() {
  this.isCalm = true;
  // 平静期提示
  const calmText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '🧬 平静期 — 干扰对手的最佳时机！', {
    fontSize: '24px', color: '#ff6666', fontStyle: 'bold',
    backgroundColor: '#ffffffcc', padding: { x: 20, y: 10 },
  }).setOrigin(0.5);
  calmText._calmText = true;

  // ATP 恢复
  this.playerATP.add(CALM_ATP_REWARD);
  this.aiATP.add(CALM_ATP_REWARD);

  // 延迟移除提示
  this.time.delayedCall(CALM_DURATION - 500, () => {
    if (calmText && calmText._calmText) calmText.destroy();
  });
}

_onCalmEnd() {
  this.isCalm = false;
  // 平静期结束提示
  const endText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, '⚡ 进攻恢复！', {
    fontSize: '20px', color: '#ff8844',
  }).setOrigin(0.5);
  this.time.delayedCall(1500, () => endText.destroy());
}
```

在 `_buildTower` 中检查平静期：

```js
if (this.isCalm) return; // 平静期不能造塔
```

- [ ] **Step 4: 在 GameScene 添加道具购买 UI**

在左上角添加购买道具按钮：

```js
_createItemShop() {
  const y = 60;
  const itemKeys = Object.keys(ITEMS);
  itemKeys.forEach((key, i) => {
    const item = ITEMS[key];
    const x = 80 + i * 140;
    const txt = this.add.text(x, y, `买:${item.name}(${item.cost})`, {
      fontSize: '12px', color: '#ffffff', backgroundColor: '#884488',
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    txt._itemShopKey = key;
    txt.on('pointerdown', () => {
      this.itemManager.purchase(key);
    });
  });
}
```

在 `create()` 中调用 `this._createItemShop();`

- [ ] **Step 5: 在 index.html 添加 script**

```html
<script src="src/js/systems/ItemManager.js"></script>
```

- [ ] **Step 6: 验证**

波次中平静期触发 → 文字提示 + ATP 恢复 → 平静期不能造塔 → 购买道具 → 点击道具对 AI 释放 → AI 也释放道具

- [ ] **Step 7: 提交**

```bash
git add -A && git commit -m "feat: 道具系统 + 平静期机制"
```

---

### Task 10: 游戏流程（结算 + 胜负判定）

**Files:**
- Create: `src/js/scenes/ResultScene.js`
- Update: `GameScene.js` — 胜负判定 + 游戏结束

- [ ] **Step 1: 创建 ResultScene.js**

```js
class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }

  init(data) {
    this.result = data.result || 'draw'; // 'win' | 'lose' | 'draw'
    this.playerHp = data.playerHp || 0;
    this.aiHp = data.aiHp || 0;
    this.wave = data.wave || 0;
  }

  create() {
    const messages = {
      win:  { text: '🧬 胜利！', color: '#44dd88' },
      lose: { text: '💀 淘汰', color: '#dd4444' },
      draw: { text: '⚖️ 平局', color: '#ddcc44' },
    };
    const msg = messages[this.result];

    this.add.text(GAME_WIDTH / 2, 180, msg.text, {
      fontSize: '56px', color: msg.color, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 260, `玩家核血量: ${this.playerHp}%  |  AI核血量: ${this.aiHp}%`, {
      fontSize: '18px', color: '#666688',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 290, `坚持到第 ${this.wave + 1} 波`, {
      fontSize: '16px', color: '#8888aa',
    }).setOrigin(0.5);

    const btn = this.add.text(GAME_WIDTH / 2, 400, '[ 再来一局 ]', {
      fontSize: '26px', color: '#ffffff', backgroundColor: '#4a5f8e',
      padding: { x: 26, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setBackgroundColor('#5a6f9e'));
    btn.on('pointerout', () => btn.setBackgroundColor('#4a5f8e'));
    btn.on('pointerdown', () => this.scene.start('GameScene'));

    this.add.text(GAME_WIDTH / 2, 460, '[ 返回主菜单 ]', {
      fontSize: '16px', color: '#8888aa',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
```

- [ ] **Step 2: 在 GameScene 添加胜负判定**

```js
_gameOver(loser) {
  if (this._isGameOver) return;
  this._isGameOver = true;

  let result;
  if (loser === '玩家') result = 'lose';
  else if (loser === 'AI') result = 'win';
  else result = 'draw';

  const pHp = Math.round((this.playerNucleus.hp / this.playerNucleus.maxHp) * 100);
  const aHp = Math.round((this.aiNucleus.hp / this.aiNucleus.maxHp) * 100);

  // 延迟跳转结算
  this.time.delayedCall(1000, () => {
    this.scene.start('ResultScene', {
      result,
      playerHp: pHp,
      aiHp: aHp,
      wave: this.waveManager ? this.waveManager.currentWave : 0,
    });
  });
}

onAllWavesComplete() {
  // 所有波次结束，比血量
  const pHp = this.playerNucleus.hp;
  const aHp = this.aiNucleus.hp;
  let result;
  if (pHp > aHp) result = 'win';
  else if (aHp > pHp) result = 'lose';
  else result = 'draw';
  this._gameOver(result);
}
```

- [ ] **Step 3: 在 GameScene.update 中调用核毁灭检测**

```js
// 怪物到达检测
if (m.reachedTarget) {
  const destroyed = this.playerNucleus.takeDamage(m.config.damageNucleus);
  m.destroy();
  if (destroyed) this._gameOver('玩家');
  return false;
}

// 噬菌体打塔检测
```

- [ ] **Step 4: 添加噬菌体攻击塔逻辑（在 Monster.update 中）**

在 `Monster.update()` 开头添加：

```js
// 噬菌体：寻找最近的塔
if (this.config.type === 'towerHunter' && this.scene.playerTowers) {
  let nearestTower = null;
  let minDist = 100; // 攻击范围
  const allTowers = [...(this.scene.playerTowers || []), ...(this.scene.aiController?.towers || [])];
  allTowers.forEach(t => {
    if (t.hp <= 0) return;
    const dx = t.x - this.x, dy = t.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearestTower = t;
    }
  });

  if (nearestTower) {
    // 攻击塔而非走向核
    this.attackTimer += delta;
    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      const dead = nearestTower.takeDamage(this.config.damageTower);
      if (dead) {
        // 从对应数组中移除
        const arr = this.scene.playerTowers?.includes(nearestTower)
          ? this.scene.playerTowers : this.scene.aiController?.towers;
        if (arr) {
          const idx = arr.indexOf(nearestTower);
          if (idx >= 0) arr.splice(idx, 1);
        }
      }
    }
    return; // 不移动
  }
}
```

注意：这里访问 `this.scene` 需要把场景引用传入 Monster。在 `_spawnMonster` 和 `Monster` 构造函数中确保引用。

- [ ] **Step 5: 在 index.html 添加 script**

```html
<script src="src/js/scenes/ResultScene.js"></script>
```

- [ ] **Step 6: 更新 `BootScene` 场景列表**

```js
scene: [BootScene, MenuScene, GameScene, ResultScene],
```

- [ ] **Step 7: 验证**

完整游戏流程：主菜单 → 开始 → 8 波战斗 → 结算画面 → 再来一局 / 返回菜单

- [ ] **Step 8: 提交**

```bash
git add -A && git commit -m "feat: 结算画面 + 胜负判定 + 完整游戏流程"
```

---

### Task 11: 视觉打磨 + 手机适配

**Files:**
- Update: `index.html` — 移动端 meta 优化
- Update: `src/css/style.css` — 禁用滚动/缩放
- Update: `GameScene.js` — 视觉效果
- Update: `Monster.js` — 死亡动画
- Update: `Nucleus.js` — 低血量特效

- [ ] **Step 1: 怪物死亡溶解动画**

在 Monster 死亡时添加粒子效果（Phaser 3 内置粒子）：

```js
// 在 Monster.takeDamage 中，hp<=0 时触发
if (this.hp <= 0) {
  // 简单爆炸效果（用 Graphics 模拟）
  const explosion = this.scene.add.graphics();
  explosion.fillStyle(this.config.color, 0.6);
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 15;
    explosion.fillCircle(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist, 3);
  }
  this.scene.tweens.add({
    targets: explosion, alpha: 0, duration: 300,
    onComplete: () => explosion.destroy(),
  });
}
```

- [ ] **Step 2: 核受伤震颤 + 裂痕**

在 `Nucleus.takeDamage` 中添加裂痕 Graphics：

```js
// 低血量时画裂痕
if (this.hp / this.maxHp < 0.3) {
  this.graphics.lineStyle(2, 0xff4444, 0.5);
  this.graphics.lineBetween(this.x - 10, this.y - 8, this.x + 8, this.y + 12);
  this.graphics.lineBetween(this.x + 5, this.y - 12, this.x - 5, this.y + 5);
}
```

- [ ] **Step 3: 响应式 canvas**

确认 `main.js` 中 `scale` 配置：

```js
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  min: { width: 600, height: 350 },
  max: { width: 1800, height: 1050 },
}
```

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: 视觉打磨 + 手机适配"
```

---

## 自检清单

- [ ] MVP 设计文档中的每个功能点是否都有 task 覆盖？
  - 3 种塔 ✅ (Task 4, 5)
  - 3 种怪 ✅ (Task 5, 6)
  - 8 波次 ✅ (Task 7)
  - ATP 经济 ✅ (Task 7)
  - AI 对手 ✅ (Task 8)
  - 3 道具 + 平静期 ✅ (Task 9)
  - 结算/胜负 ✅ (Task 10)
- [ ] 是否有任何 TODO 或 TBD？无
- [ ] 跨 task 的类型/方法签名是否一致？Tower/Monster/update 接口在 Task 5-9 间一致
- [ ] scope 是否聚焦在 MVP 范围内？是，全局事件/升级树/联机均未包含
