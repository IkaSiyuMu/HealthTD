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
      this._hitEffect();
      this.alive = false;
      return;
    }

    const step = this.speed * (delta / 1000);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.draw();
  }

  _hitEffect() {
    const g = this.scene.add.graphics();
    g.fillStyle(this.color, 0.4);
    g.fillCircle(this.x, this.y, 6);
    this.scene.tweens.add({
      targets: g, alpha: 0, scale: 2, duration: 150,
      onComplete: () => g.destroy(),
    });
  }

  draw() {
    if (!this.alive) return;
    this.graphics.clear();
    // Y 形抗体弹体
    const s = 5;
    this.graphics.lineStyle(2, this.color, 0.9);
    // 主干
    this.graphics.lineBetween(this.x, this.y - s, this.x, this.y + s);
    // Y 分叉
    this.graphics.lineBetween(this.x, this.y - s, this.x - s * 0.7, this.y - s * 0.3);
    this.graphics.lineBetween(this.x, this.y - s, this.x + s * 0.7, this.y - s * 0.3);
    // 发光
    this.graphics.fillStyle(this.color, 0.3);
    this.graphics.fillCircle(this.x, this.y, 2);
  }

  destroy() { if (this.graphics && this.graphics.scene) this.graphics.destroy(); this.alive = false; }
}
