"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import { Icono, ICONOS } from "@/components/Iconos";
import { vibrar } from "@/components/Tactil";

/**
 * Navega apenas se levanta el dedo, sin esperar el "click".
 * En iPhone, si la pantalla todavía se desliza por el impulso del scroll, el primer toque
 * solo frena el movimiento y Safari no dispara el click: había que tocar dos veces.
 * Con el mouse o el teclado sigue andando el click normal del enlace.
 */
function useToqueDirecto(href: string) {
  const router = useRouter();
  const inicio = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      inicio.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const t = e.changedTouches[0];
      const desde = inicio.current;
      inicio.current = null;
      // Si el dedo se movió, era un scroll o un arrastre: no es un toque.
      if (!desde || Math.hypot(t.clientX - desde.x, t.clientY - desde.y) > 10) return;
      e.preventDefault(); // evita el click que vendría después (navegaría dos veces)
      vibrar();
      router.push(href);
    },
  };
}

function EnlaceDirecto(props: React.ComponentProps<typeof Link> & { href: string }) {
  const toque = useToqueDirecto(props.href);
  return <Link {...props} {...toque} />;
}

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
              <EnlaceDirecto href="/cargar" aria-label="Cargar gasto" className="grid size-12 place-items-center rounded-full bg-marca text-sobre-marca active:opacity-80">
                <Icono trazo={ICONOS.mas} className="size-6" />
              </EnlaceDirecto>
            </li>
          ) : (
            <li key={item.href}>
              <EnlaceDirecto
                href={item.href}
                aria-current={(item.href === "/" ? ruta === "/" : ruta.endsWith(item.href)) ? "page" : undefined}
                className="group flex flex-col items-center gap-1 text-[11px] font-medium text-tenue aria-[current=page]:font-semibold aria-[current=page]:text-marca"
              >
                <span className="grid h-7 w-14 place-items-center rounded-full group-aria-[current=page]:bg-marca-suave">
                  <Icono trazo={item.icono} className="size-[22px]" />
                </span>
                {item.texto}
              </EnlaceDirecto>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
