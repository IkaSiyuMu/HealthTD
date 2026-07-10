class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this._isGameOver = false;
    this.isCalm = false;
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
    this.waveManager.start();

    // AI
    this.aiController = new AIController(this, this.aiGrid, this.aiATP, this.aiNucleus);

    // 道具
    this.itemManager = new ItemManager(this, this.playerATP, this.aiATP);
    this._createItemShop();

    // 建造 UI 状态
    this.selectedCell = null;
    this.buildMenu = this.add.graphics();
    this.buildMenuVisible = false;

    // 点击输入
    this.input.on('pointerdown', (pointer) => this._handleClick(pointer.x, pointer.y));
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

    // 先检查建造菜单点击
    if (this.buildMenuVisible) {
      for (const item of this.buildMenuItems) {
        if (item._hitBox && px >= item._hitBox.x && px <= item._hitBox.x + item._hitBox.w &&
            py >= item._hitBox.y && py <= item._hitBox.y + item._hitBox.h) {
          this._buildTower(item._towerKey);
          return;
        }
      }
      // 点击菜单外关闭菜单
      this._hideBuildMenu();
      return;
    }

    // 检查点击六边形
    const dx = px - ARENA_POSITIONS.PLAYER.x;
    const dy = py - ARENA_POSITIONS.PLAYER.y;
    if (Math.sqrt(dx * dx + dy * dy) > ARENA.RADIUS) return;

    const cell = this.playerGrid.getCellAtPixel(px, py);
    if (!cell || !cell.buildable || cell.occupied) return;

    if (this.isCalm) {
      this._flashText('平静期无法造塔！');
      return;
    }

    this._showBuildMenu(cell);
  }

  _showBuildMenu(cell) {
    this.selectedCell = cell;
    this.buildMenuVisible = true;
    this.buildMenu.clear();

    const menuX = cell.x;
    const menuY = cell.y - 65;
    const types = [
      { key: 'MACROPHAGE', label: `巨噬细胞 (${TOWERS.MACROPHAGE.cost})`, color: 0x44aa88 },
      { key: 'BCELL', label: `B细胞 (${TOWERS.BCELL.cost})`, color: 0x4488dd },
      { key: 'COMPLEMENT', label: `补体系统 (${TOWERS.COMPLEMENT.cost})`, color: 0xdd8844 },
    ];

    // 清理旧菜单
    this._hideBuildMenu();

    // 背景
    this.buildMenu.fillStyle(0x333333, 0.85);
    this.buildMenu.fillRoundedRect(menuX - 85, menuY - 5, 170, 75, 6);

    types.forEach((t, i) => {
      const ty = menuY + 10 + i * 24;
      const txt = this.add.text(menuX, ty, `${t.label}`, {
        fontSize: '12px', color: '#ffffff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      txt._towerKey = t.key;
      txt._hitBox = { x: menuX - 80, y: ty - 8, w: 160, h: 20 };
      txt.on('pointerdown', (ptr) => { ptr.event.stopPropagation(); this._buildTower(t.key); });
      this.buildMenuItems.push(txt);
    });
  }

  _buildTower(towerKey) {
    const config = TOWERS[towerKey];
    if (!this.playerATP.spend(config.cost)) {
      this._flashText('ATP 不足！');
      return;
    }

    this.playerGrid.setOccupied(this.selectedCell.q, this.selectedCell.r, true);
    this.playerGrid.render();

    const tower = new Tower(this, this.selectedCell.x, this.selectedCell.y, config);
    this.playerTowers.push(tower);

    this._hideBuildMenu();
  }

  _hideBuildMenu() {
    this.buildMenuVisible = false;
    this.buildMenu.clear();
    this.buildMenuItems.forEach(t => t.destroy());
    this.buildMenuItems = [];
  }

  _createItemShop() {
    const y = 60;
    const keys = Object.keys(ITEMS);
    keys.forEach((key, i) => {
      const item = ITEMS[key];
      const x = 90 + i * 150;
      const txt = this.add.text(x, y, `买:${item.name}(${item.cost}ATP)`, {
        fontSize: '12px', color: '#fff', backgroundColor: '#884488',
        padding: { x: 6, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      txt.on('pointerdown', () => this.itemManager.purchase(key));
    });
  }

  _flashText(msg) {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, msg, {
      fontSize: '20px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 30, duration: 1000, onComplete: () => t.destroy() });
  }

  _onCalmStart() {
    this.isCalm = true;
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '🧬 平静期 — 干扰对手的最佳时机！', {
      fontSize: '22px', color: '#ff6666', fontStyle: 'bold',
      backgroundColor: '#ffffffcc', padding: { x: 16, y: 8 },
    }).setOrigin(0.5);
    t._calmText = true;
    this.playerATP.add(CALM_ATP_REWARD);
    this.aiATP.add(CALM_ATP_REWARD);
    this.time.delayedCall(CALM_DURATION - 500, () => { if (t._calmText) t.destroy(); });
  }

  _onCalmEnd() {
    this.isCalm = false;
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, '⚡ 进攻恢复！', {
      fontSize: '18px', color: '#ff8844',
    }).setOrigin(0.5);
    this.time.delayedCall(1500, () => t.destroy());
  }

  _onWaveStart(waveIdx) {
    this._flashText(`第 ${waveIdx + 1} 波`);
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
}
