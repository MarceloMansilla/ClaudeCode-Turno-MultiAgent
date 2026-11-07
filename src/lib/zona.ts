/**
 * Conversión entre la hora local de la clínica y los instantes UTC que se guardan
 * (Principio II, research.md R5). Las fechas locales viajan como 'AAAA-MM-DD' y las horas como
 * 'HH:mm' (24 h).
 */
import { TZDate } from '@date-fns/tz';

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

function partesFecha(fecha: string): [number, number, number] {
  const m = RE_FECHA.exec(fecha);
  if (!m) throw new Error(`Fecha no válida: «${fecha}».`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function esFechaValida(fecha: string): boolean {
  const m = RE_FECHA.exec(fecha);
  if (!m) return false;
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, me - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === me - 1 && f.getUTCDate() === d;
}

export function esHoraValida(hora: string): boolean {
  return RE_HORA.test(hora);
}

/** Instante UTC que corresponde a `fecha` + `hora` en la zona IANA indicada. */
export function instanteLocal(fecha: string, hora: string, zona: string): Date {
  const [a, me, d] = partesFecha(fecha);
  const m = RE_HORA.exec(hora);
  if (!m) throw new Error(`Hora no válida: «${hora}».`);
  const local = new TZDate(a, me - 1, d, Number(m[1]), Number(m[2]), 0, zona);
  return new Date(local.getTime());
}

function dosCifras(n: number): string {
  return String(n).padStart(2, '0');
}

/** Fecha local 'AAAA-MM-DD' de un instante en la zona indicada. */
export function fechaLocal(instante: Date, zona: string): string {
  const t = new TZDate(instante.getTime(), zona);
  return `${t.getFullYear()}-${dosCifras(t.getMonth() + 1)}-${dosCifras(t.getDate())}`;
}

/** Hora local 'HH:mm' (24 h) de un instante en la zona indicada. */
export function horaLocal(instante: Date, zona: string): string {
  const t = new TZDate(instante.getTime(), zona);
  return `${dosCifras(t.getHours())}:${dosCifras(t.getMinutes())}`;
}

/** Instantes [inicio, fin) del día local completo. */
export function rangoDelDia(fecha: string, zona: string): { desde: Date; hasta: Date } {
  return {
    desde: instanteLocal(fecha, '00:00', zona),
    hasta: instanteLocal(sumarDias(fecha, 1), '00:00', zona),
  };
}

/** Suma (o resta) días naturales a una fecha local. */
export function sumarDias(fecha: string, dias: number): string {
  const [a, me, d] = partesFecha(fecha);
  const f = new Date(Date.UTC(a, me - 1, d + dias));
  return `${f.getUTCFullYear()}-${dosCifras(f.getUTCMonth() + 1)}-${dosCifras(f.getUTCDate())}`;
}

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export function diaSemanaIso(fecha: string): number {
  const [a, me, d] = partesFecha(fecha);
  const dia = new Date(Date.UTC(a, me - 1, d)).getUTCDay();
  return dia === 0 ? 7 : dia;
}

/** Minutos desde medianoche de 'HH:mm' o 'HH:mm:ss'. */
export function minutosDeHora(hora: string): number {
  const [h, m] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

/** 'HH:mm' a partir de minutos desde medianoche. */
export function horaDeMinutos(minutos: number): string {
  return `${dosCifras(Math.floor(minutos / 60))}:${dosCifras(minutos % 60)}`;
}
