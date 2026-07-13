class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const cx = GAME_WIDTH / 2;

    // 简单标题
    this.add.text(cx, 160, '免 疫 风 暴', {
      fontSize: '48px', fontFamily: 'Arial, sans-serif', color: '#4a5f8e', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 220, 'Immune TD — 细胞免疫塔防', {
      fontSize: '16px', color: '#8888aa',
    }).setOrigin(0.5);

    // 开始按钮
    const btn = this.add.text(cx, 350, '▶  开始游戏', {
      fontSize: '24px', color: '#ffffff', backgroundColor: '#4a5f8e',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setBackgroundColor('#5a6f9e'));
    btn.on('pointerout', () => btn.setBackgroundColor('#4a5f8e'));
    btn.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
