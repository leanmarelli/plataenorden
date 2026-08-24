-- ============================================================
--  0004 — Emoji de país para viajes
--
--  Se agrega columna opcional pais_emoji a viajes. Todos los rubros
--  del mismo viaje comparten el emoji; la app lo lee del primer
--  rubro que lo tenga cargado.
-- ============================================================

alter table public.viajes
  add column if not exists pais_emoji text;
