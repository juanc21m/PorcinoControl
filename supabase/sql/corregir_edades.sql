-- =============================================================================
-- Agrocomercial Moreno · CORRECCIÓN DE EDADES + REDISTRIBUCIÓN DEFINITIVA
-- =============================================================================
-- Causa raíz del problema de las zonas:
--   El motor biológico mueve a Ceba a todo animal con role='Ceba' que tenga
--   70 días o más (biologicalEngine.ts, CEBA_TRANSITION_DAY). Los 246 de
--   Destete quedaron con fecha de nacimiento demasiado antigua, así que la app
--   los barría a Ceba y guardaba el cambio en Supabase. El SQL corregía la
--   base y la app la volvía a deshacer.
--
-- Este script alinea la fecha de nacimiento con la zona real:
--   Lechones  <  21 días
--   Destete     21–70 días
--   Ceba      >= 70 días
--
-- Así el motor coincide con la realidad de la granja y deja de mover animales.
--
-- Nota: cuando tengas las fechas reales de nacimiento, se actualizan por arete
-- y estas quedan reemplazadas. Mientras tanto son estimaciones coherentes.
-- =============================================================================

do $$
declare
  v_pool int;
  v_lec int; v_des int; v_ceb int; v_tot int;
  v_mal_des int; v_mal_ceb int;
begin
  ---------------------------------------------------------------------------
  -- 1 · Repartir de nuevo los 667 en 246 Destete + 421 Ceba
  ---------------------------------------------------------------------------
  -- Solo Ceba y Destete. Los 136 de Lechones ya están bien y no se tocan.
  select count(*) into v_pool
  from public.animals
  where status = 'Activo' and etapa_actual in ('Ceba','Destete');

  if v_pool <> 667 then
    raise exception
      'El grupo Ceba+Destete tiene % animales y se esperaban 667. No se tocó nada.', v_pool;
  end if;

  -- El peso sigue distinguiéndolos: los destetados pesan ~15 lb y los de ceba
  -- ~150 lb, aunque la app les haya cambiado la zona.
  with pool as (
    select id, row_number() over (order by weight asc, created_at asc, tag asc) as rn
    from public.animals
    where status = 'Activo' and etapa_actual in ('Ceba','Destete')
  )
  update public.animals a
     set etapa_actual = case when p.rn <= 246 then 'Destete' else 'Ceba' end,
         -- Edad coherente con la zona, repartida para que no nazcan todos el
         -- mismo día: Destete 25–64 días, Ceba 90–149 días.
         birth_date = case
           when p.rn <= 246 then current_date - (25 + (p.rn % 40))
           else                  current_date - (90 + (p.rn % 60))
         end
    from pool p
   where a.id = p.id;

  ---------------------------------------------------------------------------
  -- 2 · Los lechones deben tener menos de 21 días para no ser destetados ya
  ---------------------------------------------------------------------------
  update public.animals
     set birth_date = current_date - 10
   where status = 'Activo'
     and etapa_actual = 'Lechones'
     and current_date - birth_date >= 21;

  ---------------------------------------------------------------------------
  -- 3 · Verificación
  ---------------------------------------------------------------------------
  select count(*) into v_lec from public.animals where status='Activo' and etapa_actual='Lechones';
  select count(*) into v_des from public.animals where status='Activo' and etapa_actual='Destete';
  select count(*) into v_ceb from public.animals where status='Activo' and etapa_actual='Ceba';
  select count(*) into v_tot from public.animals where status='Activo';

  if v_lec <> 136 then raise exception 'Lechones quedó en % (esperado 136)', v_lec; end if;
  if v_des <> 246 then raise exception 'Destete quedó en % (esperado 246)',  v_des; end if;
  if v_ceb <> 421 then raise exception 'Ceba quedó en % (esperado 421)',     v_ceb; end if;
  if v_tot <> 914 then raise exception 'Total quedó en % (esperado 914)',    v_tot; end if;

  -- Lo importante: que ningún animal tenga una edad que el motor vaya a corregir.
  select count(*) into v_mal_des from public.animals
   where status='Activo' and etapa_actual='Destete'
     and (current_date - birth_date < 21 or current_date - birth_date >= 70);

  select count(*) into v_mal_ceb from public.animals
   where status='Activo' and etapa_actual='Ceba'
     and current_date - birth_date < 70;

  if v_mal_des > 0 then
    raise exception '% animales en Destete tienen edad fuera de 21-70 días; el motor los movería', v_mal_des;
  end if;
  if v_mal_ceb > 0 then
    raise exception '% animales en Ceba tienen menos de 70 días; el motor los movería', v_mal_ceb;
  end if;

  raise notice 'OK · Lechones 136 · Destete 246 · Ceba 421 · edades coherentes con el motor';
end $$;

notify pgrst, 'reload schema';

-- Resultado final: zona, cantidad y rango de edad
select etapa_actual as zona,
       count(*) as animales,
       min(current_date - birth_date) as edad_min,
       max(current_date - birth_date) as edad_max
from public.animals
where status = 'Activo'
group by etapa_actual
order by count(*) desc;
