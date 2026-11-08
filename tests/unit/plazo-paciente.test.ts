import { describe, expect, it } from 'vitest';
import {
  inicioMinimoCancelacionPaciente,
  limiteCancelacionPaciente,
  pacientePuedeCancelar,
  PLAZO_CANCELACION_PACIENTE_MS,
} from '@/dominio/plazo-paciente';
import { instanteLocal } from '@/lib/zona';

const Z = 'Europe/Madrid';
const local = (fecha: string, hora: string) => instanteLocal(fecha, hora, Z);
const conSegundos = (fecha: string, hms: string) => new Date(`${fecha}T${hms}+01:00`);
const reservada = (inicio: Date) => ({ estado: 'reservada' as const, inicio });

describe('FR-009 / FR-010 — plazo del paciente: hasta 24 h antes del inicio', () => {
  it('el plazo son 24 horas reales', () => {
    expect(PLAZO_CANCELACION_PACIENTE_MS).toBe(86_400_000);
  });

  describe('lunes 16/11/2026 10:00 → vence el domingo 15/11/2026 10:00', () => {
    const cita = reservada(local('2026-11-16', '10:00'));
    it('el límite es el domingo a las 10:00', () => {
      expect(limiteCancelacionPaciente(cita.inicio)).toEqual(local('2026-11-15', '10:00'));
      expect(limiteCancelacionPaciente(cita.inicio).toISOString()).toBe('2026-11-15T09:00:00.000Z');
    });
    it('US2 #1 — a las 09:00 del domingo (faltan 25 h): procede', () => {
      expect(pacientePuedeCancelar(cita, local('2026-11-15', '09:00'))).toBe(true);
    });
    it('US2 #2 — a las 11:00 del domingo (faltan 23 h): no procede', () => {
      expect(pacientePuedeCancelar(cita, local('2026-11-15', '11:00'))).toBe(false);
    });
    it('US2 #4 — a las 09:59:59 procede; a las 10:00:00 ya no', () => {
      expect(pacientePuedeCancelar(cita, conSegundos('2026-11-15', '09:59:59'))).toBe(true);
      expect(pacientePuedeCancelar(cita, conSegundos('2026-11-15', '10:00:00'))).toBe(false);
    });
  });

  it('martes 17/11/2026 19:15: procede a las 19:14 del lunes y no a las 19:15', () => {
    const cita = reservada(local('2026-11-17', '19:15'));
    expect(limiteCancelacionPaciente(cita.inicio)).toEqual(local('2026-11-16', '19:15'));
    expect(pacientePuedeCancelar(cita, local('2026-11-16', '19:14'))).toBe(true);
    expect(pacientePuedeCancelar(cita, local('2026-11-16', '19:15'))).toBe(false);
  });

  it('lunes 26/10/2026 09:00, tras el cambio de hora: vence el domingo 25/10 a las 09:00 locales', () => {
    const cita = reservada(local('2026-10-26', '09:00'));
    expect(cita.inicio.toISOString()).toBe('2026-10-26T08:00:00.000Z');
    expect(limiteCancelacionPaciente(cita.inicio).toISOString()).toBe('2026-10-25T08:00:00.000Z');
    expect(limiteCancelacionPaciente(cita.inicio)).toEqual(local('2026-10-25', '09:00'));
  });

  it.each(['completada', 'cancelada', 'no_asistida'] as const)(
    'FR-011 — una cita %s nunca se ofrece cancelar, aunque falten días',
    (estado) => {
      expect(pacientePuedeCancelar({ estado, inicio: local('2026-11-30', '10:00') }, local('2026-11-15', '10:00'))).toBe(false);
    },
  );

  it('el mínimo del UPDATE es el mismo instante que el límite visto desde el otro lado', () => {
    const ahora = conSegundos('2026-11-15', '09:59:59');
    expect(inicioMinimoCancelacionPaciente(ahora).getTime() - ahora.getTime()).toBe(PLAZO_CANCELACION_PACIENTE_MS);
  });
});
