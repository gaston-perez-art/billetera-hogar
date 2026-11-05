# Billetera Hogar

Webapp tipo billetera (estilo Mercado Pago) para que Gastón y Jime carguen los gastos del hogar desde el celular y vean, cada mes, cuánto le toca poner a cada uno y cuánto le queda.

Reemplaza a la planilla de Google Sheets "Reestructuración Económica FIN".

## Problema

La planilla funciona, pero:
- Cargar un gasto desde el celular es lento y propenso a errores (fila equivocada, hoja equivocada).
- "Quién pagó" hay que elegirlo a mano en cada fila.
- Marcar un pago fijo como "pagado" no lo registra como gasto: hay que cargarlo dos veces.
- La vista no es clara en el celular.

## Usuarios

Dos personas que comparten gastos: Gastón y Jime. Cada uno con su propio login.

## Funcionalidades (MVP)

1. **Cargar gasto en 3 toques**: monto, categoría, detalle. Fecha = hoy y "pagó" = usuario logueado por defecto.
2. **Inicio del mes**: entra, gastado, pagos que faltan, te queda de verdad.
3. **En qué se va**: por categoría, gastado vs. techo y lo que queda (verde) o lo excedido (rojo).
4. **Pagos fijos del mes**: lista ordenada por día de vencimiento. Marcar como pagado **crea el gasto** automáticamente.
5. **Quién pone qué**: por persona, plan (le toca poner, le debería quedar) vs. real (puso, le queda) y la diferencia.
6. **Ajustes**: ingresos por persona, techos por categoría, pagos fijos recurrentes.
7. **Importar** la Base de datos de la planilla para no perder el historial.

Ver [docs/reglas-de-negocio.md](docs/reglas-de-negocio.md) y [docs/modelo-de-datos.md](docs/modelo-de-datos.md).

## Stack propuesto

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind, instalable como PWA.
- **Backend**: Supabase (Auth, Postgres con RLS, Realtime para que los dos vean los cambios al instante).
- **Deploy**: Vercel.

## Estado

- [x] Contexto, reglas de negocio y modelo de datos
- [x] Esquema SQL inicial (`supabase/migrations/0001_init.sql`)
- [x] POC navegable (Next.js, datos de demo en el navegador, sin login)
- [ ] Conectar Supabase (auth con magic link, migración, Realtime)
- [ ] Importador desde Google Sheets

## Correr el POC

```bash
npm install
npm run dev      # http://localhost:3000 (abrilo con el celular en la misma red: http://<ip-de-la-compu>:3000)
npm test         # reglas de negocio
```

Qué incluye:
- Las 6 pantallas del MVP: inicio del mes, cargar gasto (3 pasos), en qué se va, pagos fijos, quién pone qué y ajustes.
- Marcar un pago fijo como pagado crea el gasto; desmarcarlo lo borra.
- Selector Gastón / Jime arriba en lugar de login.
- Datos de demo **ficticios**, guardados en `localStorage`. "Reiniciar demo" en Ajustes vuelve al estado inicial.

Qué falta para pasar de POC a MVP:
- Supabase: reemplazar `src/lib/store.tsx` por el cliente de Supabase (las pantallas no cambian) y mover los cálculos de `src/lib/calculos.ts` a las vistas SQL, usando `calculos.test.ts` como casos de validación.
- Techos e ingresos por mes (en el POC son los mismos para todos los meses).
- Presupuesto parcial de pagos fijos (lo pendiente = presupuesto − gastado).
- Importador de la planilla.

## Ideas (post-MVP)

- **Saldo real actualizado**: en Argentina no hay open banking obligatorio que exponga saldos de bancos a apps personales. Alternativas gratuitas a evaluar:
  - Importar el reporte de actividad (CSV) que descarga Mercado Pago.
  - Leer los mails de aviso de movimientos de Mercado Pago y Galicia (Gmail API) y proponerlos como gastos para confirmar.
  - Carga manual del saldo por cuenta (MP, Galicia, ICBC) para conciliar contra lo calculado.
- Agregadores pagos (ej.: Pluggy) solo si confirman cobertura de bancos argentinos.
