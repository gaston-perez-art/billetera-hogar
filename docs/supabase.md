# Configurar Supabase

Pasos para pasar la app de modo demo a datos reales compartidos. Se hacen una sola vez.

## 1. Proyecto

1. Crear un proyecto en [supabase.com](https://supabase.com) (plan gratis). Región: São Paulo.
2. **Project Settings → API**: copiar la **Project URL** y la clave **anon / publishable**. La service role key no se usa.

## 2. Base

En **SQL Editor**, correr en orden:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_app.sql`

## 3. Login

**Authentication → URL Configuration**:
- Site URL: `https://gaston-perez-art.github.io/billetera-hogar/`
- Redirect URLs: agregar esa misma y `http://localhost:3000/`.

**Authentication → Emails → Magic Link**: agregar el código al cuerpo del mail, por ejemplo:

```html
<p>Tu código para entrar: <strong>{{ .Token }}</strong></p>
<p>O tocá este link: <a href="{{ .ConfirmationURL }}">Entrar</a></p>
```

El código hace falta en iPhone: el link abre Safari, no la app instalada en la pantalla de inicio, que tiene su propia sesión.

## 4. Hogar

1. Cada uno entra una vez a la app con su mail. Va a ver "esa cuenta todavía no está en un hogar": es lo esperado.
2. En **SQL Editor**, pegar `supabase/seed/crear-hogar.sql` con los dos mails reemplazados y correrlo (sin guardar los mails en el repo).
3. Recargar la app: ya entra.
4. **Authentication → Sign In / Providers**: desactivar **Allow new users to sign up**, para que nadie más pueda crear cuenta.

## 5. Datos

- Desde cero: cargar ingresos, techos y pagos fijos en Ajustes.
- Con los datos reales que ya se usaban en el POC: en la app conectada, Ajustes → Importar archivo .json con ese mismo `.json` (vive fuera del repo). Reemplaza todo lo del hogar; los nombres de los miembros del archivo tienen que coincidir con los del hogar.

## 6. Variables

- Local: copiar `.env.example` a `.env.local` y completar.
- Sitio publicado: en GitHub, **Settings → Secrets and variables → Actions → Variables**, crear `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Volver a correr el workflow de Pages.

Sin variables, la app arranca en modo demo (datos ficticios en el navegador).
