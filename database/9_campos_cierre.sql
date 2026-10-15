-- ============================================================
-- CAMPOS DE CIERRE CONFIGURABLES (RF06, RF19, RF21 · CU07)
-- Correr después de 8_configuracion_equipo.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================
--
-- Cada equipo define los campos de su cierre ganado en tenant_config.campos_cierre, una lista de:
--   { "id": "importe", "nombre": "Importe", "tipo": "texto" | "numero" | "lista",
--     "obligatorio": true, "opciones": ["..."] (solo las listas) }
-- y cada cierre guarda sus valores en cierres.datos: { "importe": 15000, ... }

-- 1) Campos por equipo. Los equipos que ya existían quedan con los 4 campos de antes;
--    los equipos nuevos arrancan con "Producto o servicio" e "Importe".
alter table tenant_config add column if not exists campos_cierre jsonb;

update tenant_config set campos_cierre = '[
  {"id": "producto",  "nombre": "Carrera / producto", "tipo": "texto", "obligatorio": true},
  {"id": "modalidad", "nombre": "Modalidad", "tipo": "lista", "obligatorio": true,
   "opciones": ["Presencial", "Virtual", "Híbrida"]},
  {"id": "descuento", "nombre": "Descuento", "tipo": "lista", "obligatorio": true,
   "opciones": ["Sin descuento", "20%", "30%", "50%", "70%"]},
  {"id": "importe",   "nombre": "Importe ($)", "tipo": "numero", "obligatorio": true}
]'::jsonb
where campos_cierre is null;

alter table tenant_config alter column campos_cierre set default '[
  {"id": "producto", "nombre": "Producto o servicio", "tipo": "texto", "obligatorio": true},
  {"id": "importe",  "nombre": "Importe", "tipo": "numero", "obligatorio": false}
]'::jsonb;
alter table tenant_config alter column campos_cierre set not null;

-- 2) Valores de cada cierre. Los cierres que ya existían pasan sus datos al formato nuevo.
alter table cierres add column if not exists datos jsonb not null default '{}'::jsonb;

update cierres set datos = jsonb_build_object(
    'producto', producto,
    'modalidad', case modalidad when 'presencial' then 'Presencial' when 'virtual' then 'Virtual'
                                when 'hibrida' then 'Híbrida' end,
    'descuento', case when descuento = 0 then 'Sin descuento' else descuento || '%' end,
    'importe', importe
  )
where tipo = 'ganado' and datos = '{}'::jsonb and producto is not null;

-- la regla vieja exigía producto, modalidad, descuento e importe en todo cierre ganado
alter table cierres drop constraint if exists cierre_coherente;
alter table cierres drop constraint if exists cierre_perdido_sin_datos;
alter table cierres add constraint cierre_perdido_sin_datos
  check (tipo = 'ganado' or datos = '{}'::jsonb);

-- 3) Revisa la lista de campos que arma el líder
create or replace function validar_campos_cierre(p jsonb)
returns void
language plpgsql
immutable
as $$
declare
  c jsonb;
begin
  if jsonb_typeof(p) <> 'array' then
    raise exception 'Los campos de cierre tienen que venir en una lista' using errcode = '22023';
  end if;
  if jsonb_array_length(p) > 15 then
    raise exception 'Puede haber hasta 15 campos de cierre' using errcode = '22023';
  end if;
  if (select count(distinct x->>'id') from jsonb_array_elements(p) x) <> jsonb_array_length(p) then
    raise exception 'Hay campos de cierre repetidos' using errcode = '22023';
  end if;
  if (select count(distinct lower(trim(x->>'nombre'))) from jsonb_array_elements(p) x) <> jsonb_array_length(p) then
    raise exception 'Hay dos campos de cierre con el mismo nombre' using errcode = '22023';
  end if;

  for c in select * from jsonb_array_elements(p) loop
    if coalesce(c->>'id', '') !~ '^[a-z0-9_]{1,30}$' then
      raise exception 'Un campo de cierre no tiene un identificador válido' using errcode = '22023';
    end if;
    if coalesce(trim(c->>'nombre'), '') = '' or length(c->>'nombre') > 40 then
      raise exception 'Cada campo de cierre necesita un nombre (hasta 40 letras)' using errcode = '22023';
    end if;
    if coalesce(c->>'tipo', '') not in ('texto', 'numero', 'lista') then
      raise exception 'El campo "%" tiene un tipo inválido', c->>'nombre' using errcode = '22023';
    end if;
    if c->>'tipo' = 'lista' and (
         jsonb_typeof(c->'opciones') is distinct from 'array'
         or jsonb_array_length(c->'opciones') = 0
         or jsonb_array_length(c->'opciones') > 30) then
      raise exception 'El campo "%" es una lista: cargale entre 1 y 30 opciones', c->>'nombre'
        using errcode = '22023';
    end if;
  end loop;
