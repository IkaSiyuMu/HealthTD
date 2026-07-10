class WaveManager {
  constructor(scene, spawnPlayerFn, spawnAiFn) {
    this.scene = scene; this.spawnPlayer = spawnPlayerFn; this.spawnAi = spawnAiFn;
    this.currentWave = -1; this.waveActive = false; this.spawnTimer = 0;
    this.spawnQueue = []; this.spawnIndex = 0; this.isCalm = false;
    this.onCalmStart = null; this.onCalmEnd = null; this.onWaveStart = null;
  }
  start() { this.currentWave = -1; this._nextWave(); }
  _nextWave() {
    this.currentWave++;
    if (this.currentWave >= WAVES.length) {
      if (this.scene.onAllWavesComplete) this.scene.onAllWavesComplete();
      return;
    }
    if (this.currentWave > 0 && this.currentWave % CALM_EVERY === 0) { this._startCalm(); return; }
    this._startWave();
  }
  _startCalm() {
    this.isCalm = true;
    if (this.onCalmStart) this.onCalmStart();
    this.scene.time.delayedCall(CALM_DURATION, () => {
      this.isCalm = false;
      if (this.onCalmEnd) this.onCalmEnd();
      this._startWave();
    });
  }
  _startWave() {
    this.waveActive = true;
    const wave = WAVES[this.currentWave];
    this.spawnQueue = [];
    for (let i = 0; i < wave.staph; i++) this.spawnQueue.push({ type: 'STAPH', delay: i * 600 + Math.random() * 300 });
    for (let i = 0; i < wave.strep; i++) this.spawnQueue.push({ type: 'STREP', delay: i * 400 + Math.random() * 300 });
    for (let i = 0; i < wave.phage; i++) this.spawnQueue.push({ type: 'PHAGE', delay: i * 800 + Math.random() * 300 });
    this.spawnQueue.sort((a, b) => a.delay - b.delay);
    this.spawnTimer = 0; this.spawnIndex = 0;
    if (this.onWaveStart) this.onWaveStart(this.currentWave);
  }
  update(delta) {
    if (!this.waveActive || this.spawnIndex >= this.spawnQueue.length) return;
    this.spawnTimer += delta;
    const item = this.spawnQueue[this.spawnIndex];
    if (this.spawnTimer >= item.delay) {
      this.spawnPlayer(item.type); this.spawnAi(item.type);
      this.spawnIndex++;
    }
  }
}
