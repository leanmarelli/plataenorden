-- ============================================================
--  0005 — Cuotas en fijos
--
--  Se agregan dos columnas opcionales a fijos para modelar planes
--  de cuotas (típicamente compras con tarjeta de crédito):
--
--    · cuotas_totales: cuántas cuotas tiene el plan en total.
--      Si es null, es un fijo tradicional (siempre activo).
--    · cuotas_pagas:   cuántas cuotas ya fueron materializadas.
--      Al alcanzar cuotas_totales, el plan queda completado.
--
--  El KPI 'Comprometido en fijos' del Resumen sumará los fijos
--  tradicionales + una cuota mensual de cada plan que aún no
--  esté completado.
-- ============================================================

alter table public.fijos
  add column if not exists cuotas_totales integer
    check (cuotas_totales is null or cuotas_totales > 0),
  add column if not exists cuotas_pagas integer not null default 0
    check (cuotas_pagas >= 0);

comment on column public.fijos.cuotas_totales is
  'Si el fijo es un plan de cuotas (tarjeta), número total de cuotas. NULL para fijos indefinidos.';
comment on column public.fijos.cuotas_pagas is
  'Cuotas ya materializadas como movimiento. Cuando iguala cuotas_totales el plan se completa.';
