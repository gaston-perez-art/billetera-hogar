# Reglas de negocio

Reglas que hoy viven en las fórmulas de la planilla y que la app tiene que respetar.

## Gastos (movimientos)

- Cada gasto tiene: fecha, monto, categoría, detalle, medio de pago (opcional) y **quién pagó** (Gastón o Jime).
- La categoría es siempre una de la lista cerrada (nada de texto libre: era la causa de gastos que no sumaban en el mes).
- Un monto negativo representa plata que entra a la caja sin ser ingreso del mes (ej.: un préstamo que se usa para cancelar deudas). Así esos pagos no cuentan como gasto del sueldo.

## Categorías

Súper y comida · Delivery · Nafta y transporte · Uber · Casa y servicios · Izán · Santino · Entrenamientos · Salud · Personal · Deuda · Salidas con Jime · Jardín · Otros · Seguro del auto

- Cada categoría tiene un **techo mensual**.
- Desde noviembre 2026, "Chicos" se dividió en **Izán** (jardín, kit, peluquerías), **Santino** y **Entrenamientos** (gimnasio de Jime), y **Uber** se separó de Nafta y transporte. "Chicos" solo queda para gastos de meses anteriores.
- El techo de **Deuda** de un mes = suma de las cuotas fijas de deuda de ese mes (no un valor fijo).

## Mes

- **Entra este mes**: suma de ingresos (más extras del mes, ej.: aguinaldo en diciembre).
- **Gastado hasta hoy**: suma de gastos con fecha dentro del mes.
- **Pagos que faltan**: pagos fijos del mes no marcados como pagados.
- **Te queda de verdad** = entra − gastado − pagos que faltan.

## En qué se va

- Por categoría: gastado, techo y **te queda = techo − gastado**.
- Verde si queda, rojo si se pasó, "–" si techo y gastado son cero.

## Pagos fijos

- Recurrentes por mes, con día de vencimiento. Se ordenan por día y, dentro del día, por monto descendente.
- Alquiler + AySA + TM se muestran como **un solo pago**.
- **Marcar como pagado crea el gasto** en la categoría que corresponde (en la planilla había que cargarlo aparte y se olvidaba).
- Un pago fijo puede tener presupuesto parcial: si se gasta parte antes (ej.: Santino, peluquería), lo pendiente es presupuesto − gastado.

## Quién pone qué (reparto proporcional)

Por persona:

| Concepto | Cálculo |
|---|---|
| Ingresa | ingresos de la persona en el mes |
| Proporción | ingreso persona / ingreso total |
| Le toca (plan) | proporción × gasto previsto del mes |
| Le queda (plan) | ingresa − le toca |
| Puso (real) | suma de gastos del mes con `pagó = persona` |
| Le queda (real) | ingresa − puso |
| Diferencia | le queda (real) − le queda (plan) |

- **Gasto previsto del mes** = suma por categoría de `max(techo, gastado)`.
- Diferencia en verde: puso menos de lo que le tocaba (le debe al otro esa diferencia al cerrar el mes). En rojo: puso de más.
- El número que vale es el de fin de mes; durante el mes los dos suelen dar verde.

## Seguimiento puntual

- Gastos de Santino: categoría Santino (en meses anteriores a la división: Chicos con detalle que arranca con "Santino"). La app muestra el total del mes.
