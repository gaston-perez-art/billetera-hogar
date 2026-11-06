import type { Fecha, Mes } from "./tipos";

const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/**
 * Montos ocultos (el ojito del encabezado, para usar la app delante de otras personas).
 * La fija el proveedor de datos antes de dibujar las pantallas; todas las cifras pasan por `pesos`.
 */
let montosOcultos = false;
export function fijarMontosOcultos(ocultos: boolean) {
  montosOcultos = ocultos;
}
export const MONTO_OCULTO = "$***";

/** `$1.234.567`, sin decimales. Cero se muestra como "–" salvo que se pida lo contrario. */
export function pesos(monto: number, { ceroComoGuion = true } = {}): string {
  if (montosOcultos) return MONTO_OCULTO;
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

const miles = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/**
 * Formatea un monto mientras se escribe, con puntos de miles y coma decimal: "5.000.000,32".
 * El punto que escribe la persona (teclados que no tienen coma) se toma como coma decimal,
 * porque los puntos de miles los pone la app.
 */
export function montoEnVivo(escrito: string, anterior = ""): { texto: string; valor: number } {
  let s = escrito.replace(/[^\d.,]/g, "");
  // Un punto recién tecleado al final (no de miles) vale como coma.
  if (!s.includes(",") && s.endsWith(".") && !anterior.endsWith(".")) s = s.slice(0, -1) + ",";
  const coma = s.indexOf(",");
  const entera = (coma === -1 ? s : s.slice(0, coma)).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const decimales = coma === -1 ? null : s.slice(coma + 1).replace(/\D/g, "").slice(0, 2);
  const enteraFormateada = entera ? miles.format(Number(entera)) : decimales !== null ? "0" : "";
  const texto = decimales === null ? enteraFormateada : `${enteraFormateada},${decimales}`;
  const valor = Number(`${entera || "0"}.${decimales || "0"}`);
  return { texto, valor };
}

/** Texto inicial de un campo de monto: "1.234.567" o "1.234.567,50". */
export function montoATexto(valor: number): string {
  if (!valor) return "";
  const [entera, dec] = Math.abs(valor).toFixed(2).split(".");
  return dec === "00" ? miles.format(Number(entera)) : `${miles.format(Number(entera))},${dec}`;
}

/** Días de `desde` a `hasta` (positivo si `hasta` es después). */
export function diasEntre(desde: Fecha, hasta: Fecha): number {
  const [a, m, d] = desde.split("-").map(Number);
  const [b, n, e] = hasta.split("-").map(Number);
  return Math.round((Date.UTC(b, n - 1, e) - Date.UTC(a, m - 1, d)) / 86_400_000);
}

/** "Vence hoy", "Vence mañana", "Vence en 4 días", "Venció hace 2 días". */
export function cuandoVence(dias: number): string {
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  if (dias > 1) return `Vence en ${dias} días`;
  if (dias === -1) return "Venció ayer";
  return `Venció hace ${-dias} días`;
}

