import { describe, expect, it } from 'vitest';
import { calcularVentana } from '@/dominio/ventana-recordatorio';

const MADRID = 'Europe/Madrid';
const HORA = 3_600_000;

describe('FR-002 ventana de antelación: el día natural siguiente en la zona de la clínica', () => {
  it.each([
    ['2026-11-09T08:00:00+01:00', '2026-11-10', '2026-11-09T23:00:00.000Z', '2026-11-10T23:00:00.000Z', 24],
    ['2027-03-27T08:00:00+01:00', '2027-03-28', '2027-03-27T23:00:00.000Z', '2027-03-28T22:00:00.000Z', 23],
    ['2027-10-30T08:00:00+02:00', '2027-10-31', '2027-10-30T22:00:00.000Z', '2027-10-31T23:00:00.000Z', 25],
  ])('FR-002 ejecución %s → %s (%s – %s, %i h)', (ahora, fecha, desde, hasta, horas) => {
    const v = calcularVentana(new Date(ahora), MADRID);
    expect(v.fechaObjetivo).toBe(fecha);
    expect(v.desde.toISOString()).toBe(desde);
    expect(v.hasta.toISOString()).toBe(hasta);
    expect((v.hasta.getTime() - v.desde.getTime()) / HORA).toBe(horas);
  });

  it.each(['2026-11-09T00:05:00+01:00', '2026-11-09T08:00:00+01:00', '2026-11-09T23:55:00+01:00'])(
    'FR-002 la ventana no depende de la hora de ejecución (%s → martes 10/11/2026)',
    (ahora) => {
      expect(calcularVentana(new Date(ahora), MADRID).fechaObjetivo).toBe('2026-11-10');
    },
  );

  it('FR-002 una clínica en Atlantic/Canary usa su propia medianoche', () => {
    const v = calcularVentana(new Date('2026-11-09T08:00:00Z'), 'Atlantic/Canary');
    expect(v.fechaObjetivo).toBe('2026-11-10');
    expect(v.desde.toISOString()).toBe('2026-11-10T00:00:00.000Z');
    expect(v.hasta.toISOString()).toBe('2026-11-11T00:00:00.000Z');
  });

  it('Edge Cases: la ejecución del domingo 28/03/2027 (cambio de hora) recuerda el lunes 29/03/2027', () => {
    const v = calcularVentana(new Date('2027-03-28T08:00:00+02:00'), MADRID);
    expect(v.fechaObjetivo).toBe('2027-03-29');
    expect(v.desde.toISOString()).toBe('2027-03-28T22:00:00.000Z');
  });
});
