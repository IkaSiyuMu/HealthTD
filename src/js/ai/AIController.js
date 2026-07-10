class AIController {
  constructor(scene, grid, atpManager, nucleus) {
    this.scene = scene; this.grid = grid; this.atp = atpManager; this.nucleus = nucleus;
    this.towers = []; this.lastDecision = 0;
    this.decisionInterval = 2000; this.difficultyDelay = 500;
  }
  update(time, delta, monsters) {
    if (time - this.lastDecision < this.decisionInterval + this.difficultyDelay) return;
    this.lastDecision = time;
    if (this.atp.atp < 50) return;
    if (this.towers.length < 4 && this.atp.atp >= 100) { this._buildTower(); return; }

    // 平静期优先用道具
    if (this.scene.isCalm && this.atp.atp >= 80) {
      if (Math.random() < 0.7 && this.scene.onAiUseItem) {
        this.scene.onAiUseItem();
        return;
      }
    }

    // 已有4塔且钱多 → 买道具
    if (this.towers.length >= 4 && this.atp.atp >= 120 && Math.random() < 0.35) {
      if (this.scene.onAiUseItem) this.scene.onAiUseItem();
    }
  }
  _buildTower() {
    const empty = this.grid.getEmptyCells();
    if (empty.length === 0) return;
    empty.sort((a, b) => Math.abs(a.y - this.grid.cy) - Math.abs(b.y - this.grid.cy));
    const types = ['MACROPHAGE', 'BCELL', 'COMPLEMENT'];
    const weights = [0.5, 0.3, 0.2];
    let r = Math.random(), idx = 0;
    for (let i = 0; i < weights.length; i++) { if (r < weights[i]) { idx = i; break; } r -= weights[i]; }
    const key = types[idx]; const config = TOWERS[key];
    if (!this.atp.spend(config.cost)) return;
    const cell = empty[0];
    this.grid.setOccupied(cell.q, cell.r, true);
    this.grid.render();
    this.towers.push(new Tower(this.scene, cell.x, cell.y, config, cell));
  }
  updateTowers(time, delta, monsters, bullets) {
    this.towers.forEach(t => t.update(time, delta, monsters, bullets));
  }
}
