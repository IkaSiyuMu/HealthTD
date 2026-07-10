# 策略深度系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 为塔防游戏增加三层策略深度：六边形地形差异、塔连携加成、怪物螺旋路径

**Architecture:** 三个子系统独立修改不同文件：HexGrid 加地形分区和邻居查找、Tower 加连携和地形读取、Monster 改移动算法。config 加轨道强度配置。

**Tech Stack:** Phaser 3，原生 JavaScript

## Global Constraints

- 保持零构建工具，单 HTML 加载
- 所有视觉修改使用 Phaser Graphics API
- 地形效果用乘法叠加：射程×1.25，攻速×0.85（攻速数值越低越快），伤害×1.3
- 连携效果在 draw() 中渲染连线
- 所有数值常量在 config.js 中

---

## 涉及文件

```
Modify: src/js/systems/HexGrid.js   — 地形分区 + 特殊格 + getNeighbors()
Modify: src/js/entities/Tower.js    — 地形加成读取 + 连携系统 + 视觉
Modify: src/js/entities/Monster.js  — 螺旋路径算法
Modify: src/js/config.js            — 怪物轨道强度
```

---

### Task 1: 六边形地形差异

**Files:**
- Modify: `src/js/systems/HexGrid.js`
- Modify: `src/js/entities/Tower.js`

- [ ] **Step 1: HexGrid 新增地形分区**

在 `_generate()` 循环中，为每个 cell 添加 `zone` 属性：

```js
// 在 cell 创建后添加
const dist = Math.sqrt(dx * dx + dy * dy);
cell.buildable = dist >= 55 && dist <= ARENA.RADIUS - 15;
cell.zone = 'middle'; // default
if (cell.buildable) {
  if (dist <= 100) cell.zone = 'outer';
  else if (dist <= 150) cell.zone = 'middle';
  else cell.zone = 'inner';
}
cell.special = null;
```

在 `_generate()` 末尾添加特殊格：

```js
// 每方随机选 2 个 middle 格作为线粒体
const middleCells = this.cells.filter(c => c.buildable && c.zone === 'middle');
const shuffled = [...middleCells].sort(() => Math.random() - 0.5);
shuffled.slice(0, 2).forEach(c => { c.special = 'mitochondria'; });
```

- [ ] **Step 2: HexGrid 渲染地形颜色**

修改 `render()` 方法，用 zone 决定底色：

```js
let baseColor, baseAlpha;
if (c.zone === 'outer')      { baseColor = 0x64b4ff; baseAlpha = 0.15; }
else if (c.zone === 'middle') { baseColor = 0x64ff96; baseAlpha = 0.12; }
else if (c.zone === 'inner')  { baseColor = 0xb464ff; baseAlpha = 0.15; }
// 特殊格闪烁
if (c.special === 'mitochondria' && !c.occupied) {
  const glow = 0.6 + Math.sin(Date.now() * 0.003) * 0.3;
  this.graphics.lineStyle(2, 0xffd700, glow);
  const verts = [];
  for (let i = 0; i < 6; i++) {
    const corner = this._hexCorner(c.x, c.y, i);
    verts.push(corner.x, corner.y);
  }
  this.graphics.beginPath();
  this.graphics.moveTo(verts[0], verts[1]);
  for (let i = 2; i < verts.length; i += 2) this.graphics.lineTo(verts[i], verts[i + 1]);
  this.graphics.closePath();
  this.graphics.strokePath();
}
```

- [ ] **Step 3: HexGrid 新增 getNeighbors 方法**

```js
getNeighbors(q, r) {
  const offsets = [
    { dq: -1, dr: 0 }, { dq: 1, dr: 0 },
    { dq: 0, dr: -1 }, { dq: 0, dr: 1 },
    { dq: -1, dr: 1 }, { dq: 1, dr: -1 },
  ];
  return offsets
    .map(o => this.cells.find(c => c.q === q + o.dq && c.r === o.dr))
    .filter(c => c && c.occupied);
}
```

- [ ] **Step 4: Tower 读取地形加成**

在 Tower 构造时传入 cell 引用，或通过 scene.grid 查找：

在 `GameScene._buildTower()` 中：

```js
const cell = this.selectedCell; // 已有
const tower = new Tower(this, this.selectedCell.x, this.selectedCell.y, config, cell);
```

在 `Tower` 构造器末尾：

```js
constructor(scene, x, y, config, cell) {
  // ... 原有代码 ...
  this.cell = cell || null;
  this.zoneBonus = {};
  if (cell) {
    if (cell.zone === 'outer')   this.zoneBonus.rangeMult = 1.25;
    if (cell.zone === 'middle')  this.zoneBonus.speedMult = 0.85;
    if (cell.zone === 'inner')   this.zoneBonus.damageMult = 1.3;
    if (cell.special === 'mitochondria') this.zoneBonus.atpBonus = 2;
  }
}
```

- [ ] **Step 5: Tower 应用地形加成**

