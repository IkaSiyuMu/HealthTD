class ATPManager {
  constructor(scene, x, y, label) {
    this.scene = scene;
    this.atp = ARENA.INITIAL_ATP;
    this.x = x;
    this.y = y;
    this.label = label;
    const font = 'Noto Sans SC, Arial, sans-serif';

    // 背景框
    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x1a1a3e, 0.5);
    this.bg.fillRoundedRect(x - 65, y - 10, 130, 32, 8);
    this.bg.lineStyle(1, 0x88bbff, 0.15);
    this.bg.strokeRoundedRect(x - 65, y - 10, 130, 32, 8);

    // ATP label + value
    this.text = scene.add.text(x, y + 5, '', {
      fontSize: '15px', fontFamily: font, color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.updateDisplay();
  }

  add(amount) {
    this.atp += amount;
    this.updateDisplay();
    // 获得 ATP 时闪烁
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

  destroy() {
    this.text.destroy();
    this.bg.destroy();
  }
}
