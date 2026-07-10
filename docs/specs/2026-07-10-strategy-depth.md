# 免疫风暴 — 策略深度系统设计 v1

> 2026-07-10

## 概述

在现有 MVP 基础上增加三个策略层：塔连携、地形差异、怪物螺旋路径。三者独立实现但相互叠加，让"塔怎么摆"成为核心决策。

---

## 一、塔连携系统

### 1.1 六边形邻居判定

对于轴向坐标 (q, r) 的六边形，邻居偏移为：
```
(q-1, r), (q+1, r), (q, r-1), (q, r+1), (q-1, r+1), (q+1, r-1)
```

在 `HexGrid` 中新增 `getNeighbors(q, r)` 方法，返回相邻格位的塔列表。

### 1.2 连携表

| 组合 A | 组合 B | 效果 |
|--------|--------|------|
| 巨噬细胞 (melee) | B细胞 (ranged) | B细胞 射速 +30%（攻速 800ms → 560ms）|
| 巨噬细胞 (melee) | 补体系统 (aoe) | 巨噬细胞 射程 40px → 60px |
| B细胞 (ranged) | 补体系统 (aoe) | 补体系统 伤害 5 → 7/跳 |
| 同种塔相邻 | 同种塔相邻 | 各自攻速 +10%（可叠加） |

### 1.3 视觉反馈

在 `Tower.draw()` 中增加：如果有激活的连携，在塔之间画一条半透明连线。
- 巨噬细胞↔B细胞: 金色线 (#ffd700)
- 巨噬细胞↔补体: 红色线 (#ff6644) 
- B细胞↔补体: 蓝色线 (#4488ff)
- 同种: 白色虚线 (#ffffff)

### 1.4 实现方案

Tower 类新增：
```js
// 每帧调用
updateSynergy(neighborTowers) {
  this.synergies = [];
  neighborTowers.forEach(n => {
    if (n.hp <= 0) return;
    const key = [this.config.type, n.config.type].sort().join('+');
    if (bonusMap[key]) this.synergies.push(bonusMap[key]);
  });
  this.applySynergyBuffs();
}
```

在 `GameScene.update()` 中收集每个塔的邻居并调用 `updateSynergy()`。

---

## 二、六边形地形差异

### 2.1 地形分区

根据格子到阵地中心的距离 `dist`，将六边形分为三个区域：

| 区域 | 距离范围 | 颜色 | 效果 | 大约格数 |
|------|---------|------|------|---------|
| 膜缘区 (outer) | 55 ~ 100px | `rgba(100,180,255,0.2)` 淡蓝 | 塔射程 +25% | ~8 |
| 细胞质区 (middle) | 100 ~ 150px | `rgba(100,255,150,0.2)` 淡绿 | 塔攻速 +15% | ~10 |
| 核周区 (inner) | 150 ~ 185px | `rgba(180,100,255,0.2)` 淡紫 | 塔伤害 +30% | ~6 |

### 2.2 特殊格：线粒体

每方阵地随机选 2 个可建造格（优先选细胞质区）设为线粒体格：
- 视觉: 金色闪烁轮廓
- 效果: 放置的塔击杀怪物额外 +2 ATP
- 标记: `cell.special = 'mitochondria'`

### 2.3 修改 HexGrid

在 `_generate()` 中为每个 cell 添加 `zone` 属性：
```js
cell.zone = dist <= 100 ? 'outer' : (dist <= 150 ? 'middle' : 'inner');
```

然后随机挑选 2 个 middle 格设为 special。

`HexGrid.render()` 根据 `cell.zone` 使用不同底色。

### 2.4 Tower 读取属性

Tower 在构造时从 `cell.zone` 读取地形加成，存储在 `this.zoneBonus` 中。
在攻击/伤害计算时应用加成。

---

## 三、怪物螺旋路径

### 3.1 核心算法

怪物移动时，在"朝向核"的方向向量上叠加一个垂直的"轨道分量"：

```js
// 在 Monster.update() 中
const dx = targetX - this.x;
const dy = targetY - this.y;
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist < 8) { reachedTarget = true; return; }

// 单位方向向量
const dirX = dx / dist;
const dirY = dy / dist;

// 轨道向量（垂直方向）
const orbitStrength = this.config.orbitStrength || 0;
const perpX = -dirY * orbitStrength;
const perpY = dirX * orbitStrength;

// 最终移动
const step = this.speed * (delta / 1000) * this.slowFactor;
this.x += (dirX + perpX) * step;
this.y += (dirY + perpY) * step;
```

### 3.2 各怪物轨道强度

在 `MONSTERS` 配置中新增 `orbitStrength`：

| 怪物 | 轨道强度 | 原因 |
|------|---------|------|
| 葡萄球菌 (staph) | 0.3 | 明显绕圈，多经过塔的射程 |
| 链球菌 (strep) | 0.1 | 快速绕小圈，保持威胁性 |
| 噬菌体 (phage) | 0 | 直冲塔，已有打塔逻辑不干扰 |

### 3.3 对游戏的影响

- 怪物不再全部集中于径向路线，而是分散经过不同角度的格子
- 玩家必须在阵地的各个方向都有防御，不能只放一条直线
- 配合地形系统：外层（膜缘区）的塔射程加成让它们能覆盖更广的螺旋弧线
- 配合连携系统：密集布阵的区域能覆盖更多的螺旋路径段

---

## 四、实现顺序

1. **地形差异**（最简单，只改 HexGrid 渲染 + Tower 读取）
2. **塔连携**（中等，新增邻居查找 + buff 逻辑）
3. **怪物螺旋路径**（最简单，只改 Monster.update 几行）

---

## 五、视觉汇总

| 系统 | 玩家能看到的 |
|------|------------|
| 地形 | 格子底色不同（蓝/绿/紫），特殊格金色闪烁 |
| 连携 | 塔之间有彩色连线，塔身上有 buff 指示器 |
| 螺旋路径 | 怪物走弧线路径，自然经过更多格子 |
