/**
 * Analítica de la clínica (spec 004): reglas puras de periodo, redondeo, ocupación, no
 * asistencia e ingresos. Sin BD, sin reloj y sin E/S: todo llega en la entrada (research R1).
 *
 * - Importes en céntimos enteros; porcentajes en décimas enteras (Principio II, research R3).
 * - Semanas de lunes a domingo según la fecha local de la clínica (FR-005, research R2).
 */
import type { EstadoCita } from '@/db/esquema';
import { diaSemanaIso, fechaLocal, instanteLocal, minutosDeHora, sumarDias } from '@/lib/zona';

export const SEMANAS_ANALITICA = 8;

// ---------------------------------------------------------------------------------------------
// Tipos (data-model.md)
// ---------------------------------------------------------------------------------------------

export interface HorarioClinica {
  horaApertura: string;
  horaCierre: string;
  /** Días ISO (1 = lunes … 7 = domingo). */
  diasLaborables: number[];
}

export interface ClinicaAnalitica extends HorarioClinica {
  zonaHoraria: string;
}

export interface CitaAnalitica {
  profesionalId: string;
  servicioId: string;
  estado: EstadoCita;
  inicio: Date;
  fin: Date;
}

export interface EntradaAnalitica {
  ahora: Date;
  clinica: ClinicaAnalitica;
  /** En el orden de la agenda. */
  profesionales: { id: string; nombre: string }[];
  /** En el orden del catálogo. */
  servicios: { id: string; nombre: string; precioCentimos: number }[];
  /** Pueden venir sin filtrar: se ignoran las que empiezan fuera del periodo. */
  citas: CitaAnalitica[];
}

export interface Indicadores {
  completadas: number;
  noAsistidas: number;
  canceladas: number;
  /** Citas pasadas que siguen «reservadas» (ocupan tiempo, nada más). */
  reservadas: number;
  minutosCompletadas: number;
  minutosNoAsistidas: number;
  minutosCanceladas: number;
  minutosOcupados: number;
  minutosDisponibles: number;
  /** p. ej. 105 → «10,5 %»; `null` si no hay completadas ni no asistidas. */
  tasaNoAsistenciaDecimas: number | null;
  ocupacionDecimas: number | null;
}

export interface IndicadoresProfesional extends Indicadores {
  profesionalId: string;
  nombre: string;
}

export interface IngresoServicio {
  servicioId: string;
  nombre: string;
  precioCentimos: number;
  citas: number;
  importeCentimos: number;
}

export interface Semana {
  /** 'AAAA-MM-DD' del lunes. */
  lunes: string;
  porProfesional: IndicadoresProfesional[];
  clinica: Indicadores;
  ingresosCentimos: number;
}

export interface ResumenAnalitica {
  periodo: {
    /** Lunes de la primera semana ('AAAA-MM-DD'). */
    desde: string;
    /** Domingo de la última semana ('AAAA-MM-DD'). */
    hasta: string;
    /** «14/09/2026 – 08/11/2026». */
    etiqueta: string;
  };
  hayDatos: boolean;
  profesionales: IndicadoresProfesional[];
  clinica: Indicadores;
  ingresosPorServicio: IngresoServicio[];
  ingresosTotalCentimos: number;
  semanas: Semana[];
}

// ---------------------------------------------------------------------------------------------
// Reglas base
// ---------------------------------------------------------------------------------------------

/** Lunes de la semana (lunes a domingo) de una fecha local 'AAAA-MM-DD'. */
export function lunesDe(fecha: string): string {
  return sumarDias(fecha, 1 - diaSemanaIso(fecha));
}

/**
 * FR-004: las 8 semanas completas anteriores a la semana en curso. `desde`/`hasta` son los
 * instantes de las 00:00 locales (intervalo [desde, hasta)), calculados desde fechas locales
 * para no desplazarse con el cambio de hora.
 */
