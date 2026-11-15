#!/usr/bin/env node
/* Draws the antique ornaments and writes them into the page.

   Everything decorative in the antique layer is computed here rather than
   traced by hand, so a shape can be retuned by changing one number:

     - the cusped (scalloped) arch that frames the category tiles, the bridal
       panels and the workshop niche
     - the beaded lace border around the hero
     - the lotus rosette, the flourish divider and the arcade sketch

   Symbols go into index.html and data-URI custom properties into
   assets/css/antique.css, each between a pair of marker comments.

     node tools/make-ornaments.js
*/
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const n = (v) => +v.toFixed(2);

/* --------------------------------------------------------------------------
   Cusped arch
   The opening is a run of outward-bulging lobes that meet at inward cusps,
   closed by an ogee point. Points are given for the left half as
   [u, v]: u runs from the jamb (0) to the centre line (1), v from the
   springing (0) to the apex (1). The right half is the mirror image.
   -------------------------------------------------------------------------- */
const CUSPS = [[0.07, 0], [0.14, 0.33], [0.29, 0.58], [0.5, 0.74], [0.74, 0.8]];
const OGEE = [[0.9, 0.8], [0.97, 0.88]];

function cusped(x0, x1, ySpring, yApex) {
  const half = (x1 - x0) / 2;
  const rise = ySpring - yApex;
  const L = ([u, v]) => [x0 + u * half, ySpring - v * rise];
  const R = ([u, v]) => [x1 - u * half, ySpring - v * rise];
  const arc = (a, b) => {
    const radius = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.6;
    return `A${n(radius)} ${n(radius)} 0 0 1 ${n(b[0])} ${n(b[1])}`;
  };

  const left = CUSPS.map(L);
  const right = CUSPS.map(R).reverse();
  const out = [`L${n(left[0][0])} ${n(left[0][1])}`];
  for (let i = 1; i < left.length; i++) out.push(arc(left[i - 1], left[i]));

  const [l1, l2] = OGEE.map(L);
  const [r1, r2] = OGEE.map(R);
  const apex = [(x0 + x1) / 2, yApex];
  out.push(`C${n(l1[0])} ${n(l1[1])} ${n(l2[0])} ${n(l2[1])} ${n(apex[0])} ${n(apex[1])}`);
  out.push(`C${n(r2[0])} ${n(r2[1])} ${n(r1[0])} ${n(r1[1])} ${n(right[0][0])} ${n(right[0][1])}`);
  for (let i = 1; i < right.length; i++) out.push(arc(right[i - 1], right[i]));
  return out.join(' ');
}

/* The mask is stretched to whatever box it lands on, so it is drawn on a
   100 x 100 field with the arch taking the top two fifths. */
const archMask =
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>` +
  `<path d='M0 100V38${cusped(0, 100, 38, 1)}L100 38V100Z'/></svg>`;

/* --------------------------------------------------------------------------
   Lace border — a hairline, a row of beads and a row of scallops, cut as a
   nine-slice so it can wrap a box of any size.
   -------------------------------------------------------------------------- */
function lace(colour) {
  const bead = (x, y, r = 2) => `<circle cx='${x}' cy='${y}' r='${r}'/>`;
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60' fill='none' stroke='${colour}'>` +
    `<rect x='1.5' y='1.5' width='57' height='57'/>` +
    `<g fill='${colour}' stroke='none'>` +
    bead(30, 7.5) + bead(30, 52.5) + bead(7.5, 30) + bead(52.5, 30) +
    bead(7.5, 7.5, 2.6) + bead(52.5, 7.5, 2.6) + bead(7.5, 52.5, 2.6) + bead(52.5, 52.5, 2.6) +
    `</g>` +
    `<path d='M20 12.5Q30 21 40 12.5M20 47.5Q30 39 40 47.5M12.5 20Q21 30 12.5 40M47.5 20Q39 30 47.5 40'/>` +
    `<path d='M12.5 20C12.5 15 15 12.5 20 12.5M40 12.5C45 12.5 47.5 15 47.5 20M47.5 40C47.5 45 45 47.5 40 47.5M20 47.5C15 47.5 12.5 45 12.5 40'/>` +
    `</svg>`
  );
}