end;
$$;

-- 4) Revisa los valores de un cierre ganado contra los campos del equipo y los devuelve limpios
--    (solo los campos que existen; números como número; textos sin espacios de más)
create or replace function limpiar_datos_cierre(p_campos jsonb, p_datos jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  c jsonb;
  v_valor text;
  v_limpio jsonb := '{}'::jsonb;
begin
  for c in select * from jsonb_array_elements(p_campos) loop
    v_valor := nullif(trim(coalesce(p_datos->>(c->>'id'), '')), '');

    if v_valor is null then
      if (c->>'obligatorio')::boolean then
        raise exception 'Completá "%"', c->>'nombre' using errcode = '22023';
      end if;
      continue;
    end if;

    if c->>'tipo' = 'numero' then
      v_valor := replace(v_valor, ',', '.');
      if v_valor !~ '^-?[0-9]{1,12}(\.[0-9]{1,2})?$' then
        raise exception '"%" tiene que ser un número', c->>'nombre' using errcode = '22023';
      end if;
      v_limpio := v_limpio || jsonb_build_object(c->>'id', v_valor::numeric);
    elsif c->>'tipo' = 'lista' then
      if not (c->'opciones' ? v_valor) then
        raise exception 'Elegí una opción válida para "%"', c->>'nombre' using errcode = '22023';
      end if;
      v_limpio := v_limpio || jsonb_build_object(c->>'id', v_valor);
    else
      if length(v_valor) > 200 then
        raise exception '"%" es demasiado largo (hasta 200 letras)', c->>'nombre' using errcode = '22023';
      end if;
      v_limpio := v_limpio || jsonb_build_object(c->>'id', v_valor);
    end if;
  end loop;

  return v_limpio;
end;
$$;

-- 5) Cerrar un lead o modificar su cierre (CU07). Reemplaza a cerrar_lead: guarda el cierre con los
--    campos del equipo, cambia el estado y escribe el historial como UNA sola operación.
--    Corre con los permisos de quien lo usa (la RLS de cierres decide quién puede cerrar).
create or replace function registrar_cierre(p_lead_id uuid, p_tipo text, p_datos jsonb, p_motivo text)
returns cierres
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tenant uuid;
  v_campos jsonb;
  v_datos jsonb := '{}'::jsonb;
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_anterior text;
  v_detalle text;
  v_inicio text;
  v_cierre cierres;
