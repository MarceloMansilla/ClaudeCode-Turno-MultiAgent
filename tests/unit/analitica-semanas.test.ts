/**
 * Spec 004, US2: evolución semanal con la semilla 2026-11-09. Oráculo: tablas «Por semana y
 * profesional» y «Por semana: clínica e ingresos» de la spec, copiadas literalmente.
 */
import { describe, expect, it } from 'vitest';
import { calcularAnalitica, type Indicadores, type ResumenAnalitica } from '@/dominio/analitica';
import { instanteLocal } from '@/lib/zona';
import { AHORA_SEMILLA, entradaDeSemilla } from '../helpers/entrada-semilla';

const r = calcularAnalitica(entradaDeSemilla('2026-11-09', AHORA_SEMILLA));
const semana = (lunes: string) => r.semanas.find((s) => s.lunes === lunes)!;
const de = (lunes: string, nombre: string) => semana(lunes).porProfesional.find((p) => p.nombre === nombre)!;

// Semana del, profesional, C, NA, Can, min C, min NA, min Can
const POR_SEMANA_Y_PROFESIONAL: [string, string, number, number, number, number, number, number][] = [
  ['2026-09-14', 'María', 36, 7, 5, 1815, 330, 240],
  ['2026-09-14', 'Jorge', 39, 9, 6, 1860, 420, 285],
  ['2026-09-14', 'Lucía', 62, 4, 4, 2115, 135, 120],
  ['2026-09-21', 'María', 40, 9, 7, 1920, 450, 345],
  ['2026-09-21', 'Jorge', 43, 7, 4, 2115, 360, 210],
  ['2026-09-21', 'Lucía', 55, 6, 6, 1770, 180, 195],
  ['2026-09-28', 'María', 44, 5, 8, 2130, 225, 390],
  ['2026-09-28', 'Jorge', 40, 6, 3, 1935, 300, 150],
  ['2026-09-28', 'Lucía', 57, 5, 10, 1920, 165, 345],
  ['2026-10-05', 'María', 46, 3, 5, 2175, 150, 240],
  ['2026-10-05', 'Jorge', 43, 6, 4, 2100, 300, 195],
  ['2026-10-05', 'Lucía', 62, 9, 4, 2130, 285, 120],
  ['2026-10-12', 'María', 45, 6, 1, 2145, 285, 45],
  ['2026-10-12', 'Jorge', 47, 7, 3, 2280, 360, 165],
  ['2026-10-12', 'Lucía', 67, 3, 3, 2325, 105, 105],
  ['2026-10-19', 'María', 42, 7, 4, 1995, 375, 180],
  ['2026-10-19', 'Jorge', 43, 5, 6, 2070, 240, 300],
  ['2026-10-19', 'Lucía', 62, 8, 3, 2040, 285, 105],
  ['2026-10-26', 'María', 46, 3, 1, 2265, 150, 45],
  ['2026-10-26', 'Jorge', 39, 8, 2, 1965, 360, 105],
  ['2026-10-26', 'Lucía', 53, 11, 10, 1770, 360, 360],
  ['2026-11-02', 'María', 50, 1, 3, 2430, 60, 150],
  ['2026-11-02', 'Jorge', 41, 2, 4, 2040, 90, 195],
  ['2026-11-02', 'Lucía', 66, 6, 8, 2250, 210, 270],
];

describe('US2 #1 — 8 semanas en orden cronológico', () => {
  it('de la semana del 14/09/2026 a la del 02/11/2026', () => {
    expect(r.semanas.map((s) => s.lunes)).toEqual([
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ]);
  });
});

describe('Tabla «Por semana y profesional» (24 filas)', () => {
  it.each(POR_SEMANA_Y_PROFESIONAL)('semana %s, %s: %i / %i / %i', (lunes, nombre, c, na, can, minC, minNa, minCan) => {
    expect(de(lunes, nombre)).toMatchObject({
      completadas: c,
      noAsistidas: na,
      canceladas: can,
      minutosCompletadas: minC,
      minutosNoAsistidas: minNa,
      minutosCanceladas: minCan,
      minutosDisponibles: 3300,
    });
  });
});

