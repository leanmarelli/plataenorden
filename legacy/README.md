# Legacy (versión anterior)

Este directorio contiene la versión anterior de Plata en Orden, antes de la
migración a Next.js + Supabase. Se mantiene acá temporalmente como referencia
mientras se portan las pantallas, y se elimina una vez que la nueva versión
esté completa y validada.

- `index.html`: la app anterior, un solo archivo con HTML/CSS/JS.
- `api/data.js`: función serverless que guardaba el JSON en Vercel Blob.
- `package.json.old`: dependencia @vercel/blob (ya no se usa).
- `README.md` (este archivo, arriba): las instrucciones originales.

## Instrucciones originales

Ver el commit `d901427` para las instrucciones del deploy anterior con
Vercel Blob y clave por hash. El nuevo flujo usa Supabase y está documentado
en el `README.md` de la raíz.
