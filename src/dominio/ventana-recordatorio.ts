/**
 * Ventana de antelación de una ejecución de recordatorios (spec 003, FR-002; research R1).
 *
 * La ventana es el día natural siguiente al «ahora» en la zona de la clínica, de 00:00
 * (incluido) a 00:00 del día después (excluido). No depende de la hora de ejecución y cubre
 * completos los días de 23 y 25 horas del cambio de hora.
 */
import { fechaLocal, rangoDelDia, sumarDias } from '@/lib/zona';

export interface VentanaRecordatorio {
  /** Día local cubierto, 'AAAA-MM-DD'. */
  fechaObjetivo: string;
  desde: Date;
  hasta: Date;
}

export function calcularVentana(ahora: Date, zona: string): VentanaRecordatorio {
  const fechaObjetivo = sumarDias(fechaLocal(ahora, zona), 1);
  const { desde, hasta } = rangoDelDia(fechaObjetivo, zona);
  return { fechaObjetivo, desde, hasta };
}