describe('Por semana: clínica e ingresos', () => {
  it('US2 #3 — no asistencia semanal de la clínica en décimas', () => {
    expect(r.semanas.map((s) => s.clinica.tasaNoAsistenciaDecimas)).toEqual([127, 138, 102, 107, 91, 120, 138, 54]);
    const primera = semana('2026-09-14').clinica;
    const ultima = semana('2026-11-02').clinica;
    expect([primera.noAsistidas, primera.completadas + primera.noAsistidas]).toEqual([20, 157]);
    expect([ultima.noAsistidas, ultima.completadas + ultima.noAsistidas]).toEqual([9, 166]);
  });

  it('ocupación semanal de la clínica en décimas', () => {
    expect(r.semanas.map((s) => s.clinica.ocupacionDecimas)).toEqual([674, 686, 674, 721, 758, 708, 694, 715]);
  });

  it('recuentos semanales de la clínica (C / NA / Can)', () => {
    expect(r.semanas.map((s) => [s.clinica.completadas, s.clinica.noAsistidas, s.clinica.canceladas])).toEqual([
      [137, 20, 15],
      [138, 22, 17],
      [141, 16, 21],
      [151, 18, 13],
      [159, 16, 7],
      [147, 20, 13],
      [138, 22, 13],
      [157, 9, 15],
    ]);
  });

  it('US2 #2, FR-012 — ingresos semanales al céntimo', () => {
    expect(r.semanas.map((s) => s.ingresosCentimos)).toEqual([554000, 552500, 568500, 609000, 642500, 585000, 564500, 638000]);
  });

  it('ocupación de la semana del 02/11 por profesional: 75,5 / 64,5 / 74,5 %', () => {
    expect(semana('2026-11-02').porProfesional.map((p) => [p.minutosOcupados, p.ocupacionDecimas])).toEqual([
      [2490, 755],
      [2130, 645],
      [2460, 745],
    ]);
  });
});

describe('US2 #4 — semana de mayor ocupación de Jorge', () => {
  it('la del 12/10/2026 con 800 décimas (2.640 de 3.300 min)', () => {
    const jorge = r.semanas.map((s) => ({ lunes: s.lunes, ...s.porProfesional.find((p) => p.nombre === 'Jorge')! }));
    const maxima = jorge.reduce((a, b) => ((b.ocupacionDecimas ?? 0) > (a.ocupacionDecimas ?? 0) ? b : a));
    expect([maxima.lunes, maxima.ocupacionDecimas, maxima.minutosOcupados, maxima.minutosDisponibles]).toEqual([
      '2026-10-12',
      800,
      2640,
      3300,
    ]);
  });
});

describe('US2 #5 — detalle de la semana del 02/11/2026', () => {
  it('María 50/1/3, Jorge 41/2/4, Lucía 66/6/8', () => {
    expect(semana('2026-11-02').porProfesional.map((p) => [p.nombre, p.completadas, p.noAsistidas, p.canceladas])).toEqual([
      ['María', 50, 1, 3],
      ['Jorge', 41, 2, 4],
      ['Lucía', 66, 6, 8],
    ]);
  });
});

describe('FR-007 — tasas semanales por profesional', () => {
  it('Lucía, semana del 26/10/2026: 11 de 64 → 172 décimas', () => {
    const l = de('2026-10-26', 'Lucía');
    expect([l.noAsistidas, l.completadas + l.noAsistidas, l.tasaNoAsistenciaDecimas]).toEqual([11, 64, 172]);
  });

  it('María, semana del 02/11/2026: 1 de 51 → 20 décimas', () => {
    const m = de('2026-11-02', 'María');
    expect([m.noAsistidas, m.completadas + m.noAsistidas, m.tasaNoAsistenciaDecimas]).toEqual([1, 51, 20]);
  });
});

const SUMABLES: (keyof Indicadores)[] = [
  'completadas',
  'noAsistidas',
  'canceladas',
  'reservadas',
  'minutosCompletadas',
  'minutosNoAsistidas',
  'minutosCanceladas',
  'minutosOcupados',
  'minutosDisponibles',
];

function comprobarInvariantes(res: ResumenAnalitica) {
  // Invariante 1: Σ semanas = total = Σ servicios.
  expect(res.semanas.reduce((s, x) => s + x.ingresosCentimos, 0)).toBe(res.ingresosTotalCentimos);
  expect(res.ingresosPorServicio.reduce((s, x) => s + x.importeCentimos, 0)).toBe(res.ingresosTotalCentimos);
  // Invariante 2 en cada semana.
  for (const s of res.semanas) {
    for (const k of SUMABLES) expect(s.clinica[k]).toBe(s.porProfesional.reduce((t, p) => t + (p[k] as number), 0));
  }
  // Invariante 3: Σ semanas de cada profesional = sus totales.
  res.profesionales.forEach((p, i) => {
    for (const k of SUMABLES) expect(res.semanas.reduce((t, s) => t + (s.porProfesional[i]![k] as number), 0)).toBe(p[k]);
  });
  // Invariante 4: 8 semanas.
  expect(res.semanas).toHaveLength(8);
}

describe('Invariantes 1–3 con la semilla 2026-11-09', () => {
  it('Σ semanas = total = Σ servicios = 47.140,00 €, y Σ semanas por profesional = sus totales', () => {
    expect(r.ingresosTotalCentimos).toBe(4714000);
    comprobarInvariantes(r);
  });
});

describe('SC-002 — en cualquier conjunto de datos las sumas cuadran al céntimo', () => {
  it.each(['2026-03-30', '2026-06-15', '2026-11-09', '2027-01-11'])('semilla con fecha de referencia %s', (referencia) => {
    const res = calcularAnalitica(entradaDeSemilla(referencia, instanteLocal(referencia, '12:10', 'Europe/Madrid')));
    expect(res.hayDatos).toBe(true);
    expect(res.ingresosTotalCentimos).toBeGreaterThan(0);
    comprobarInvariantes(res);
  });
});
