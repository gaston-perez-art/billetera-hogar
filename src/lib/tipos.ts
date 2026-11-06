// Tipos del dominio. Espejan las tablas de supabase/migrations/0001_init.sql
// (sin hogar_id: en el POC hay un solo hogar y los datos viven en el navegador).

/** Fecha ISO `AAAA-MM-DD`. */
export type Fecha = string;
/** Primer día del mes, `AAAA-MM-01`. */
export type Mes = string;

export interface Miembro {
  id: string;
  nombre: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  orden: number;
  /** Techo mensual. En la DB vive en `techos` por mes; en el POC es uno solo para todos los meses. */
  techo: number;
}

export interface Ingreso {
  id: string;
  miembroId: string;
  concepto: string;
  monto: number;
  /** `null` = se repite todos los meses (sueldo). Con mes = extra puntual (aguinaldo). */
  mes: Mes | null;
  /** Solo para los que se repiten: primer mes en que vale. Sin valor = desde siempre. */
  desde?: Mes | null;
  /** Solo para los que se repiten: último mes en que vale. Sin valor = sin fin. */
  hasta?: Mes | null;
}

export interface Movimiento {
  id: string;
  fecha: Fecha;
  /** Negativo = plata que entra sin ser ingreso del mes (ej.: préstamo para cancelar deudas). */
  monto: number;
  categoriaId: string;
  detalle: string;
  medio?: string;
  pagoPor: string;
  creadoEn: string;
}

export interface PagoFijo {
  id: string;
  concepto: string;
  categoriaId: string;
  dia: number;
  monto: number;
  /** Suma al techo de Deuda del mes. */
  esDeuda: boolean;
  activo: boolean;
  /** Mes desde el que está dado de baja. Antes de ese mes sigue apareciendo. */
  bajaDesde?: Mes | null;
}

export interface PagoMes {
  id: string;
  pagoFijoId: string;
  mes: Mes;
  monto: number;
  pagado: boolean;
  movimientoId?: string;
}

export interface Datos {
  miembros: Miembro[];
  categorias: Categoria[];
  ingresos: Ingreso[];
  movimientos: Movimiento[];
  pagosFijos: PagoFijo[];
  pagosMes: PagoMes[];
}
