"use client";

// Entrar con el mail: llega un código de 6 dígitos (y un link).
// El código importa en iPhone: el link abre Safari, no la app instalada en la pantalla de inicio.

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Boton } from "@/components/ui";

const campo =
  "h-[52px] w-full rounded-full bg-relleno px-5 text-[16px] font-medium outline-none placeholder:text-sutil";

export function Acceso({ sb }: { sb: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [paso, setPaso] = useState<"email" | "codigo">("email");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/` },
    });
    setEnviando(false);
    if (error) setError(error.message.includes("rate") ? "Pediste muchos códigos seguidos. Esperá un minuto." : "No pudimos mandar el mail. Revisá la dirección.");
    else setPaso("codigo");
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: codigo, type: "email" });
    setEnviando(false);
    if (error) setError("El código no es válido o ya venció. Pedí uno nuevo.");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[max(env(safe-area-inset-top),3rem)]">
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">Billetera Hogar</h1>
      {paso === "email" ? (
        <form onSubmit={pedirCodigo} className="flex flex-1 flex-col">
          <p className="mt-2 text-[15px] text-tenue">Entrá con tu mail. Te mandamos un código para confirmar que sos vos.</p>
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
          {error && <p className="mt-3 px-1 text-[13px] text-pasaste">{error}</p>}
          <Boton type="submit" disabled={enviando || !email.includes("@")} className="mt-auto">
            {enviando ? "Mandando…" : "Mandame el código"}
          </Boton>
        </form>
      ) : (
        <form onSubmit={verificar} className="flex flex-1 flex-col">
          <p className="mt-2 text-[15px] text-tenue">
            Te mandamos un código a {email.trim()}. También podés tocar el link del mail.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Código"
            aria-label="Código"
            className={`${campo} mt-8 text-center text-[24px] tracking-[0.3em] tabular-nums`}
          />
          {error && <p className="mt-3 px-1 text-[13px] text-pasaste">{error}</p>}
          <button type="button" onClick={() => { setPaso("email"); setCodigo(""); setError(null); }} className="mt-4 self-start px-1 text-[14px] font-semibold text-marca">
            Usar otro mail
          </button>
          <Boton type="submit" disabled={enviando || codigo.length < 6} className="mt-auto">
            {enviando ? "Entrando…" : "Entrar"}
          </Boton>
        </form>
      )}
    </main>
  );
}
