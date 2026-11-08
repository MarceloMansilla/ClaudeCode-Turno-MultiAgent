import { describe, expect, it } from 'vitest';
import {
  diaSemanaIso,
  esFechaValida,
  fechaLocal,
  horaLocal,
  instanteLocal,
  rangoDelDia,
  sumarDias,
} from '@/lib/zona';

const MADRID = 'Europe/Madrid';
const CANARIAS = 'Atlantic/Canary';

describe('Principio II — hora local de la clínica', () => {
  it('convierte la hora local de Madrid en invierno (UTC+1) a UTC', () => {
    expect(instanteLocal('2026-11-16', '10:00', MADRID).toISOString()).toBe(
      '2026-11-16T09:00:00.000Z',
    );
  });

  it('convierte la hora local de Madrid en verano (UTC+2) a UTC', () => {
    expect(instanteLocal('2026-07-15', '10:00', MADRID).toISOString()).toBe(
      '2026-07-15T08:00:00.000Z',
    );
  });

  it('Canarias va una hora por detrás de la península', () => {
    const peninsula = instanteLocal('2026-11-16', '10:00', MADRID);
    const canarias = instanteLocal('2026-11-16', '10:00', CANARIAS);
    expect(canarias.getTime() - peninsula.getTime()).toBe(60 * 60_000);
  });

  it('ida y vuelta: instante → fecha y hora locales', () => {
    const i = instanteLocal('2026-11-16', '19:45', MADRID);
    expect(fechaLocal(i, MADRID)).toBe('2026-11-16');
    expect(horaLocal(i, MADRID)).toBe('19:45');
  });

  it.each([
    ['2026-03-29', 'cambio a horario de verano'],
    ['2026-10-25', 'cambio a horario de invierno'],
  ])('el %s (%s) no altera duraciones dentro del horario 09:00–20:00', (fecha) => {
    const abre = instanteLocal(fecha, '09:00', MADRID);
    const cierra = instanteLocal(fecha, '20:00', MADRID);
    expect(cierra.getTime() - abre.getTime()).toBe(11 * 60 * 60_000);
    // 09:30 + 45 min sigue siendo 10:15 local.
    const fin = new Date(instanteLocal(fecha, '09:30', MADRID).getTime() + 45 * 60_000);
    expect(horaLocal(fin, MADRID)).toBe('10:15');
  });

  it('el día del cambio de hora de octubre dura 25 horas', () => {
    const { desde, hasta } = rangoDelDia('2026-10-25', MADRID);
    expect(hasta.getTime() - desde.getTime()).toBe(25 * 60 * 60_000);
  });

  it('calcula días de la semana ISO y suma días', () => {
    expect(diaSemanaIso('2026-11-09')).toBe(1); // lunes
    expect(diaSemanaIso('2026-11-15')).toBe(7); // domingo
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(sumarDias('2026-11-09', -1)).toBe('2026-11-08');
  });

  it('valida fechas', () => {
    expect(esFechaValida('2026-11-16')).toBe(true);
    expect(esFechaValida('2026-02-30')).toBe(false);
    expect(esFechaValida('16/11/2026')).toBe(false);
  });
});
