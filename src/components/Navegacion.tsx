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

/** Barra de pestañas clara. La pestaña activa lleva una pastilla verde suave detrás del ícono. */
export function Navegacion() {
  const ruta = usePathname().replace(/\/$/, "") || "/";
  if (ruta.endsWith("/cargar")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-tarjeta/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Secciones">
      <ul className="mx-auto grid h-[68px] max-w-md grid-cols-5 items-center">
        {ITEMS.map((item) =>
          item === null ? (
            <li key="cargar" className="flex justify-center">
              <Link href="/cargar" aria-label="Cargar gasto" className="grid size-12 place-items-center rounded-full bg-marca text-white active:opacity-80">
                <Icono trazo={ICONOS.mas} className="size-6" />
              </Link>
            </li>
          ) : (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={(item.href === "/" ? ruta === "/" : ruta.endsWith(item.href)) ? "page" : undefined}
                className="group flex flex-col items-center gap-1 text-[11px] font-medium text-tenue aria-[current=page]:font-semibold aria-[current=page]:text-marca"
              >
                <span className="grid h-7 w-14 place-items-center rounded-full group-aria-[current=page]:bg-marca-suave">
                  <Icono trazo={item.icono} className="size-[22px]" />
                </span>
                {item.texto}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
