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
    const c = this.config.color;

    if (this.config.type === 'melee') {
      // 巨噬细胞：圆形 + 伪足
      this.graphics.fillStyle(c, 0.85);
      this.graphics.fillCircle(this.x, this.y, r);
      this.graphics.fillStyle(0xffffff, 0.3);
      this.graphics.fillCircle(this.x - 5, this.y - 5, r * 0.35);
      // 伪足突起
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i + this.scene.time.time * 0.001;
        this.graphics.fillStyle(c, 0.6);
        this.graphics.fillCircle(this.x + Math.cos(a) * (r + 4), this.y + Math.sin(a) * (r + 4), 5);
      }
    } else if (this.config.type === 'ranged') {
      // B细胞：圆形 + Y形抗体
      this.graphics.fillStyle(c, 0.85);
      this.graphics.fillCircle(this.x, this.y, r);
      this.graphics.fillStyle(0xffffff, 0.25);
      this.graphics.fillCircle(this.x - 4, this.y - 4, r * 0.3);
      // Y形抗体标记
      this.graphics.lineStyle(2, 0xffd700, 0.8);
      this.graphics.lineBetween(this.x, this.y - 8, this.x, this.y + 6);
      this.graphics.lineBetween(this.x, this.y - 8, this.x - 5, this.y - 1);
      this.graphics.lineBetween(this.x, this.y - 8, this.x + 5, this.y - 1);
    } else if (this.config.type === 'aoe') {
      // 补体系统：环状扩散
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

    // HP 条（受伤时）
    if (this.hp < this.maxHp) {
      const barW = 28, barH = 3;
      this.graphics.fillStyle(0x333, 0.6);
      this.graphics.fillRect(this.x - barW / 2, this.y - r - 8, barW, barH);
      this.graphics.fillStyle(0x44dd44, 0.8);
      this.graphics.fillRect(this.x - barW / 2, this.y - r - 8, barW * (this.hp / this.maxHp), barH);
    }
  }

  update(time, delta, monsters, bullets) {
    if (this.hp <= 0) return;

    // AOE 持续伤害
    if (this.config.type === 'aoe') {
      if (time - this.lastAttack >= this.config.attackSpeed) {
        this.lastAttack = time;
        monsters.forEach(m => {
          if (!m.alive) return;
          const dx = m.x - this.x, dy = m.y - this.y;
          if (Math.sqrt(dx * dx + dy * dy) <= this.config.range) {
            m.takeDamage(this.config.damage);
          }
        });
      }
      this.draw();
      return;
    }

    // 选择目标
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

    // 近战：进入范围即攻击
    if (this.config.type === 'melee') {
      if (this.target && time - this.lastAttack >= this.config.attackSpeed) {
        this.lastAttack = time;
        this.target.takeDamage(this.config.damage);
        // 击退效果
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.target.x += (dx / dist) * 8;
        this.target.y += (dy / dist) * 8;
      }
      this.draw();
      return;
    }

    // 远程：发射子弹
    if (this.target && time - this.lastAttack >= this.config.attackSpeed) {
      this.lastAttack = time;
      const bullet = new Bullet(this.scene, this.x, this.y, this.target, 300, this.config.damage, 0xffd700);
      bullets.push(bullet);
    }
    this.draw();
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }
    this.draw();
    return false;
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
    this.hp = 0;
  }
}
