class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }
  init(data) {
    this.result = data.result || 'draw';
    this.playerHp = data.playerHp || 0;
    this.aiHp = data.aiHp || 0;
    this.wave = data.wave || 0;
  }
  create() {
    const msgs = {
      win:  { text: '🧬 胜利！', color: '#44dd88' },
      lose: { text: '💀 淘汰', color: '#dd4444' },
      draw: { text: '⚖️ 平局', color: '#ddcc44' },
    };
    const msg = msgs[this.result] || msgs.draw;
    this.add.text(GAME_WIDTH / 2, 180, msg.text, { fontSize: '56px', color: msg.color, fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 260, `玩家核血量: ${this.playerHp}%  |  AI核血量: ${this.aiHp}%`, { fontSize: '18px', color: '#666688' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 290, `坚持到第 ${this.wave + 1} 波`, { fontSize: '16px', color: '#8888aa' }).setOrigin(0.5);
    const btn = this.add.text(GAME_WIDTH / 2, 400, '[ 再来一局 ]', { fontSize: '26px', color: '#fff', backgroundColor: '#4a5f8e', padding: { x: 26, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setBackgroundColor('#5a6f9e'));
    btn.on('pointerout', () => btn.setBackgroundColor('#4a5f8e'));
    btn.on('pointerdown', () => this.scene.start('GameScene'));
    this.add.text(GAME_WIDTH / 2, 470, '[ 返回主菜单 ]', { fontSize: '16px', color: '#8888aa' }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
