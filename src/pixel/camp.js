/* ================= 8-bit edition: camp, windows, start screen and story ================= */
let GAME_PAUSED = true; // the title screen and story hold the simulation
const HEX = { k: '#1a1c2c', p: '#5d275d', r: '#b13e53', o: '#ef7d57', y: '#ffcd75', l: '#a7f070', g: '#38b764', t: '#257179', n: '#29366f', b: '#3b5dc9',
  c: '#41a6f6', a: '#73eff7', w: '#f4f4f4', s: '#94b0c2', d: '#566c86', m: '#333c57', 1: '#2b1e1a', 2: '#5a3a2b', 3: '#8a5a3c', 4: '#c49a6c', v: '#c86bd6' };

/* ---------- 8×8 pixel icons ---------- */
const ICONS = {
  coin: ['..yyyy..', '.yywwyy.', 'yywyyyoy', 'yyyyyyoy', 'yyyyyyoy', 'yyyyyooy', '.yyoooy.', '..yyyy..'],
  gem: ['..aaaa..', '.awwaaa.', 'awaaaaac', 'aaaaaacc', '.aaaacc.', '..aacc..', '...cc...', '........'],
  clock: ['wwwwwwww', '.y....y.', '..yyyy..', '...yy...', '...yy...', '..y..y..', '.yyyyyy.', 'wwwwwwww'],
  cart: ['........', '..yyyy..', '.yoyyoy.', 'dddddddd', '.dddddd.', '.d....d.', '.k....k.', '........'],
  flame: ['...o....', '...oo...', '..ooo...', '..oyoo..', '.ooyyo..', '.oyyyyo.', '.oywwyo.', '..oooo..'],
  gear: ['...dd...', '.d.ss.d.', '..ssss..', 'dss..ssd', 'dss..ssd', '..ssss..', '.d.ss.d.', '...dd...'],
  sack: ['...33...', '..3..3..', '...33...', '..3443..', '.344y43.', '34y4y443', '3444y443', '.333333.'],
  book: ['.rrrrrr.', 'rwwwwwwr', 'rwkkkkwr', 'rwwwwwwr', 'rwkkkwwr', 'rwwwwwwr', 'rrrrrrrr', '.pppppp.'],
  flag: ['wrrrr...', 'wrrrrrr.', 'wrrrr...', 'w.......', 'w.......', 'w.......', 'w.......', 'ww......'],
  rocket: ['...ww...', '..wssw..', '..saas..', '..ssss..', '..ssss..', '.rssssr.', 'rr.dd.rr', '...oo...'],
};
function iconSvg(name) {
  let r = '';
  (ICONS[name] || []).forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${HEX[ch]}"/>`; }));
  return `<svg class="pxi" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
document.querySelectorAll('[data-ico]').forEach(el => { el.outerHTML = iconSvg(el.dataset.ico); });

/* ---------- RPG windows: every camp building opens one ---------- */
const WIN_TITLES = { rig: 'Workshop', ore: 'Assay Office', skills: 'Archive', prestige: 'Claims Office', yard: 'Meridian Shipyard' };
let winOpen = null, winReturn = null;
function openWin(kind) {
  winReturn = document.activeElement;
  if (kind === 'yard') setScreen('yard');
  else { setScreen('site'); document.querySelector(`.tab[data-tab="${kind}"]`).click(); }
  winOpen = kind;
  $('#winTitle').textContent = WIN_TITLES[kind];
  $('#winScrim').hidden = false;
  $('#winClose').focus();
  uiTick(true);
}
function closeWin() {
  $('#winScrim').hidden = true; winOpen = null;
  if (winReturn && winReturn.focus) winReturn.focus();
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  if (winOpen && winOpen !== 'yard') { winOpen = t.dataset.tab; $('#winTitle').textContent = WIN_TITLES[winOpen]; }
}));
$('#winClose').addEventListener('click', closeWin);
$('#winScrim').addEventListener('click', e => { if (e.target.id === 'winScrim') closeWin(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && winOpen) closeWin(); });
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openWin(b.dataset.open)));

/* ---------- quest markers: a bouncing "!" where something is ready ---------- */
function campFlags() {
  return {
    rig: UPGS.some(u => !(u.max && S.up[u.id] >= u.max) && costOf(u, S.up[u.id]) <= S.credits),
    ore: S.full || hopperFill() > 0.85,
    skills: SKILLS.some(k => skillOpen(k) && S.shards >= skillCost(k)),
    prestige: !S.launched && S.permit <= 120,
    yard: yardReady(),
  };
}
setInterval(() => {
  const f = campFlags();
  for (const k in f) document.querySelectorAll(`[data-mk="${k}"]`).forEach(m => { m.hidden = !f[k]; });
}, 300);

/* ---------- surface camp, drawn pixel by pixel ---------- */
const townBox = $('#townBox'), townCv = $('#town'), tc = townCv.getContext('2d');
let TS = 2, TW = 0, TH = 0, GY = 0, DX = 0, townBg = null, POS = {};
const BLD = [
  { id: 'prestige', name: 'Claims Office', fx: 0.03, w: 14, h: 18 },
  { id: 'rig', name: 'Workshop', fx: 0.14, w: 22, h: 18 },
  { id: 'skills', name: 'Archive', fx: 0.32, w: 20, h: 18 },
  { id: 'ore', name: 'Assay Office', fx: 0.66, w: 20, h: 15 },
  { id: 'yard', name: 'Shipyard', fx: 0.82, w: 22, h: 40 },
];
$('#blds').innerHTML = BLD.map(b => `<button type="button" data-bld="${b.id}" aria-label="${b.name}"><span class="tag">${b.name}</span><b class="mk" data-mk="${b.id}" hidden>!</b></button>`).join('');
document.querySelectorAll('[data-bld]').forEach(b => b.addEventListener('click', () => openWin(b.dataset.bld)));
const smooth = (x, seed) => { const i = Math.floor(x), f = x - i, a = hash(i, seed), b = hash(i + 1, seed); return a + (b - a) * (f * f * (3 - 2 * f)); };
function painter(c) { return (x, y, w, h, col) => { c.fillStyle = HEX[col] || col; c.fillRect(Math.round(x), Math.round(y), w, h); }; }
function layoutTown() {
  const r = townBox.getBoundingClientRect(); if (!r.width || !r.height) return;
  TS = r.width >= 600 ? 3 : 2;
  TW = Math.ceil(r.width / TS); TH = Math.ceil(r.height / TS);
  townCv.width = TW; townCv.height = TH;
  GY = TH - 8;
  DX = Math.round(Math.max(110, r.width * 0.56) / TS); // lines up with the drill string in the borehole below
  POS = {}; let prevEnd = -1;
  for (const b of BLD) {
    let x = Math.round(b.fx * TW);
    if (b.id === 'skills') x = Math.min(x, DX - 14 - b.w);
    if (b.id === 'ore') x = Math.max(x, DX + 14);
    if (b.id === 'yard') x = Math.max(x, POS.ore.x + POS.ore.w + 4);
    x = Math.max(x, prevEnd + 2);
    POS[b.id] = { x, w: b.w, h: b.h }; prevEnd = x + b.w;
    const el = document.querySelector(`[data-bld="${b.id}"]`);
    Object.assign(el.style, { left: x * TS + 'px', top: (GY - b.h) * TS + 'px', width: b.w * TS + 'px', height: (b.h + 2) * TS + 'px' });
  }
  townBg = buildTownBg();
}
function ditherSky(R, w, h, bands, curve) {
  for (let y = 0; y < h; y++) {
    const f = Math.pow(y / h, curve) * (bands.length - 1), i = Math.min(bands.length - 1, Math.floor(f)), fr = f - i;
    R(0, y, w, 1, bands[i]);
    if (i + 1 < bands.length && fr > 0.33) {
      const dense = fr > 0.66;
      if (dense || (y & 1) === 0) for (let x = (y >> (dense ? 0 : 1)) & 1; x < w; x += 2) R(x, y, 1, 1, bands[i + 1]);
    }
  }
}
function discR(R, cx, cy, r, col, clipY) {
  for (let dy = -r; dy <= r; dy++) { if (cy + dy > clipY) break; const hw = Math.round(Math.sqrt(r * r - dy * dy)); R(cx - hw, cy + dy, hw * 2 + 1, 1, col); }
}
function buildTownBg() {
  const o = document.createElement('canvas'); o.width = TW; o.height = TH;
  const R = painter(o.getContext('2d'));
  ditherSky(R, TW, GY, ['k', 'n', 'p', 'r'], 1.5);
  for (let k = 0; k < 46; k++) R(Math.floor(hash(k, 1) * TW), Math.floor(hash(2, k) * GY * 0.55), 1, 1, k % 3 ? 's' : 'w');
  // the swollen sun, low over the ridge
  const sx = Math.round(TW * 0.25), sy = GY - 3, sr = Math.round(TH * 0.42);
  discR(R, sx, sy, sr, 'r', GY); discR(R, sx, sy, sr - 3, 'o', GY); discR(R, sx, sy, Math.round(sr * 0.55), 'y', GY);
  for (let x = 0; x < TW; x++) { const h = Math.round(5 + 9 * smooth(x / 9, 7)); R(x, GY - h, 1, h, 'm'); }
  for (let x = 0; x < TW; x++) { const h = Math.round(2 + 5 * smooth(x / 5, 9)); R(x, GY - h, 1, h, 'k'); }
  R(0, GY, TW, 1, 't'); R(0, GY + 1, TW, TH - GY - 1, '2');
  for (let k = 0; k < TW * 0.6; k++) R(Math.floor(hash(k, 31) * TW), GY + 2 + Math.floor(hash(33, k) * (TH - GY - 2)), 1, 1, k % 2 ? '3' : '1');
  drawClaims(R, POS.prestige.x); drawWorkshop(R, POS.rig.x); drawArchive(R, POS.skills.x); drawAssay(R, POS.ore.x);
  return o;
}
function drawWorkshop(R, x) {
  const g = GY;
  R(x + 1, g - 10, 20, 10, 'r');
  for (let yy = g - 9, j = 0; yy < g; yy += 3, j++) { R(x + 1, yy, 20, 1, 'p'); for (let xx = x + 3 + (j & 1) * 2; xx < x + 21; xx += 4) R(xx, yy + 1, 1, 2, 'p'); }
  R(x, g - 11, 22, 1, 'd'); R(x + 2, g - 12, 18, 1, 'd'); R(x + 4, g - 13, 14, 1, 'd'); R(x + 6, g - 14, 10, 1, 's');
  R(x + 16, g - 17, 3, 5, 'm'); R(x + 15, g - 17, 5, 1, 'd');
  R(x + 9, g - 8, 4, 8, '1'); R(x + 12, g - 4, 1, 1, 'y');
  R(x + 3, g - 7, 4, 3, 'y'); R(x + 3, g - 6, 4, 1, 'o'); R(x + 15, g - 7, 4, 3, 'y'); R(x + 15, g - 6, 4, 1, 'o');
  R(x + 10, g - 10, 2, 1, 'y'); R(x + 9, g - 11, 4, 1, 'y');
}
function drawAssay(R, x) {
  const g = GY;
  R(x + 1, g - 10, 18, 10, '3');
  for (let xx = x + 3; xx < x + 19; xx += 3) R(xx, g - 10, 1, 10, '2');
  R(x, g - 11, 20, 1, '2'); R(x + 3, g - 14, 14, 3, '4'); R(x + 3, g - 15, 14, 1, '2');
  R(x + 9, g - 13, 2, 1, 'y'); R(x + 8, g - 14, 1, 1, '2');
  R(x + 8, g - 6, 4, 6, '1'); R(x + 3, g - 7, 3, 3, 'a'); R(x + 14, g - 7, 3, 3, 'a');
}
function drawArchive(R, x) {
  const g = GY;
  R(x + 2, g - 8, 16, 8, 's');
  for (let yy = g - 6; yy < g; yy += 2) R(x + 2, yy, 16, 1, 'd');
  R(x + 3, g - 8, 2, 8, 'w'); R(x + 15, g - 8, 2, 8, 'w');
  R(x + 1, g - 1, 18, 1, 'd'); R(x + 1, g - 9, 18, 1, 'd');
  [14, 12, 10, 8, 4].forEach((w, i) => R(x + 10 - w / 2, g - 10 - i, w, 1, i === 1 ? 'a' : 'c'));
  R(x + 9, g - 17, 2, 3, 'a'); R(x + 8, g - 6, 4, 6, 'n');
}
function drawClaims(R, x) {
  const g = GY;
  R(x + 1, g - 7, 11, 7, '4');
  [13, 11, 7, 3].forEach((w, i) => R(x + 6.5 - w / 2, g - 8 - i, w, 1, 'o'));
  R(x + 4, g - 5, 3, 5, '2'); R(x + 8, g - 5, 3, 3, 'w'); R(x + 8, g - 4, 2, 1, 'd');
  R(x + 13, g - 18, 1, 18, 's');
}
function drawDerrick(R, t) {
  const h = Math.min(34, GY - 6), top = GY - h;
  R(DX - 1, top, 2, TH - top, 's'); R(DX, top, 1, TH - top, 'w'); // the drill string runs on into the borehole below
  for (let k = 0; k <= h; k++) {
    const hw = Math.round(9 - k * (7 / h)), y = GY - k;
    R(DX - hw, y, 1, 1, 'd'); R(DX + hw, y, 1, 1, 'd');
    if (k && k % 6 === 0) R(DX - hw, y, hw * 2 + 1, 1, 'd');
    if (k % 6 < 5) { const f = (k % 6) / 6, xx = Math.round(DX - hw + f * hw * 2); R(xx, y, 1, 1, 'm'); }
  }
  R(DX - 3, top - 2, 7, 2, 's');
  R(DX - 12, GY - 1, 24, 2, 'm'); for (let x = DX - 12; x < DX + 12; x += 4) R(x, GY - 1, 2, 1, 'y');
  R(DX, top - 4, 1, 2, Math.floor(t * 1.6) % 2 ? 'r' : '2');
}
// ship drawn in local pixel units: put(dx, dy, w, h, colour) relative to the nose tip
function drawShipLocal(put, st, t, flame) {
  const hwAt = r => r < 2 ? 1 : r < 4 ? 2 : r < 6 ? 3 : 4;
  if (st < 2) { // static dashed blueprint outline: no animation, so the shape stays still
    for (let r = 0; r < 26; r += 2) { const hw = hwAt(r); put(-hw, r, 1, 1, 'c'); put(hw - 1, r, 1, 1, 'c'); }
    for (let k = 0; k < 6; k += 2) { put(-5 - (k >> 1), 20 + k, 1, 1, 'c'); put(4 + (k >> 1), 20 + k, 1, 1, 'c'); }
    put(-2, 26, 4, 1, 'c');
    return;
  }
  if (st >= 4) for (const bx of [-6, 4]) {
    put(bx, 13, 2, 12, 'd'); put(bx, 12, 2, 1, 's');
    const pulse = Math.floor(t * 3 + bx) % 2;
    put(bx, 16, 2, 1, pulse ? 'a' : 't'); put(bx, 20, 2, 1, pulse ? 't' : 'a');
  }
  for (let k = 0; k < 6; k++) { const fw = 1 + (k >> 1); put(-4 - fw, 20 + k, fw, 1, 'r'); put(4, 20 + k, fw, 1, 'r'); }
  for (let r = 0; r < 26; r++) { const hw = hwAt(r); put(-hw, r, hw * 2, 1, 's'); put(-hw, r, 1, 1, 'd'); if (hw > 1) put(hw - 2, r, 1, 1, 'w'); }
  put(-2, 26, 4, 2, 'm');
  if (st >= 5) for (let r = 17; r < 26; r++) for (let x = -4; x < 4; x++) put(x, r, 1, 1, ((x + r) & 1) ? 'k' : 'm');
  if (st >= 3) {
    put(-1, 7, 2, 2, 'a'); put(0, -3, 1, 3, 's'); put(0, -4, 1, 1, Math.floor(t * 2) % 2 ? 'o' : 'r');
    for (let x = -4; x < 4; x++) put(x, 14, 1, 1, (x & 1) ? 'y' : 'k');
  }
  if (st >= 5) put(-6, 5, 12, 1, Math.floor(t * 3) % 3 ? 'a' : 'c');
  if (st >= 6) { put(-1, 10, 2, 3, Math.floor(t * 2.6) % 2 ? 'v' : 'p'); if (!flame) put(-2, 28, 4, 1, 'v'); }
  if (flame) {
    const L = 4 + Math.floor(Math.random() * 4) + Math.floor(flame * 10);
    for (let i = 0; i < L; i++) { const w = Math.max(1, 4 - Math.floor(i / 3)); put(-Math.floor(w / 2), 28 + i, w, 1, i < 1 ? 'w' : i < 3 ? 'y' : 'o'); }
  }
}
function drawYard(R, t, now) {
  const P = POS.yard, cx = P.x + 12, by = GY - 2;
  R(P.x + 1, GY - 2, 21, 2, 'd'); for (let x = P.x + 1; x < P.x + 22; x += 3) R(x, GY - 2, 2, 1, 'y');
  const st = S.ship;
  if (launchT && now - launchT >= 4500) finishLaunch();
  const lp = launchT ? Math.min(1.2, (now - launchT) / 4500) : 0;
  if (st >= 1) {
    const gx = P.x + 1;
    R(gx, by - 32, 1, 32, 'o'); R(gx + 3, by - 32, 1, 32, 'o');
    for (let y = by - 32; y < by; y += 3) R(gx + 1, y, 2, 1, 'o');
    if (!lp && !S.launched) R(gx + 4, by - 22, cx - 4 - (gx + 4), 1, 'o');
  }
  if (S.launched && !launchT) {
    const px = Math.floor((t * 7) % (TW + 30)) - 15, py = 6 + Math.round(Math.sin(t * 0.7) * 2);
    R(px, py, 1, 1, 'w'); R(px - 1, py + 1, 1, 1, 'a'); R(px - 2, py + 1, 1, 1, 'c');
    return;
  }
  const lift = lp > 0 ? Math.pow(lp, 2.2) * (TH + 40) : 0, top = by - 30 - lift;
  drawShipLocal((dx, dy, w, h, col) => R(cx + dx, top + dy, w, h, col), st, t, lp);
  if (lp > 0 && lift < 30) for (let k = 0; k < 4; k++) R(cx + (Math.random() - 0.5) * 26, GY - 1 - Math.random() * 4, 2, 1, Math.random() < 0.5 ? 's' : 'd');
}
const carts = [];
$('#sellBtn').addEventListener('click', () => carts.push({ t0: performance.now(), to: 'ore', col: 'y' }));
['#shipBtn', '#shipBtn2'].forEach(id => $(id).addEventListener('click', () => carts.push({ t0: performance.now(), to: 'yard', col: 'a' })));
function renderTown(now) {
  requestAnimationFrame(renderTown);
  if (!townBg || document.hidden) return;
  const t = now / 1000, R = painter(tc);
  tc.drawImage(townBg, 0, 0);
  for (let k = 0; k < 7; k++) if (Math.floor(t * 1.5 + k * 1.7) % 4 === 0) R(Math.floor(hash(k, 51) * TW), Math.floor(hash(52, k) * GY * 0.5), 1, 1, 'w');
  const W0 = POS.rig.x;
  for (let k = 0; k < 5; k++) { const ph = (t * 0.45 + k / 5) % 1; R(W0 + 17 + Math.sin(ph * 6 + k) * 1.5 + ph * 5, GY - 18 - ph * 16, ph < 0.4 ? 2 : 1, 1, ph < 0.6 ? 's' : 'd'); }
  const fx = POS.prestige.x + 14, fr = Math.floor(t * 3) % 2;
  R(fx, GY - 18, 4, 1, 'r'); R(fx, GY - 17, fr ? 5 : 4, 1, 'r'); R(fx, GY - 16, fr ? 4 : 5, 1, 'r');
  if (Math.floor(t * 1.2) % 3 === 0) R(POS.skills.x + 9, GY - 17, 1, 1, 'w');
  drawDerrick(R, t);
  drawYard(R, t, now);
  for (let k = carts.length - 1; k >= 0; k--) {
    const c = carts[k], p = (now - c.t0) / 1600; if (p >= 1) { carts.splice(k, 1); continue; }
    const tx = c.to === 'ore' ? POS.ore.x + 10 : POS.yard.x + 12, x = DX + (tx - DX) * p;
    R(x - 2, GY - 3, 5, 2, 'd'); R(x - 1, GY - 4, 3, 1, c.col); R(x - 2, GY - 1, 1, 1, 'k'); R(x + 2, GY - 1, 1, 1, 'k');
  }
}
new ResizeObserver(layoutTown).observe(townBox);
requestAnimationFrame(renderTown);

/* ---------- start screen and story ---------- */
let hadSave = false;
try { hadSave = !!localStorage.getItem(SAVE_KEY); } catch (e) {}
function sceneCanvas(cv) {
  const c = cv.getContext('2d'), st = { s: 3, w: 1, h: 1, sky: {}, ready: false };
  const fit = () => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    st.s = Math.max(2, Math.round(Math.min(r.width, r.height) / 170));
    st.w = Math.ceil(r.width / st.s); st.h = Math.ceil(r.height / st.s);
    cv.width = st.w; cv.height = st.h; st.sky = {}; st.ready = true;
  };
  new ResizeObserver(fit).observe(cv);
  return { c, st, R: painter(c) };
}
function cachedSky(sc, key, bands, curve, h) {
  if (!sc.st.sky[key]) {
    const o = document.createElement('canvas'); o.width = sc.st.w; o.height = h;
    const R = painter(o.getContext('2d')); ditherSky(R, sc.st.w, h, bands, curve);
    for (let k = 0; k < sc.st.w * 0.35; k++) { const y = Math.floor(hash(k, 61) * h * 0.6); if (y < h * 0.5) R(Math.floor(hash(62, k) * sc.st.w), y, 1, 1, k % 4 ? 's' : 'w'); }
    sc.st.sky[key] = o;
  }
  sc.c.drawImage(sc.st.sky[key], 0, 0);
}
function ridge(R, w, base, amp, seed, col, h) { for (let x = 0; x < w; x++) { const hh = Math.round(amp * smooth(x / 11, seed)); R(x, base - hh, 1, hh + h, col); } }
function sceneSun(sc, t, k) {
  const { w, h } = sc.st, R = sc.R, hz = Math.round(h * 0.68);
  cachedSky(sc, 'sun', ['k', 'p', 'r', 'o'], 1.7, hz);
  const r = Math.round(h * (0.24 + 0.1 * k) + Math.sin(t * 2) * 1);
  discR(R, w >> 1, hz + 4, r + 3, 'r', hz); discR(R, w >> 1, hz + 4, r, 'o', hz); discR(R, w >> 1, hz + 4, Math.round(r * 0.62), 'y', hz);
  for (let i = 0; i < 14; i++) { const ph = (t * 0.3 + i / 14) % 1, x = Math.floor(hash(i, 71) * w); R(x, hz - 4 - ph * h * 0.35, 3 + (i % 3), 1, ph < 0.5 ? 'o' : 'r'); }
  ridge(R, w, hz + 2, 10, 5, 'm', h); ridge(R, w, hz + 8, 6, 8, 'k', h);
  const dx = Math.round(w * 0.7), dt = hz + 8 - 26;
  for (let kk = 0; kk < 22; kk++) { const hw = Math.round(6 - kk * 0.2); R(dx - hw, hz + 6 - kk, 1, 1, 'k'); R(dx + hw, hz + 6 - kk, 1, 1, 'k'); }
  R(dx, dt - 2, 1, 2, Math.floor(t * 1.6) % 2 ? 'r' : 'k');
}
function sceneFleet(sc, t) {
  const { w, h } = sc.st, R = sc.R, hz = Math.round(h * 0.74);
  cachedSky(sc, 'fleet', ['k', 'n', 'm'], 1.3, hz);
  for (let i = 0; i < 6; i++) {
    const sp = 9 + i * 4, x = Math.round(w * (0.12 + i * 0.15)), y = Math.round(hz - 6 - ((t * sp + i * 37) % (hz + 30)));
    for (let tr = 0; tr < 14; tr += 2) R(x, y + 9 + tr, 2, 1, tr < 6 ? 'o' : 'd');
    R(x, y, 2, 6, 'w'); R(x, y - 1, 2, 1, 's'); R(x - 1, y + 4, 1, 2, 's'); R(x + 2, y + 4, 1, 2, 's');
    R(x, y + 6, 2, 2 + Math.floor(Math.random() * 2), 'y');
  }
  ridge(R, w, hz, 7, 12, 'k', h);
  for (let i = 0; i < 5; i++) { const x = Math.round(w * (0.12 + i * 0.18)); R(x - 4, hz + 2, 10, 2, 'd'); }
}
function sceneHull(sc, t, k) {
  const { w, h } = sc.st, R = sc.R, hz = Math.round(h * 0.76);
  cachedSky(sc, 'hull', ['k', 'n', 'p', 'r'], 1.6, hz);
  ridge(R, w, hz, 8, 21, 'm', h); R(0, hz, w, h - hz, 'k');
  const sc2 = Math.max(2, Math.round(h / 70)), cx = w >> 1, top = hz - 30 * sc2 - 2;
  // drafting sheet: a faint grid and corner brackets frame the outline as a technical drawing
  const fx0 = cx - 18 * sc2, fx1 = cx + 18 * sc2, fy0 = top - 6 * sc2, fy1 = hz - 4, step = 3 * sc2;
  for (let x = fx0; x <= fx1; x += step) for (let y = fy0; y <= fy1; y += 2) R(x, y, 1, 1, 'n');
  for (let y = fy0; y <= fy1; y += step) for (let x = fx0; x <= fx1; x += 2) R(x, y, 1, 1, 'n');
  const br = 4 * sc2;
  [[fx0, fy0, 1, 1], [fx1, fy0, -1, 1], [fx0, fy1, 1, -1], [fx1, fy1, -1, -1]].forEach(([x, y, dx, dy]) => {
    R(dx > 0 ? x : x - br + 1, y, br, 1, 'c'); R(x, dy > 0 ? y : y - br + 1, 1, br, 'c');
  });
  R(cx - 14 * sc2, hz - 2, 28 * sc2, 2, 'd');
  for (let x = cx - 14 * sc2; x < cx + 14 * sc2; x += 4) R(x, hz - 2, 2, 1, 'y');
  drawShipLocal((dx, dy, ww, hh, col) => R(cx + dx * sc2, top + dy * sc2, ww * sc2, hh * sc2, col), 0, t, 0);
  const gx = cx - 12 * sc2; for (let y = hz - 32 * sc2; y < hz - 2; y += 3) R(gx, y, 3, 1, 'o');
  R(gx + 1, hz - 33 * sc2, 2, 2, Math.floor(t * 1.6) % 2 ? 'r' : 'k'); // gantry lamp is the only thing that blinks
}
function sceneRig(sc, t, k) {
  const { w, h } = sc.st, R = sc.R, gl = Math.round(h * 0.38);
  cachedSky(sc, 'rig', ['k', 'n', 'p'], 1.2, gl);
  const layers = ['t', '2', '3', 'm', '1', 'p'], lh = Math.ceil((h - gl) / (layers.length - 0.5));
  layers.forEach((col, i) => R(0, gl + i * lh, w, lh, col));
  for (let i = 0; i < w * 0.5; i++) { const x = Math.floor(hash(i, 81) * w), y = gl + 3 + Math.floor(hash(82, i) * (h - gl)); R(x, y, 1, 1, ['y', 'a', 'o', 'w'][i % 4]); }
  const dx = Math.round(w * 0.32), depth = gl + Math.min(h - gl - 6, (h - gl) * Math.min(1, k * 1.3));
  for (let kk = 0; kk < 24; kk++) { const hw = Math.round(7 - kk * 0.22); R(dx - hw, gl - kk, 1, 1, 's'); R(dx + hw, gl - kk, 1, 1, 's'); }
  R(dx, gl - 26, 1, 2, Math.floor(t * 1.6) % 2 ? 'r' : '2');
  R(dx - 1, gl - 24, 2, depth - gl + 24, 's'); R(dx - 2, depth, 4, 2, 'y'); R(dx - 1, depth + 2, 2, 1, 'w');
  for (let i = 0; i < 4; i++) R(dx + (Math.random() - 0.5) * 10, depth + Math.random() * 3, 1, 1, 'y');
  for (let i = 0; i < 70; i++) {
    const sp = 30 + hash(i, 4) * 50, x = Math.floor(((hash(i, 3) * w * 2 - t * sp) % w + w) % w), y = Math.floor(hash(5, i) * gl);
    R(x, y, 2 + (i % 3), 1, i % 3 ? 'o' : '4');
  }
}
function sceneFinal(sc, t, k) {
  const { w, h } = sc.st, R = sc.R, hz = Math.round(h * 0.76);
  cachedSky(sc, 'final', ['k', 'p', 'r', 'o'], 1.7, hz);
  discR(R, Math.round(w * 0.72), hz + 3, Math.round(h * 0.3), 'r', hz); discR(R, Math.round(w * 0.72), hz + 3, Math.round(h * 0.2), 'o', hz);
  ridge(R, w, hz, 8, 33, 'm', h); R(0, hz, w, h - hz, 'k');
  const sc2 = Math.max(2, Math.round(h / 70)), cx = Math.round(w * 0.36), lift = k > 0.55 ? Math.pow((k - 0.55) * 2.2, 2.2) * h : 0, top = hz - 30 * sc2 - 2 - lift;
  R(cx - 14 * sc2, hz - 2, 28 * sc2, 2, 'd');
  drawShipLocal((dx, dy, ww, hh, col) => R(cx + dx * sc2, top + dy * sc2, ww * sc2, hh * sc2, col), 6, t, lift > 0 ? 1 : 0);
}
const STORY = [
  { text: 'Kessra, year 2291. The old sun is swelling, and the surface will not last much longer.', draw: sceneSun },
  { text: 'The evacuation fleet lifted off last winter. Not everyone made it aboard.', draw: sceneFleet },
  { text: 'One hull still stands on the launch pad: the Meridian. Its warp core needs minerals nobody has mined in a century.', draw: sceneHull },
  { text: 'You have a drill rig and a mining permit. Dust storms seal every claim after 25 minutes, so dig fast.', draw: sceneRig },
  { text: 'Dig deep. Ship the ore. Build the Meridian. Get off this rock.', draw: sceneFinal },
];
const titleSc = sceneCanvas($('#titleCv')), introSc = sceneCanvas($('#introCv'));
let titleOn = false, introOn = false, introIdx = 0, introT0 = 0, newArmed = 0;
function titleLoop(now) {
  if (!titleOn) return;
  requestAnimationFrame(titleLoop);
  if (titleSc.st.ready) sceneSun(titleSc, now / 1000, 0.5 + 0.5 * Math.sin(now / 4000));
}
function showTitle() {
  GAME_PAUSED = true;
  const cont = $('#btnContinue');
  cont.hidden = !hadSave;
  $('#btnNew').textContent = hadSave ? 'New game' : 'Start';
  $('#titleSave').textContent = hadSave
    ? `Claim #${S.prestiges + 1} · record ${fmtDepth(S.best)} · Meridian ${S.launched ? 'launched' : `${S.ship} of ${STAGES.length} stages`}`
    : 'The last driller at Deepcore Camp';
  $('#title').hidden = false; titleOn = true;
  requestAnimationFrame(titleLoop);
  (hadSave ? cont : $('#btnNew')).focus();
}
function hideTitle() { titleOn = false; $('#title').hidden = true; }
function resumeGame() { hideTitle(); GAME_PAUSED = false; $('#cv').focus(); }
function newGame() {
  S = DEFAULT(); migrateClaims(); visDepth = 0; T = null;
  $('#cmap').hidden = true;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  $('#toast').hidden = true; closeWin();
  renderLog(); renderBoons(); showDraft(); yardSig = ''; uiTick(true); save();
  hadSave = true;
}
$('#btnContinue').addEventListener('click', resumeGame);
$('#btnNew').addEventListener('click', () => {
  if (hadSave && performance.now() - newArmed > 4000) {
    newArmed = performance.now(); $('#btnNew').textContent = 'Erase save and restart?';
    setTimeout(() => { if (titleOn && hadSave) $('#btnNew').textContent = 'New game'; }, 4000);
    return;
  }
  newArmed = 0; newGame(); hideTitle(); playIntro();
});
function playIntro() {
  introOn = true; introIdx = 0; introT0 = performance.now();
  $('#introDots').innerHTML = STORY.map(() => '<i></i>').join('');
  $('#intro').hidden = false; $('#introSkip').focus();
  requestAnimationFrame(introLoop);
}
function endIntro() {
  introOn = false; $('#intro').hidden = true; GAME_PAUSED = false;
  logEvt('Day one at Deepcore Camp. The Meridian waits on its pad. Tap the rock to start drilling.', 'strata');
  $('#cv').focus();
}
function introLoop(now) {
  if (!introOn) return;
  requestAnimationFrame(introLoop);
  const sc = STORY[introIdx], el = now - introT0, chars = reduceMotion ? sc.text.length : Math.floor(el / 32);
  const typed = Math.min(sc.text.length, chars), done = typed >= sc.text.length;
  const line = $('#introLine'); if (line.textContent.length !== typed) line.textContent = sc.text.slice(0, typed);
  $('#introTap').textContent = introIdx === STORY.length - 1 ? 'Tap to begin' : 'Tap to continue';
  $('#introTap').style.visibility = done ? 'visible' : 'hidden';
  document.querySelectorAll('#introDots i').forEach((d, i) => d.classList.toggle('on', i <= introIdx));
  const dur = sc.text.length * 32 + 3200;
  if (introSc.st.ready) sc.draw(introSc, now / 1000, Math.min(1, el / dur));
  if (el > dur + 1500) advanceIntro();
}
function advanceIntro() {
  const el = performance.now() - introT0, sc = STORY[introIdx];
  if (el < sc.text.length * 32) { introT0 = performance.now() - sc.text.length * 32; return; } // finish typing first
  if (introIdx >= STORY.length - 1) { endIntro(); return; }
  introIdx++; introT0 = performance.now(); $('#introLine').textContent = '';
}
$('#intro').addEventListener('click', e => { if (e.target.id !== 'introSkip') advanceIntro(); });
$('#introSkip').addEventListener('click', endIntro);
document.addEventListener('keydown', e => {
  if (introOn && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); advanceIntro(); }
  else if (introOn && e.key === 'Escape') endIntro();
});
