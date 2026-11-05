"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", texto: "Inicio", icono: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/categorias", texto: "En qué se va", icono: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  null,
  { href: "/pagos", texto: "Pagos fijos", icono: "M4 5h16v15H4zM4 10h16M9 3v4M15 3v4" },
  { href: "/reparto", texto: "Quién pone", icono: "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9" },
];

export function Navegacion() {
  const ruta = usePathname();
  if (ruta === "/cargar") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-tarjeta/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
        {ITEMS.map((item) =>
          item === null ? (
            <li key="cargar" className="flex justify-center">
              <Link
                href="/cargar"
                aria-label="Cargar gasto"
                className="-mt-6 grid size-14 place-items-center rounded-full bg-marca text-white shadow-lg shadow-marca/30 active:scale-95 transition"
              >
                <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </Link>
            </li>
          ) : (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  ruta === item.href ? "text-marca" : "text-tenue"
                }`}
              >
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icono} />
                </svg>
                {item.texto}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
