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

/** Barra de pestañas fija. El botón del medio carga un gasto: es la acción más usada. */
export function Navegacion() {
  const ruta = usePathname().replace(/\/$/, "") || "/";
  if (ruta.endsWith("/cargar")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-tarjeta/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Secciones">
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
        {ITEMS.map((item) =>
          item === null ? (
            <li key="cargar" className="flex justify-center">
              <Link href="/cargar" aria-label="Cargar gasto" className="grid size-11 place-items-center rounded-full bg-marca text-white active:opacity-80">
                <Icono trazo={ICONOS.mas} className="size-[22px]" />
              </Link>
            </li>
          ) : (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={(item.href === "/" ? ruta === "/" : ruta.endsWith(item.href)) ? "page" : undefined}
                className="flex flex-col items-center gap-1 text-[11px] font-medium text-sutil aria-[current=page]:text-texto"
              >
                <Icono trazo={item.icono} className="size-6" />
                {item.texto}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
