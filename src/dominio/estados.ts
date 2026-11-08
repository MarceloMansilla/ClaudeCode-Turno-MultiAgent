/**
 * Ciclo de vida de una cita (FR-017–FR-019, data-model.md):
 *   reservada ─ cancelar (solo antes del inicio) ──────────► cancelada
 *             ─ completar (desde la hora de inicio) ───────► completada
 *             ─ no_asistida (desde la hora de inicio) ─────► no_asistida
 * Los estados finales no tienen salida.
 */
import type { EstadoCita } from '@/db/esquema';
import type { CodigoError } from './errores';

export type AccionCita = 'cancelar' | 'completar' | 'no_asistida';

export const ETIQUETA_ESTADO: Record<EstadoCita, string> = {
  reservada: 'Reservada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistida: 'No asistida',
};

export const ETIQUETA_ACCION: Record<AccionCita, string> = {
  cancelar: 'Cancelar cita',
  completar: 'Completar',
  no_asistida: 'No asistió',
};

export const ESTADO_DESTINO: Record<AccionCita, EstadoCita> = {
  cancelar: 'cancelada',
  completar: 'completada',
  no_asistida: 'no_asistida',
};

/** Estados que ocupan el hueco del profesional (FR-006, FR-011). */
export const ESTADOS_QUE_OCUPAN: readonly EstadoCita[] = ['reservada', 'completada'];

interface CitaEstado {
  estado: EstadoCita;
  inicio: Date;
}

export function accionesDisponibles(cita: CitaEstado, ahora: Date): AccionCita[] {
  if (cita.estado !== 'reservada') return [];
  return ahora.getTime() < cita.inicio.getTime() ? ['cancelar'] : ['completar', 'no_asistida'];
}

export type ErrorTransicion = Extract<
  CodigoError,
  'ESTADO_CAMBIADO' | 'CANCELACION_TARDIA' | 'TRANSICION_NO_PERMITIDA'
>;

/** `null` si la transición es válida; si no, el código de error del contrato. */
export function validarTransicion(
  cita: CitaEstado,
  accion: AccionCita,
  ahora: Date,
): ErrorTransicion | null {
  if (cita.estado !== 'reservada') return 'ESTADO_CAMBIADO';
  const empezada = ahora.getTime() >= cita.inicio.getTime();
  if (accion === 'cancelar') return empezada ? 'CANCELACION_TARDIA' : null;
  return empezada ? null : 'TRANSICION_NO_PERMITIDA';
}
