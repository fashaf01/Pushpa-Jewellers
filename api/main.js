/* Vercel function: every /api/* request lands here (see vercel.json). */
const { put } = require('@vercel/blob');
const db = require('../server/db');
const createApp = require('../server/app');

const handle = createApp({
  db,
  ownerEmail: process.env.OWNER_EMAIL,
  blob: process.env.BLOB_READ_WRITE_TOKEN
    ? { async put(name, data, type) { return (await put(name, data, { access: 'public', contentType: type, addRandomSuffix: true })).url; } }
    : null
});

function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return Promise.resolve(Buffer.alloc(0));
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = url.searchParams.get('__path');
  if (path == null) path = url.pathname.replace(/^\/api\/?/, '').replace(/^main\/?$/, '');
  url.searchParams.delete('__path');

  let raw = await readBody(req);
  if (!raw.length && req.body) raw = Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

  const out = await handle({
    method: req.method,
    path,
    query: Object.fromEntries(url.searchParams),
    headers: req.headers,
    raw,
    contentType: req.headers['content-type'] || ''
  });
  res.statusCode = out.status;
  res.setHeader('Cache-Control', 'no-store');
  if (out.status === 204) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(out.body));
};
