// Builds the GitHub Pages site from src/:
//   index.html   - 8-Bit edition (src/pixel/shell.html + src/pixel/camp.js + the game script)
//   classic.html - Classic edition (src/game.html)
// usage: node tools/build.js
const fs = require('fs'), path = require('path');
const pixelize = require('./pixelize');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const game = read('src/game.html');
const pixel = pixelize(game, read('src/pixel/shell.html'), read('src/pixel/camp.js'));

// 8×8 pixel pickaxe favicon
const ICON = ['.yyyyy..', 'yk...ss.', '....sk..', '...3....', '..3.....', '.3......', '3.......', '........'];
const COL = { y: '#ffcd75', k: '#1a1c2c', s: '#94b0c2', 3: '#8a5a3c' };
const favicon = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${
  ICON.map((row, y) => [...row].map((ch, x) => ch === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${COL[ch]}"/>`).join('')).join('')}</svg>`);

const DESCRIPTION = 'Deepcore: an incremental drilling game. Dig through the rock of a dying planet for rare minerals, excavate treasure, and build the Meridian to escape.';

function page(fragment, { other, otherLabel, themeColor, extraHead = '' }) {
  const cut = fragment.indexOf('</style>') + '</style>'.length;
  const head = fragment.slice(0, cut);
  let body = fragment.slice(cut);
  const linked = body.replace(/(<button class="btn danger" id="wipeBtn"[^>]*>Wipe save<\/button>)/,
    `$1\n          <p class="edition-link">Also available: <a href="${other}">${otherLabel}</a>.</p>`);
  if (linked === body) throw new Error('edition link anchor not found');
  body = linked;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${DESCRIPTION}">
<meta name="theme-color" content="${themeColor}">
<link rel="icon" href="${favicon}">
<style>[hidden]{display:none!important}html{-webkit-text-size-adjust:100%}body{margin:0}img{max-width:100%}.edition-link a{color:inherit}${extraHead}</style>
${head.trim()}
</head>
<body>
${body.trim()}
</body>
</html>
`;
}

const out = {
  'index.html': page(pixel, { other: 'classic.html', otherLabel: 'the Classic edition', themeColor: '#1a1c2c' }),
  'classic.html': page(game, { other: './', otherLabel: 'the 8-Bit edition', themeColor: '#15161a',
    extraHead: ':root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' }),
};
for (const [name, html] of Object.entries(out)) {
  fs.writeFileSync(path.join(root, name), html);
  console.log(`built ${name} (${(html.length / 1024).toFixed(0)} KB)`);
}
