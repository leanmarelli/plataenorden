-- ============================================================
--  0003 — Viajes sólo con concepto y gastado
--
--  Se saca el campo `presupuesto` de viajes. La app ahora sólo
--  lleva registro de lo gastado por rubro dentro de cada viaje.
-- ============================================================

alter table public.viajes
  drop column if exists presupuesto;
