# Plata en Orden — finanzas personales (ARS/USD)

App de una sola página + backend serverless con sync en la nube y acceso por clave.

## Archivos
- `index.html` — la app completa (frontend, sin build).
- `api/data.js` — función serverless (guarda/lee tus datos en Vercel Blob).
- `package.json` — dependencia @vercel/blob.

## Subirlo a tu GitHub (para editarlo vos)
1. Creá un repo nuevo en https://github.com/new  (ej: `plata-en-orden`).
2. En tu compu, dentro de esta carpeta:
   ```
   git init
   git add .
   git commit -m "Plata en Orden"
   git branch -M main
   git remote add origin https://github.com/leanmarelli/plata-en-orden.git
   git push -u origin main
   ```

## Conectarlo a Vercel (deploy + link fijo, gratis)
1. Entrá a https://vercel.com/new  → importá el repo `plata-en-orden`.
2. Deploy. Te queda una URL fija tipo `https://plata-en-orden.vercel.app`.
3. Cada `git push` se publica solo. Editás en GitHub o local, y listo.

## Activar el sync entre dispositivos (1 min, una vez)
1. En el proyecto de Vercel → pestaña **Storage** → **Create Database → Blob** → **Connect**.
   (Vercel agrega solo la variable BLOB_READ_WRITE_TOKEN.)
2. Redeploy. Entrás con tu clave y ya sincroniza entre celu y compu.

## Acceso
Entrás con una clave (mín. 4 caracteres). Esa clave crea/abre tu espacio. Usá siempre la misma. No hay recuperación: anotala.
