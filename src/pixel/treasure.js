// 8-Bit edition: buried treasure drawn as pixel-art sprites. Replaces the classic drawTreasure().
// Every cell is one buffer pixel (PL.pix screen pixels), snapped to the grid, so sprites stay crisp.
const TR_COL = { k: '#1a1c2c', p: '#5d275d', r: '#b13e53', o: '#ef7d57', y: '#ffcd75', t: '#257179', a: '#73eff7', w: '#f4f4f4',
  s: '#94b0c2', d: '#566c86', m: '#333c57', 1: '#2b1e1a', 2: '#5a3a2b', 3: '#8a5a3c', 4: '#c49a6c', v: '#c86bd6' };
// sprite painters: put(gx, gy, colourKey) on a grid centred on the find, roughly 12×12 cells
const TREASURE_SPRITES = [
  (put) => { // ammonite fossil: a ribbed spiral shell
    for (let gy = -6; gy < 6; gy++) for (let gx = -6; gx < 6; gx++) {
      const x = gx + 0.5, y = gy + 0.5, r = Math.hypot(x, y); if (r > 6) continue;
      const band = (r + (Math.atan2(y, x) + Math.PI) / (2 * Math.PI) * 2.4) % 2.4;
      put(gx, gy, r > 5.2 ? '2' : band < 1.2 ? '4' : '3');
    }
    put(0, 0, '2'); put(-1, 0, '3');
  },
  (put, t) => { // amethyst geode: a grey shell around a cave of purple crystals
    for (let gy = -6; gy < 6; gy++) for (let gx = -6; gx < 6; gx++) {
      const x = gx + 0.5, y = gy + 0.5, r = Math.hypot(x, y) + (hash(gx + 9, gy + 9) - 0.5) * 0.8; if (r > 6) continue;
      put(gx, gy, r > 5 ? 'd' : r > 4.2 ? 's' : hash(gx, gy + 40) < 0.35 ? 'v' : (gx + gy) & 1 ? 'p' : 'v');
    }
    if (Math.floor(t * 2) % 2) put(-1, -2, 'w'); else put(1, 1, 'w');
  },
  (put) => { // iron meteorite: a pitted metal lump with a bright edge
    for (let gy = -5; gy < 6; gy++) for (let gx = -6; gx < 6; gx++) {
      const x = gx + 0.5, y = gy + 0.5, r = Math.hypot(x * 0.9, y * 1.1) + (hash(gx + 3, gy + 17) - 0.5) * 1.2; if (r > 5.6) continue;
      put(gx, gy, r > 5 ? 'k' : x + y < -3.5 ? 's' : hash(gx + 31, gy) < 0.16 ? 'k' : 'd');
    }
  },
  (put) => { // reliquary: a wooden chest with gold bands and a lock
    for (let gy = -3; gy <= 4; gy++) for (let gx = -6; gx <= 5; gx++) put(gx, gy, gx === -6 || gx === 5 || gy === 4 ? '2' : gy === 0 ? 'y' : '3');
    for (let gx = -5; gx <= 4; gx++) { put(gx, -5, '2'); put(gx, -4, 'y'); }
    for (let gx = -4; gx <= 3; gx++) put(gx, -6, '2');
    for (const gx of [-4, 3]) for (let gy = -3; gy <= 3; gy++) put(gx, gy, 'y');
    put(-1, -1, 'y'); put(0, -1, 'y'); put(-1, 1, 'y'); put(0, 1, 'y'); put(-1, 0, 'k'); put(0, 0, 'k');
  },
  (put, t) => { // xeno artifact: a teal hexagon with a pulsing glyph
    for (let gy = -6; gy < 6; gy++) for (let gx = -6; gx < 6; gx++) {
      const x = Math.abs(gx + 0.5), y = Math.abs(gy + 0.5); if (y > 5.5 || x * 0.87 + y * 0.5 > 5.5) continue;
      put(gx, gy, x * 0.87 + y * 0.5 > 4.6 || y > 4.6 ? 'a' : 't');
    }
    const on = Math.floor(t * 2.5) % 2;
    for (const [gx, gy] of [[0, -2], [-1, -1], [0, -1], [0, 0], [-1, 1], [0, 1], [-2, 0], [1, 0]]) put(gx - (gx < 0 ? 0 : 0), gy, on ? 'w' : 'a');
  },
  (put, t) => { // core heart: a layered molten orb that throbs gently
    const pulse = Math.floor(t * 3) % 2 ? 0.4 : 0;
    for (let gy = -6; gy < 6; gy++) for (let gx = -6; gx < 6; gx++) {
      const r = Math.hypot(gx + 0.5, gy + 0.5); if (r > 5.8 + pulse) continue;
      put(gx, gy, r > 4.8 ? 'r' : r > 3.2 ? 'o' : r > 1.4 ? 'y' : 'w');
    }
  },
];
function drawTreasure(now, cx, headY, dtF) {
  if (!T) return;
  const p = PL.pix, d = T.def, t = now / 1000;
  const snap = v => Math.round(v / p) * p;
  const x = snap(Math.max(80, Math.min(W - 60, cx + T.ox))), y = snap(headY + T.oy);
  T.hit = Math.max(0, T.hit - dtF);
  const jig = T.hit > 0 ? (Math.random() < 0.5 ? -p : p) : 0;
  T.x = x; T.y = y;
  const cell = (gx, gy, col) => { ctx.fillStyle = TR_COL[col] || col; ctx.fillRect(x + jig + gx * p, y + gy * p, p, p); };
  const locked = toolTier(S.up.tools) < d.tier;
  // the pocket: a dark cavity with a one-pixel rim
  for (let gy = -8; gy <= 8; gy++) for (let gx = -11; gx <= 11; gx++) {
    const e = (gx * gx) / 121 + (gy * gy) / 64;
    if (e <= 1) ctx.fillStyle = e > 0.8 ? TR_COL['1'] : TR_COL.k, ctx.fillRect(x + gx * p, y + gy * p, p, p);
  }
  TREASURE_SPRITES[Math.min(d.tier, TREASURE_SPRITES.length - 1)](cell, t);
  // cracks spread pixel by pixel as it is dug out
  const cracks = Math.floor((1 - T.hp / T.max) * 7);
  for (let k = 0; k < cracks; k++) {
    const a = hash(k, T.seed | 0) * Math.PI * 2;
    for (let r = 7; r >= 2; r--) cell(Math.round(Math.cos(a + (r & 1) * 0.25) * r), Math.round(Math.sin(a) * r * 0.85), 'k');
  }
  // blinking corner brackets mark it as something to tap
  const bc = locked ? TR_COL.o : d.color, on = Math.floor(t * 2.5) % 2 === 0 || reduceMotion;
  if (on) for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const bx = sx * 13, by = sy * 10;
    for (let i = 0; i < 3; i++) { cell(bx - sx * i, by, bc); cell(bx, by - sy * i, bc); }
  }
  // two pixel bars: integrity (or the lock) and time before the wall collapses
  const barW = 22, bx0 = -11, frac = Math.max(0, T.left / T.total);
  if (!locked) {
    for (let i = 0; i < barW; i++) cell(bx0 + i, 12, i < Math.ceil(barW * Math.max(0, T.hp / T.max)) ? d.color : 'm');
  }
  for (let i = 0; i < barW; i++) cell(bx0 + i, locked ? 12 : 14, i < Math.ceil(barW * frac) ? (frac < 0.25 ? 'o' : 'y') : 'm');
  // label (and the tool it needs) on the crisp text layer
  ctx.textAlign = 'center'; ctx.font = '18px "VT323", monospace';
  const lines = [[d.name.toUpperCase(), d.color, y - 12 * p]];
  if (locked) lines.push(['NEEDS ' + TOOL_NAMES[d.tier].toUpperCase(), '#ef7d57', y + 17 * p + 10]);
  for (const [txt, col, ly] of lines) {
    const w = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(26,28,44,.85)'; ctx.fillRect(x - w / 2 - 6, ly - 15, w + 12, 19);
    ctx.fillStyle = col; ctx.fillText(txt, x, ly);
  }
  ctx.textAlign = 'left';
}
