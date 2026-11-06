// Se vuelve a montar en cada cambio de pantalla: el contenido entra con una transición corta.
export default function Plantilla({ children }: { children: React.ReactNode }) {
  return <div className="pantalla-entra">{children}</div>;
}
