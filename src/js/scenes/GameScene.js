class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this._isGameOver = false;
    this.isCalm = false;
    this.gameStarted = false;
    this.monsters = [];
    this.bullets = [];
    this.playerTowers = [];
    this.buildMenuItems = [];

    // === 玩家阵地 (左) ===
    this._drawArena(ARENA_POSITIONS.PLAYER);
    this.playerNucleus = new Nucleus(this, ARENA_POSITIONS.PLAYER.x, ARENA_POSITIONS.PLAYER.y, ARENA.NUCLEUS_RADIUS, ARENA.NUCLEUS_HP);
    this.playerGrid = new HexGrid(this, ARENA_POSITIONS.PLAYER.x, ARENA_POSITIONS.PLAYER.y, HEX.GRID_RADIUS, HEX.SIZE);
    this.playerGrid.render();

    // === AI 阵地 (右) ===
    this._drawArena(ARENA_POSITIONS.AI);
    this.aiNucleus = new Nucleus(this, ARENA_POSITIONS.AI.x, ARENA_POSITIONS.AI.y, ARENA.NUCLEUS_RADIUS, ARENA.NUCLEUS_HP);
    this.aiGrid = new HexGrid(this, ARENA_POSITIONS.AI.x, ARENA_POSITIONS.AI.y, HEX.GRID_RADIUS, HEX.SIZE);
    this.aiGrid.render();

    // ATP
    this.playerATP = new ATPManager(this, ARENA_POSITIONS.PLAYER.x, 20, '玩家');
    this.aiATP = new ATPManager(this, ARENA_POSITIONS.AI.x, 20, 'AI');

    // 波次
    this.waveManager = new WaveManager(
      this,
      (type) => this._spawnMonster(type, ARENA_POSITIONS.PLAYER),
      (type) => this._spawnMonster(type, ARENA_POSITIONS.AI),
    );
    this.waveManager.onCalmStart = () => this._onCalmStart();
    this.waveManager.onCalmEnd = () => this._onCalmEnd();
    this.waveManager.onWaveStart = (waveIdx) => this._onWaveStart(waveIdx);

    // AI
    this.aiController = new AIController(this, this.aiGrid, this.aiATP, this.aiNucleus);

    // 道具
    this.itemManager = new ItemManager(this, this.playerATP, this.aiATP);
    this._createItemShop();

    // AI 使用道具回调
    this.onAiUseItem = () => {
      const keys = Object.keys(ITEMS);
      const key = keys[Math.floor(Math.random() * keys.length)];
      if (this.aiATP.spend(ITEMS[key].cost)) {
        this.itemManager.activeEffects.push({
          item: ITEMS[key], target: 'player',
          startTime: Date.now(), duration: ITEMS[key].duration,
        });
        this._flashText(`AI 对你使用了 ${ITEMS[key].name}！`);
      }
    };

    // 建造 UI 状态
    this.selectedCell = null;
    this.buildMenu = this.add.graphics();
    this.buildMenuVisible = false;

    // 点击输入
    this.input.on('pointerdown', (pointer) => this._handleClick(pointer.x, pointer.y));

    // 说明按钮
    this._helpVisible = false;
    this._helpObjects = [];
    this._createHelpButton();

    // === 开局准备倒计时 ===
    this._startPrepTime();
  }

  _startPrepTime() {
    this.isCalm = true; // 准备期间也算平静期（不刷怪）
    const font = 'Noto Sans SC, Arial, sans-serif';
    let countdown = 15;
    const prepText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, `准备时间 ${countdown}s`, {
      fontSize: '30px', fontFamily: font, color: '#ffffff', fontStyle: 'bold',
      stroke: '#4a5f8e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    // 准备期间每秒给 ATP，方便多造塔
    const prepIncomeTimer = this.time.addEvent({
      delay: 1000, repeat: countdown - 1,
      callback: () => { this.playerATP.add(10); this.aiATP.add(10); },
    });

    const timer = this.time.addEvent({
      delay: 1000, repeat: countdown - 1,
      callback: () => {
        countdown--;
        prepText.setText(`准备时间 ${countdown}s`);
        if (countdown <= 5) prepText.setColor('#ff6644');
      },
    });

    this.time.delayedCall(countdown * 1000, () => {
      prepText.destroy();
      this.isCalm = false;
      this.gameStarted = true;
      this.waveManager.start();
      this._flashText('战斗开始！');
    });
  }

  _drawArena(pos) {
    const g = this.add.graphics();
    g.lineStyle(ARENA.MEMBRANE_WIDTH, ARENA.MEMBRANE_COLOR, 0.5);
    g.strokeCircle(pos.x, pos.y, ARENA.RADIUS);
    g.fillStyle(ARENA.MEMBRANE_COLOR, 0.06);
    g.fillCircle(pos.x, pos.y, ARENA.RADIUS + 15);
    g.fillStyle(0xffffff, 0.04);
    g.fillCircle(pos.x, pos.y, ARENA.RADIUS - 3);
  }

  _getSpawnPoints(pos) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      pts.push({
        x: pos.x + Math.cos(angle) * ARENA.RADIUS,
        y: pos.y + Math.sin(angle) * ARENA.RADIUS,
      });
    }
    return pts;
  }

  _spawnMonster(type, arenaPos) {
    const config = MONSTERS[type];
    const spawns = this._getSpawnPoints(arenaPos);
    const sp = spawns[Math.floor(Math.random() * spawns.length)];
    const monster = new Monster(this, sp.x, sp.y, config, arenaPos.x, arenaPos.y);
    const atpMgr = arenaPos === ARENA_POSITIONS.PLAYER ? this.playerATP : this.aiATP;
    monster.onDeath = () => atpMgr.add(config.atpReward);
    this.monsters.push(monster);
  }

  _handleClick(px, py) {
    if (this._isGameOver) return;
    if (this._helpVisible) return;

    // 建造菜单打开时，Zone 自带的 pointerdown 会处理点击
    if (this.buildMenuVisible) return;

    // 检查点击六边形
    const dx = px - ARENA_POSITIONS.PLAYER.x;
    const dy = py - ARENA_POSITIONS.PLAYER.y;
    if (Math.sqrt(dx * dx + dy * dy) > ARENA.RADIUS) return;

    const cell = this.playerGrid.getCellAtPixel(px, py);
    if (!cell || !cell.buildable || cell.occupied) return;

    this._showBuildMenu(cell);
  }

  _showBuildMenu(cell) {
    this.selectedCell = cell;
    this.buildMenuVisible = true;
    this.buildMenu.clear();

    const menuX = cell.x;
    const menuY = cell.y - 80;
    const font = 'Noto Sans SC, Arial, sans-serif';
    const types = [
      { key: 'MACROPHAGE', label: '🧫 巨噬细胞', cost: TOWERS.MACROPHAGE.cost, color: 0x44aa88 },
      { key: 'BCELL', label: '🔬 B细胞', cost: TOWERS.BCELL.cost, color: 0x4488dd },
      { key: 'COMPLEMENT', label: '🧬 补体系统', cost: TOWERS.COMPLEMENT.cost, color: 0xdd8844 },
    ];

    this._hideBuildMenu();

    // 背景
    this.buildMenu.fillStyle(0x1a1a3e, 0.92);
    this.buildMenu.fillRoundedRect(menuX - 100, menuY - 5, 200, 120, 10);
    this.buildMenu.lineStyle(1, 0x88bbff, 0.2);
    this.buildMenu.strokeRoundedRect(menuX - 100, menuY - 5, 200, 120, 10);

    types.forEach((t, i) => {
      const ty = menuY + 15 + i * 34;

      // 按钮背景
      const btnBg = this.add.graphics().setDepth(10);
      const drawBtn = (hover) => {
        btnBg.clear();
        btnBg.fillStyle(hover ? t.color : 0x333355, hover ? 0.5 : 0.4);
        btnBg.fillRoundedRect(menuX - 85, ty - 10, 170, 28, 6);
        btnBg.lineStyle(1, t.color, hover ? 0.6 : 0.2);
        btnBg.strokeRoundedRect(menuX - 85, ty - 10, 170, 28, 6);
      };
      drawBtn(false);

      const txt = this.add.text(menuX - 10, ty, `${t.label}`, {
        fontSize: '13px', fontFamily: font, color: '#ffffff',
      }).setOrigin(0.5).setDepth(11);
      const priceTxt = this.add.text(menuX + 72, ty, `${t.cost}⚡`, {
        fontSize: '11px', fontFamily: font, color: '#ffd700',
      }).setOrigin(0.5).setDepth(11);

      const zone = this.add.zone(menuX, ty, 170, 28).setInteractive({ useHandCursor: true }).setDepth(12);
      zone._towerKey = t.key;
      zone.on('pointerover', () => drawBtn(true));
      zone.on('pointerout', () => drawBtn(false));
      zone.on('pointerdown', () => { this._buildTower(t.key); });
      this.buildMenuItems.push(zone, btnBg, txt, priceTxt);
    });

    // 关闭按钮
    const closeY = menuY + 15 + 3 * 34 + 6;
    const closeZone = this.add.zone(menuX, closeY, 80, 20).setInteractive({ useHandCursor: true }).setDepth(12);
    closeZone._towerKey = '__close__';
    closeZone.on('pointerdown', () => { this._hideBuildMenu(); });
    const closeTxt = this.add.text(menuX, closeY, '[ 取消 ]', {
      fontSize: '11px', fontFamily: 'Noto Sans SC, Arial, sans-serif', color: '#888888',
    }).setOrigin(0.5).setDepth(11);
    this.buildMenuItems.push(closeZone, closeTxt);
  }

  _buildTower(towerKey) {
    const config = TOWERS[towerKey];
    if (!this.playerATP.spend(config.cost)) {
      this._flashText('ATP 不足！');
      return;
    }

    this.playerGrid.setOccupied(this.selectedCell.q, this.selectedCell.r, true);
    this.playerGrid.render();

    const tower = new Tower(this, this.selectedCell.x, this.selectedCell.y, config, this.selectedCell);
    this.playerTowers.push(tower);

    this._hideBuildMenu();
  }

  _hideBuildMenu() {
    this.buildMenuVisible = false;
    this.buildMenu.clear();
    this.buildMenuItems.forEach(t => { if (t && t.destroy) t.destroy(); });
    this.buildMenuItems = [];
  }

  _createItemShop() {
    const y = 60;
    const font = 'Noto Sans SC, Arial, sans-serif';
    const keys = Object.keys(ITEMS);
    keys.forEach((key, i) => {
      const item = ITEMS[key];
      const x = 90 + i * 150;
      const w = 130, h = 30;
      const bg = this.add.graphics().setDepth(5);
      const drawBtn = (hover) => {
        bg.clear();
        bg.fillStyle(hover ? 0x994499 : 0x884488, 0.8);
        bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
        bg.lineStyle(1, 0xcc66cc, hover ? 0.4 : 0.15);
        bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      };
      drawBtn(false);
      const txt = this.add.text(x, y, `🛒 ${item.name}`, {
        fontSize: '12px', fontFamily: font, color: '#fff',
      }).setOrigin(0.5).setDepth(6);
      const priceTxt = this.add.text(x, y + 14, `${item.cost}ATP`, {
        fontSize: '9px', fontFamily: font, color: '#ffd700',
      }).setOrigin(0.5).setDepth(6);
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(7);
      zone.on('pointerover', () => drawBtn(true));
      zone.on('pointerout', () => drawBtn(false));
      zone.on('pointerdown', () => this.itemManager.purchase(key));
    });
  }

  _flashText(msg) {
    const font = 'Noto Sans SC, Arial, sans-serif';
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, msg, {
      fontSize: '22px', fontFamily: font, color: '#ff6644', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, duration: 1200, ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  _onCalmStart() {
    this.isCalm = true;
    const font = 'Noto Sans SC, Arial, sans-serif';
    const t = this.add.text(GAME_WIDTH / 2, 6, '▎ 准备阶段 — 抓紧造塔或使用道具', {
      fontSize: '13px', fontFamily: font, color: '#ff8866', fontStyle: 'bold',
      backgroundColor: '#1a1a3edd', padding: { x: 12, y: 4 },
    }).setOrigin(0.5, 0).setDepth(15);
    t._calmText = true;
    this.playerATP.add(CALM_ATP_REWARD);
    this.aiATP.add(CALM_ATP_REWARD);
    this.time.delayedCall(CALM_DURATION - 300, () => { if (t._calmText) t.destroy(); });
  }

  _onCalmEnd() {
    this.isCalm = false;
    const font = 'Noto Sans SC, Arial, sans-serif';
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, '⚡ 进攻恢复！', {
      fontSize: '16px', fontFamily: font, color: '#ff8844',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);
    this.time.delayedCall(1500, () => t.destroy());
  }

  _processSynergies() {
    this.playerTowers.forEach(t => {
      if (t.hp <= 0 || !t.cell) return;
      const neighbors = this.playerGrid.getNeighbors(t.cell.q, t.cell.r);
      const neighborTowers = neighbors
        .map(c => this.playerTowers.find(ot => ot.cell && ot.cell.q === c.q && ot.cell.r === c.r))
        .filter(nt => nt && nt.hp > 0);
      t.updateSynergy(neighborTowers);
    });

    if (this.aiController) {
      const aiTowers = this.aiController.towers || [];
      aiTowers.forEach(t => {
        if (t.hp <= 0 || !t.cell) return;
        const neighbors = this.aiGrid.getNeighbors(t.cell.q, t.cell.r);
        const neighborTowers = neighbors
          .map(c => aiTowers.find(ot => ot.cell && ot.cell.q === c.q && ot.cell.r === c.r))
          .filter(nt => nt && nt.hp > 0);
        t.updateSynergy(neighborTowers);
      });
    }
  }

  _onWaveStart(waveIdx) {
    const font = 'Noto Sans SC, Arial, sans-serif';
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, `第 ${waveIdx + 1} 波`, {
      fontSize: '32px', fontFamily: font, color: '#ff8844', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(15).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, duration: 300, yoyo: true, hold: 800,
      onComplete: () => t.destroy(),
    });
  }

  _gameOver(loser) {
    if (this._isGameOver) return;
    this._isGameOver = true;

    let result;
    if (loser === '玩家') result = 'lose';
    else if (loser === 'AI') result = 'win';
    else result = 'draw';

    const pHp = Math.round((this.playerNucleus.hp / this.playerNucleus.maxHp) * 100);
    const aHp = Math.round((this.aiNucleus.hp / this.aiNucleus.maxHp) * 100);

    this.time.delayedCall(1200, () => {
      this.scene.start('ResultScene', {
        result, playerHp: pHp, aiHp: aHp,
        wave: this.waveManager.currentWave,
      });
    });
  }

  onAllWavesComplete() {
    const pHp = this.playerNucleus.hp;
    const aHp = this.aiNucleus.hp;
    let result;
    if (pHp > aHp) result = 'win';
    else if (aHp > pHp) result = 'lose';
    else result = 'draw';
    this._gameOver(result);
  }

  update(time, delta) {
    if (this._isGameOver) return;

    // 波次
    this.waveManager.update(delta);

    // 怪物
    this.monsters.forEach(m => m.update(delta));

    // 塔连携：收集邻居并激活
    this._processSynergies();

    // 塔
    this.playerTowers.forEach(t => t.update(time, delta, this.monsters, this.bullets));

    // AI 塔
    if (this.aiController) {
      this.aiController.update(time, delta, this.monsters);
      this.aiController.updateTowers(time, delta, this.monsters, this.bullets);
    }

    // 子弹
    this.bullets.forEach(b => b.update(delta));

    // 道具
    if (this.itemManager) this.itemManager.update();

    // 清理
    this.monsters = this.monsters.filter(m => {
      if (!m.alive) {
        if (m.onDeath) m.onDeath();
        // 线粒体额外 ATP
        if (m._lastAttacker && m._lastAttacker.zoneBonus && m._lastAttacker.zoneBonus.atpBonus) {
          const isPlayer = this.playerTowers.includes(m._lastAttacker);
          const atpMgr = isPlayer ? this.playerATP : this.aiATP;
          atpMgr.add(m._lastAttacker.zoneBonus.atpBonus);
        }
        return false;
      }
      if (m.reachedTarget) {
        const side = this._whichArena(m.targetX, m.targetY);
        const nucleus = side === 'player' ? this.playerNucleus : this.aiNucleus;
        const destroyed = nucleus.takeDamage(m.config.damageNucleus);
        m.destroy();
        if (destroyed) this._gameOver(side === 'player' ? '玩家' : 'AI');
        return false;
      }
      return true;
    });

    this.bullets = this.bullets.filter(b => {
      if (!b.alive) { b.destroy(); return false; }
      return true;
    });
  }

  _whichArena(x, y) {
    const dP = Math.abs(x - ARENA_POSITIONS.PLAYER.x);
    const dA = Math.abs(x - ARENA_POSITIONS.AI.x);
    return dP < dA ? 'player' : 'ai';
  }

  // ========== 说明面板 ==========

  _createHelpButton() {
    const btn = this.add.text(GAME_WIDTH - 20, 20, '❓', {
      fontSize: '22px',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(10);
    btn.on('pointerdown', () => this._toggleHelp());
  }

  _toggleHelp() {
    this._helpVisible = !this._helpVisible;
    if (this._helpVisible) this._showHelp();
    else this._hideHelp();
  }

  _showHelp() {
    this._hideHelp();

    const ox = 60, oy = 50, w = 1080, h = 580;
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRoundedRect(ox, oy, w, h, 10);
    this._helpObjects.push(bg);

    const title = this.add.text(ox + 20, oy + 10, '📖 游戏说明', {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setDepth(21);
    this._helpObjects.push(title);

    // 关闭按钮
    const closeBtn = this.add.text(ox + w - 25, oy + 10, '✕', {
      fontSize: '20px', color: '#ff8888',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(21);
    closeBtn.on('pointerdown', () => this._toggleHelp());
    this._helpObjects.push(closeBtn);

    // === 各区域说明 ===
    const col1 = ox + 20, col2 = ox + 370, col3 = ox + 740;
    const addSection = (cx, cy, label, color, lines) => {
      const l = this.add.text(cx, cy, label, {
        fontSize: '15px', color: color, fontStyle: 'bold',
      }).setDepth(21);
      this._helpObjects.push(l);
      lines.forEach((text, i) => {
        const t = this.add.text(cx + 8, cy + 20 + i * 18, text, {
          fontSize: '12px', color: '#cccccc',
        }).setDepth(21);
        this._helpObjects.push(t);
      });
    };

    // === 列1：左 ===
    addSection(col1, oy + 50, '🟦🟩🟪 地形区域', '#88ccff', [
      '🟦 膜缘区（蓝）→ 射程 +25%',
      '🟩 细胞质区（绿）→ 攻速 +15%',
      '🟪 核周区（紫）→ 伤害 +30%',
      '✨ 金色线粒体格 → 击杀额外 +2 ATP',
    ]);
    addSection(col1, oy + 160, '🏗️ 防御塔', '#44dd88', [
      '🧫 巨噬细胞 100ATP  近战吞噬定身',
      '🔬 B细胞 150ATP  远程Y形弹体',
      '🧬 补体系统 250ATP  AOE持续伤害',
    ]);
    addSection(col1, oy + 240, '👾 病原体', '#ff8866', [
      '🟡 葡萄球菌 — 基础步兵',
      '🟢 链球菌 — 快速直冲核',
      '🟣 噬菌体 — 专打防御塔',
      '🌀 螺旋路径 → 需环形布防',
    ]);
    addSection(col1, oy + 340, '🧘 准备阶段', '#ff8866', [
      '每 2 波后 10 秒准备期，不刷怪',
      '可自由造塔 / 放道具，双方 +20 ATP',
    ]);

    // === 列2：中 ===
    addSection(col2, oy + 50, '🔗 塔连携（相邻激活）', '#ffd700', [
      '🧫巨噬 + 🔬B细胞 → B射速 +30%',
      '🧫巨噬 + 🧬补体 → 巨噬范围 +20',
      '🔬B细胞 + 🧬补体 → 补体伤害 +2',
      '同种相邻 → 各自攻速 +10%',
      '彩色连线 = 连携已激活',
    ]);
    addSection(col2, oy + 190, '🎯 道具系统', '#cc88ff', [
      '🧪 炎症因子 80ATP → 目标受击面+30%',
      '🧪 细菌毒素 120ATP → 随机塔瘫痪3s',
      '🧪 信号干扰 100ATP → 塔乱锁目标',
    ]);

    // === 列3：右 ===
    addSection(col3, oy + 50, '💡 策略提示', '#ffffff', [
      '• 开局 500ATP + 准备期 150 = 650',
      '  推荐铺 4巨噬 + 1B细胞',
      '',
      '• 巨噬放外层（+射程）吞噬跑过的怪',
      '• B细胞放内层（+伤害）全图覆盖',
      '• 补体放中间克制密集群怪',
      '',
      '• 巨噬+B细胞相邻 = 最佳组合',
      '• 噬菌体会打塔，注意补位',
      '',
      '• 平静期记得买道具坑 AI',
    ]);
  }
  }

  _hideHelp() {
    this._helpObjects.forEach(o => { if (o && o.destroy) o.destroy(); });
    this._helpObjects = [];
    this._helpVisible = false;
  }
}
