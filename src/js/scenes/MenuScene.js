class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const cx = GAME_WIDTH / 2;
    const font = 'Noto Sans SC, Arial, sans-serif';

    // 背景装饰粒子
    const particles = [];
    for (let i = 0; i < 20; i++) {
      const g = this.add.graphics();
      const r = 6 + Math.random() * 16;
      const alpha = 0.08 + Math.random() * 0.12;
      g.fillStyle(0x88bbff, alpha);
      g.fillCircle(0, 0, r);
      g.setPosition(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT);
      particles.push({ g, r, speedX: (Math.random() - 0.5) * 0.3, speedY: (Math.random() - 0.5) * 0.2, alpha });
    }

    // 定期更新粒子动画
    this.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        particles.forEach(p => {
          p.g.x += p.speedX; p.g.y += p.speedY;
          if (p.g.x < -50) p.g.x = GAME_WIDTH + 50;
          if (p.g.x > GAME_WIDTH + 50) p.g.x = -50;
          if (p.g.y < -50) p.g.y = GAME_HEIGHT + 50;
          if (p.g.y > GAME_HEIGHT + 50) p.g.y = -50;
          const pulse = 0.6 + Math.sin(Date.now() * 0.001 + p.r) * 0.4;
          p.g.setAlpha(p.alpha * pulse);
        });
      },
    });

    // 标题装饰环
    const ringG = this.add.graphics();
    ringG.lineStyle(2, 0x88bbff, 0.15);
    ringG.strokeCircle(cx, 155, 80);
    ringG.lineStyle(1, 0x88bbff, 0.08);
    ringG.strokeCircle(cx, 155, 95);

    // 标题 - 免疫风暴
    const title = this.add.text(cx, 150, '免 疫 风 暴', {
      fontSize: '56px', fontFamily: font, color: '#4a5f8e', fontStyle: 'bold',
    }).setOrigin(0.5);
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, y: 140, duration: 600, ease: 'Back.easeOut' });

    // 标题发光
    const glow = this.add.text(cx, 140, '免 疫 风 暴', {
      fontSize: '56px', fontFamily: font, color: '#4a5f8e', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.12);
    this.tweens.add({ targets: glow, alpha: 0.25, duration: 1200, yoyo: true, repeat: -1 });

    // 副标题
    const sub = this.add.text(cx, 200, 'I M M U N E   T D', {
      fontSize: '14px', fontFamily: font, color: '#8888bb', letterSpacing: 6,
    }).setOrigin(0.5);

    // 装饰分割线
    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x8888bb, 0.2);
    const lineW = 200;
    lineG.lineBetween(cx - lineW / 2, 235, cx + lineW / 2, 235);

    // 游戏简介
    this.add.text(cx, 265, '细胞免疫塔防 · 抵御病原体 · 1v1 vs AI', {
      fontSize: '14px', fontFamily: font, color: '#9999bb',
    }).setOrigin(0.5);

    // 开始按钮（带光效）
    const btnBg = this.add.graphics();
    const btnW = 220, btnH = 52;
    const btnX = cx - btnW / 2, btnY = 340;

    const drawBtn = (hover) => {
      btnBg.clear();
      const color = hover ? 0x5a7fbe : 0x4a5f8e;
      btnBg.fillStyle(color, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
      btnBg.fillStyle(0xffffff, 0.08);
      btnBg.fillRoundedRect(btnX + 4, btnY + 2, btnW - 8, btnH / 2 - 2, { tl: 10, tr: 10, bl: 0, br: 0 });
      // 外发光
      btnBg.lineStyle(2, 0x88bbff, hover ? 0.5 : 0.2);
      btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
    };
    drawBtn(false);

    const btnText = this.add.text(cx, btnY + btnH / 2, '▶  开始游戏', {
      fontSize: '22px', fontFamily: font, color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const btnZone = this.add.zone(cx, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
    btnZone.on('pointerover', () => { drawBtn(true); btnText.setScale(1.03); });
    btnZone.on('pointerout', () => { drawBtn(false); btnText.setScale(1); });
    btnZone.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('GameScene'));
    });

    // 版本/制作信息
    this.add.text(cx, GAME_HEIGHT - 20, '细胞免疫 · 网页塔防  v0.1', {
      fontSize: '11px', fontFamily: font, color: '#666688',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(500);
  }
}
