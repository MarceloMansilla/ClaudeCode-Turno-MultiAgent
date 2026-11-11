import { describe, expect, it } from 'vitest';
import { calcularHuecosLibres } from '@/dominio/huecos';
import type { Horario } from '@/dominio/horario';
import type { EstadoCita } from '@/db/esquema';
import { instanteLocal } from '@/lib/zona';

const Z = 'Europe/Madrid';
const HORARIO: Horario = { horaApertura: '09:00', horaCierre: '20:00', diasLaborables: [1, 2, 3, 4, 5] };
const LUNES = '2026-11-16';
const ANTES = new Date('2026-11-09T12:10:00+01:00'); // una semana antes: todo el lunes es futuro

const cita = (desde: string, hasta: string, estado: EstadoCita = 'reservada', fecha = LUNES) => ({
  inicio: instanteLocal(fecha, desde, Z),
  fin: instanteLocal(fecha, hasta, Z),
  estado,
});

describe('FR-006 — huecos libres', () => {
  it('ejemplo de data-model.md: 10:00–10:45 y 12:00–13:00 ocupados', () => {
    const huecos = calcularHuecosLibres(
      LUNES,
      [cita('10:00', '10:45'), cita('12:00', '13:00', 'completada')],
      HORARIO,
      Z,
      ANTES,
    );
    expect(huecos).toEqual([
      { inicio: '09:00', fin: '10:00', reservable: true },
      { inicio: '10:45', fin: '12:00', reservable: true },
      { inicio: '13:00', fin: '20:00', reservable: true },
    ]);
  });

  it('US1 #5 — canceladas y no asistidas no ocupan el hueco', () => {
    const huecos = calcularHuecosLibres(
      LUNES,
      [cita('10:00', '10:45', 'cancelada'), cita('11:00', '11:45', 'no_asistida')],
      HORARIO,
      Z,
      ANTES,
    );
    expect(huecos).toEqual([{ inicio: '09:00', fin: '20:00', reservable: true }]);
  });

  it('día sin citas: un único hueco de 09:00 a 20:00', () => {
    expect(calcularHuecosLibres(LUNES, [], HORARIO, Z, ANTES)).toEqual([
      { inicio: '09:00', fin: '20:00', reservable: true },
    ]);
  });

  it('día no laborable: sin huecos', () => {
    expect(calcularHuecosLibres('2026-11-14', [], HORARIO, Z, ANTES)).toEqual([]);
  });

  it('citas contiguas no dejan hueco entre ellas', () => {
    const huecos = calcularHuecosLibres(
      LUNES,
      [cita('09:00', '09:45'), cita('09:45', '10:30')],
      HORARIO,
      Z,
      ANTES,
    );
    expect(huecos[0]).toEqual({ inicio: '10:30', fin: '20:00', reservable: true });
  });

  it('RN2 — en días pasados ningún hueco es reservable', () => {
    const huecos = calcularHuecosLibres('2026-11-06', [], HORARIO, Z, ANTES);
    expect(huecos).toEqual([{ inicio: '09:00', fin: '20:00', reservable: false }]);
  });

  it('RN2 — hoy a las 12:10 el hueco se parte: pasado hasta 12:15, reservable desde 12:15', () => {
    const hoy = '2026-11-09';
    const huecos = calcularHuecosLibres(hoy, [cita('09:00', '10:00', 'completada', hoy)], HORARIO, Z, ANTES);
    expect(huecos).toEqual([
      { inicio: '10:00', fin: '12:15', reservable: false },
      { inicio: '12:15', fin: '20:00', reservable: true },
    ]);
  });

  it('RN2 — a las 12:15:30 el cuarto de 12:15 ya no es reservable', () => {
    const hoy = '2026-11-09';
    const huecos = calcularHuecosLibres(hoy, [], HORARIO, Z, new Date('2026-11-09T12:15:30+01:00'));
    expect(huecos).toEqual([
      { inicio: '09:00', fin: '12:30', reservable: false },
      { inicio: '12:30', fin: '20:00', reservable: true },
    ]);
  });
});
