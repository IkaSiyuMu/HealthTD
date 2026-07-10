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
    this.onDeath = null;
    this.attackTimer = 0;
    this.attackInterval = 1000;
    this.engulfed = false;      // 被巨噬细胞吞噬定身
    this.engulfSource = null;   // 吞噬来源的塔
    this.slowFactor = 1.0;      // 减速倍率
    this.graphics = scene.add.graphics();
    this.draw();
  }

  update(delta) {
    if (!this.alive) return;

    // 噬菌体：攻击最近的塔
    if (this.config.type === 'towerHunter') {
      this._towerHunterUpdate(delta);
      return;
    }

    // === 阻拦系统 ===
    this._checkBlocking(delta);

    // 被吞噬 → 不能移动，被拉向塔的位置
    if (this.engulfed && this.engulfSource && this.engulfSource.hp > 0) {
      this.x += (this.engulfSource.x - this.x) * 0.08;
      this.y += (this.engulfSource.y - this.y) * 0.08;
      this.draw();
      return;
    }
    this.engulfed = false;

    // 移向细胞核
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      this.reachedTarget = true;
      return;
    }

    const step = this.speed * (delta / 1000) * this.slowFactor;
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.draw();
  }

  _checkBlocking(delta) {
    this.slowFactor = 1.0;
    this.engulfed = false;
    this.engulfSource = null;

    // 确定属于哪一方
    const forPlayer = Math.abs(this.targetX - ARENA_POSITIONS.PLAYER.x) < Math.abs(this.targetX - ARENA_POSITIONS.AI.x);
    const towers = forPlayer ? (this.scene.playerTowers || []) : (this.scene.aiController ? this.scene.aiController.towers : []);

    towers.forEach(t => {
      if (t.hp <= 0) return;
      const dx = t.x - this.x, dy = t.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 巨噬细胞：吞噬定身（40px 范围）
      if (t.config.type === 'melee' && dist <= 40) {
        this.engulfed = true;
        this.engulfSource = t;
      }

      // 所有塔都有减速区域（25px 范围）
      if (dist <= 25) {
        this.slowFactor = Math.min(this.slowFactor, 0.5);
      }
    });
  }

  _towerHunterUpdate(delta) {
    let nearestTower = null;
    let minDist = 80;
    const forPlayer = Math.abs(this.targetX - ARENA_POSITIONS.PLAYER.x) < Math.abs(this.targetX - ARENA_POSITIONS.AI.x);
    const searchTowers = forPlayer ? (this.scene.playerTowers || []) : (this.scene.aiController ? this.scene.aiController.towers : []);

    searchTowers.forEach(t => {
      if (t.hp <= 0) return;
      const dx = t.x - this.x, dy = t.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearestTower = t;
      }
    });

    if (nearestTower) {
      this.attackTimer += delta;
      if (this.attackTimer >= this.attackInterval) {
        this.attackTimer = 0;
        const dead = nearestTower.takeDamage(this.config.damageTower);
        if (dead) {
          const arr = forPlayer ? this.scene.playerTowers : this.scene.aiController.towers;
          const grid = forPlayer ? this.scene.playerGrid : this.scene.aiGrid;
          if (arr) {
            const idx = arr.indexOf(nearestTower);
            if (idx >= 0) arr.splice(idx, 1);
            const cell = grid.getCellAtPixel(nearestTower.x, nearestTower.y);
            if (cell) { cell.occupied = false; grid.render(); }
          }
        }
      }
      // 移向塔
      const dx = nearestTower.x - this.x, dy = nearestTower.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const step = this.speed * (delta / 1000);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      this.draw();
      return;
    }

    // 没有找到塔，走向细胞核
    const dx = this.targetX - this.x, dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) { this.reachedTarget = true; return; }
    const step = this.speed * (delta / 1000);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.draw();
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      this._deathEffect();
      return true;
    }
    this.draw();
    return false;
  }

  _deathEffect() {
    // 溶解/碎裂效果
    const g = this.scene.add.graphics();
    g.fillStyle(this.config.color, 0.5);
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const d = 8 + Math.random() * 18;
      const size = 2 + Math.random() * 4;
      g.fillCircle(this.x + Math.cos(angle) * d, this.y + Math.sin(angle) * d, size);
    }
    this.scene.tweens.add({
      targets: g, alpha: 0, duration: 300,
      onComplete: () => g.destroy(),
    });
    this.graphics.destroy();
  }

  draw() {
    if (!this.alive) return;
    this.graphics.clear();
    const r = this.config.radius || 10;

    if (this.config.type === 'fast') {
      // 链球菌：三个小圆串
      for (let i = -1; i <= 1; i++) {
        this.graphics.fillStyle(this.config.color, 0.85);
        this.graphics.fillCircle(this.x + i * 7, this.y, r * 0.55);
        this.graphics.fillStyle(0xffffff, 0.15);
        this.graphics.fillCircle(this.x + i * 7 - 2, this.y - 2, r * 0.25);
      }
    } else if (this.config.type === 'towerHunter') {
      // 噬菌体：二十面体几何形
      this.graphics.fillStyle(this.config.color, 0.85);
      const half = r * 0.85;
      this.graphics.fillRect(this.x - half, this.y - half, half * 2, half * 2);
      // 内部结构
      this.graphics.fillStyle(0xffffff, 0.2);
      this.graphics.fillCircle(this.x, this.y, r * 0.35);
      // 尾部纤维
      this.graphics.lineStyle(1.5, this.config.color, 0.6);
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI / 4) * (i - 1) + Math.PI;
        this.graphics.lineBetween(this.x, this.y + half, this.x + Math.cos(a) * half * 0.7, this.y + half + half * 0.6);
      }
    } else {
      // 葡萄球菌：金色圆球
      this.graphics.fillStyle(this.config.color, 0.85);
      this.graphics.fillCircle(this.x, this.y, r);
      this.graphics.fillStyle(0xffffff, 0.2);
      this.graphics.fillCircle(this.x - 3, this.y - 3, r * 0.4);
      // 表面纹理
      this.graphics.lineStyle(0.5, this.config.color, 0.2);
      this.graphics.strokeCircle(this.x, this.y, r);
    }

    // HP 条
    if (this.hp < this.maxHp) {
      const barW = 20, barH = 3;
      this.graphics.fillStyle(0x333333, 0.6);
      this.graphics.fillRect(this.x - barW / 2, this.y - r - 7, barW, barH);
      this.graphics.fillStyle(0x44dd44, 0.8);
      this.graphics.fillRect(this.x - barW / 2, this.y - r - 7, barW * (this.hp / this.maxHp), barH);
    }
  }

  destroy() {
    if (this.graphics && this.graphics.scene) this.graphics.destroy();
    this.alive = false;
  }
}
