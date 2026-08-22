/* Inlines the stylesheet and script into one self-contained page.
   Artifact hosting serves a single file, so external assets never load. */
const fs = require('fs');
const path = require('path');

const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/js/main.js'), 'utf8');
const favicon = fs.readFileSync(path.join(root, 'assets/img/favicon.svg'), 'utf8');

html = html
  .replace('<link rel="stylesheet" href="assets/css/styles.css">', `<style>\n${css}\n</style>`)
  .replace('<script src="assets/js/main.js" defer></script>', `<script>\n${js}\n</script>`)
  .replace('<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">',
           `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}">`);

/* The site keeps its long, search-friendly title; the hosted preview is
   named for a gallery, where a short noun phrase reads better. */
html = html.replace(
  /<title>[\s\S]*?<\/title>/,
  '<title>Pushpa Jewellers</title>'
);

const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'pushpa-jewellers.html'), html);

for (const [label, marker] of [['stylesheet', 'assets/css/'], ['script', 'assets/js/'], ['favicon', 'assets/img/']]) {
  if (html.includes(marker)) throw new Error(`${label} was not inlined — ${marker} still referenced`);
}
console.log(`dist/pushpa-jewellers.html  ${(html.length / 1024).toFixed(0)} KB — fully self-contained`);
