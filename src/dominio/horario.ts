/**
 * Reglas puras de horario (FR-014): la clínica abre de lunes a viernes de 09:00 a 20:00; las
 * citas empiezan en múltiplos de 15 minutos, duran un múltiplo de 15 y caben enteras en el
 * horario. El horario nunca cruza la franja del cambio de hora (02:00–03:00), así que la
 * aritmética en minutos locales es exacta.
 */
import { diaSemanaIso, horaDeMinutos, minutosDeHora } from '@/lib/zona';

export interface Horario {
  horaApertura: string; // 'HH:mm' o 'HH:mm:ss'
  horaCierre: string;
  diasLaborables: number[]; // ISO 1–7
}

export const PASO_MINUTOS = 15;

export function esLaborable(fecha: string, horario: Horario): boolean {
  return horario.diasLaborables.includes(diaSemanaIso(fecha));
}

export function esMultiploDe15(hora: string): boolean {
  return minutosDeHora(hora) % PASO_MINUTOS === 0;
}

export function esDuracionValida(minutos: number): boolean {
  return Number.isInteger(minutos) && minutos > 0 && minutos % PASO_MINUTOS === 0;
}

export type ProblemaHorario =
  | { motivo: 'no_laborable' }
  | { motivo: 'antes_apertura'; apertura: string }
  | { motivo: 'despues_cierre'; fin: string; cierre: string };

/** `null` si una cita de `duracion` minutos que empieza a `hora` cabe en el horario de `fecha`. */
export function comprobarHorario(
  fecha: string,
  hora: string,
  duracion: number,
  horario: Horario,
): ProblemaHorario | null {
  if (!esLaborable(fecha, horario)) return { motivo: 'no_laborable' };
  const apertura = minutosDeHora(horario.horaApertura);
  const cierre = minutosDeHora(horario.horaCierre);
  const inicio = minutosDeHora(hora);
  if (inicio < apertura) return { motivo: 'antes_apertura', apertura: horaDeMinutos(apertura) };
  const fin = inicio + duracion;
  if (fin > cierre) {
    return { motivo: 'despues_cierre', fin: horaDeMinutos(fin), cierre: horaDeMinutos(cierre) };
  }
  return null;
}

/** Horas de inicio posibles ('HH:mm') de un día para una duración dada. */
export function horasDeInicio(duracion: number, horario: Horario): string[] {
  const apertura = minutosDeHora(horario.horaApertura);
  const cierre = minutosDeHora(horario.horaCierre);
  const horas: string[] = [];
  for (let m = apertura; m + duracion <= cierre; m += PASO_MINUTOS) horas.push(horaDeMinutos(m));
  return horas;
}