export function periodoAnalitica(
  ahora: Date,
  zona: string,
): { desde: Date; hasta: Date; lunes: string[] } {
  const lunesActual = lunesDe(fechaLocal(ahora, zona));
  const lunes = Array.from({ length: SEMANAS_ANALITICA }, (_, i) =>
    sumarDias(lunesActual, -7 * (SEMANAS_ANALITICA - i)),
  );
  return {
    desde: instanteLocal(lunes[0]!, '00:00', zona),
    hasta: instanteLocal(lunesActual, '00:00', zona),
    lunes,
  };
}

/**
 * `num ÷ den` en décimas de porcentaje, con aritmética entera y redondeo de la mitad hacia
 * arriba: ⌊(2000·num + den) / (2·den)⌋. Denominador 0 → `null`.
 */
export function decimas(num: number, den: number): number | null {
  if (!Number.isInteger(num) || !Number.isInteger(den) || num < 0 || den < 0) {
    throw new Error('decimas() solo admite enteros no negativos.');
  }
  if (den === 0) return null;
  return Math.floor((2000 * num + den) / (2 * den));
}

/** FR-008: minutos disponibles de un profesional en la semana que empieza en `lunes`. */
export function minutosDisponiblesSemana(clinica: HorarioClinica, lunes: string): number {
  const porDia = minutosDeHora(clinica.horaCierre) - minutosDeHora(clinica.horaApertura);
  let dias = 0;
  for (let i = 0; i < 7; i++) {
    if (clinica.diasLaborables.includes(diaSemanaIso(sumarDias(lunes, i)))) dias++;
  }
  return dias * porDia;
}

// ---------------------------------------------------------------------------------------------
// Cálculo (FR-004–FR-012)
// ---------------------------------------------------------------------------------------------

interface Acumulador {
  completadas: number;
  noAsistidas: number;
  canceladas: number;
  reservadas: number;
  minutosCompletadas: number;
  minutosNoAsistidas: number;
  minutosCanceladas: number;
  minutosReservadas: number;
}

const acumuladorVacio = (): Acumulador => ({
  completadas: 0,
  noAsistidas: 0,
  canceladas: 0,
  reservadas: 0,
  minutosCompletadas: 0,
  minutosNoAsistidas: 0,
  minutosCanceladas: 0,
  minutosReservadas: 0,
});

/** Suma una cita al acumulador según su estado (reglas comunes a periodo y semana). */
function acumular(a: Acumulador, estado: EstadoCita, minutos: number): void {
  switch (estado) {
    case 'completada':
      a.completadas++;
      a.minutosCompletadas += minutos;
      break;
    case 'no_asistida':
      a.noAsistidas++;
      a.minutosNoAsistidas += minutos;
      break;
    case 'cancelada':
      a.canceladas++;
      a.minutosCanceladas += minutos;
      break;
    case 'reservada':
      // Solo puede estar en el periodo si es pasada sin desenlace: ocupa tiempo y nada más.
      a.reservadas++;
      a.minutosReservadas += minutos;
      break;
  }
}

function sumarAcumuladores(partes: Acumulador[]): Acumulador {
  const total = acumuladorVacio();
  for (const p of partes) {
    for (const k of Object.keys(total) as (keyof Acumulador)[]) total[k] += p[k];
  }
  return total;
}

/** FR-006 (tasa) y FR-008 (ocupación) a partir de los recuentos y los minutos disponibles. */
function indicadores(a: Acumulador, minutosDisponibles: number): Indicadores {
  const minutosOcupados = a.minutosCompletadas + a.minutosNoAsistidas + a.minutosReservadas;
  return {
    completadas: a.completadas,
    noAsistidas: a.noAsistidas,
    canceladas: a.canceladas,
    reservadas: a.reservadas,
    minutosCompletadas: a.minutosCompletadas,
    minutosNoAsistidas: a.minutosNoAsistidas,
    minutosCanceladas: a.minutosCanceladas,
    minutosOcupados,
    minutosDisponibles,
    tasaNoAsistenciaDecimas: decimas(a.noAsistidas, a.completadas + a.noAsistidas),
    ocupacionDecimas: decimas(minutosOcupados, minutosDisponibles),
  };
}

