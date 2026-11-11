import { describe, expect, it } from 'vitest';
import { seSolapan } from '@/dominio/solape';

const t = (hhmm: string) => new Date(`2026-11-16T${hhmm}:00+01:00`);
const cita = (desde: string, hasta: string) => ({ inicio: t(desde), fin: t(hasta) });
const BASE = cita('10:00', '10:45');

describe('RN1 / FR-011 — solape de intervalos semiabiertos [inicio, fin)', () => {
  it.each([
    ['parcial por el inicio', cita('09:30', '10:15')],
    ['parcial por el final', cita('10:30', '11:30')],
    ['contenida', cita('10:15', '10:30')],
    ['contenedora', cita('09:00', '12:00')],
    ['idéntica', cita('10:00', '10:45')],
  ])('se solapan: %s', (_caso, otra) => {
    expect(seSolapan(BASE, otra)).toBe(true);
    expect(seSolapan(otra, BASE)).toBe(true);
  });

  it.each([
    ['contigua después (10:45)', cita('10:45', '11:30')],
    ['contigua antes (termina 10:00)', cita('09:15', '10:00')],
    ['separada', cita('12:00', '12:45')],
  ])('no se solapan: %s', (_caso, otra) => {
    expect(seSolapan(BASE, otra)).toBe(false);
    expect(seSolapan(otra, BASE)).toBe(false);
  });
});