/* A lattice of overlapping circles, the pattern cut into a jaali screen */
function lattice(colour) {
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44' fill='none' stroke='${colour}' stroke-opacity='.13'>` +
    `<circle cx='22' cy='22' r='22'/><circle cx='0' cy='0' r='22'/><circle cx='44' cy='0' r='22'/>` +
    `<circle cx='0' cy='44' r='22'/><circle cx='44' cy='44' r='22'/></svg>`
  );
}

/* Paper grain and the slow mottling of old stock */
const grain =
  `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>` +
  `<filter id='g' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/>` +
  `<feColorMatrix values='0 0 0 0 .38 0 0 0 0 .26 0 0 0 0 .12 0 0 0 .55 -.2'/></filter>` +
  `<rect width='100%' height='100%' filter='url(#g)'/></svg>`;

const mottle =
  `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900'>` +
  `<filter id='m' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.004 .006' numOctaves='3' seed='11' stitchTiles='stitch'/>` +
  `<feColorMatrix values='0 0 0 0 .52 0 0 0 0 .36 0 0 0 0 .17 0 0 0 .62 -.25'/></filter>` +
  `<rect width='100%' height='100%' filter='url(#m)'/></svg>`;

const dataUri = (svg) =>
  `url("data:image/svg+xml,${svg.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/"/g, '%22')}")`;

/* --------------------------------------------------------------------------
   Lotus rosette — pushpa, the flower in the name
   -------------------------------------------------------------------------- */
