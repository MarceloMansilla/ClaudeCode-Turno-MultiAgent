/**
 * Presentación de fechas, horas e importes con convenciones españolas (Principio II):
 * día antes que mes, reloj de 24 h y euros con coma decimal.
 */
import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { horaLocal } from './zona';

/** «lunes, 16/11/2026» a partir de 'AAAA-MM-DD'. */
export function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return format(new TZDate(a, m - 1, d, 'UTC'), "EEEE, dd/MM/yyyy", { locale: es });
}

/** «10:00» en la hora local de la clínica. */
export function formatearHora(instante: Date, zona: string): string {
  return horaLocal(instante, zona);
}

/** «10:00–10:45» (guion largo, sin espacios). */
export function formatearRango(desde: string, hasta: string): string {
  return `${desde}–${hasta}`;
}

const euros = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});

/** Céntimos enteros → «40,00 €» (con espacio de no separación antes del símbolo). */
export function formatearPrecio(centimos: number): string {
  if (!Number.isInteger(centimos)) throw new Error('El precio debe expresarse en céntimos enteros.');
  return euros.format(centimos / 100);
}

/** «45 min». */
export function formatearDuracion(minutos: number): string {
  return `${minutos} min`;
}

const enteros = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' });

/** Entero con separador de miles siempre: «1.311», «47» (clarificación de la spec 004). */
export function formatearEntero(n: number): string {
  if (!Number.isInteger(n)) throw new Error('Solo se formatean números enteros.');
  return enteros.format(n);
}

/**
 * Porcentaje a partir de décimas enteras: 105 → «10,5 %» (espacio de no separación antes de
 * «%», como en los importes). `null` (denominador 0) → «Sin datos».
 */
export function formatearPorcentaje(decimas: number | null): string {
  if (decimas === null) return 'Sin datos';
  if (!Number.isInteger(decimas)) throw new Error('El porcentaje debe expresarse en décimas enteras.');
  const signo = decimas < 0 ? '-' : '';
  const absoluto = Math.abs(decimas);
  return `${signo}${formatearEntero(Math.trunc(absoluto / 10))},${absoluto % 10} %`;
}

/** «14/09/2026» a partir de 'AAAA-MM-DD' (spec 004: semanas y periodo). */
export function formatearFechaNumerica(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return `${d}/${m}/${a}`;
}

/** «14/09» a partir de 'AAAA-MM-DD' (eje de los gráficos semanales). */
export function formatearDiaMes(fecha: string): string {
  const [, m, d] = fecha.split('-');
  return `${d}/${m}`;
}
