-- =============================================================================
-- Agrocomercial Moreno · CARGA INICIAL DE ALIMENTO
-- =============================================================================
-- 200 sacos por cada uno de los 7 tipos del catálogo.
--
-- Las libras se calculan según el peso real del saco: Fase 1 y Fase 2 vienen
-- en sacos de ~25 kg (55 lb) y el resto en sacos de 100 lb.
--
--   Gestación    200 sacos × 100 lb =  20,000 lb
--   Lactancia    200 sacos × 100 lb =  20,000 lb
--   Crecimiento  200 sacos × 100 lb =  20,000 lb
--   Engorde      200 sacos × 100 lb =  20,000 lb
--   Fase 1       200 sacos ×  55 lb =  11,000 lb
--   Fase 2       200 sacos ×  55 lb =  11,000 lb
--   Fase 3       200 sacos × 100 lb =  20,000 lb
--                              TOTAL 122,000 lb
--
-- Es idempotente: si se repite, deja el stock en 200, no lo acumula.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1 · Preparar la tabla
-- -----------------------------------------------------------------------------
-- Mismo caso que animals: la columna id es UUID sin default porque hasta ahora
-- siempre lo generaba el navegador.
alter table public.feed_inventory alter column id set default gen_random_uuid();

-- El catálogo creció a 7 tipos; el CHECK viejo solo permitía 3.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.feed_inventory'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%feed_type%'
  loop
    execute format('alter table public.feed_inventory drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.feed_inventory alter column feed_type type varchar(20);

alter table public.feed_inventory
  add constraint feed_inventory_feed_type_check
  check (feed_type in ('Gestación','Lactancia','Crecimiento','Engorde','Fase 1','Fase 2','Fase 3'));

-- ON CONFLICT necesita un índice único sobre feed_type.
create unique index if not exists feed_inventory_feed_type_key
  on public.feed_inventory (feed_type);

-- -----------------------------------------------------------------------------
-- PASO 2 · Carga inicial
-- -----------------------------------------------------------------------------
insert into public.feed_inventory (id, feed_type, sacos, lb, updated_at)
select gen_random_uuid(), t.feed_type, 200, 200 * t.lb_por_saco, now()
from (values
  ('Gestación',   100),
  ('Lactancia',   100),
  ('Crecimiento', 100),
  ('Engorde',     100),
  ('Fase 1',       55),
  ('Fase 2',       55),
  ('Fase 3',      100)
) as t(feed_type, lb_por_saco)
on conflict (feed_type) do update
  set sacos      = excluded.sacos,
      lb         = excluded.lb,
      updated_at = now();

notify pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- PASO 3 · Verificación
-- -----------------------------------------------------------------------------
select feed_type as alimento, sacos, lb
from public.feed_inventory
order by feed_type;

select count(*) as tipos, sum(sacos) as sacos_totales, sum(lb) as lb_totales
from public.feed_inventory;
