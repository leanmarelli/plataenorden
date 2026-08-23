import { put, list } from '@vercel/blob';
import { createHash } from 'node:crypto';

// Secreto del servidor (no se envía al cliente) mezclado con la clave del usuario
// para que la ubicación de sus datos no sea adivinable.
const PEPPER = process.env.APP_PEPPER || 'plata-en-orden-pepper-fixed-7c1f9a';

function keyFor(clave) {
  return 'datos/u_' + createHash('sha256').update(PEPPER + '::' + clave).digest('hex') + '.json';
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const clave = (req.headers['x-clave'] || '').toString().trim();
  if (clave.length < 4) { res.status(401).json({ error: 'clave_invalida' }); return; }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({ error: 'sync_no_configurado' });
    return;
  }

  const key = keyFor(clave);
  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: key, limit: 1 });
      if (!blobs.length) { res.status(200).json({ ok: true, data: null }); return; }
      const r = await fetch(blobs[0].url + '?ts=' + Date.now(), { cache: 'no-store' });
      const data = await r.json();
      res.status(200).json({ ok: true, data });
      return;
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
      if (!body || typeof body !== 'object') { res.status(400).json({ error: 'cuerpo_invalido' }); return; }
      body._savedAt = new Date().toISOString();
      await put(key, JSON.stringify(body), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 0,
      });
      res.status(200).json({ ok: true, savedAt: body._savedAt });
      return;
    }
    res.status(405).json({ error: 'metodo_no_permitido' });
  } catch (err) {
    res.status(500).json({ error: 'error_servidor', detail: String(err) });
  }
}
