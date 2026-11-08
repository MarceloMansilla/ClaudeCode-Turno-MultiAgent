/**
 * Clasificación de cada cita de la ventana y totales del resumen (spec 003, FR-004, FR-005,
 * FR-010; data-model.md, «Selección de citas»; research R2 y R9). Sin acceso a BD.
 */
import { z } from 'zod';
import type { EstadoRecordatorio, ResumenRecordatorios } from '@/db/esquema';

export type ResultadoCita = ResumenRecordatorios['citas'][number];
export type ResumenEjecucion = ResumenRecordatorios;

/** Un `enviando` más antiguo que esto es un envío interrumpido (R2). */
export const ENVIANDO_INTERRUMPIDO_MS = 10 * 60 * 1000;

export const DETALLE_INTERRUMPIDO = 'envío interrumpido; no se reintenta para no duplicar';

export type Clasificacion =
  | { tipo: 'a_enviar' }
  | { tipo: 'sin_correo' }
  | { tipo: 'correo_no_valido' }
  | { tipo: 'ya_enviado_antes' }
  | { tipo: 'interrumpido' };

export function esCorreoValido(email: string): boolean {
  return z.email().safeParse(email.trim()).success;
}

/** Qué hacer con una cita reservada de la ventana antes de intentar reclamarla. */
export function clasificarCita({
  email,
  recordatorio,
  ahora,
}: {
  email: string | null;
  recordatorio: { estado: EstadoRecordatorio; ultimoIntentoEn: Date } | null;
  ahora: Date;
}): Clasificacion {
  if (!email || !email.trim()) return { tipo: 'sin_correo' };
  if (!esCorreoValido(email)) return { tipo: 'correo_no_valido' };
  if (!recordatorio || recordatorio.estado === 'fallido') return { tipo: 'a_enviar' };
  if (recordatorio.estado === 'enviado') return { tipo: 'ya_enviado_antes' };
  // 'enviando': otra ejecución en curso o un envío que se cortó a medias.
  const antiguedad = ahora.getTime() - recordatorio.ultimoIntentoEn.getTime();
  return antiguedad > ENVIANDO_INTERRUMPIDO_MS ? { tipo: 'interrumpido' } : { tipo: 'ya_enviado_antes' };
}

export function totalizar(citas: ResultadoCita[]): ResumenEjecucion['totales'] {
  const totales = { enviado: 0, yaEnviadoAntes: 0, sinCorreo: 0, correoNoValido: 0, fallido: 0 };
  for (const c of citas) {
    if (c.resultado === 'enviado') totales.enviado++;
    else if (c.resultado === 'ya_enviado_antes') totales.yaEnviadoAntes++;
    else if (c.resultado === 'sin_correo') totales.sinCorreo++;
    else if (c.resultado === 'correo_no_valido') totales.correoNoValido++;
    else totales.fallido++;
  }
  return totales;
}

/** Texto del resultado tal como lo muestra la salida del comando (FR-005). */
export function textoResultado(c: ResultadoCita): string {
  switch (c.resultado) {
    case 'enviado':
      return 'enviado';
    case 'ya_enviado_antes':
      return 'ya enviado antes';
    case 'sin_correo':
      return 'sin correo';
    case 'correo_no_valido':
      return 'correo no válido';
    case 'fallido':
      return c.interrumpido ? 'fallido (interrumpido)' : 'fallido';
  }
}
