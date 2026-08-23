# Plata en Orden

Finanzas personales en pesos y dólares — gastos, ahorro, viajes, metas y
conversiones, con sync entre celular y desktop.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 ·
Supabase (auth + Postgres + RLS) · deploy en Vercel.

---

## Puesta en marcha

Antes del primer deploy hay tres cosas manuales que hacer una sola vez:

1. Crear el proyecto en Supabase.
2. Correr la migración SQL.
3. Pegar dos variables en Vercel.

Todos los pasos abajo, con enlaces.

### 1. Crear proyecto Supabase

1. Entrá a <https://supabase.com/dashboard> y creá un proyecto nuevo (free
   tier alcanza y sobra).
2. Anotá **Project URL** y **anon public key**, están en
   *Project Settings → API*.

### 2. Correr la migración SQL

En el dashboard de Supabase, ir a **SQL Editor → New query**, copiar y
pegar todo el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
y correr. Eso crea las tablas (`settings`, `movimientos`, `fijos`, `metas`,
`viajes`, `conversiones`), los enums, los triggers y las policies de RLS.

Al terminar deberías ver 6 tablas en **Database → Tables** y RLS habilitado
en todas.

### 3. Habilitar los proveedores de auth

En **Authentication → Providers**:

- **Email**: dejarlo habilitado. Si querés que sea instantáneo (sin
  verificación por mail), desactivá "Confirm email".
- **Google**: activarlo. Necesitás un OAuth Client ID/Secret de Google
  Cloud (Guía oficial: <https://supabase.com/docs/guides/auth/social-login/auth-google>).
  En "Authorized redirect URIs" de Google Cloud, agregar la URL que Supabase
  te muestra (algo tipo `https://<proyecto>.supabase.co/auth/v1/callback`).

En **Authentication → URL Configuration**:

- **Site URL**: la URL de tu deploy en Vercel (ej.
  `https://plata-en-orden.vercel.app`).
- **Redirect URLs**: agregar `http://localhost:3000/auth/callback` y
  `https://plata-en-orden.vercel.app/auth/callback`.

### 4. Variables de entorno

Crear un archivo `.env.local` (para correr en tu máquina):

```
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```

Y las mismas dos variables en **Vercel → Settings → Environment Variables**
(Production, Preview y Development).

### 5. Deploy

- **Local:** `npm install` → `npm run dev` → <http://localhost:3000>.
- **Vercel:** cada `git push` a `main` publica solo. No hay que tocar
  build settings, Vercel detecta Next.js.

---

## Estructura del código

```
app/
├── layout.tsx              shell HTML + fuentes
├── page.tsx                redirect a /resumen o /login
├── login/                  form de auth (email + Google)
├── auth/
│   ├── callback/           OAuth callback
│   └── signout/            POST cierra sesión
└── (app)/                  rutas protegidas (grupo con auth check)
    ├── layout.tsx          shell con header + tabs + settings
    ├── resumen/            KPIs, categorías, fijos vs variables, trend, metas
    ├── movimientos/        CRUD de movimientos con filtros
    ├── fijos/              CRUD de gastos recurrentes
    ├── metas/              objetivos de ahorro con progreso
    ├── viajes/             presupuesto vs gastado por viaje/rubro
    └── conversiones/       compra/venta de USD

components/
├── app-shell.tsx           header (mes/tc/moneda/tema/logout) + tabs
├── settings-context.tsx    context con los settings del usuario
├── modal.tsx               modal genérico
└── page-header.tsx         título + subtítulo + acción

lib/
├── supabase/
│   ├── client.ts           cliente browser
│   ├── server.ts           cliente server (con cookies)
│   └── middleware.ts       helper para refrescar sesión
├── calc.ts                 helpers de cálculo (arsOf, usdOf, sumBy…)
├── format.ts               formatters de plata y porcentajes
└── constants.ts            listas de categorías y medios de pago

middleware.ts               Next middleware — redirige según sesión
supabase/migrations/        SQL versionado del schema
types/database.ts           tipos del schema (equivalente a lo que emite la CLI)
legacy/                     versión anterior (index.html + api/data.js) — se saca cuando esté todo probado
```

---

## Modelo de sync

- Cada usuario tiene una fila por tabla, aislada por RLS (`auth.uid() = user_id`).
- El cliente browser habla directo con Supabase (con la anon key + cookie
  de sesión). No hay una capa de API custom en el medio.
- Cada cambio es una query específica (insert/update/delete de una fila),
  no un "guardá todo el JSON". Eso arregla el problema de "last write wins"
  que tenía la versión anterior: si editás en el celu y en la compu, los
  cambios no se pisan mutuamente mientras toquen filas distintas.
- Los `settings` del usuario (tc de referencia, moneda preferida, mes
  activo, tema) también viven en Supabase, así el toggle en el celu se ve
  reflejado en la próxima recarga en la compu.

---

## Scripts

```
npm run dev        # local en :3000
npm run build      # build de producción
npm run start      # servir el build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

---

## Migración desde la versión anterior

La versión antigua guardaba todo en Vercel Blob detrás de una clave
hasheada. Esos datos siguen ahí — no fueron tocados. Si querés
importarlos alguna vez:

1. Levantá el Blob con las credenciales viejas (`BLOB_READ_WRITE_TOKEN`).
2. Bajate el JSON de tu clave.
3. Podés escribir un script one-shot que use el cliente admin de Supabase
   (service role key) para insertar cada movimiento/fijo/meta/etc. como
   filas asociadas a tu `auth.users.id`.

El directorio `legacy/` mantiene el `index.html` original y el `api/data.js`
por si necesitás consultarlos. Una vez que verifiques que la nueva versión
te sirve, se puede borrar entero.

---

## Roadmap corto (próximas iteraciones)

Ideas ya cocinadas para retomar cuando quieras:

- **Realtime** (Supabase Realtime): ver cambios de otro dispositivo en
  vivo, sin recargar.
- **Vinculación fijo → movimiento**: cuando marcás un mes como pagado,
  auto-crear el movimiento a partir del fijo (columna `from_fijo` ya
  reservada en el schema).
- **Export CSV** de movimientos por mes.
- **PWA**: manifest + service worker para instalar como app en el celu.
- **Presupuesto por categoría**: cuánto planeaste gastar vs cuánto llevás
  gastado este mes.