begin
  if p_tipo is null or p_tipo not in ('ganado', 'perdido') then
    raise exception 'El cierre tiene que ser ganado o perdido' using errcode = '22023';
  end if;

  select tenant_id into v_tenant from leads where id = p_lead_id;
  if v_tenant is null then
    raise exception 'Lead no encontrado' using errcode = 'P0002';
  end if;

  select tipo into v_anterior from cierres where lead_id = p_lead_id;

  if p_tipo = 'ganado' then
    select campos_cierre into v_campos from tenant_config where tenant_id = v_tenant;
    v_campos := coalesce(v_campos, '[]'::jsonb);
    v_datos := limpiar_datos_cierre(v_campos, coalesce(p_datos, '{}'::jsonb));
    v_motivo := null;

    -- "Carrera / producto: Diseño · Importe ($): 15000", en el orden de los campos
    select string_agg((c->>'nombre') || ': ' || (v_datos->>(c->>'id')), ' · ' order by orden)
      into v_detalle
      from jsonb_array_elements(v_campos) with ordinality as x(c, orden)
     where v_datos ? (c->>'id');
  else
    if length(v_motivo) > 500 then
      raise exception 'El motivo es demasiado largo (hasta 500 letras)' using errcode = '22023';
    end if;
    v_detalle := case when v_motivo is not null then 'motivo: ' || v_motivo end;
  end if;

  insert into cierres (lead_id, tenant_id, tipo, datos, motivo, cerrado_por)
  values (p_lead_id, v_tenant, p_tipo, v_datos, v_motivo, auth.uid())
  on conflict (lead_id) do update set
    tipo = excluded.tipo,
    datos = excluded.datos,
    motivo = excluded.motivo,
    producto = null,
    modalidad = null,
    descuento = null,
    importe = null
  returning * into v_cierre;

  update leads set estado = p_tipo, updated_at = now() where id = p_lead_id;
  if not found then
    raise exception 'No tenés permiso para cerrar este lead' using errcode = '42501';
  end if;

  v_inicio := case
    when v_anterior is null then 'Cerrado como ' || p_tipo
    when v_anterior <> p_tipo then 'Cierre cambiado de ' || v_anterior || ' a ' || p_tipo
    else 'Cierre ' || p_tipo || ' modificado'
  end;

  insert into lead_historial (lead_id, texto, autor_id)
  values (p_lead_id, v_inicio || coalesce(': ' || v_detalle, '') || '.', auth.uid());

  return v_cierre;
end;
$$;

revoke execute on function registrar_cierre(uuid, text, jsonb, text) from public, anon;
grant execute on function registrar_cierre(uuid, text, jsonb, text) to authenticated;

-- 6) La configuración del equipo ahora también guarda los campos de cierre
--    (misma función que en el script 8, con campos_cierre agregado)
create or replace function guardar_config_equipo(p jsonb)
returns tenant_config
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := current_tenant_id();
  v_venc boolean := coalesce((p->>'vencimiento_habilitado')::boolean, false);
  v_config tenant_config;
begin
  if v_tenant is null or current_user_rol() <> 'lider' then
    raise exception 'Solo el líder puede cambiar la configuración del equipo' using errcode = '42501';
  end if;
  if coalesce(trim(p->>'equipo_nombre'), '') = '' or length(p->>'equipo_nombre') > 80 then
    raise exception 'Ingresá el nombre del equipo (hasta 80 letras)' using errcode = '22023';
  end if;
  perform validar_config_equipo(p);
  if p ? 'campos_cierre' then
    perform validar_campos_cierre(p->'campos_cierre');
  end if;

  update tenants set nombre = trim(p->>'equipo_nombre') where id = v_tenant;

  update tenant_config set
    rubro = coalesce(p->>'rubro', rubro),
    vencimiento_habilitado = v_venc,
    dias_vencimiento_lead = case when v_venc then (p->>'dias_vencimiento_lead')::int end,
    dias_alerta_previa = case when v_venc then (p->>'dias_alerta_previa')::int end,
    dias_archivo = case when v_venc then (p->>'dias_archivo')::int end,
    termino_contacto = trim(p->>'termino_contacto'),
    termino_contacto_plural = trim(p->>'termino_contacto_plural'),
    categorias_origen = limpiar_categorias(p->'categorias_origen'),
    eventos_habilitado = coalesce((p->>'eventos_habilitado')::boolean, false),
    termino_evento = coalesce(nullif(trim(p->>'termino_evento'), ''), termino_evento),
    email_diario = coalesce((p->>'email_diario')::boolean, true),
    campos_cierre = coalesce(p->'campos_cierre', campos_cierre)
  where tenant_id = v_tenant
  returning * into v_config;

  return v_config;
end;
$$;
