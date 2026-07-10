class ATPManager {
  constructor(scene, x, y, label) {
    this.scene = scene; this.atp = ARENA.INITIAL_ATP; this.x = x; this.y = y;
    this.label = label;
    this.text = scene.add.text(x, y, '', { fontSize: '18px', fontFamily: 'Arial', color: '#4a5f8e', fontStyle: 'bold' }).setOrigin(0.5);
    this.updateDisplay();
  }
  add(amount) { this.atp += amount; this.updateDisplay(); }
  spend(amount) { if (this.atp < amount) return false; this.atp -= amount; this.updateDisplay(); return true; }
  updateDisplay() { this.text.setText(`${this.label || ''}: ${this.atp} ATP`); }
  destroy() { this.text.destroy(); }
}
