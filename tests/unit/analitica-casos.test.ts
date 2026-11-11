/** Spec 004, US1: casos sintéticos del periodo (Edge Cases, FR-004, FR-006, FR-010, Principio II). */
import { describe, expect, it } from 'vitest';
import { calcularAnalitica, type CitaAnalitica, type EntradaAnalitica } from '@/dominio/analitica';
import type { EstadoCita } from '@/db/esquema';
import { instanteLocal } from '@/lib/zona';

const ZONA = 'Europe/Madrid';
const A = 'prof-a';
const B = 'prof-b';
const S1 = 'serv-37-50';
const S2 = 'serv-45-00';

function cita(profesionalId: string, servicioId: string, estado: EstadoCita, fecha: string, hora: string, minutos = 45): CitaAnalitica {
  const inicio = instanteLocal(fecha, hora, ZONA);
  return { profesionalId, servicioId, estado, inicio, fin: new Date(inicio.getTime() + minutos * 60_000) };
}

function entrada(citas: CitaAnalitica[]): EntradaAnalitica {
  return {
    ahora: new Date('2026-11-09T12:10:00+01:00'),
    clinica: { zonaHoraria: ZONA, horaApertura: '09:00', horaCierre: '20:00', diasLaborables: [1, 2, 3, 4, 5] },
    profesionales: [
      { id: A, nombre: 'Ana' },
      { id: B, nombre: 'Bruno' },
    ],
    servicios: [
      { id: S1, nombre: 'Servicio de 37,50 €', precioCentimos: 3750 },
      { id: S2, nombre: 'Servicio de 45,00 €', precioCentimos: 4500 },
    ],
    citas,
  };
}

const prof = (r: ReturnType<typeof calcularAnalitica>, id: string) => r.profesionales.find((p) => p.profesionalId === id)!;

describe('Edge Cases — cita pasada que sigue «reservada»', () => {
  it('suma sus 45 min a la ocupación y nada a la tasa ni a los ingresos', () => {
    const r = calcularAnalitica(
      entrada([cita(A, S1, 'completada', '2026-11-02', '10:00', 60), cita(A, S1, 'reservada', '2026-11-03', '10:00', 45)]),
    );
    const a = prof(r, A);
    expect(a.reservadas).toBe(1);
    expect(a.minutosOcupados).toBe(105);
    expect(a.completadas + a.noAsistidas).toBe(1);
    expect(a.tasaNoAsistenciaDecimas).toBe(0);
    expect(r.ingresosTotalCentimos).toBe(3750);
  });
});

describe('FR-006 — canceladas fuera del numerador y del denominador', () => {
  it('1 no asistida, 3 completadas y 4 canceladas → 1 de 4 = 25,0 %', () => {
    const r = calcularAnalitica(
      entrada([
        cita(A, S1, 'no_asistida', '2026-10-05', '09:00'),
        ...['10:00', '11:00', '12:00'].map((h) => cita(A, S1, 'completada', '2026-10-05', h)),
        ...['13:00', '14:00', '15:00', '16:00'].map((h) => cita(A, S1, 'cancelada', '2026-10-05', h)),
      ]),
    );
    expect(prof(r, A).tasaNoAsistenciaDecimas).toBe(250);
    expect(prof(r, A).canceladas).toBe(4);
    // Canceladas no ocupan (FR-008): 4 × 45 min de citas que cuentan.
    expect(prof(r, A).minutosOcupados).toBe(180);
    expect(prof(r, A).minutosCanceladas).toBe(180);
  });

  it('profesional sin completadas ni no asistidas → tasa null («Sin datos»), ocupación 0', () => {
    const r = calcularAnalitica(entrada([cita(A, S1, 'completada', '2026-10-05', '10:00'), cita(B, S1, 'cancelada', '2026-10-05', '10:00')]));
    expect(prof(r, B).tasaNoAsistenciaDecimas).toBeNull();
    expect(prof(r, B).ocupacionDecimas).toBe(0);
  });
});

describe('FR-010 — ingresos por servicio', () => {
  it('servicio sin citas completadas aparece con 0 citas y 0 céntimos', () => {
    const r = calcularAnalitica(entrada([cita(A, S1, 'completada', '2026-10-05', '10:00'), cita(A, S2, 'no_asistida', '2026-10-05', '11:00')]));
    expect(r.ingresosPorServicio.map((i) => [i.servicioId, i.citas, i.importeCentimos])).toEqual([
      [S1, 1, 3750],
      [S2, 0, 0],
    ]);
  });

  it('Principio II — 3 × 37,50 € + 1 × 45,00 € = 157,50 € exactos (15.750 céntimos)', () => {
    const r = calcularAnalitica(
      entrada([
        cita(A, S1, 'completada', '2026-10-05', '09:00'),
        cita(A, S1, 'completada', '2026-10-05', '10:00'),
        cita(B, S1, 'completada', '2026-10-06', '10:00'),
        cita(B, S2, 'completada', '2026-10-07', '10:00'),
      ]),
    );
    expect(r.ingresosTotalCentimos).toBe(15750);
    expect(r.ingresosPorServicio[0]!.importeCentimos).toBe(11250);
  });
});

describe('FR-004 — solo cuentan las 8 semanas completas anteriores', () => {
  it('se ignoran las citas de la semana en curso (aunque estén completadas) y las anteriores al primer lunes', () => {
    const r = calcularAnalitica(
      entrada([
        cita(A, S1, 'completada', '2026-11-09', '09:00'), // semana en curso
        cita(A, S1, 'completada', '2026-09-11', '10:00'), // viernes antes del periodo
        cita(A, S1, 'completada', '2026-09-14', '09:00'), // primer día del periodo
        cita(A, S1, 'completada', '2026-11-06', '19:15'), // último día laborable del periodo
      ]),
    );
    expect(prof(r, A).completadas).toBe(2);
    expect(r.ingresosTotalCentimos).toBe(7500);
  });
});

describe('Edge Cases — Sin historia', () => {
  it('sin citas en el periodo → hayDatos = false', () => {
    expect(calcularAnalitica(entrada([])).hayDatos).toBe(false);
    expect(calcularAnalitica(entrada([cita(A, S1, 'completada', '2026-11-10', '10:00')])).hayDatos).toBe(false);
  });

  it('solo citas pasadas aún reservadas (ninguna con desenlace) → hayDatos = false', () => {
    expect(calcularAnalitica(entrada([cita(A, S1, 'reservada', '2026-11-02', '10:00')])).hayDatos).toBe(false);
  });

  it('una sola cancelada ya es historia → hayDatos = true', () => {
    expect(calcularAnalitica(entrada([cita(A, S1, 'cancelada', '2026-11-02', '10:00')])).hayDatos).toBe(true);
  });
});

describe('Determinismo', () => {
  it('misma entrada → mismo resultado', () => {
    const citas = [cita(A, S1, 'completada', '2026-10-05', '10:00'), cita(B, S2, 'no_asistida', '2026-10-20', '12:00')];
    expect(calcularAnalitica(entrada(citas))).toEqual(calcularAnalitica(entrada(citas)));
  });
});
