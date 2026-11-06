import { createClient } from "@supabase/supabase-js";

// Solo la clave pública (anon / publishable): la seguridad la dan las políticas RLS.
// La service role key nunca va al cliente.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** `null` si no hay variables: la app arranca en modo demo. */
export const supabase = url && clave ? createClient(url, clave) : null;
