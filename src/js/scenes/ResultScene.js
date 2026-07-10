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
    const font = 'Noto Sans SC, Arial, sans-serif';

    // 背景粒子
    for (let i = 0; i < 12; i++) {
      const g = this.add.graphics();
      const r = 4 + Math.random() * 12;
      g.fillStyle(0x88bbff, 0.06 + Math.random() * 0.08);
      g.fillCircle(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, r);
    }

    const msgs = {
      win:  { text: '胜 利', color: '#44dd88', sub: '免疫系统成功抵御了所有病原体！' },
      lose: { text: '淘 汰', color: '#dd4444', sub: '细胞核被攻破，免疫系统崩溃...' },
      draw: { text: '平 局', color: '#ddcc44', sub: '双方势均力敌！' },
    };
    const msg = msgs[this.result] || msgs.draw;

    // 结果图标
    const iconSize = 50;
    const iconG = this.add.graphics();
    iconG.fillStyle(Phaser.Display.Color.HexStringToColor(msg.color).color, 0.15);
    iconG.fillCircle(cx, 150, iconSize + 10);
    iconG.fillStyle(Phaser.Display.Color.HexStringToColor(msg.color).color, 0.6);
    iconG.fillCircle(cx, 150, iconSize);

    this.add.text(cx, 150, this.result === 'win' ? '🏆' : this.result === 'lose' ? '💀' : '⚖️', {
      fontSize: '36px',
    }).setOrigin(0.5);

    // 结果文字
    const resultTxt = this.add.text(cx, 230, msg.text, {
      fontSize: '48px', fontFamily: font, color: msg.color, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: resultTxt, alpha: 1, y: 225, duration: 500, ease: 'Back.easeOut' });

    this.add.text(cx, 275, msg.sub, {
      fontSize: '14px', fontFamily: font, color: '#8888aa',
    }).setOrigin(0.5);

    // 数据面板
    const panelG = this.add.graphics();
    panelG.fillStyle(0xffffff, 0.06);
    panelG.fillRoundedRect(cx - 160, 310, 320, 70, 10);
    panelG.lineStyle(1, 0x8888cc, 0.15);
    panelG.strokeRoundedRect(cx - 160, 310, 320, 70, 10);

    this.add.text(cx, 330, `玩家核血量`, {
      fontSize: '12px', fontFamily: font, color: '#8888aa',
    }).setOrigin(0.5);
    this.add.text(cx, 352, `${this.playerHp}%`, {
      fontSize: '22px', fontFamily: font, color: this.playerHp > this.aiHp ? '#44dd88' : '#dd4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    const sepG = this.add.graphics();
    sepG.lineStyle(1, 0x8888cc, 0.15);
    sepG.lineBetween(cx, 315, cx, 375);

    this.add.text(cx, 330, `AI 核血量`, {
      fontSize: '12px', fontFamily: font, color: '#8888aa',
    }).setOrigin(0.5);
    this.add.text(cx, 352, `${this.aiHp}%`, {
      fontSize: '22px', fontFamily: font, color: this.aiHp > this.playerHp ? '#44dd88' : '#dd4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 波次信息
    this.add.text(cx, 400, `坚持到第 ${this.wave + 1} 波`, {
      fontSize: '14px', fontFamily: font, color: '#666688',
    }).setOrigin(0.5);

    // 按钮
    this._createBtn(cx, 460, '[ 再来一局 ]', () => {
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(200, () => this.scene.start('GameScene'));
    });

    this.add.text(cx, 510, '[ 返回主菜单 ]', {
      fontSize: '14px', fontFamily: font, color: '#8888aa',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', function() { this.setColor('#aaaacc'); })
      .on('pointerout', function() { this.setColor('#8888aa'); })
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => this.scene.start('MenuScene'));
      });

    this.cameras.main.fadeIn(300);
  }

  _createBtn(x, y, label, cb) {
    const font = 'Noto Sans SC, Arial, sans-serif';
    const w = 220, h = 50;
    const bg = this.add.graphics();
    const drawBtn = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x5a7fbe : 0x4a5f8e, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      bg.fillStyle(0xffffff, 0.08);
      bg.fillRoundedRect(x - w / 2 + 4, y - h / 2 + 3, w - 8, h / 2 - 3, { tl: 10, tr: 10, bl: 0, br: 0 });
      bg.lineStyle(2, 0x88bbff, hover ? 0.5 : 0.2);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    };
    drawBtn(false);
    const txt = this.add.text(x, y, label, {
      fontSize: '20px', fontFamily: font, color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { drawBtn(true); txt.setScale(1.03); });
    zone.on('pointerout', () => { drawBtn(false); txt.setScale(1); });
    zone.on('pointerdown', cb);
  }
}
