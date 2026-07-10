class WaveManager {
  constructor(scene, spawnPlayerFn, spawnAiFn) {
    this.scene = scene;
    this.spawnPlayer = spawnPlayerFn;
    this.spawnAi = spawnAiFn;
    this.currentWave = -1;
    this.waveActive = false;
    this.allDone = false;
    this.spawnTimer = 0;
    this.spawnQueue = [];
    this.spawnIndex = 0;
    this.isCalm = false;
    this.onCalmStart = null;
    this.onCalmEnd = null;
    this.onWaveStart = null;
    this.waveEndTimer = 0;
    this.waveEndDelay = 3000; // 怪物出完后等3秒自动下一波
  }

  start() { this.currentWave = -1; this._nextWave(); }

  _nextWave() {
    if (this.allDone) return;
    this.currentWave++;
    if (this.currentWave >= WAVES.length) {
      this.allDone = true;
      this.waveActive = false;
      // 等待剩余怪物清理完
      this.scene.time.delayedCall(2000, () => {
        if (this.scene.onAllWavesComplete) this.scene.onAllWavesComplete();
      });
      return;
    }
    // 平静期：第2、4、6波后
    if (this.currentWave > 0 && this.currentWave % CALM_EVERY === 0) {
      this._startCalm();
      return;
    }
    this._startWave();
  }

  _startCalm() {
    this.isCalm = true;
    this.waveActive = false;
    if (this.onCalmStart) this.onCalmStart();
    this.scene.time.delayedCall(CALM_DURATION, () => {
      this.isCalm = false;
      if (this.onCalmEnd) this.onCalmEnd();
      this._startWave();
    });
  }

  _startWave() {
    this.waveActive = true;
    this.waveEndTimer = 0;
    const wave = WAVES[this.currentWave];
    this.spawnQueue = [];
    for (let i = 0; i < wave.staph; i++) this.spawnQueue.push({ type: 'STAPH', delay: i * 600 + Math.random() * 400 });
    for (let i = 0; i < wave.strep; i++) this.spawnQueue.push({ type: 'STREP', delay: i * 400 + Math.random() * 300 });
    for (let i = 0; i < wave.phage; i++) this.spawnQueue.push({ type: 'PHAGE', delay: i * 800 + Math.random() * 400 });
    this.spawnQueue.sort((a, b) => a.delay - b.delay);
    this.spawnTimer = 0;
    this.spawnIndex = 0;
    if (this.onWaveStart) this.onWaveStart(this.currentWave);
  }

  update(delta) {
    if (!this.waveActive) return;

    // 生成怪物
    if (this.spawnIndex < this.spawnQueue.length) {
      this.spawnTimer += delta;
      while (this.spawnIndex < this.spawnQueue.length && this.spawnTimer >= this.spawnQueue[this.spawnIndex].delay) {
        const item = this.spawnQueue[this.spawnIndex];
        this.spawnPlayer(item.type);
        this.spawnAi(item.type);
        this.spawnIndex++;
      }
    }

    // 所有怪物生成完毕，等待后进入下一波
    if (this.spawnIndex >= this.spawnQueue.length) {
      this.waveEndTimer += delta;
      if (this.waveEndTimer >= this.waveEndDelay) {
        this.waveActive = false;
        this._nextWave();
      }
    }
  }
}
