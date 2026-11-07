import { describe, expect, it } from 'vitest';
import {
  comprobarHorario,
  esDuracionValida,
  esLaborable,
  esMultiploDe15,
  horasDeInicio,
  type Horario,
} from '@/dominio/horario';

const HORARIO: Horario = {
  horaApertura: '09:00:00',
  horaCierre: '20:00:00',
  diasLaborables: [1, 2, 3, 4, 5],
};
const LUNES = '2026-11-16';

describe('FR-014 — horario y granularidad', () => {
  it('duraciones de servicio: múltiplo de 15 válidas, el resto no', () => {
    for (const d of [15, 30, 45, 60, 90]) expect(esDuracionValida(d)).toBe(true);
    for (const d of [0, 10, 20, 50, -15, 22.5]) expect(esDuracionValida(d)).toBe(false);
  });

  it('las horas de inicio son múltiplos de 15', () => {
    expect(esMultiploDe15('10:00')).toBe(true);
    expect(esMultiploDe15('10:45')).toBe(true);
    expect(esMultiploDe15('10:10')).toBe(false);
  });

  it('Primera visita de fisioterapia (60 min) a las 19:00 → termina 20:00: válida', () => {
    expect(comprobarHorario(LUNES, '19:00', 60, HORARIO)).toBeNull();
  });

  it('US2 #8 — 60 min a las 19:30 termina a las 20:30: fuera de horario', () => {
    expect(comprobarHorario(LUNES, '19:30', 60, HORARIO)).toEqual({
      motivo: 'despues_cierre',
      fin: '20:30',
      cierre: '20:00',
    });
  });

  it('60 min a las 19:15 → fin 20:15: fuera de horario', () => {
    expect(comprobarHorario(LUNES, '19:15', 60, HORARIO)).toMatchObject({ fin: '20:15' });
  });

  it('antes de la apertura (08:45): fuera de horario', () => {
    expect(comprobarHorario(LUNES, '08:45', 45, HORARIO)).toEqual({
      motivo: 'antes_apertura',
      apertura: '09:00',
    });
  });

  it('sábado y domingo no son laborables', () => {
    expect(esLaborable('2026-11-14', HORARIO)).toBe(false);
    expect(esLaborable('2026-11-15', HORARIO)).toBe(false);
    expect(comprobarHorario('2026-11-14', '10:00', 45, HORARIO)).toEqual({ motivo: 'no_laborable' });
    expect(esLaborable(LUNES, HORARIO)).toBe(true);
  });

  it('horas de inicio posibles para 45 min: de 09:00 a 19:15', () => {
    const horas = horasDeInicio(45, HORARIO);
    expect(horas[0]).toBe('09:00');
    expect(horas.at(-1)).toBe('19:15');
    expect(horas).toHaveLength(42);
  });
});
