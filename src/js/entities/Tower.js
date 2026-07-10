class Tower {
  constructor(scene, x, y, config) {
    this.scene = scene; this.x = x; this.y = y; this.config = config;
    this.hp = config.hp; this.maxHp = config.hp; this.lastAttack = 0; this.target = null;
    this.graphics = scene.add.graphics(); this.draw();
  }
  draw() { this.graphics.clear(); }
  update(time, delta, monsters, bullets) {}
  takeDamage(amount) { this.hp -= amount; return this.hp <= 0; }
  destroy() { this.graphics.destroy(); }
}
