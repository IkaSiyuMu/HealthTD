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
    this.graphics.clear();
    this.scene.children.each(child => { if (child._isItemUI) child.destroy(); });
    const startX = ARENA_POSITIONS.PLAYER.x - 60;
    const y = GAME_HEIGHT - 50;
    this.graphics.fillStyle(0x333333, 0.7);
    this.graphics.fillRoundedRect(startX - 10, y - 20, 140, 40, 6);
    this.slots.forEach((item, i) => {
      const x = startX + i * 60;
      const txt = this.scene.add.text(x, y, `[${item.name}]`, {
        fontSize: '12px', color: '#fff', backgroundColor: '#666', padding: { x: 6, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      txt._isItemUI = true; txt._itemIndex = i;
      txt.on('pointerdown', () => this.useItem(i, 'ai'));
    });
  }
}
