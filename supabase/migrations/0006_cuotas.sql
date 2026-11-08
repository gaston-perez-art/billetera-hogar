-- Compras en cuotas con tarjeta: un pago fijo con cantidad de cuotas.
-- La primera cuota es alta_desde; pasada la última deja de aparecer sola.
-- Sin cuotas = pago fijo común, sin fin.
alter table pagos_fijos add column cuotas int check (cuotas is null or (cuotas between 1 and 120 and alta_desde is not null));

-- El gasto que se crea al pagar dice qué cuota es ("Heladera, cuota 3 de 6").
create or replace function marcar_pagado(
  p_pago_fijo uuid, p_mes date, p_pago_por uuid, p_fecha date, p_movimiento uuid default gen_random_uuid()
) returns uuid
language plpgsql set search_path = public as $$
declare
  pf pagos_fijos;
  existente pagos_mes;
  v_detalle text;
begin
  select * into pf from pagos_fijos where id = p_pago_fijo;
  if pf.id is null or not es_miembro(pf.hogar_id) then
    raise exception 'Pago fijo inexistente';
  end if;

  select * into existente from pagos_mes where pago_fijo_id = p_pago_fijo and mes = p_mes for update;
  if existente.pagado then
    return existente.movimiento_id;
  end if;

  v_detalle := pf.concepto;
  if pf.cuotas is not null and pf.alta_desde is not null then
    v_detalle := v_detalle || ', cuota '
      || ((extract(year from p_mes) - extract(year from pf.alta_desde)) * 12
          + extract(month from p_mes) - extract(month from pf.alta_desde) + 1)::int
      || ' de ' || pf.cuotas;
  end if;

  insert into movimientos (id, hogar_id, fecha, monto, categoria_id, detalle, pago_por)
  values (p_movimiento, pf.hogar_id, p_fecha, coalesce(existente.monto, pf.monto), pf.categoria_id, v_detalle, p_pago_por);

  insert into pagos_mes (hogar_id, pago_fijo_id, mes, monto, pagado, movimiento_id)
  values (pf.hogar_id, p_pago_fijo, p_mes, coalesce(existente.monto, pf.monto), true, p_movimiento)
  on conflict (pago_fijo_id, mes) do update set pagado = true, movimiento_id = excluded.movimiento_id;

  return p_movimiento;
end $$;

-- importar_datos con la columna nueva.
create or replace function importar_datos(p_hogar uuid, p_datos jsonb) returns void
language plpgsql set search_path = public as $$
begin
  if not es_miembro(p_hogar) then
    raise exception 'No sos miembro de este hogar';
  end if;

  delete from pagos_mes where hogar_id = p_hogar;
  delete from movimientos where hogar_id = p_hogar;
  delete from pagos_fijos where hogar_id = p_hogar;
  delete from ingresos where hogar_id = p_hogar;
  delete from techos where hogar_id = p_hogar;
  delete from categorias where hogar_id = p_hogar;

  insert into categorias (id, hogar_id, nombre, orden)
  select (c->>'id')::uuid, p_hogar, c->>'nombre', (c->>'orden')::int
  from jsonb_array_elements(p_datos->'categorias') c;

  insert into techos (hogar_id, categoria_id, mes, monto)
  select p_hogar, (t->>'categoriaId')::uuid, (t->>'mes')::date, (t->>'monto')::numeric
  from jsonb_array_elements(p_datos->'techos') t;

  insert into ingresos (id, hogar_id, miembro_id, mes, concepto, monto, desde, hasta)
  select (i->>'id')::uuid, p_hogar, (i->>'miembroId')::uuid, (i->>'mes')::date, i->>'concepto', (i->>'monto')::numeric,
         (i->>'desde')::date, (i->>'hasta')::date
  from jsonb_array_elements(p_datos->'ingresos') i;

  insert into pagos_fijos (id, hogar_id, concepto, categoria_id, dia, monto, es_deuda, activo, baja_desde, alta_desde, cuotas)
  select (p->>'id')::uuid, p_hogar, p->>'concepto', (p->>'categoriaId')::uuid, (p->>'dia')::int,
         (p->>'monto')::numeric, (p->>'esDeuda')::boolean, (p->>'activo')::boolean, (p->>'bajaDesde')::date,
         (p->>'altaDesde')::date, (p->>'cuotas')::int
  from jsonb_array_elements(p_datos->'pagosFijos') p;

  insert into movimientos (id, hogar_id, fecha, monto, categoria_id, detalle, medio, pago_por, created_at)
  select (m->>'id')::uuid, p_hogar, (m->>'fecha')::date, (m->>'monto')::numeric, (m->>'categoriaId')::uuid,
         m->>'detalle', m->>'medio', (m->>'pagoPor')::uuid, coalesce((m->>'creadoEn')::timestamptz, now())
  from jsonb_array_elements(p_datos->'movimientos') m;

  insert into pagos_mes (id, hogar_id, pago_fijo_id, mes, monto, pagado, movimiento_id)
  select (p->>'id')::uuid, p_hogar, (p->>'pagoFijoId')::uuid, (p->>'mes')::date, (p->>'monto')::numeric,
         (p->>'pagado')::boolean, (p->>'movimientoId')::uuid
  from jsonb_array_elements(p_datos->'pagosMes') p;
end $$;

