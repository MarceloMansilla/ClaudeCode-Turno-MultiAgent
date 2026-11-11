/**
 * Presentación de fechas, horas e importes con convenciones españolas (Principio II):
 * día antes que mes, reloj de 24 h y euros con coma decimal.
 */
import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { fechaLocal, horaLocal } from './zona';

/** «lunes, 16/11/2026» a partir de 'AAAA-MM-DD'. */
export function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return format(new TZDate(a, m - 1, d, 'UTC'), "EEEE, dd/MM/yyyy", { locale: es });
}

/** «10:00» en la hora local de la clínica. */
export function formatearHora(instante: Date, zona: string): string {
  return horaLocal(instante, zona);
}

/** «domingo, 15/11/2026 a las 10:00»: un instante en la hora local de la clínica (spec 005, FR-016). */
export function formatearLimite(instante: Date, zona: string): string {
  return `${formatearFecha(fechaLocal(instante, zona))} a las ${horaLocal(instante, zona)}`;
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
