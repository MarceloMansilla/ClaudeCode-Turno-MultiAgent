/** Spec 004, US2: asignación a semanas (Edge Cases: cambio de hora, semanas vacías). */
import { describe, expect, it } from 'vitest';
import { calcularAnalitica, type CitaAnalitica, type EntradaAnalitica } from '@/dominio/analitica';
import type { EstadoCita } from '@/db/esquema';
import { instanteLocal } from '@/lib/zona';

const ZONA = 'Europe/Madrid';
const MARIA = 'maria';
const JORGE = 'jorge';
const SERV = 'sesion';

function cita(profesionalId: string, estado: EstadoCita, fecha: string, hora: string, minutos = 45): CitaAnalitica {
  const inicio = instanteLocal(fecha, hora, ZONA);
  return { profesionalId, servicioId: SERV, estado, inicio, fin: new Date(inicio.getTime() + minutos * 60_000) };
}

function entrada(ahora: string, citas: CitaAnalitica[]): EntradaAnalitica {
  return {
    ahora: new Date(ahora),
    clinica: { zonaHoraria: ZONA, horaApertura: '09:00', horaCierre: '20:00', diasLaborables: [1, 2, 3, 4, 5] },
    profesionales: [
      { id: MARIA, nombre: 'María' },
      { id: JORGE, nombre: 'Jorge' },
    ],
    servicios: [{ id: SERV, nombre: 'Sesión de fisioterapia', precioCentimos: 4000 }],
    citas,
  };
}

type Resumen = ReturnType<typeof calcularAnalitica>;
const semana = (r: Resumen, lunes: string) => r.semanas.find((s) => s.lunes === lunes)!;

describe('Edge Cases — cambio de horario de invierno (domingo 25/10/2026)', () => {
  const lunes2610 = cita(MARIA, 'completada', '2026-10-26', '09:00');
  const viernes2310 = cita(MARIA, 'completada', '2026-10-23', '19:15');

  it('la cita del lunes 26/10/2026 a las 09:00 (08:00 UTC) pertenece a la semana del 26/10/2026', () => {
    expect(lunes2610.inicio.toISOString()).toBe('2026-10-26T08:00:00.000Z');
    const r = calcularAnalitica(entrada('2026-11-09T12:10:00+01:00', [lunes2610, viernes2310]));
    expect(semana(r, '2026-10-26').porProfesional[0]!.completadas).toBe(1);
    expect(semana(r, '2026-10-26').ingresosCentimos).toBe(4000);
  });

  it('la cita del viernes 23/10/2026 a las 19:15 pertenece a la semana del 19/10/2026', () => {
    const r = calcularAnalitica(entrada('2026-11-09T12:10:00+01:00', [lunes2610, viernes2310]));
    expect(semana(r, '2026-10-19').porProfesional[0]!.completadas).toBe(1);
  });

  it('con «ahora» = lunes 26/10/2026 00:30 el periodo termina el domingo 25/10 y la cita del 26/10 no cuenta', () => {
    const r = calcularAnalitica(entrada('2026-10-26T00:30:00+01:00', [lunes2610, viernes2310]));
    expect(r.periodo.hasta).toBe('2026-10-25');
    expect(r.semanas.at(-1)!.lunes).toBe('2026-10-19');
    expect(r.clinica.completadas).toBe(1);
    expect(r.ingresosTotalCentimos).toBe(4000);
  });

  it('las duraciones se cuentan en minutos reales', () => {
    const r = calcularAnalitica(entrada('2026-11-09T12:10:00+01:00', [cita(JORGE, 'no_asistida', '2026-10-26', '09:00', 60)]));
    expect(semana(r, '2026-10-26').porProfesional[1]!.minutosOcupados).toBe(60);
  });
});

describe('Edge Cases — semana sin citas de un profesional', () => {
  it('tasa null («Sin datos»), ocupación 0 décimas (hay minutos disponibles) e ingresos 0', () => {
    const r = calcularAnalitica(entrada('2026-11-09T12:10:00+01:00', [cita(MARIA, 'completada', '2026-10-05', '10:00')]));
    const vacia = semana(r, '2026-10-12');
    for (const p of vacia.porProfesional) {
      expect(p.tasaNoAsistenciaDecimas).toBeNull();
      expect(p.ocupacionDecimas).toBe(0);
      expect(p.minutosDisponibles).toBe(3300);
    }
    expect(vacia.clinica.tasaNoAsistenciaDecimas).toBeNull();
    expect(vacia.ingresosCentimos).toBe(0);
    expect(r.semanas).toHaveLength(8);
  });
});
