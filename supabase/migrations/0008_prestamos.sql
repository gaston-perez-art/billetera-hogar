-- Préstamos (pestaña Préstamos en Pagos): un pago fijo en cuotas, sin tarjeta.
-- monto = la última cuota conocida; si se ajusta por UVA, el monto de cada mes lo dice el banco
-- y se guarda en pagos_mes al pagar. Nunca se guarda el número de préstamo ni de cuenta.
alter table pagos_fijos add column prestamo boolean not null default false;
alter table pagos_fijos add column uva boolean not null default false;
alter table pagos_fijos add constraint prestamo_en_cuotas check (not prestamo or cuotas is not null);

-- importar_datos con las columnas nuevas.
create or replace function importar_datos(p_hogar uuid, p_datos jsonb) returns void
language plpgsql set search_path = public as $$
begin
  if not es_miembro(p_hogar) then
    raise exception 'No sos miembro de este hogar';
  end if;

  delete from pagos_mes where hogar_id = p_hogar;
  delete from movimientos where hogar_id = p_hogar;
  delete from pagos_fijos where hogar_id = p_hogar;
  delete from tarjetas where hogar_id = p_hogar;
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

  insert into tarjetas (id, hogar_id, banco, ultimos4, miembro_id)
  select (t->>'id')::uuid, p_hogar, t->>'banco', t->>'ultimos4', (t->>'miembroId')::uuid
  from jsonb_array_elements(coalesce(p_datos->'tarjetas', '[]'::jsonb)) t;

  insert into pagos_fijos (id, hogar_id, concepto, categoria_id, dia, monto, es_deuda, activo, baja_desde, alta_desde, cuotas, tarjeta_id, prestamo, uva)
  select (p->>'id')::uuid, p_hogar, p->>'concepto', (p->>'categoriaId')::uuid, (p->>'dia')::int,
         (p->>'monto')::numeric, (p->>'esDeuda')::boolean, (p->>'activo')::boolean, (p->>'bajaDesde')::date,
         (p->>'altaDesde')::date, (p->>'cuotas')::int, (p->>'tarjetaId')::uuid,
         coalesce((p->>'prestamo')::boolean, false), coalesce((p->>'uva')::boolean, false)
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
