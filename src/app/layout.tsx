import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Navegacion } from "@/components/Navegacion";
import { Tactil } from "@/components/Tactil";
import { ProveedorBilletera } from "@/lib/store";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Billetera Hogar",
  description: "Gastos del hogar de Gastón y Jime: cuánto entra, cuánto se va y cuánto le toca poner a cada uno.",
  appleWebApp: { capable: true, title: "Billetera", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1110" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <ProveedorBilletera>
          <div className="mx-auto min-h-dvh max-w-md pb-24">{children}</div>
          <Navegacion />
          <Tactil />
        </ProveedorBilletera>
      </body>
    </html>
  );
}
