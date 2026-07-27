-- =============================================================================
-- Agrocomercial Moreno · REPARTO FINAL DE ZONAS
-- =============================================================================
-- ⚠️ ORDEN OBLIGATORIO: primero el redeploy en Vercel, después este script.
--
-- Causa raíz de que las zonas se "desconfiguraran" solas:
--   El motor biológico movía a Ceba a todo animal con role='Ceba' de 70 días o
--   más. Los 246 de Destete entraban en esa regla, así que cada vez que se
--   abría la app quedaban en Ceba y el cambio se guardaba en Supabase. El SQL
--   corregía la base y la app la volvía a deshacer.
--
--   Ya corregido: el motor ahora solo levanta una alerta y el traslado se hace
--   a mano desde el módulo de Movilización. Pero ese arreglo vive en el bundle
--   de la app, así que si corres este script ANTES del redeploy, la versión
--   vieja seguirá deshaciéndolo.
--
-- Reparto:  Ceba + Destete = 667  →  246 Destete + 421 Ceba
-- Los 136 de Lechones ya están bien y no se tocan.
-- =============================================================================

do $$
declare
  v_pool int;
  v_lec int; v_des int; v_ceb int; v_tot int;
begin
  select count(*) into v_pool
  from public.animals
  where status = 'Activo' and etapa_actual in ('Ceba','Destete');

  if v_pool <> 667 then
    raise exception
      'El grupo Ceba+Destete tiene % animales y se esperaban 667. No se tocó nada.', v_pool;
  end if;

  -- El peso los distingue aunque la app les haya cambiado la zona:
  -- los destetados pesan ~15 lb y los de ceba ~150 lb.
  with pool as (
    select id, row_number() over (order by weight asc, created_at asc, tag asc) as rn
    from public.animals
    where status = 'Activo' and etapa_actual in ('Ceba','Destete')
  )
  update public.animals a
     set etapa_actual = case when p.rn <= 246 then 'Destete' else 'Ceba' end
    from pool p
   where a.id = p.id;

  select count(*) into v_lec from public.animals where status='Activo' and etapa_actual='Lechones';
  select count(*) into v_des from public.animals where status='Activo' and etapa_actual='Destete';
  select count(*) into v_ceb from public.animals where status='Activo' and etapa_actual='Ceba';
  select count(*) into v_tot from public.animals where status='Activo';

  if v_lec <> 136 then raise exception 'Lechones quedó en % (esperado 136)', v_lec; end if;
  if v_des <> 246 then raise exception 'Destete quedó en % (esperado 246)',  v_des; end if;
  if v_ceb <> 421 then raise exception 'Ceba quedó en % (esperado 421)',     v_ceb; end if;
  if v_tot <> 914 then raise exception 'Total quedó en % (esperado 914)',    v_tot; end if;

  raise notice 'OK · Gestación 88 · Maternidad 23 · Lechones 136 · Destete 246 · Ceba 421 · Total 914';
end $$;

notify pgrst, 'reload schema';

select etapa_actual as zona, count(*) as animales
from public.animals
where status = 'Activo'
group by etapa_actual
order by count(*) desc;
