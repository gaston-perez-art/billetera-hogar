# Modelo de datos (Supabase / Postgres)

```
hogares ──< miembros (user_id, nombre)
   │
   ├──< categorias (nombre, orden)
   │       └──< techos (categoria, mes, monto)
   ├──< ingresos (miembro, mes, concepto, monto)
   ├──< pagos_fijos (concepto, categoria, dia, monto, activo)
   │       └──< pagos_mes (pago_fijo, mes, monto, pagado, movimiento_id)
   └──< movimientos (fecha, monto, categoria, detalle, medio, pago_por)
```

- `mes` se guarda como el primer día del mes (`date`).
- `pagos_mes.movimiento_id` enlaza el pago fijo con el gasto que se crea al marcarlo pagado.
- Préstamo en dólares (`0009_dolares.sql`): `pagos_fijos.usd_total` y `usd_cuota` (USD); `pagos_mes.usd` son los dólares pagados ese mes y `monto`, los pesos. `cuotas` se recalcula con lo pagado (si un mes se pone más, termina antes).
- Todo filtra por `hogar_id` con RLS: solo los miembros del hogar ven y editan sus datos.
- Las vistas `v_resumen_mes`, `v_categorias_mes` y `v_reparto_mes` calculan lo que hoy hacen las fórmulas de la planilla.

Esquema completo: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
