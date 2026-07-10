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
    this.scene.tweens.add({
      targets: this.graphics,
      alpha: 0.5, yoyo: true, duration: 80,
    });
    return this.hp <= 0;
  }

  draw() {
    this.graphics.clear();
    // 外圈光晕
    this.graphics.fillStyle(ARENA.NUCLEUS_COLOR, 0.15);
    this.graphics.fillCircle(this.x, this.y, this.radius + 12);
    // 主体
    this.graphics.fillStyle(ARENA.NUCLEUS_COLOR, 0.8);
    this.graphics.fillCircle(this.x, this.y, this.radius);
    // 高光
    this.graphics.fillStyle(0xffffff, 0.2);
    this.graphics.fillCircle(this.x - 8, this.y - 8, this.radius * 0.4);
    // 低血量裂痕
    const hpRatio = this.hp / this.maxHp;
    if (hpRatio < 0.3) {
      this.graphics.lineStyle(2, 0xff4444, 0.5);
      this.graphics.lineBetween(this.x - 10, this.y - 8, this.x + 8, this.y + 12);
      this.graphics.lineBetween(this.x + 5, this.y - 12, this.x - 5, this.y + 5);
    }
    // HP 条
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
