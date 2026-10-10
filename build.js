/* Inlines the stylesheet, script, favicon and every image into one self-contained page,
   for hosting that serves a single file. */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (p, enc) => fs.readFileSync(path.join(root, p), enc);
const TYPES = { '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const dataUri = p => `data:${TYPES[path.extname(p)]};base64,${read(p).toString('base64')}`;

let html = read('index.html', 'utf8');
const css = read('assets/css/styles.css', 'utf8');
const js = read('assets/js/main.js', 'utf8');

html = html
  .replace('<link rel="stylesheet" href="assets/css/styles.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script src="assets/js/main.js" defer></script>', () => `<script>\nwindow.addEventListener('DOMContentLoaded', function () {\n${js}\n});\n</script>`)
  .replace('href="assets/img/favicon.svg"', () => `href="${dataUri('assets/img/favicon.svg')}"`)
  .replace(/src="(assets\/img\/[^"]+)"/g, (_, p) => `src="${dataUri(p)}"`);

/* The site keeps its search-friendly title; the hosted preview is
   named for a gallery, where a short noun phrase reads better. */
html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>Pushpa Jewellers</title>');

const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'pushpa-jewellers.html'), html);

/* Check for real attribute references only. */
const left = html.match(/(?:href|src)=["']assets\/[^"']+/g);
if (left) throw new Error(`not inlined: ${left.join(', ')}`);
console.log(`dist/pushpa-jewellers.html  ${(html.length / 1024).toFixed(0)} KB, fully self-contained`);
