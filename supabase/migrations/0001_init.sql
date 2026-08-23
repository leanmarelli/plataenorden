-- ============================================================
--  Plata en Orden — schema inicial
--  Migración desde el JSON de Vercel Blob a tablas relacionales.
--  Cada tabla lleva user_id (auth.users) y tiene RLS por dueño.
-- ============================================================

-- Necesario para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================
--  ENUMS
-- ============================================================

create type mov_tipo    as enum ('Ingreso', 'Gasto', 'Ahorro');
create type moneda      as enum ('ARS', 'USD');
create type fijo_var    as enum ('Fijo', 'Variable');
create type mov_estado  as enum ('Confirmado', 'Pendiente');
create type theme_pref  as enum ('light', 'dark', 'system');

-- ============================================================
--  TABLA: settings (una fila por usuario)
-- ============================================================

create table public.settings (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  tc_ref    numeric not null default 1450,
  cur_pref  moneda  not null default 'ARS',
  mes       text    not null default to_char(now(), 'YYYY-MM'),
  theme     theme_pref not null default 'system',
  updated_at timestamptz not null default now()
);

-- ============================================================
--  TABLA: movimientos
-- ============================================================

create table public.movimientos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  fecha      date not null,
  tipo       mov_tipo not null,
  cat        text not null,
  descripcion text,
  mon        moneda not null,
  monto      numeric not null check (monto >= 0),
  tc         numeric,
  medio      text,
  fv         fijo_var not null default 'Variable',
  estado     mov_estado not null default 'Confirmado',
  from_fijo  uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index movimientos_user_fecha_idx
  on public.movimientos (user_id, fecha desc);

-- ============================================================
--  TABLA: fijos (gastos recurrentes esperados)
-- ============================================================

create table public.fijos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  concepto   text not null,
  cat        text not null,
  mon        moneda not null,
  monto      numeric not null check (monto >= 0),
  dia        smallint not null check (dia between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fijos_user_idx on public.fijos (user_id);

-- ============================================================
--  TABLA: metas (objetivos de ahorro)
-- ============================================================

create table public.metas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  nombre     text not null,
  mon        moneda not null,
  objetivo   numeric not null check (objetivo > 0),
  ahorrado   numeric not null default 0 check (ahorrado >= 0),
  fecha      date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index metas_user_idx on public.metas (user_id);

-- ============================================================
--  TABLA: viajes (rubros de presupuesto de un viaje)
-- ============================================================

create table public.viajes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  viaje      text not null,
  concepto   text not null,
  mon        moneda not null,
  presupuesto numeric not null check (presupuesto >= 0),
  gastado    numeric not null default 0 check (gastado >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index viajes_user_idx on public.viajes (user_id, viaje);

-- ============================================================
--  TABLA: conversiones (compra/venta de USD)
-- ============================================================

create table public.conversiones (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  fecha      date not null,
  de         moneda not null,
  monto_de   numeric not null check (monto_de > 0),
  a          moneda not null,
  monto_a    numeric not null check (monto_a > 0),
  created_at timestamptz not null default now(),
  check (de <> a)
);

create index conversiones_user_fecha_idx
  on public.conversiones (user_id, fecha desc);

-- ============================================================
--  TRIGGERS: updated_at automático
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger settings_touch     before update on public.settings
  for each row execute function public.set_updated_at();
create trigger movimientos_touch  before update on public.movimientos
  for each row execute function public.set_updated_at();
create trigger fijos_touch        before update on public.fijos
  for each row execute function public.set_updated_at();
create trigger metas_touch        before update on public.metas
  for each row execute function public.set_updated_at();
create trigger viajes_touch       before update on public.viajes
  for each row execute function public.set_updated_at();

-- ============================================================
--  ALTA AUTOMÁTICA de settings al crear usuario
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.settings (user_id) values (new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  RLS
-- ============================================================

alter table public.settings     enable row level security;
alter table public.movimientos  enable row level security;
alter table public.fijos        enable row level security;
alter table public.metas        enable row level security;
alter table public.viajes       enable row level security;
alter table public.conversiones enable row level security;

-- Policies: cada usuario ve/edita sólo sus propias filas
create policy "settings: dueño" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "movimientos: dueño" on public.movimientos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "fijos: dueño" on public.fijos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "metas: dueño" on public.metas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "viajes: dueño" on public.viajes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "conversiones: dueño" on public.conversiones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
