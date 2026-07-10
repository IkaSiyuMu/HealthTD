class Tower {
  constructor(scene, x, y, config, cell) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.config = config;
    this.cell = cell || null;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.lastAttack = 0;
    this.target = null;
    this.graphics = scene.add.graphics();

    // 地形加成
    this.zoneBonus = {};
    if (cell) {
      if (cell.zone === 'outer')   this.zoneBonus.rangeMult = 1.25;
      if (cell.zone === 'middle')  this.zoneBonus.speedMult = 0.85;
      if (cell.zone === 'inner')   this.zoneBonus.damageMult = 1.3;
      if (cell.special === 'mitochondria') this.zoneBonus.atpBonus = 2;
    }

    // 连携
    this.synergies = [];
    this.synergyLines = [];
    this._synASmult = 1;
    this._synRangeAdd = 0;
    this._synDmgAdd = 0;

    this.draw();
  }

  draw() {
    this.graphics.clear();
    const r = 14;
    const c = this.config.color;

    if (this.config.type === 'melee') {
      this.graphics.fillStyle(c, 0.85);
      this.graphics.fillCircle(this.x, this.y, r);
      this.graphics.fillStyle(0xffffff, 0.3);
      this.graphics.fillCircle(this.x - 5, this.y - 5, r * 0.35);
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i + this.scene.time.time * 0.001;
        this.graphics.fillStyle(c, 0.6);
        this.graphics.fillCircle(this.x + Math.cos(a) * (r + 4), this.y + Math.sin(a) * (r + 4), 5);
      }
    } else if (this.config.type === 'ranged') {
      this.graphics.fillStyle(c, 0.85);
      this.graphics.fillCircle(this.x, this.y, r);
      this.graphics.fillStyle(0xffffff, 0.25);
      this.graphics.fillCircle(this.x - 4, this.y - 4, r * 0.3);
      this.graphics.lineStyle(2, 0xffd700, 0.8);
      this.graphics.lineBetween(this.x, this.y - 8, this.x, this.y + 6);
      this.graphics.lineBetween(this.x, this.y - 8, this.x - 5, this.y - 1);
      this.graphics.lineBetween(this.x, this.y - 8, this.x + 5, this.y - 1);
    } else if (this.config.type === 'aoe') {
      this.graphics.fillStyle(c, 0.8);
      this.graphics.fillCircle(this.x, this.y, r);
      this.graphics.lineStyle(2, 0xffaa44, 0.5);
      this.graphics.strokeCircle(this.x, this.y, r + 6);
      this.graphics.lineStyle(1, 0xffaa44, 0.25);
      this.graphics.strokeCircle(this.x, this.y, r + 12);
    }

    // 边框
    this.graphics.lineStyle(1.5, 0xffffff, 0.35);
    this.graphics.strokeCircle(this.x, this.y, r);

    // 地形加成小标记
    if (this.zoneBonus.damageMult) {
      this.graphics.lineStyle(2, 0xff4488, 0.5);
      this.graphics.strokeCircle(this.x, this.y, r + 3);
    } else if (this.zoneBonus.rangeMult) {
      this.graphics.lineStyle(2, 0x4488ff, 0.5);
      this.graphics.strokeCircle(this.x, this.y, r + 3);
    } else if (this.zoneBonus.speedMult) {
      this.graphics.lineStyle(2, 0x44ff88, 0.5);
      this.graphics.strokeCircle(this.x, this.y, r + 3);
    }

    // 连携连线
    this.synergyLines.forEach(line => {
      this.graphics.lineStyle(2, line.color, 0.35 + Math.sin(Date.now() * 0.005) * 0.15);
      this.graphics.lineBetween(this.x, this.y, line.x, line.y);
    });

    // HP 条
    if (this.hp < this.maxHp) {
      const barW = 28, barH = 3;
      this.graphics.fillStyle(0x333, 0.6);
      this.graphics.fillRect(this.x - barW / 2, this.y - r - 8, barW, barH);
      this.graphics.fillStyle(0x44dd44, 0.8);
      this.graphics.fillRect(this.x - barW / 2, this.y - r - 8, barW * (this.hp / this.maxHp), barH);
    }
  }

  updateSynergy(neighborTowers) {
    this.synergies = [];
    this.synergyLines = [];

    neighborTowers.forEach(n => {
      if (n.hp <= 0) return;
      const types = [this.config.type, n.config.type].sort();
      const key = types.join('+');

      if (types[0] === types[1]) {
        this.synergies.push({ ...SAME_SYNERGY });
        this.synergyLines.push({ x: n.x, y: n.y, color: SAME_SYNERGY.color });
        this._synASmult = Math.min(this._synASmult || 1, 0.9);
        n._synASmult = Math.min(n._synASmult || 1, 0.9);
      } else if (SYNERGY_MAP[key]) {
        const s = SYNERGY_MAP[key];
        this.synergies.push({ ...s });
        this.synergyLines.push({ x: n.x, y: n.y, color: s.color });

        if (key === 'melee+ranged') {
          if (this.config.type === 'ranged') this._synASmult = Math.min(this._synASmult, 0.7);
          if (n.config.type === 'ranged') n._synASmult = Math.min(n._synASmult, 0.7);
        } else if (key === 'melee+aoe') {
          if (this.config.type === 'melee') this._synRangeAdd = 20;
          if (n.config.type === 'melee') n._synRangeAdd = 20;
        } else if (key === 'ranged+aoe') {
          if (this.config.type === 'aoe') this._synDmgAdd = 2;
          if (n.config.type === 'aoe') n._synDmgAdd = 2;
        }
      }
    });
  }

  update(time, delta, monsters, bullets) {
    if (this.hp <= 0) return;

    // 重置帧 buff
    this._synASmult = 1;
    this._synRangeAdd = 0;
    this._synDmgAdd = 0;

    // 计算最终数值
    const baseDmg = this.config.damage;
    const baseRange = this.config.range;
    const baseAS = this.config.attackSpeed;
    const dmgMult = this.zoneBonus.damageMult || 1;
    const rngMult = this.zoneBonus.rangeMult || 1;
    const spdMult = this.zoneBonus.speedMult || 1;
    const finalDmg = Math.round(baseDmg * dmgMult) + this._synDmgAdd;
    const finalRange = baseRange * rngMult + this._synRangeAdd;
    const finalAS = Math.round(baseAS * spdMult * this._synASmult);

    // AOE 持续伤害
    if (this.config.type === 'aoe') {
      if (time - this.lastAttack >= finalAS) {
        this.lastAttack = time;
        monsters.forEach(m => {
          if (!m.alive) return;
          const dx = m.x - this.x, dy = m.y - this.y;
          if (Math.sqrt(dx * dx + dy * dy) <= finalRange) {
            m.takeDamage(finalDmg);
            if (this.zoneBonus.atpBonus) m._lastAttacker = this;
          }
        });
      }
      this.draw();
      return;
    }

    // 选择目标
    this.target = null;
    let minDist = finalRange;
    monsters.forEach(m => {
      if (!m.alive) return;
      const dx = m.x - this.x, dy = m.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= minDist) { minDist = dist; this.target = m; }
    });

    // 近战
    if (this.config.type === 'melee') {
      if (this.target && time - this.lastAttack >= finalAS) {
        this.lastAttack = time;
        this.target.takeDamage(finalDmg);
        if (this.zoneBonus.atpBonus) this.target._lastAttacker = this;
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.target.x += (dx / dist) * 8;
        this.target.y += (dy / dist) * 8;
      }
      this.draw();
      return;
    }

    // 远程
    if (this.target && time - this.lastAttack >= finalAS) {
      this.lastAttack = time;
      const bullet = new Bullet(this.scene, this.x, this.y, this.target, 300, finalDmg, 0xffd700);
      if (this.zoneBonus.atpBonus) this.target._lastAttacker = this;
      bullets.push(bullet);
    }
    this.draw();
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) { this.destroy(); return true; }
    this.draw();
    return false;
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
    this.hp = 0;
  }
}
