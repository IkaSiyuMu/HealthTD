class Monster {
  constructor(scene, x, y, config, targetX, targetY) {
    this.scene = scene; this.x = x; this.y = y; this.config = config;
    this.hp = config.hp; this.maxHp = config.hp; this.speed = config.speed;
    this.targetX = targetX; this.targetY = targetY;
    this.alive = true; this.reachedTarget = false; this.onDeath = null;
    this.attackTimer = 0; this.attackInterval = 1000;
    this.graphics = scene.add.graphics(); this.draw();
  }
  update(delta) {
    if (!this.alive) return;
    const dx = this.targetX - this.x, dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) { this.reachedTarget = true; return; }
    const step = this.speed * (delta / 1000);
    this.x += (dx / dist) * step; this.y += (dy / dist) * step;
    this.draw();
  }
  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) { this.alive = false; this.graphics.destroy(); return true; }
    this.draw(); return false;
  }
  draw() { this.graphics.clear(); }
  destroy() { this.graphics.destroy(); this.alive = false; }
}
