class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this.add.text(GAME_WIDTH / 2, 160, '🦠 免疫风暴', {
      fontSize: '52px', fontFamily: 'Arial', color: '#4a5f8e', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 220, 'Immune TD — 细胞免疫塔防', {
      fontSize: '18px', color: '#8888aa',
    }).setOrigin(0.5);

    // 装饰：阵地缩略
    const g = this.add.graphics();
    g.lineStyle(3, ARENA.MEMBRANE_COLOR, 0.3);
    g.strokeCircle(GAME_WIDTH / 2, 330, 60);
    g.fillStyle(ARENA.NUCLEUS_COLOR, 0.4);
    g.fillCircle(GAME_WIDTH / 2, 330, 14);

    const btn = this.add.text(GAME_WIDTH / 2, 440, '▶  开始游戏', {
      fontSize: '26px', color: '#ffffff', backgroundColor: '#4a5f8e',
      padding: { x: 30, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setBackgroundColor('#5a6f9e'));
    btn.on('pointerout', () => btn.setBackgroundColor('#4a5f8e'));
    btn.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
