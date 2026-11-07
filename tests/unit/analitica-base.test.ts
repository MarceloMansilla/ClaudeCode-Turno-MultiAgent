/** Reglas base de la analítica (spec 004: FR-004, FR-005, FR-008; research R2–R4). */
import { describe, expect, it } from 'vitest';
import { decimas, lunesDe, minutosDisponiblesSemana, periodoAnalitica } from '@/dominio/analitica';
import { fechaLocal, instanteLocal, sumarDias } from '@/lib/zona';

const MADRID = 'Europe/Madrid';
const CANARIAS = 'Atlantic/Canary';
const ELEVA = { horaApertura: '09:00:00', horaCierre: '20:00:00', diasLaborables: [1, 2, 3, 4, 5] };

describe('FR-005 — semana de lunes a domingo', () => {
  it.each([
    ['2026-11-11', '2026-11-09'],
    ['2026-11-09', '2026-11-09'],
    ['2026-11-08', '2026-11-02'],
    ['2026-10-25', '2026-10-19'],
  ])('lunesDe(%s) → %s', (fecha, lunes) => {
    expect(lunesDe(fecha)).toBe(lunes);
  });
});

describe('FR-004 — periodo: 8 semanas completas anteriores a la semana en curso', () => {
  it.each([
    ['2026-11-09T12:10:00+01:00', '2026-09-14', '2026-11-02', '2026-11-09'],
    ['2026-11-08T23:59:00+01:00', '2026-09-07', '2026-10-26', '2026-11-02'],
    ['2026-10-26T00:30:00+01:00', '2026-08-31', '2026-10-19', '2026-10-26'],
  ])('ahora %s → lunes %s … %s, hasta %s 00:00 local', (ahora, primero, ultimo, hasta) => {
    const p = periodoAnalitica(new Date(ahora), MADRID);
    expect(p.lunes).toHaveLength(8);
    expect(p.lunes[0]).toBe(primero);
    expect(p.lunes[7]).toBe(ultimo);
    for (let i = 1; i < 8; i++) expect(p.lunes[i]).toBe(sumarDias(p.lunes[i - 1]!, 7));
    expect(p.desde).toEqual(instanteLocal(primero, '00:00', MADRID));
    expect(p.hasta).toEqual(instanteLocal(hasta, '00:00', MADRID));
  });

  it('con «ahora» = 09/11/2026 12:10 el periodo es 14/09/2026 – 08/11/2026 en UTC exacto', () => {
    const p = periodoAnalitica(new Date('2026-11-09T12:10:00+01:00'), MADRID);
    expect(p.desde.toISOString()).toBe('2026-09-13T22:00:00.000Z'); // horario de verano
    expect(p.hasta.toISOString()).toBe('2026-11-08T23:00:00.000Z'); // horario de invierno
  });

  it('respeta la zona de la clínica: en Atlantic/Canary el corte es una hora más tarde en UTC', () => {
    const ahora = new Date('2026-11-09T12:10:00+01:00');
    const madrid = periodoAnalitica(ahora, MADRID);
    const canarias = periodoAnalitica(ahora, CANARIAS);
    expect(canarias.lunes).toEqual(madrid.lunes);
    expect(canarias.desde.getTime() - madrid.desde.getTime()).toBe(3_600_000);
    expect(canarias.hasta.getTime() - madrid.hasta.getTime()).toBe(3_600_000);
    expect(canarias.hasta.toISOString()).toBe('2026-11-09T00:00:00.000Z');
  });

  it('Edge Cases — página abierta durante el cambio de semana: el periodo avanza una semana sin solaparse ni dejar huecos', () => {
    const antes = periodoAnalitica(new Date('2026-11-08T23:59:00+01:00'), MADRID);
    const despues = periodoAnalitica(new Date('2026-11-09T00:00:00+01:00'), MADRID);
    expect([antes.lunes[0], fechaLocal(new Date(antes.hasta.getTime() - 1), MADRID)]).toEqual([
      '2026-09-07',
      '2026-11-01',
    ]);
    expect([despues.lunes[0], fechaLocal(new Date(despues.hasta.getTime() - 1), MADRID)]).toEqual([
      '2026-09-14',
      '2026-11-08',
    ]);
    // La semana nueva empieza justo donde terminaba el periodo anterior.
    expect(instanteLocal(despues.lunes[7]!, '00:00', MADRID)).toEqual(antes.hasta);
    expect(despues.lunes.slice(0, 7)).toEqual(antes.lunes.slice(1));
    expect(despues.desde.getTime() - antes.desde.getTime()).toBe(7 * 24 * 3_600_000);
  });
});

describe('Principio II — porcentajes en décimas enteras, redondeo de la mitad hacia arriba', () => {
  it.each([
    [41, 390, 105],
    [1, 16, 63],
    [2, 47, 43],
    [22, 160, 138],
    [2640, 3300, 800],
    [0, 7, 0],
    [7, 7, 1000],
  ])('decimas(%i, %i) → %i', (num, den, esperado) => {
    expect(decimas(num, den)).toBe(esperado);
  });

  it('denominador 0 → null («Sin datos»)', () => {
    expect(decimas(5, 0)).toBeNull();
    expect(decimas(0, 0)).toBeNull();
  });
});

describe('FR-008 — minutos disponibles por profesional y semana', () => {
  it('L–V 09:00–20:00 → 5 × 660 = 3.300', () => {
    expect(minutosDisponiblesSemana(ELEVA, '2026-11-02')).toBe(3300);
  });

  it('también en la semana del 19/10/2026, que termina con el cambio de hora', () => {
    expect(minutosDisponiblesSemana(ELEVA, '2026-10-19')).toBe(3300);
  });

  it('sale de la configuración de la clínica, no de una constante', () => {
    expect(
      minutosDisponiblesSemana({ horaApertura: '10:00', horaCierre: '14:00', diasLaborables: [1, 3, 6] }, '2026-11-02'),
    ).toBe(3 * 240);
  });
});
