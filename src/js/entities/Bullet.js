class Bullet {
  constructor(scene, fromX, fromY, target, speed, damage, color) {
    this.scene = scene; this.x = fromX; this.y = fromY; this.target = target;
    this.speed = speed || 300; this.damage = damage; this.alive = true;
    this.color = color || 0xffd700;
    this.graphics = scene.add.graphics(); this.draw();
  }
  update(delta) {
    if (!this.alive || !this.target || !this.target.alive) { this.alive = false; return; }
    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) { this.target.takeDamage(this.damage); this.alive = false; return; }
    const step = this.speed * (delta / 1000);
    this.x += (dx / dist) * step; this.y += (dy / dist) * step;
    this.draw();
  }
  draw() { this.graphics.clear(); }
  destroy() { this.graphics.destroy(); this.alive = false; }
}
