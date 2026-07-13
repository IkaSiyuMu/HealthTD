class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }
  init(data) {
    this.result = data.result || 'draw';
    this.playerHp = data.playerHp || 0;
    this.aiHp = data.aiHp || 0;
    this.wave = data.wave || 0;
  }
  create() {
    const cx = GAME_WIDTH / 2;
    const msgs = {
      win:  { text: '胜 利', color: '#44dd88', sub: '免疫系统成功抵御了所有病原体！' },
      lose: { text: '淘 汰', color: '#dd4444', sub: '细胞核被攻破，免疫系统崩溃...' },
      draw: { text: '平 局', color: '#ddcc44', sub: '双方势均力敌！' },
    };
    const msg = msgs[this.result] || msgs.draw;

    this.add.text(cx, 180, msg.text, {
      fontSize: '48px', color: msg.color, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 250, msg.sub, {
      fontSize: '14px', color: '#8888aa',
    }).setOrigin(0.5);

    this.add.text(cx, 290, `玩家核血量: ${this.playerHp}%  |  AI核血量: ${this.aiHp}%`, {
      fontSize: '16px', color: '#666688',
    }).setOrigin(0.5);

    this.add.text(cx, 320, `坚持到第 ${this.wave + 1} 波`, {
      fontSize: '14px', color: '#8888aa',
    }).setOrigin(0.5);

    const btn = this.add.text(cx, 400, '[ 再来一局 ]', {
      fontSize: '22px', color: '#fff', backgroundColor: '#4a5f8e',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setBackgroundColor('#5a6f9e'));
    btn.on('pointerout', () => btn.setBackgroundColor('#4a5f8e'));
    btn.on('pointerdown', () => this.scene.start('GameScene'));

    this.add.text(cx, 460, '[ 返回主菜单 ]', {
      fontSize: '14px', color: '#8888aa',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
