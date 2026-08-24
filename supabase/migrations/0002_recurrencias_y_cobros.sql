-- ============================================================
--  0002 — Recurrencias y cobros parciales
--
--  · Fijos ahora pueden ser Ingreso o Ahorro además de Gasto.
--    Se agrega columna `tipo mov_tipo not null default 'Gasto'`.
--
--  · Movimientos pendientes se pueden marcar como cobrados
--    total o parcialmente. Para el cobro parcial se crea un
--    nuevo movimiento Confirmado con el monto cobrado y se
--    reduce el original al monto pendiente. No hace falta
--    schema nuevo — usamos las mismas columnas + `from_fijo`
--    ya existente. Agregamos comentarios documentando esto.
-- ============================================================

alter table public.fijos
  add column if not exists tipo mov_tipo not null default 'Gasto';

comment on column public.fijos.tipo is
  'Tipo del ítem recurrente: Gasto, Ingreso o Ahorro.';

comment on column public.movimientos.from_fijo is
  'Si el movimiento fue generado desde un Fijo, referencia su id (sin FK para permitir borrar el fijo sin perder el movimiento).';
