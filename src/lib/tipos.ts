// Tipos del dominio. Espejan las tablas de supabase/migrations/0001_init.sql
// (sin hogar_id: en el POC hay un solo hogar y los datos viven en el navegador).

/** Fecha ISO `AAAA-MM-DD`. */
export type Fecha = string;
/** Primer día del mes, `AAAA-MM-01`. */
export type Mes = string;

export interface Miembro {
  id: string;
  nombre: string;
  /** Foto de perfil achicada, en data URL. La ven los dos. */
  foto?: string | null;
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
  /** Mes en que se dio de alta. Antes de ese mes no aparece (null = desde siempre). */
  altaDesde?: Mes | null;
  /**
   * Compra en cuotas con tarjeta: cuántas cuotas tiene. La primera es `altaDesde` y,
   * pasada la última, deja de aparecer sola. Sin valor = pago fijo común, sin fin.
   */
  cuotas?: number | null;
  /** Compra en cuotas: con qué tarjeta se pagó (null = sin decir). */
  tarjetaId?: string | null;
  /**
   * Préstamo (pestaña Préstamos en Pagos): en cuotas como una compra, pero sin tarjeta y
   * con el monto que manda el banco cada mes. `monto` es la última cuota conocida.
   */
  prestamo?: boolean;
  /** Préstamo que se ajusta por UVA: la cuota en pesos sube cada mes. */
  uva?: boolean;
  /**
   * Préstamo en dólares: lo que se debía al empezar y la cuota mínima por mes, en USD.
   * Se paga en pesos al dólar del día; `monto` es la cuota mínima en pesos al último dólar usado.
   * Si un mes se pone más, se descuenta de lo que deben y termina antes (`cuotas` se recalcula).
   */
  usdTotal?: number | null;
  usdCuota?: number | null;
}

/** Tarjeta de crédito, para agrupar las compras en cuotas. Solo banco y últimos 4 números. */
export interface Tarjeta {
  id: string;
  banco: string;
  /** Últimos 4 números, para distinguir dos del mismo banco. */
  ultimos4: string;
  /** De quién es. */
  miembroId: string;
}

export interface PagoMes {
  id: string;
  pagoFijoId: string;
  mes: Mes;
  monto: number;
  pagado: boolean;
  movimientoId?: string;
  /** Préstamo en dólares: cuántos USD se pagaron ese mes (`monto` son los pesos). */
  usd?: number | null;
}

export interface Datos {
  miembros: Miembro[];
  categorias: Categoria[];
  ingresos: Ingreso[];
  movimientos: Movimiento[];
  pagosFijos: PagoFijo[];
  pagosMes: PagoMes[];
  /** Tarjetas de crédito (datos viejos pueden no tenerlas). */
  tarjetas?: Tarjeta[];
}
