import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Navegacion } from "@/components/Navegacion";
import { ProveedorBilletera } from "@/lib/store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Billetera Hogar",
  description: "Gastos del hogar de Gastón y Jime: cuánto entra, cuánto se va y cuánto le toca poner a cada uno.",
  appleWebApp: { capable: true, title: "Billetera", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ProveedorBilletera>
          <div className="mx-auto min-h-dvh max-w-md pb-28">{children}</div>
          <Navegacion />
        </ProveedorBilletera>
      </body>
    </html>
  );
}
