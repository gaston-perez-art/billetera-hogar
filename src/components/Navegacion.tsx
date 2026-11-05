"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, ICONOS } from "@/components/Iconos";

const ITEMS = [
  { href: "/", texto: "Inicio", icono: ICONOS.inicio },
  { href: "/categorias", texto: "Categorías", icono: ICONOS.categorias },
  null,
  { href: "/pagos", texto: "Pagos", icono: ICONOS.pagos },
  { href: "/reparto", texto: "Reparto", icono: ICONOS.reparto },
];

/** Barra flotante oscura. El botón del medio carga un gasto. */
export function Navegacion() {
  const ruta = usePathname().replace(/\/$/, "") || "/";
  if (ruta.endsWith("/cargar")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]" aria-label="Secciones">
      <ul className="mx-auto grid max-w-md grid-cols-5 items-center rounded-full bg-bosque-hondo/95 p-1.5 shadow-[0_12px_32px_-12px_rgba(10,36,25,0.6)] backdrop-blur">
        {ITEMS.map((item) =>
          item === null ? (
            <li key="cargar" className="flex justify-center">
              <Link
                href="/cargar"
                aria-label="Cargar gasto"
                className="grid size-12 place-items-center rounded-full bg-menta text-bosque-hondo transition active:scale-95"
              >
                <Icono trazo={ICONOS.mas} className="size-6" />
              </Link>
            </li>
          ) : (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ruta.endsWith(item.href) && (item.href !== "/" || ruta === "/") ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-semibold text-white/55 aria-[current=page]:bg-white/10 aria-[current=page]:text-white"
              >
                <Icono trazo={item.icono} className="size-[22px]" />
                {item.texto}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
