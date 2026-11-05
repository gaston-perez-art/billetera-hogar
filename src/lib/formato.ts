import type { Fecha, Mes } from "./tipos";

const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** `$1.234.567`, sin decimales. Cero se muestra como "–" salvo que se pida lo contrario. */
export function pesos(monto: number, { ceroComoGuion = true } = {}): string {
  const redondeado = Math.round(monto);
  if (redondeado === 0 && ceroComoGuion) return "–";
  const signo = redondeado < 0 ? "-" : "";
  return `${signo}$${numero.format(Math.abs(redondeado))}`;
}

/** `DD/MM/AAAA` */
export function fechaCorta(fecha: Fecha): string {
  const [a, m, d] = fecha.split("-");
  return `${d}/${m}/${a}`;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function nombreMes(mes: Mes): string {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}

function dosDigitos(n: number) {
  return String(n).padStart(2, "0");
}

/** Fecha local de hoy en `AAAA-MM-DD` (no UTC: a la noche en Argentina UTC ya es mañana). */
export function hoy(ahora = new Date()): Fecha {
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}

export function mesDe(fecha: Fecha): Mes {
  return `${fecha.slice(0, 7)}-01`;
}

export function sumarMeses(mes: Mes, n: number): Mes {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${dosDigitos((total % 12) + 1)}-01`;
}

export function diasDelMes(mes: Mes): number {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m, 0).getDate();
}

/** Fecha dentro del mes, ajustando el día si el mes es más corto (pago del 31 en febrero → 28/29). */
export function fechaEnMes(mes: Mes, dia: number): Fecha {
  return `${mes.slice(0, 8)}${dosDigitos(Math.min(dia, diasDelMes(mes)))}`;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Encabezado de un día de actividad: "Hoy", "Ayer" o "Martes 3 de noviembre". */
export function etiquetaDia(fecha: Fecha, referencia: Fecha = hoy()): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const [ra, rm, rd] = referencia.split("-").map(Number);
  const dias = Math.round((Date.UTC(ra, rm - 1, rd) - Date.UTC(a, m - 1, d)) / 86_400_000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  const nombre = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${d} de ${MESES[m - 1]}`;
}

/** Mes abreviado de una fecha, para chips de día: "nov". */
export function mesCorto(mes: Mes): string {
  return MESES[Number(mes.slice(5, 7)) - 1].slice(0, 3);
}
