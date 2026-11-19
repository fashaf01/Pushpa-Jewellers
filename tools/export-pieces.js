/* Writes api/seed/website-pieces.json: the shop's pieces (pieces.js and pieces-instagram.js) in the order
   the shop shows them, for the admin's one-click "Bring in the website's pieces" (Settings > Website shop).

     node tools/export-pieces.js

   Run it again after changing pieces.js or pieces-instagram.js, before the pieces are brought into the admin.
   Once they are in the admin, the admin is where pieces are added and changed, and these files are only the
   fallback the shop uses if the backend cannot be reached. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const win = {};
for (const f of ['assets/js/pieces.js', 'assets/js/pieces-instagram.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), { window: win });
}

/* The same order as shop.js: Instagram pieces spread evenly through the others, watches last. */
function mix(own, rest) {
  const total = own.length + rest.length, slots = {}, out = [];
  own.forEach((p, r) => {
    let pos = Math.floor((r + 0.5) * total / own.length);
    while (slots[pos]) pos++;
    slots[pos] = p;
  });
  for (let k = 0, pos = 0; pos < total; pos++) out.push(slots[pos] || rest[k++]);
  return out;
}
const isWatch = (p) => p.cats.includes('watches');
const own = win.PIECES || [];
const ordered = mix(win.PIECES_INSTAGRAM || [], own.filter((p) => !isWatch(p))).concat(own.filter(isWatch));

const KEEP = ['slug', 'name', 'kind', 'cats', 'weight', 'note', 'karat', 'price', 'photos', 'about', 'ig', 'bestseller',
  'brand', 'line', 'specs', 'casio', 'credit'];
const pieces = ordered.map((p, order) => {
  const o = { order };
  for (const k of KEEP) if (p[k] !== undefined && p[k] !== '') o[k] = p[k];
  return o;
});

const slugs = new Set();
for (const p of pieces) {
  if (slugs.has(p.slug)) throw new Error('two pieces share the slug ' + p.slug);
  slugs.add(p.slug);
  for (let i = 1; i <= (p.photos || 1); i++) {
    const f = path.join(root, 'assets/img/shop', p.slug + (i > 1 ? '-' + i : '') + '.webp');
    if (!fs.existsSync(f)) throw new Error('missing photo ' + path.relative(root, f));
  }
}

const out = path.join(root, 'api/seed/website-pieces.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), pieces }, null, 1) + '\n');
console.log(`${path.relative(root, out)}  ${pieces.length} pieces`);
