class HexGrid {
  constructor(scene, centerX, centerY, gridRadius, hexSize) {
    this.scene = scene;
    this.cx = centerX;
    this.cy = centerY;
    this.gridRadius = gridRadius;
    this.size = hexSize;
    this.cells = [];
    this.graphics = scene.add.graphics();
    this._generate();
  }

  _generate() {
    for (let q = -this.gridRadius; q <= this.gridRadius; q++) {
      for (let r = -this.gridRadius; r <= this.gridRadius; r++) {
        if (Math.abs(q + r) > this.gridRadius) continue;
        const pos = this._hexToPixel(q, r);
        const dx = pos.x - this.cx;
        const dy = pos.y - this.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // 只保留环形带：核外侧 55px ~ 膜内侧 185px
        const buildable = dist >= 55 && dist <= ARENA.RADIUS - 15;
        this.cells.push({ q, r, x: pos.x, y: pos.y, occupied: false, buildable });
      }
    }
  }

  _hexToPixel(q, r) {
    const x = this.size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = this.size * (3 / 2 * r);
    return { x: x + this.cx, y: y + this.cy };
  }

  _pixelToHex(px, py) {
    const x = (px - this.cx) / this.size;
    const y = (py - this.cy) / this.size;
    const q = (Math.sqrt(3) / 3) * x - (1 / 3) * y;
    const r = (2 / 3) * y;
    return this._roundHex(q, r);
  }

  _roundHex(q, r) {
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return { q: rq, r: rr };
  }

  _hexCorner(cx, cy, i) {
    const angleDeg = 60 * i - 30;
    const angleRad = Math.PI / 180 * angleDeg;
    return { x: cx + this.size * Math.cos(angleRad), y: cy + this.size * Math.sin(angleRad) };
  }

  getCellAtPixel(px, py) {
    const hex = this._pixelToHex(px, py);
    return this.cells.find(c => c.q === hex.q && c.r === hex.r) || null;
  }

  setOccupied(q, r, val) {
    const cell = this.cells.find(c => c.q === q && c.r === r);
    if (cell) cell.occupied = val;
  }

  getEmptyCells() {
    return this.cells.filter(c => c.buildable && !c.occupied);
  }

  render() {
    this.graphics.clear();
    this.cells.forEach(c => {
      if (!c.buildable) return;
      const verts = [];
      for (let i = 0; i < 6; i++) {
        const corner = this._hexCorner(c.x, c.y, i);
        verts.push(corner.x, corner.y);
      }
      const fillColor = c.occupied ? 0x44dd88 : 0xccccff;
      const alpha = c.occupied ? 0.5 : 0.2;
      this.graphics.fillStyle(fillColor, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(verts[0], verts[1]);
      for (let i = 2; i < verts.length; i += 2) {
        this.graphics.lineTo(verts[i], verts[i + 1]);
      }
      this.graphics.closePath();
      this.graphics.fillPath();
      this.graphics.lineStyle(1, 0x8888cc, 0.25);
      this.graphics.strokePath();
    });
  }
}
