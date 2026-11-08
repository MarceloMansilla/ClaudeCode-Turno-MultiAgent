/**
 * 005, FR-009 y FR-018: único sitio donde vive el plazo de cancelación del paciente.
 *
 * El paciente puede cancelar una cita reservada solo si `ahora < inicio − 24 h`. Se comparan
 * instantes reales (24 h = 86.400.000 ms); con el horario de la clínica eso coincide con «la
 * misma hora del día anterior» también tras un cambio de hora (FR-010, research R6). Cambiar el
 * valor es una enmienda de la spec 005 y cambia a la vez la regla y todos los textos (FR-016).
 *
 * Recepción tiene su propio plazo (hasta la hora de inicio, 001 FR-018); este no lo restringe.
 */
import type { EstadoCita } from '@/db/esquema';

export const PLAZO_CANCELACION_PACIENTE_MS = 24 * 60 * 60 * 1000;

/** Instante en que vence el plazo: a partir de él ya no se puede cancelar desde el enlace. */
export function limiteCancelacionPaciente(inicio: Date): Date {
  return new Date(inicio.getTime() - PLAZO_CANCELACION_PACIENTE_MS);
}

/** Para el `UPDATE` condicional: solo se cancelan citas con `inicio > ahora + 24 h`. */
export function inicioMinimoCancelacionPaciente(ahora: Date): Date {
  return new Date(ahora.getTime() + PLAZO_CANCELACION_PACIENTE_MS);
}

/** Si se ofrece «Cancelar» al paciente (FR-011). La escritura repite la condición en SQL. */
export function pacientePuedeCancelar(cita: { estado: EstadoCita; inicio: Date }, ahora: Date): boolean {
  return cita.estado === 'reservada' && ahora.getTime() < limiteCancelacionPaciente(cita.inicio).getTime();
}
