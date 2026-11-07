import { describe, expect, it } from 'vitest';
import { accionesDisponibles, validarTransicion } from '@/dominio/estados';
import type { EstadoCita } from '@/db/esquema';

const INICIO = new Date('2026-11-09T10:00:00+01:00');
const ANTES = new Date('2026-11-09T09:59:00+01:00');
const EN_EL_INICIO = INICIO;
const DESPUES = new Date('2026-11-09T12:10:00+01:00');

const cita = (estado: EstadoCita) => ({ estado, inicio: INICIO });

describe('FR-017–FR-019 — transiciones de estado', () => {
  it('US3 #4 — antes del inicio solo se puede cancelar', () => {
    expect(accionesDisponibles(cita('reservada'), ANTES)).toEqual(['cancelar']);
  });

  it('US3 #2 y #3 — desde la hora de inicio: completar o no asistida, nunca cancelar', () => {
    expect(accionesDisponibles(cita('reservada'), EN_EL_INICIO)).toEqual(['completar', 'no_asistida']);
    expect(accionesDisponibles(cita('reservada'), DESPUES)).toEqual(['completar', 'no_asistida']);
  });

  it.each(['completada', 'cancelada', 'no_asistida'] as const)(
    'US3 #5 — una cita %s no tiene acciones (estado final)',
    (estado) => {
      expect(accionesDisponibles(cita(estado), ANTES)).toEqual([]);
      expect(accionesDisponibles(cita(estado), DESPUES)).toEqual([]);
    },
  );

  it('FR-018 — cancelar desde la hora de inicio es CANCELACION_TARDIA', () => {
    expect(validarTransicion(cita('reservada'), 'cancelar', ANTES)).toBeNull();
    expect(validarTransicion(cita('reservada'), 'cancelar', EN_EL_INICIO)).toBe('CANCELACION_TARDIA');
  });

  it('FR-019 — completar o no asistida antes del inicio es TRANSICION_NO_PERMITIDA', () => {
    expect(validarTransicion(cita('reservada'), 'completar', ANTES)).toBe('TRANSICION_NO_PERMITIDA');
    expect(validarTransicion(cita('reservada'), 'no_asistida', ANTES)).toBe('TRANSICION_NO_PERMITIDA');
    expect(validarTransicion(cita('reservada'), 'completar', DESPUES)).toBeNull();
    expect(validarTransicion(cita('reservada'), 'no_asistida', DESPUES)).toBeNull();
  });

  it('FR-017/FR-020 — cualquier acción sobre un estado final es ESTADO_CAMBIADO', () => {
    for (const estado of ['completada', 'cancelada', 'no_asistida'] as const) {
      for (const accion of ['cancelar', 'completar', 'no_asistida'] as const) {
        expect(validarTransicion(cita(estado), accion, DESPUES)).toBe('ESTADO_CAMBIADO');
      }
    }
  });
});