function petals(count, r0, r1, width, offset = 0) {
  const mid = (r0 + r1) / 2;
  const d = `M0 ${-r0}C${width} ${n(-(r0 + (mid - r0) * 0.5))} ${width} ${n(-(mid + (r1 - mid) * 0.35))} 0 ${-r1}` +
            `C${-width} ${n(-(mid + (r1 - mid) * 0.35))} ${-width} ${n(-(r0 + (mid - r0) * 0.5))} 0 ${-r0}Z`;
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<path transform='rotate(${n(offset + (360 / count) * i)})' d='${d}'/>`;
  }
  return out;
}

function dots(count, radius, r) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    out += `<circle class='orn-fill' cx='${n(Math.sin(a) * radius)}' cy='${n(-Math.cos(a) * radius)}' r='${r}'/>`;
  }
  return out;
}

const lotus =
  `<symbol id="pj-lotus" viewBox="-50 -50 100 100"><g class="orn-stroke">` +
  petals(12, 19, 46, 8.5) +
  petals(12, 19, 37, 6, 15) +
  `<circle r='18'/><circle r='14.5'/>` +
  petals(8, 4.5, 13.5, 3.6) +
  `<circle r='3.2'/></g>` +
  dots(24, 48.6, 0.7) +
  `</symbol>`;

/* --------------------------------------------------------------------------
   Flourish divider
   -------------------------------------------------------------------------- */
const scroll =
  `<path d='M136 14H50c-10 0-16-5-13-9.5 2.2-3.2 7.5-2 7 1.8M50 14c-10 0-16 5-13 9.5 2.2 3.2 7.5 2 7-1.8M34 14H10'/>` +
  `<path d='M144 10l4 4-4 4-4-4z'/>`;

const flourish =
  `<symbol id="pj-flourish" viewBox="0 0 320 28"><g class="orn-stroke">` +
  scroll +
  `<g transform='translate(320 0) scale(-1 1)'>${scroll}</g>` +
  `<g transform='translate(160 14)'>${petals(8, 3.5, 11.5, 3)}<circle r='2.6'/></g>` +
  `</g><circle class="orn-fill" cx="5" cy="14" r="1.4"/><circle class="orn-fill" cx="315" cy="14" r="1.4"/>` +
  `</symbol>`;

/* --------------------------------------------------------------------------
   Arcade sketch — five cusped bays on slender columns, drawn as an
   elevation in a single line weight.
   -------------------------------------------------------------------------- */
function arcade() {
  const W = 640, bays = 5, col = 9, bay = 104;
  const x0 = (W - (bays * bay + (bays + 1) * col)) / 2;
  const spring = 112, apex = 58, base = 196;
  let s = '';

  /* ground, steps and plinth */
  s += `<path d='M0 218H${W}M${x0 - 34} 211H${W - x0 + 34}M${x0 - 22} 204H${W - x0 + 22}'/>`;
  s += `<path d='M${x0 - 12} 204V${base}H${W - x0 + 12}V204'/>`;

  for (let i = 0; i <= bays; i++) {
    const x = x0 + i * (bay + col);
    /* base, shaft with a necking ring, capital */
    s += `<path d='M${n(x - 4)} ${base}v-7h${col + 8}v7M${n(x - 2)} ${base - 7}v-4h${col + 4}v4'/>`;
    s += `<path d='M${n(x)} ${base - 11}V${spring + 9}M${n(x + col)} ${base - 11}V${spring + 9}M${n(x)} ${spring + 26}h${col}'/>`;
    s += `<path d='M${n(x - 2)} ${spring + 9}h${col + 4}v-4h-${col + 4}zM${n(x - 4)} ${spring + 5}h${col + 8}v-5h-${col + 8}z'/>`;
    if (i < bays) {
      const a = x + col, b = a + bay;
      s += `<path d='M${n(a)} ${spring}${cusped(a, b, spring, apex)}L${n(b)} ${spring}'/>`;
      /* a second line just inside gives the arch its depth */
      s += `<path d='M${n(a + 6)} ${spring}${cusped(a + 6, b - 6, spring, apex + 9)}L${n(b - 6)} ${spring}'/>`;
      /* a small roundel in each spandrel */
      s += `<circle cx='${n(a + 13)}' cy='${apex + 3}' r='4.5'/><circle cx='${n(b - 13)}' cy='${apex + 3}' r='4.5'/>`;
    }
  }

  /* entablature, dentils, parapet */
  const l = x0 - 10, r = W - x0 + 10;
  s += `<path d='M${l} 48H${r}M${l} 42H${r}M${l - 6} 34H${r + 6}M${l - 6} 30H${r + 6}'/>`;
  let dent = '';
  for (let x = l + 4; x < r - 2; x += 9) dent += `M${n(x)} 42v-5h4v5`;
  s += `<path d='${dent}'/>`;
  let bal = '';
  for (let x = l + 6; x < r - 2; x += 11) bal += `M${n(x)} 30V18`;
  s += `<path d='${bal}M${l} 18H${r}M${l} 14H${r}'/>`;

  /* urn finials above each column */
  for (let i = 0; i <= bays; i++) {
    const cx = x0 + i * (bay + col) + col / 2;
    s += `<path d='M${n(cx - 4)} 14c-3-4-2-8 4-9 6 1 7 5 4 9M${n(cx)} 5V1'/>`;
  }
  return `<symbol id="pj-arcade" viewBox="0 0 ${W} 220"><g class="orn-stroke">${s}</g></symbol>`;
}

/* --------------------------------------------------------------------------
   Write between the markers
   -------------------------------------------------------------------------- */
function splice(file, open, close, body) {
  const full = path.join(root, file);
  const src = fs.readFileSync(full, 'utf8');
  const a = src.indexOf(open);
  const b = src.indexOf(close);
  if (a < 0 || b < 0) throw new Error(`${file}: markers not found (${open})`);
  fs.writeFileSync(full, src.slice(0, a + open.length) + '\n' + body + '\n' + src.slice(b));
  console.log(`${file}  ${(body.length / 1024).toFixed(1)} KB of ornaments`);
}

splice(
  'index.html',
  '<!-- ornaments:start (generated by tools/make-ornaments.js) -->',
  '<!-- ornaments:end -->',
  ['  ' + lotus, '  ' + flourish, '  ' + arcade()].join('\n')
);

splice(
  'assets/css/antique.css',
  '/* ornaments:start (generated by tools/make-ornaments.js) */',
  '/* ornaments:end */',
  [
    ':root {',
    `  --arch: ${dataUri(archMask)};`,
    `  --lace: ${dataUri(lace('#A8813C'))};`,
    `  --lace-pale: ${dataUri(lace('#EBDDB9'))};`,
    `  --lattice: ${dataUri(lattice('#E4D3AC'))};`,
    `  --grain: ${dataUri(grain)};`,
    `  --mottle: ${dataUri(mottle)};`,
    '}'
  ].join('\n')
);
