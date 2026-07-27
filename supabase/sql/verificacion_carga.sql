-- =============================================================================
-- Agrocomercial Moreno · VERIFICACIÓN de la carga inicial (914 cabezas)
-- Ejecutar en Supabase → SQL Editor. Devuelve UNA tabla con veredicto por fila.
-- Nombres de etapa usados: 'Gestación', 'Maternidad', 'Destete', 'Ceba'
-- =============================================================================
with a as (select * from public.animals),
lech as (
  select coalesce(sum(coalesce(litter_males,0) + coalesce(litter_females,0)),0)::int as n
  from a where etapa_actual = 'Maternidad'
),
chk as (
  select  1 as ord, 'Filas en la tabla'              as concepto, 778 as esperado, (select count(*) from a)::int as real
  union all select  2, 'CABEZAS totales (filas+lechones)', 914, ((select count(*) from a) + (select n from lech))::int
  union all select  3, 'Zona Gestación',                    88, (select count(*) from a where etapa_actual='Gestación')::int
  union all select  4, 'Zona Maternidad',                   23, (select count(*) from a where etapa_actual='Maternidad')::int
  union all select  5, 'Zona Destete',                     246, (select count(*) from a where etapa_actual='Destete')::int
  union all select  6, 'Zona Ceba',                        421, (select count(*) from a where etapa_actual='Ceba')::int
  union all select  7, 'Hembras',                          444, (select count(*) from a where gender='Hembra')::int
  union all select  8, 'Machos',                           334, (select count(*) from a where gender='Macho')::int
  union all select  9, 'Gestantes (Embarazada)',            69, (select count(*) from a where etapa_actual='Gestación' and heat_status='Embarazada')::int
  union all select 10, 'Vacías (rol Madre)',                 8, (select count(*) from a where etapa_actual='Gestación' and heat_status='Vacía' and role='Madre')::int
  union all select 11, 'Reemplazos (sin rol)',              11, (select count(*) from a where etapa_actual='Gestación' and role is null)::int
  union all select 12, 'Lechones en camadas',              136, (select n from lech)
  union all select 13, 'Madres CON camada',                 14, (select count(*) from a where etapa_actual='Maternidad' and coalesce(litter_males,0)+coalesce(litter_females,0) > 0)::int
  union all select 14, 'Madres SIN camada',                  9, (select count(*) from a where etapa_actual='Maternidad' and coalesce(litter_males,0)+coalesce(litter_females,0) = 0)::int
  union all select 15, 'Parideras distintas ocupadas',       23, (select count(distinct room_number) from a where etapa_actual='Maternidad')::int
  union all select 16, 'Aretes duplicados',                  0, (select count(*) from (select tag from a group by tag having count(*)>1) d)::int
  union all select 17, 'Animales sin sala asignada',          0, (select count(*) from a where room_number is null)::int
  union all select 18, 'Estados distintos de Activo',         0, (select count(*) from a where status <> 'Activo')::int
)
select ord as "#", concepto, esperado, real,
       case when real = esperado then 'OK' else 'FALLA' end as veredicto
from chk order by ord;

-- Rango de aretes (esperado: H → 444 · H-000001..H-000444 | M → 334 · M-000001..M-000334)
select left(tag,1) as prefijo, count(*) as cantidad, min(tag) as primero, max(tag) as ultimo
from public.animals group by left(tag,1) order by 1;

-- Camada por paridera (14 con lechones, 9 en cero; suma 136)
select room_number as paridera, tag,
       coalesce(litter_males,0) as machos, coalesce(litter_females,0) as hembras,
       coalesce(litter_males,0) + coalesce(litter_females,0) as total
from public.animals where etapa_actual = 'Maternidad' order by room_number;