修改攻击逻辑应用 `zoneBonus`：

```js
// 在 update 中计算伤害时
const baseDamage = this.config.damage;
const finalDamage = this.zoneBonus.damageMult
  ? Math.round(baseDamage * this.zoneBonus.damageMult)
  : baseDamage;

// 在攻击触发时使用 finalDamage 替代 this.config.damage

// 在计算射程时
const range = this.zoneBonus.rangeMult
  ? this.config.range * this.zoneBonus.rangeMult
  : this.config.range;

// 在计算攻速时
const attackSpeed = this.zoneBonus.speedMult
  ? Math.round(this.config.attackSpeed * this.zoneBonus.speedMult)
  : this.config.attackSpeed;
```

- [ ] **Step 6: 线粒体特殊格击杀奖励**

在 Tower 中暴露特殊属性，在 `GameScene.update()` 的怪物死亡回调中检查：

```js
// 在 GameScene 的怪物过滤中
if (!m.alive) {
  if (m.onDeath) {
    m.onDeath();
    // 线粒体额外 ATP
    if (m._lastAttacker && m._lastAttacker.zoneBonus && m._lastAttacker.zoneBonus.atpBonus) {
      const atpMgr = /* 确定所属方 */;
      atpMgr.add(m._lastAttacker.zoneBonus.atpBonus);
    }
  }
  return false;
}
```

需要在 Monster 上记录 `_lastAttacker`（在 Bullet/tower 攻击时设置）。

- [ ] **Step 7: 验证**

浏览器打开游戏 → 观察格子颜色：外层淡蓝、中层淡绿、内层淡紫 → 找到 2 个金色闪烁特殊格 → 在不同区域建塔观察加成是否生效

- [ ] **Step 8: 提交**

```bash
git add -A && git commit -m "feat: 六边形地形差异 - 三分区 + 线粒体特殊格"
```

---

### Task 2: 塔连携系统

**Files:**
- Modify: `src/js/entities/Tower.js`
- Modify: `src/js/scenes/GameScene.js`

- [ ] **Step 1: 定义连携映射表**

在 `config.js` 末尾添加：

```js
const SYNERGY_MAP = {
  'melee+ranged': { name: '协同攻击', color: 0xffd700, desc: 'B细胞射速+30%' },
  'melee+aoe':    { name: '膜通道',   color: 0xff6644, desc: '巨噬细胞范围+20px' },
  'ranged+aoe':   { name: '免疫复合物', color: 0x4488ff, desc: '补体伤害+2' },
};
const SAME_SYNERGY = { name: '同种聚集', color: 0xffffff, desc: '攻速+10%' };
```

- [ ] **Step 2: Tower 新增连携状态和 buff 应用**

在 Tower 类中添加属性：

```js
constructor(scene, x, y, config, cell) {
  // ... 原有 ...
  this.synergies = [];      // 激活的连携列表
  this.synergyLines = [];   // 连携连线目标
  this.synergyDirty = true;
}
```

添加方法：

```js
updateSynergy(neighborTowers) {
  this.synergies = [];
  this.synergyLines = [];

  neighborTowers.forEach(n => {
    if (n.hp <= 0) return;
    const types = [this.config.type, n.config.type].sort();
    const key = types.join('+');
    let bonus = null;

    if (types[0] === types[1]) {
      // 同种相邻
      bonus = { ...SAME_SYNERGY, apply: (t) => { t._synASmult = 0.9; } };
    } else if (SYNERGY_MAP[key]) {
      bonus = { ...SYNERGY_MAP[key], apply: (t, other) => {
        if (key === 'melee+ranged') {
          if (t.config.type === 'ranged') t._synASmult = Math.min(t._synASmult || 1, 0.7);
        } else if (key === 'melee+aoe') {
          if (t.config.type === 'melee') t._synRangeAdd = 20;
        } else if (key === 'ranged+aoe') {
          if (t.config.type === 'aoe') t._synDmgAdd = 2;
        }
      }};
    }

    if (bonus) {
      this.synergies.push(bonus);
      this.synergyLines.push({ x: n.x, y: n.y, color: bonus.color });
      bonus.apply(this, n);
      bonus.apply(n, this); // 把效果也应用到邻居
    }
  });
}
```

在 `update()` 中应用 buff：

```js
// 每帧开头重置 buff
this._synASmult = 1;
this._synRangeAdd = 0;
this._synDmgAdd = 0;

// 然后在攻击计算中使用:
// attackSpeed *= this._synASmult
// range += this._synRangeAdd
// damage += this._synDmgAdd
```

- [ ] **Step 3: GameScene 收集邻居并调用 synergy**

在 `GameScene.update()` 中，在所有塔更新之前：

