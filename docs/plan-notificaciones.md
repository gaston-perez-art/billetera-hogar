# Plan: notificaciones para cargar gastos

Estado: planificado, sin empezar. Objetivo: que Jime (y Gastón) carguen los gastos del día sin tener que acordarse de abrir la app.

## Lo decidido

- **Tres avisos por día:** 10:00, 17:00 y 22:00 (hora de Argentina, `America/Argentina/Buenos_Aires`, UTC−3 sin horario de verano). En cron UTC: `0 13 * * *`, `0 20 * * *` y `0 1 * * *`.
- Tocar el aviso abre directo `/cargar`.
- Se activan una vez desde Ajustes, con un botón: el navegador solo deja pedir permiso después de un toque.

## A definir al empezar la sesión

1. **Para quién:** ¿solo Jime o los dos? (Propuesta: cada uno lo activa en su celular; la regla es la misma.)
2. **Cuándo no mandar.** Propuesta: cada aviso sale solo si esa persona no cargó nada desde el aviso anterior (10 h: desde las 22 h del día anterior; 17 h: desde las 10; 22 h: desde las 17). Así quien carga al momento no recibe avisos de más. "Hoy no gasté nada" calla los avisos que quedan del día.
3. **Textos** (uno por horario, cortos y en criollo). Borradores:
   - 10 h: "¿Gastaste algo desde anoche? Cargalo en 3 toques."
   - 17 h: "¿Algo de hoy para cargar? Café, súper, nafta…"
   - 22 h: "Antes de dormir: ¿quedó algún gasto sin cargar?"

## Requisitos (hay que avisarle a Jime)

- **iPhone:** iOS 16.4 o más nuevo y la app instalada en la pantalla de inicio (Safari → Compartir → Agregar a inicio). Desde Safari sin instalar no llegan.
- **Android:** Chrome; funciona instalada o no.

## Qué hay que construir

1. **Service worker** (`public/sw.js`): recibe el push, muestra el aviso con el ícono de la app y abre `/cargar` al tocarlo. Registrarlo con el `basePath` de GitHub Pages. Con `output: "export"` alcanza con un archivo estático.
2. **Suscripción** (`src/lib/notificaciones.ts` + fila en Ajustes "Avisos para cargar"): pide permiso, se suscribe con la clave pública VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, va en `.env.local` y en los secrets del workflow) y guarda la suscripción. Desactivar la borra.
3. **Migración `0011_notificaciones.sql`:**
   - `suscripciones_push` (`hogar_id`, `miembro_id`, `endpoint` único, `p256dh`, `auth`, `created_at`) con RLS `es_miembro(hogar_id)`; cada uno solo inserta y borra las suyas.
   - `avisos_callados` (`miembro_id`, `fecha`) para "Hoy no gasté nada", o reusar lo que ya guarda el recordatorio si se pasa a la base.
4. **Edge Function `avisar-carga`** (Supabase, Deno): recibe el horario, busca por miembro si cargó algo desde el aviso anterior (`movimientos.created_by` + `created_at`), y manda el push con la librería `web-push` y la clave privada VAPID (secret de la función, nunca en el cliente ni en el repo). Si el servicio de push responde 404/410, borra la suscripción.
5. **Programación:** `pg_cron` + `pg_net` en Supabase llaman a la función en los tres horarios.
6. **Tests:** la regla de "cuándo mandar" como función pura, como `motivoRecordatorio` en `lib/recordatorio.ts`.

## Pasos manuales en el panel de Supabase (los hace Gastón)

Dejarlos escritos en `docs/supabase.md` al implementar:

1. Generar las claves VAPID (`npx web-push generate-vapid-keys`).
2. Guardar la privada como secret de la Edge Function.
3. Desplegar la función.
4. Activar las extensiones `pg_cron` y `pg_net` y correr el SQL que agenda los tres horarios.
5. Agregar la clave pública como secret del repo para el build de Pages.

## Qué pasa con el recordatorio actual

El modal de Inicio (`components/Recordatorio.tsx`) se queda: cubre a quien no activó los avisos. Revisar si con los avisos activos conviene apagarlo para no insistir dos veces.