function minutosDeCita(c: CitaAnalitica): number {
  return Math.round((c.fin.getTime() - c.inicio.getTime()) / 60_000);
}

function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return `${d}/${m}/${a}`;
}

/**
 * Indicadores de las 8 semanas completas anteriores a la semana de `ahora`: por profesional y
 * de la clínica (periodo y cada semana), ingresos por servicio y por semana. Pura y
 * determinista; solo usa aritmética entera.
 */
export function calcularAnalitica(entrada: EntradaAnalitica): ResumenAnalitica {
  const { clinica, profesionales, servicios } = entrada;
  const zona = clinica.zonaHoraria;
  const periodo = periodoAnalitica(entrada.ahora, zona);
  const indiceSemana = new Map(periodo.lunes.map((l, i) => [l, i]));
  const indiceProfesional = new Map(profesionales.map((p, i) => [p.id, i]));
  const precio = new Map(servicios.map((s) => [s.id, s.precioCentimos]));

  // [semana][profesional]
  const celdas = periodo.lunes.map(() => profesionales.map(acumuladorVacio));
  const ingresosSemana = periodo.lunes.map(() => 0);
  const porServicio = new Map(servicios.map((s) => [s.id, { citas: 0, importeCentimos: 0 }]));

  for (const c of entrada.citas) {
    if (c.inicio < periodo.desde || c.inicio >= periodo.hasta) continue;
    const s = indiceSemana.get(lunesDe(fechaLocal(c.inicio, zona)));
    const p = indiceProfesional.get(c.profesionalId);
    if (s === undefined || p === undefined) continue;
    acumular(celdas[s]![p]!, c.estado, minutosDeCita(c));
    if (c.estado === 'completada') {
      const importe = precio.get(c.servicioId) ?? 0;
      ingresosSemana[s]! += importe;
      const linea = porServicio.get(c.servicioId);
      if (linea) {
        linea.citas++;
        linea.importeCentimos += importe;
      }
    }
  }

  const disponiblesSemana = periodo.lunes.map((l) => minutosDisponiblesSemana(clinica, l));
  const disponiblesPeriodo = disponiblesSemana.reduce((a, b) => a + b, 0);

  const semanas: Semana[] = periodo.lunes.map((lunes, s) => {
    const fila = celdas[s]!;
    return {
      lunes,
      porProfesional: profesionales.map((p, i) => ({
        profesionalId: p.id,
        nombre: p.nombre,
        ...indicadores(fila[i]!, disponiblesSemana[s]!),
      })),
      clinica: indicadores(sumarAcumuladores(fila), disponiblesSemana[s]! * profesionales.length),
      ingresosCentimos: ingresosSemana[s]!,
    };
  });

  const totalesProfesional = profesionales.map((_, i) => sumarAcumuladores(celdas.map((fila) => fila[i]!)));
  const totalClinica = sumarAcumuladores(totalesProfesional);

  const ingresosPorServicio: IngresoServicio[] = servicios.map((s) => ({
    servicioId: s.id,
    nombre: s.nombre,
    precioCentimos: s.precioCentimos,
    ...porServicio.get(s.id)!,
  }));

  const domingo = sumarDias(periodo.lunes.at(-1)!, 6);
  return {
    periodo: {
      desde: periodo.lunes[0]!,
      hasta: domingo,
      etiqueta: `${fechaCorta(periodo.lunes[0]!)} – ${fechaCorta(domingo)}`,
    },
    // Edge Cases «Sin historia»: hace falta al menos una cita con desenlace.
    hayDatos: totalClinica.completadas + totalClinica.noAsistidas + totalClinica.canceladas > 0,
    profesionales: profesionales.map((p, i) => ({
      profesionalId: p.id,
      nombre: p.nombre,
      ...indicadores(totalesProfesional[i]!, disponiblesPeriodo),
    })),
    clinica: indicadores(totalClinica, disponiblesPeriodo * profesionales.length),
    ingresosPorServicio,
    ingresosTotalCentimos: ingresosPorServicio.reduce((a, i) => a + i.importeCentimos, 0),
    semanas,
  };
}