```js
// 连携：为每个塔收集相邻塔的引用
const allTowers = [...this.playerTowers];
// 为每个塔构建邻居查找
allTowers.forEach(t => {
  if (t.hp <= 0 || !t.cell) return;
  const neighbors = this.playerGrid.getNeighbors(t.cell.q, t.cell.r);
  const neighborTowers = neighbors
    .map(c => allTowers.find(ot => ot.cell && ot.cell.q === c.q && ot.cell.r === c.r))
    .filter(nt => nt && nt.hp > 0);
  t.updateSynergy(neighborTowers);
});
```

对 AI 也做同样的处理，使用 `this.aiController.towers` 和 `this.aiGrid`。

- [ ] **Step 4: Tower 绘制连携连线**

在 `Tower.draw()` 末尾添加：

```js
// 连携连线
this.synergyLines.forEach(line => {
  this.graphics.lineStyle(1.5, line.color, 0.4 + Math.sin(Date.now() * 0.005) * 0.2);
  this.graphics.lineBetween(this.x, this.y, line.x, line.y);
});
```

- [ ] **Step 5: 整合地形和连携加成到攻击计算**

修改 `Tower.update()` 中的攻击部分，整合所有加成：

```js
// 应用全局加成
const baseDamage = this.config.damage;
const baseRange = this.config.range;
const baseAS = this.config.attackSpeed;

const dmgMult = this.zoneBonus.damageMult || 1;
const rangeMult = this.zoneBonus.rangeMult || 1;
const asMult = this.zoneBonus.speedMult || 1;

const finalDamage = Math.round(baseDamage * dmgMult) + (this._synDmgAdd || 0);
const finalRange = baseRange * rangeMult + (this._synRangeAdd || 0);
const finalAS = Math.round(baseAS * asMult * (this._synASmult || 1));
```

- [ ] **Step 6: 验证**

浏览器中 → 在相邻格位放置不同塔组合 → 观察塔之间的彩色连线 → 检查 buff 是否生效（射速变快/伤害变高/范围变大）

- [ ] **Step 7: 提交**

```bash
git add -A && git commit -m "feat: 塔连携系统 - 组合加成 + 视觉连线"
```

---

### Task 3: 怪物螺旋路径

**Files:**
- Modify: `src/js/config.js` — 新增 orbitStrength
- Modify: `src/js/entities/Monster.js` — 螺旋移动算法

- [ ] **Step 1: config 添加轨道强度**

```js
const MONSTERS = {
  STAPH:  { name: '葡萄球菌', hp: 30, speed: 60,  damageNucleus: 5,  damageTower: 0, atpReward: 5,  color: 0xd4a017, radius: 10, type: 'basic', orbitStrength: 0.3 },
  STREP:  { name: '链球菌',   hp: 15, speed: 110, damageNucleus: 3,  damageTower: 0, atpReward: 3,  color: 0x66bb44, radius: 7,  type: 'fast',  orbitStrength: 0.1 },
  PHAGE:  { name: '噬菌体',   hp: 50, speed: 55,  damageNucleus: 8,  damageTower: 5, atpReward: 10, color: 0x8844aa, radius: 12, type: 'towerHunter', orbitStrength: 0 },
};
```

- [ ] **Step 2: 修改 Monster.update 的移动逻辑**

定位到 `Monster.update()` 中移向细胞核的部分，将：

```js
const step = this.speed * (delta / 1000) * this.slowFactor;
this.x += (dx / dist) * step;
this.y += (dy / dist) * step;
```

替换为：

```js
// 单位方向向量
const dirX = dx / dist;
const dirY = dy / dist;

// 轨道向量（垂直方向），让怪物走弧线
const orbitStr = this.config.orbitStrength || 0;
const perpX = -dirY * orbitStr;
const perpY = dirX * orbitStr;

const step = this.speed * (delta / 1000) * this.slowFactor;
this.x += (dirX + perpX) * step;
this.y += (dirY + perpY) * step;
```

- [ ] **Step 3: 验证**

浏览器 → 观察怪物移动路径 → 葡萄球菌明显走弧线/螺旋 → 链球菌略弯 → 噬菌体直行 → 怪物经过更多格子区域

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: 怪物螺旋路径 - 弧线移动经过更多格子"
```

---

## 自检清单

- [ ] 地形差异：每个 cell 有 zone 属性 ✅ (Task 1)
- [ ] 地形差异：三个区域不同渲染颜色 ✅ (Task 1)
- [ ] 地形差异：线粒体特殊格 ✅ (Task 1)
- [ ] 地形差异：Tower 读取 zone 加成 ✅ (Task 1)
- [ ] 塔连携：邻居查找 getNeighbors ✅ (Task 1)
- [ ] 塔连携：4 种组合效果 ✅ (Task 2)
- [ ] 塔连携：彩色连线视觉 ✅ (Task 2)
- [ ] 塔连携：加成整合到攻击计算 ✅ (Task 2)
- [ ] 螺旋路径：config 新增 orbitStrength ✅ (Task 3)
- [ ] 螺旋路径：Monster 弧线移动 ✅ (Task 3)
- [ ] 三个子系统互不干扰 ✅
