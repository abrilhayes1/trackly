// El servidor de punta a punta, sin base de datos: encabezados, límite de pedidos y validación de la sesión.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const express = require('express');

// un "Supabase" falso que publica la clave pública con la que firmamos los tokens de prueba
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'clave-prueba', alg: 'ES256', use: 'sig' };
let pedidosJwks = 0;
const supabaseFalso = http.createServer((req, res) => {
  if (req.url.includes('jwks')) {
    pedidosJwks++;
    return res.end(JSON.stringify({ keys: [jwk] }));
  }
  res.statusCode = 401;
  res.end('{}');
});

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function firmar(payload, clave = privateKey) {
  const cabecera = b64({ alg: 'ES256', typ: 'JWT', kid: 'clave-prueba' });
  const cuerpo = b64(payload);
  const firma = crypto
    .sign('sha256', Buffer.from(`${cabecera}.${cuerpo}`), { key: clave, dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return `${cabecera}.${cuerpo}.${firma}`;
}
const ahora = () => Math.floor(Date.now() / 1000);

let base;
let servidor;
test.before(async () => {
  await new Promise((listo) => supabaseFalso.listen(0, listo));
  process.env.SUPABASE_URL = `http://127.0.0.1:${supabaseFalso.address().port}`;
  process.env.SUPABASE_ANON_KEY = 'anon';
  const { requireAuth } = require('../src/middleware/auth');

  // la app real, más una ruta de prueba protegida que devuelve el usuario del token
  const app = require('../src/app');
  const prueba = express();
  prueba.disable('x-powered-by');
  prueba.get('/protegida', requireAuth, (req, res) => res.json({ id: req.user.id }));
  prueba.use(app);
  servidor = prueba.listen(0);
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => {
  servidor.close();
  supabaseFalso.close();
});

test('responde con encabezados de seguridad y sin decir que es Express', async () => {
  const r = await fetch(`${base}/api/health`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('sin token, una ruta de la API responde 401', async () => {
  const r = await fetch(`${base}/api/leads`);
  assert.equal(r.status, 401);
});

test('un token firmado por el proyecto pasa; vencido, falso o anónimo no', async () => {
  const pedir = (token) => fetch(`${base}/protegida`, { headers: { Authorization: `Bearer ${token}` } });

  const ok = await pedir(firmar({ sub: 'u1', role: 'authenticated', exp: ahora() + 3600 }));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { id: 'u1' });
  await pedir(firmar({ sub: 'u1', role: 'authenticated', exp: ahora() + 3600 }));
  assert.equal(pedidosJwks, 1, 'la clave pública se descarga una sola vez');

  assert.equal((await pedir(firmar({ sub: 'u1', role: 'authenticated', exp: ahora() - 10 }))).status, 401);
  const otraClave = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;
  assert.equal((await pedir(firmar({ sub: 'u1', role: 'authenticated', exp: ahora() + 3600 }, otraClave))).status, 401);
  assert.equal((await pedir(firmar({ role: 'anon', exp: ahora() + 3600 }))).status, 401);
  assert.equal((await pedir('cualquier-cosa')).status, 401);
});

test('el límite de pedidos responde 429 y dice cuándo volver a intentar', async () => {
  const { limitarPedidos } = require('../src/middleware/seguridad');
  const app = express();
  app.use(limitarPedidos({ maximo: 3 }));
  app.get('/', (req, res) => res.json({ ok: true }));
  const s = app.listen(0);
  const url = `http://127.0.0.1:${s.address().port}/`;
  for (let i = 0; i < 3; i++) assert.equal((await fetch(url)).status, 200);
  const cuarto = await fetch(url);
  assert.equal(cuarto.status, 429);
  assert.ok(Number(cuarto.headers.get('retry-after')) > 0);
  s.close();
});
