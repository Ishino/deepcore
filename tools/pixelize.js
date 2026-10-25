// Builds the 8-bit edition: the pixel shell (layout + styles) + the classic game's script, adapted.
// The classic game (src/game.html) stays the single source of game logic and balance.
module.exports = function pixelize(html, shell, camp, treasure) {
let s = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error((n ? 'pixelize: not unique (' + n + '): ' : 'pixelize: missing: ') + a.slice(0, 110)); s = s.replace(a, () => b); };

/* ---------- pixel engine for the borehole and launch-pad canvases ---------- */
rep(`/* ---------- canvas ---------- */
const cv = $('#cv'), ctx = cv.getContext('2d');`, `/* ---------- pixel engine ---------- */
// The world is drawn into a buffer at 1/3 (1/2 on phones) of screen resolution, scaled up with hard
// pixels, and every frame is dithered down to one fixed palette. Text goes to a crisp layer on top.
const PALETTE = ['#1a1c2c','#5d275d','#b13e53','#ef7d57','#ffcd75','#a7f070','#38b764','#257179','#29366f','#3b5dc9','#41a6f6','#73eff7','#f4f4f4','#94b0c2','#566c86','#333c57',
  '#2b1e1a','#5a3a2b','#8a5a3c','#c49a6c'];
const PAL = PALETTE.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const LUT = new Uint8Array(32768).fill(255);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v / 16 - 0.47) * 10); // light touch: only real gradients dither
function nearestColor(r, g, b) {
  let best = 0, bd = Infinity;
  for (let k = 0; k < PAL.length; k++) { const p = PAL[k], dr = r - p[0], dg = g - p[1], db = b - p[2], d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (d < bd) { bd = d; best = k; } }
  return best;
}
function quantize(c, w, h) {
  const img = c.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) {
    const row = (y & 3) * 4;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, o = BAYER[row + (x & 3)];
      let r = d[i] + o, g = d[i + 1] + o, b = d[i + 2] + o;
      r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b;
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let p = LUT[key]; if (p === 255) p = LUT[key] = nearestColor(r, g, b);
      const q = PAL[p]; d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; d[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
}
function pixelLayer(canvas, textCanvas) {
  const base = canvas.getContext('2d', { willReadFrequently: true }), txt = textCanvas.getContext('2d');
  const st = { pix: 3, w: 1, h: 1 };
  const BOTH = new Set(['save', 'restore', 'translate', 'rotate', 'scale']);
  const TEXT = new Set(['fillText', 'strokeText', 'measureText']);
  const ctx = new Proxy({}, {
    get(_, k) {
      if (TEXT.has(k)) return txt[k].bind(txt);
      if (BOTH.has(k)) return (...a) => { base[k](...a); txt[k](...a); };
      const v = base[k]; return typeof v === 'function' ? v.bind(base) : v;
    },
    set(_, k, v) {
      base[k] = k === 'lineWidth' ? Math.max(v, st.pix) : v; // never thinner than one real pixel
      try { txt[k] = v; } catch (e) {}
      return true;
    },
  });
  return {
    ctx,
    resize(cssW, cssH) {
      st.pix = cssW < 520 ? 2 : 3;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      st.w = Math.max(1, Math.round(cssW / st.pix)); st.h = Math.max(1, Math.round(cssH / st.pix));
      canvas.width = st.w; canvas.height = st.h;
      base.setTransform(1 / st.pix, 0, 0, 1 / st.pix, 0, 0); base.imageSmoothingEnabled = false;
      textCanvas.width = Math.round(cssW * dpr); textCanvas.height = Math.round(cssH * dpr);
      txt.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    get pix() { return st.pix; },
    begin() { txt.save(); txt.setTransform(1, 0, 0, 1, 0, 0); txt.clearRect(0, 0, textCanvas.width, textCanvas.height); txt.restore(); },
    end() { quantize(base, st.w, st.h); },
  };
}

// Rock is drawn in exact palette colours (base, a darker pebble shade and a lighter one), registered
// on first use, so flat rock stays solid instead of dithering between two fixed palette entries.
const PAL_KEYS = new Set(PALETTE);
const normCtx = document.createElement('canvas').getContext('2d');
function pxReg(col) {
  normCtx.fillStyle = '#000000'; normCtx.fillStyle = col;
  const hex = normCtx.fillStyle;
  if (hex[0] === '#' && !PAL_KEYS.has(hex)) {
    PAL_KEYS.add(hex); PAL.push([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]); LUT.fill(255);
  }
  return hex;
}
const mixHex = (hex, to, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - f) + to * f).toString(16).padStart(2, '0')).join('');
const SHADES = {};
function rockShades(s) {
  const key = s.color + s.ore;
  if (!SHADES[key]) { const base = pxReg(s.color); SHADES[key] = { base, dark: pxReg(mixHex(base, 0, 0.3)), light: pxReg(mixHex(base, 255, 0.14)), ore: pxReg(s.ore) }; }
  return SHADES[key];
}

/* ---------- canvas ---------- */
const cv = $('#cv'), PL = pixelLayer(cv, $('#cvText')), ctx = PL.ctx;`);
// buried treasure as pixel-art sprites snapped to the buffer grid (one cell = one real pixel)
{
  const before = s;
  s = s.replace(/function drawTreasure\(now, cx, headY, dtF\) \{[\s\S]*?\n\}\nfunction spawnDebris\(\) \{/, () => `${treasure}\nfunction spawnDebris() {`);
  if (s === before) throw new Error('pixelize: drawTreasure not found');
}
// hand-picked pixel-art rock colours for the twelve named formations (generated ones snap to their own shades)
rep(`const BASE_N = STRATA.length;`, `['#5a3a2b', '#c49a6c', '#9c9178', '#4a5068', '#8c6f73', '#2e3340', '#6c6478', '#3a5248', '#566b3c', '#6e3b46', '#6a3220', '#8a2f1a']
  .forEach((c, i) => { STRATA[i].color = c; });
const BASE_N = STRATA.length;`);
rep(`        ctx.fillStyle = s.ore;`, `        ctx.fillStyle = rockShades(s).ore;`);
rep(`        ctx.fillStyle = r1 > 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.07)';`, `        ctx.fillStyle = r1 > 0.5 ? rockShades(s).dark : rockShades(s).light;`);
rep(`      ctx.fillStyle = s.color; ctx.fillRect(-10, y0, W + 20, y1 - y0);`, `      ctx.fillStyle = rockShades(s).base; ctx.fillRect(-10, y0, W + 20, y1 - y0);`);
rep(`function resize() {
  const r = cv.getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = r.width; H = r.height;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}`, `function resize() {
  const r = cv.getBoundingClientRect();
  W = r.width; H = r.height;
  PL.resize(W, H);
}`);
rep(`function render(now) {
  requestAnimationFrame(render);
  if (!W || !H) return;`, `function render(now) {
  requestAnimationFrame(render);
  if (!W || !H) return;
  PL.begin();`);
rep(`    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}`, `    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  PL.end();
}`);
// the camp strip above already shows the derrick; the borehole only shows the drill string arriving from it
rep(`  if (ySurf > -140 && ySurf < H + 10) {`, `  if (false) {`);
rep(`  const pipeTop = ySurf > -10 ? ySurf - 118 : -10;`, `  const pipeTop = ySurf > -10 ? ySurf : -10;`);
// keep the surface pinned near the top of the borehole while shallow (the camp strip above is the sky)
rep(`  const ppm = H / viewSpan, headY = Math.round(H * 0.58), cx = Math.round(Math.max(110, W * 0.56));`,
    `  const ppm = H / viewSpan, headY = Math.round(Math.min(H * 0.58, visDepth * ppm + 30)), cx = Math.round(Math.max(110, W * 0.56));`);
// shorter labels for the console bar
rep("const shipLabel = n => n >= 0.5 ? `Ship ${fmt(n)} useful load${n >= 1.5 ? 's' : ''} to the yard` : 'Nothing in the hopper the yard needs';",
    "const shipLabel = n => n >= 0.5 ? `Ship ${fmt(n)} to yard` : 'Yard needs none';");
rep(`const yv = $('#yv'), yx = yv.getContext('2d');`, `const yv = $('#yv'), YPL = pixelLayer(yv, $('#yvText')), yx = YPL.ctx;`);
rep(`  const r = yv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
  YW = r.width; YH = r.height; yv.width = Math.round(YW * d); yv.height = Math.round(YH * d); yx.setTransform(d, 0, 0, d, 0, 0);`,
  `  const r = yv.getBoundingClientRect();
  YW = r.width; YH = r.height; YPL.resize(YW, YH);`);
rep(`  if (activeScreen !== 'yard' || !YW || !YH) return;
  const c = yx, W2 = YW, H2 = YH, t = now / 1000;`, `  if (activeScreen !== 'yard' || !YW || !YH) return;
  YPL.begin();
  const c = yx, W2 = YW, H2 = YH, t = now / 1000;`);
rep(`  c.restore();
}

/* ---------- boot ---------- */`, `  c.restore();
  YPL.end();
}

${camp}

/* ---------- boot ---------- */`);
rep(`c.arc(st.x * W2, st.y * H2 * 0.72, st.r, 0, 7)`, `c.arc(st.x * W2, st.y * H2 * 0.72, 1.2 + st.r, 0, 7)`);
let nFont = 0;
s = s.replace(/'(?:600 )?(\d+)px "JetBrains Mono", Consolas, monospace'/g, (m, px) => { nFont++; return `'${Math.round(+px * 1.6)}px "VT323", monospace'`; });

/* ---------- boot: hold the simulation behind the title screen ---------- */
rep(`setInterval(() => { const now = performance.now(); tick(Math.min(60, (now - last) / 1000), false); last = now; }, 100);`,
    `setInterval(() => { const now = performance.now(); if (!GAME_PAUSED) tick(Math.min(60, (now - last) / 1000), false); last = now; }, 100);`);
rep(`  uiTick(true);
  requestAnimationFrame(render);
}`, `  uiTick(true);
  requestAnimationFrame(render);
  if (data && data.S) GAME_PAUSED = false; else showTitle(); // a live update keeps playing; a fresh load shows the title
}`);

return shell.replace('/*__GAME_SCRIPT__*/', () => s);
};
