-- =============================================================================
-- Agrocomercial Moreno · Módulo de Control de Mortalidad
-- =============================================================================
-- Ejecutar COMPLETO en Supabase → SQL Editor. Es idempotente (se puede repetir).
-- =============================================================================

-- 1) Columnas nuevas de control sanitario
alter table public.animals add column if not exists fecha_muerte date;
alter table public.animals add column if not exists causa_muerte text;

-- 2) El estado debe aceptar 'Muerto'.
--    La app ya tenía 'Fallecido' con el mismo significado; se consolida en
--    'Muerto' para no fragmentar los reportes sanitarios.
alter table public.animals drop constraint if exists animals_status_check;

update public.animals set status = 'Muerto' where status = 'Fallecido';

alter table public.animals
  add constraint animals_status_check
  check (status in ('Activo','Despachado','Muerto','Descarte/Matadero'));

-- 3) A los que ya estaban dados de baja sin fecha, se les pone una trazable
--    (created_at) para que no queden con fecha nula en la bitácora.
update public.animals
set fecha_muerte = coalesce(fecha_muerte, created_at::date)
where status = 'Muerto' and fecha_muerte is null;

-- 4) Índices para la bitácora y la métrica de últimos 7 días
create index if not exists idx_animals_fecha_muerte on public.animals(fecha_muerte desc);
create index if not exists idx_animals_status on public.animals(status);

notify pgrst, 'reload schema';

-- 5) VERIFICACIÓN
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'animals'
  and column_name in ('fecha_muerte','causa_muerte');

select status, count(*) from public.animals group by status order by 1;
