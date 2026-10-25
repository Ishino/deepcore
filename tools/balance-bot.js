// Balance bot: plays the real game code headlessly like an active player (hammers at a safe rate,
// digs every treasure, drafts cards, ships ore, buys upgrades, surveys and skills) and prints
// one line per claim. Use it to check pacing after a balance change.
// usage: node tools/balance-bot.js [claims=14] [game.html=src/game.html]
const fs = require('fs'), path = require('path');
const P = () => new Proxy(function () {}, { get: (t, k) => k === 'getBoundingClientRect' ? () => ({ width: 800, height: 600, left: 0, top: 0 }) : k === Symbol.toPrimitive ? () => '' : k === 'measureText' ? () => ({ width: 50 }) : P(), set: () => true, apply: () => P() });
global.document = P(); global.window = globalThis; global.matchMedia = () => ({ matches: false });
global.ResizeObserver = class { observe() {} }; global.requestAnimationFrame = () => {}; global.addEventListener = () => {};
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; global.setInterval = () => {};
const CLAIMS_N = +process.argv[2] || 14;
const html = fs.readFileSync(process.argv[3] || path.join(__dirname, '..', 'src', 'game.html'), 'utf8');
let src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
src = src.replace(/\}\)\(\);\s*$/, `
uiTick = () => {}; renderLog = () => {}; renderBoons = () => {}; showDraft = () => {}; save = () => {}; yardUi = () => {}; renderClaimMap = () => {}; openClaimMap = () => {}; drawClaimMap = () => {};
const PRIORITY = ['philo','pistons','smelter','resonant','molten','charge','teeth','broker','seam','heavypick','magnet','fuse','overclock','wildcat','shift','buyer','lucky','pockets','exchanger','water','splinter'];
const BUY = ['bit','motor','refinery','scanner','tools','hopper'];
S = DEFAULT(); migrateClaims();
let peak = 0, earned0 = 0, t = 0, last = 0, rows = [], maxF = 0, bought = [];
const nextClaim = () => CLAIMS.find(c => !S.claimsOwned[c.id]);
while (S.prestiges < ${CLAIMS_N} && t < 400000) {
  t++;
  tick(1, false);
  floaters.length = 0; debris.length = 0;
  if (!S.choosing) {
    hammer(); hammer();
    if (T && toolTier(S.up.tools) >= T.def.tier) for (let k = 0; k < 5 && T; k++) strike();
    while (S.drafts.length) { const o = S.drafts[0].options; let best = 0; o.forEach((id, k) => { if (PRIORITY.indexOf(id) < PRIORITY.indexOf(o[best])) best = k; }); pickCard(best); }
    if (S.blocked && S.charges) detonate();
    if (t % 5 === 0 && shippable() >= 1) shipOre();
    if (hopperTotal() >= cap() * 0.9) sellFraction(1);
    const nx = nextClaim(), atFloor = formIndex(S.depth) >= curClaim().floor + 0.6;
    if (nx && S.credits >= nx.cost) { buyClaim(nx.id); bought.push(nx.id + '@' + (S.prestiges + 1)); }
    const saving = nx && atFloor; // past the vein floor, upgrades barely help: save for the next survey
    if (!saving) for (let n = 0; n < 60; n++) {
      let pick = null, pc = Infinity;
      for (const id of BUY) { const u = UPGS.find(x => x.id === id); if (u.max && S.up[id] >= u.max) continue; let c = costOf(u, S.up[id]); if (id === 'bit' && S.blocked) c /= 50; if (id === 'tools' && S.up.tools >= 4 * (Math.min(5, Math.floor(formIndex(S.depth) / 2)) + 1)) continue; if (c < pc) { pc = c; pick = u; } }
      const real = costOf(pick, S.up[pick.id]); if (real > S.credits) break; S.credits -= real; S.up[pick.id]++;
    }
    if (yardReady() && !S.launched && S.ship < STAGES.length) buildNext();
    maxF = Math.max(maxF, formIndex(S.depth)); peak = Math.max(peak, S.credits);
  }
  if (S.choosing) {
    sellFraction(1);
    const nx = nextClaim(); if (nx && S.credits >= nx.cost) { buyClaim(nx.id); bought.push(nx.id + '@' + S.prestiges + 's'); }
    for (let k = 0; k < 40; k++) { const av = SKILLS.filter(s => skillOpen(s) && S.shards >= skillCost(s)).sort((a, b) => skillCost(a) - skillCost(b)); if (!av.length) break; buySkill(av[0]); }
    rows.push('t ' + (t / 3600).toFixed(1) + 'h claim ' + String(S.prestiges).padStart(2) + ' | maxF ' + maxF.toFixed(1).padStart(5) + ' (' + fmtDepth(depthAtIndex(maxF)) + ') | ' + curClaim().id.padEnd(7) + ' | shards ' + S.totalShards + ' | skills ' + Object.keys(S.skills).length + ' | ship ' + S.ship + ' | earned ' + fmt(S.lifetime - earned0) + ' peak ' + fmt(peak)); earned0 = S.lifetime; peak = 0;
    stakeClaim(CLAIMS.filter(c => S.claimsOwned[c.id]).pop().id);
    maxF = 0;
  }
}
console.log(rows.join(String.fromCharCode(10)));
console.log('surveys', bought.join(' '));
console.log('hours of play', (t / 3600).toFixed(1), 'launch-ready', S.ship >= STAGES.length);
})();`);
eval(src);
