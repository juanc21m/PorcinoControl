-- =============================================================================
-- Agrocomercial Moreno · Renombrar 'Recién Nacidos' → 'Lechones' + verificación
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor. Idempotente.
-- =============================================================================

-- 1) Renombra la zona en los datos existentes
update public.animals
set etapa_actual = 'Lechones'
where etapa_actual = 'Recién Nacidos';

-- 2) Actualiza la restricción para que acepte 'Lechones'
--    (sin esto, insertar en la zona nueva daría error de CHECK)
alter table public.animals drop constraint if exists animals_etapa_actual_check;
alter table public.animals add constraint animals_etapa_actual_check
  check (etapa_actual in ('Gestación','Maternidad','Lechones','Destete','Ceba'));

-- 3) También en el historial de movilizaciones, para que la bitácora sea legible
update public.transfers set from_zone = 'Lechones' where from_zone = 'Recién Nacidos';
update public.transfers set to_zone   = 'Lechones' where to_zone   = 'Recién Nacidos';

notify pgrst, 'reload schema';

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- (a) DIAGNÓSTICO CLAVE: conteo por zona TAL COMO ESTÁ GUARDADO,
--     mostrando la zona entre corchetes para detectar espacios o tildes raras.
select
  '[' || etapa_actual || ']'        as zona_exacta,
  length(etapa_actual)              as largo,
  count(*)                          as animales,
  count(*) filter (where status = 'Activo') as activos
from public.animals
group by etapa_actual
order by etapa_actual;

-- (b) Destete y Lechones en detalle (esperado: Destete 246 · Lechones 0)
select
  count(*) filter (where etapa_actual = 'Destete')                          as destete_total,
  count(*) filter (where etapa_actual = 'Destete' and status = 'Activo')    as destete_activos,
  count(*) filter (where etapa_actual = 'Destete' and room_number = 1)      as destete_sala1,
  count(*) filter (where etapa_actual = 'Destete' and room_number is null)  as destete_sin_sala,
  count(*) filter (where etapa_actual = 'Lechones')                         as lechones_total,
  count(*) filter (where etapa_actual = 'Recién Nacidos')                   as quedan_con_nombre_viejo
from public.animals;

-- (c) ¿Alguna zona fuera del catálogo? Debe devolver 0 filas.
select etapa_actual, count(*) as animales
from public.animals
where etapa_actual not in ('Gestación','Maternidad','Lechones','Destete','Ceba')
group by etapa_actual;

-- (d) Muestra de Destete (aretes y alimento)
select tag, gender, etapa_actual, room_number, feed_type, status
from public.animals where etapa_actual = 'Destete' order by tag limit 5;

-- (e) Recuento global de control
select
  (select count(*) from public.animals) as filas,
  (select coalesce(sum(coalesce(litter_males,0)+coalesce(litter_females,0)),0)
     from public.animals) as lechones_en_camadas;
