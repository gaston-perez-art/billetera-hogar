import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Navegacion } from "@/components/Navegacion";
import { ProveedorBilletera } from "@/lib/store";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Billetera Hogar",
  description: "Gastos del hogar de Gastón y Jime: cuánto entra, cuánto se va y cuánto le toca poner a cada uno.",
  appleWebApp: { capable: true, title: "Billetera", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${manrope.variable} font-sans antialiased`}>
        <ProveedorBilletera>
          <div className="mx-auto min-h-dvh max-w-md pb-24">{children}</div>
          <Navegacion />
        </ProveedorBilletera>
      </body>
    </html>
  );
}
