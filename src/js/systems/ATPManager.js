class ATPManager {
  constructor(scene, x, y, label) {
    this.scene = scene;
    this.atp = ARENA.INITIAL_ATP;
    this.x = x;
    this.y = y;
    this.label = label;

    this.text = scene.add.text(x, y, '', {
      fontSize: '15px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.updateDisplay();
  }

  add(amount) {
    this.atp += amount;
    this.updateDisplay();
    if (amount > 0) {
      this.text.setColor('#44ff88');
      this.scene.time.delayedCall(200, () => this.text.setColor('#ffd700'));
    }
  }

  spend(amount) {
    if (this.atp < amount) return false;
    this.atp -= amount;
    this.updateDisplay();
    return true;
  }

  updateDisplay() {
    this.text.setText(`⚡ ${this.atp} ATP`);
  }

  destroy() { this.text.destroy(); }
}
