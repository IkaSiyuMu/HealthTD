class ItemManager {
  constructor(scene, playerATP, aiATP) {
    this.scene = scene; this.playerATP = playerATP; this.aiATP = aiATP;
    this.slots = []; this.lastUseTime = 0; this.activeEffects = [];
    this.graphics = scene.add.graphics();
  }
  purchase(itemKey) {
    if (this.slots.length >= MAX_ITEM_SLOTS) return false;
    const item = ITEMS[itemKey];
    if (!this.playerATP.spend(item.cost)) return false;
    this.slots.push({ ...item, key: itemKey });
    this.renderUI(); return true;
  }
  useItem(index, targetSide) {
    const item = this.slots[index]; if (!item) return;
    if (Date.now() - this.lastUseTime < ITEM_COOLDOWN) return;
    this.lastUseTime = Date.now(); this.slots.splice(index, 1);
    this.activeEffects.push({ item, target: targetSide, startTime: Date.now(), duration: item.duration });
    this.renderUI();
  }
  update() {
    this.activeEffects = this.activeEffects.filter(e => Date.now() - e.startTime < e.duration);
  }
  renderUI() {
  renderUI() {
    this.graphics.clear();
    this.scene.children.each(child => { if (child._isItemUI) child.destroy(); });
    const font = 'Noto Sans SC, Arial, sans-serif';
    const startX = ARENA_POSITIONS.PLAYER.x - 60;
    const y = GAME_HEIGHT - 50;
    this.graphics.fillStyle(0x1a1a3e, 0.7);
    this.graphics.fillRoundedRect(startX - 15, y - 22, 150, 44, 8);
    this.graphics.lineStyle(1, 0x88bbff, 0.1);
    this.graphics.strokeRoundedRect(startX - 15, y - 22, 150, 44, 8);
    const label = this.scene.add.text(startX + 75, y - 12, '🎒 道具', {
      fontSize: '10px', fontFamily: font, color: '#8888aa',
    }).setOrigin(0.5).setDepth(5);
    label._isItemUI = true;
    this.slots.forEach((item, i) => {
      const x = startX + 20 + i * 55;
      const bg = this.scene.add.graphics().setDepth(5);
      bg.fillStyle(0x884488, 0.7);
      bg.fillRoundedRect(x - 22, y + 2, 44, 22, 6);
      bg.lineStyle(1, 0xcc66cc, 0.3);
      bg.strokeRoundedRect(x - 22, y + 2, 44, 22, 6);
      const txt = this.scene.add.text(x, y + 13, item.name, {
        fontSize: '11px', fontFamily: font, color: '#fff',
      }).setOrigin(0.5).setDepth(6);
      txt._isItemUI = true;
      txt.setInteractive({ useHandCursor: true });
      txt.on('pointerdown', () => this.useItem(i, 'ai'));
      bg._isItemUI = true;
    });
  }
  }
}
