"use client";

// Entrar con mail y contraseña. Las dos cuentas se crean desde el panel de Supabase
// (no hay registro abierto): así no depende de mails, que en el plan gratis tienen
// límites, y funciona igual en la app instalada en el iPhone.

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Boton } from "@/components/ui";

const campo =
  "h-[52px] w-full rounded-full bg-relleno px-5 text-[16px] font-medium outline-none placeholder:text-sutil";

export function Acceso({ sb }: { sb: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setError(null);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: clave });
    setEntrando(false);
    if (error) {
      setError(
        error.status === 429
          ? "Muchos intentos seguidos. Esperá un minuto."
          : error.status === 400
            ? "El mail o la contraseña no coinciden."
            : "No pudimos entrar. Revisá la conexión.",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[max(env(safe-area-inset-top),3rem)]">
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">Billetera Hogar</h1>
      <form onSubmit={entrar} className="flex flex-1 flex-col">
        <p className="mt-2 text-[15px] text-tenue">Entrá con tu mail y tu contraseña.</p>
        <input
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@mail.com"
          aria-label="Mail"
          className={`${campo} mt-8`}
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="Contraseña"
          aria-label="Contraseña"
          className={`${campo} mt-3`}
        />
        {error && <p className="mt-3 px-1 text-[13px] text-pasaste">{error}</p>}
        <Boton type="submit" disabled={entrando || !email.includes("@") || !clave} className="mt-auto">
          {entrando ? "Entrando…" : "Entrar"}
        </Boton>
      </form>
    </main>
  );
}
