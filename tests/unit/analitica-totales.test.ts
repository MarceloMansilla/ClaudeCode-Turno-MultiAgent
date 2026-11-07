/**
 * Spec 004, US1: cifras del periodo con la semilla 2026-11-09. Oráculo: «Cifras de referencia»
 * de specs/004-panel-analitica/spec.md (copiadas literalmente).
 */
import { describe, expect, it } from 'vitest';
import { calcularAnalitica, type Indicadores } from '@/dominio/analitica';
import { AHORA_SEMILLA, entradaDeSemilla } from '../helpers/entrada-semilla';

const r = calcularAnalitica(entradaDeSemilla('2026-11-09', AHORA_SEMILLA));
const fila = (nombre: string) => r.profesionales.find((p) => p.nombre === nombre)!;

describe('US1 #3 — periodo', () => {
  it('14/09/2026 – 08/11/2026, sin la semana en curso', () => {
    expect(r.periodo).toEqual({ desde: '2026-09-14', hasta: '2026-11-08', etiqueta: '14/09/2026 – 08/11/2026' });
    expect(r.hayDatos).toBe(true);
  });
});

describe('Totales del periodo por profesional (tabla de la spec)', () => {
  it.each([
    // nombre, C, NA, Can, min C, min NA, min Can, min disponibles
    ['María', 349, 41, 34, 16875, 2025, 1635, 26400],
    ['Jorge', 335, 50, 32, 16365, 2430, 1605, 26400],
    ['Lucía', 484, 52, 48, 16320, 1725, 1620, 26400],
  ])('%s: %i / %i / %i', (nombre, c, na, can, minC, minNa, minCan, disp) => {
    expect(fila(nombre)).toMatchObject({
      completadas: c,
      noAsistidas: na,
      canceladas: can,
      reservadas: 0,
      minutosCompletadas: minC,
      minutosNoAsistidas: minNa,
      minutosCanceladas: minCan,
      minutosDisponibles: disp,
    });
  });

  it('Clínica: 1.168 / 143 / 114 (1.425 citas), 49.560 / 6.180 / 4.860 min de 79.200', () => {
    expect(r.clinica).toMatchObject({
      completadas: 1168,
      noAsistidas: 143,
      canceladas: 114,
      minutosCompletadas: 49560,
      minutosNoAsistidas: 6180,
      minutosCanceladas: 4860,
      minutosDisponibles: 79200,
    });
  });
});

describe('US1 #5, FR-006 — tasa de no asistencia = NA ÷ (C + NA)', () => {
  it.each([
    ['María', 41, 390, 105],
    ['Jorge', 50, 385, 130],
    ['Lucía', 52, 536, 97],
  ])('%s: %i de %i → %i décimas', (nombre, na, den, tasa) => {
    const p = fila(nombre);
    expect(p.noAsistidas).toBe(na);
    expect(p.completadas + p.noAsistidas).toBe(den);
    expect(p.tasaNoAsistenciaDecimas).toBe(tasa);
  });

  it('Clínica: 143 de 1.311 → 109 décimas («10,9 %»)', () => {
    expect(r.clinica.noAsistidas).toBe(143);
    expect(r.clinica.completadas + r.clinica.noAsistidas).toBe(1311);
    expect(r.clinica.tasaNoAsistenciaDecimas).toBe(109);
  });
});

describe('US1 #6, FR-008, FR-009 — ocupación = minutos ocupados ÷ disponibles', () => {
  it.each([
    ['María', 18900, 716],
    ['Jorge', 18795, 712],
    ['Lucía', 18045, 684],
  ])('%s: %i de 26.400 min → %i décimas', (nombre, ocupados, ocupacion) => {
    expect(fila(nombre).minutosOcupados).toBe(ocupados);
    expect(fila(nombre).ocupacionDecimas).toBe(ocupacion);
  });

  it('Clínica: 55.740 de 79.200 min → 704 décimas (Σ ocupados ÷ Σ disponibles)', () => {
    expect(r.clinica.minutosOcupados).toBe(55740);
    expect(r.clinica.minutosDisponibles).toBe(79200);
    expect(r.clinica.ocupacionDecimas).toBe(704);
  });
});

describe('US1 #4, FR-010, FR-011 — ingresos por servicio (citas completadas)', () => {
  it('cuatro servicios en el orden del catálogo, al céntimo', () => {
    expect(r.ingresosPorServicio.map(({ nombre, precioCentimos, citas, importeCentimos }) => [nombre, precioCentimos, citas, importeCentimos])).toEqual([
      ['Sesión de fisioterapia', 4000, 520, 2080000],
      ['Primera visita de fisioterapia', 5000, 164, 820000],
      ['Consulta de nutrición', 3500, 364, 1274000],
      ['Primera visita de nutrición', 4500, 120, 540000],
    ]);
  });

  it('total 4.714.000 céntimos = suma de los servicios; 1.168 citas completadas', () => {
    expect(r.ingresosTotalCentimos).toBe(4714000);
    expect(r.ingresosPorServicio.reduce((s, i) => s + i.importeCentimos, 0)).toBe(r.ingresosTotalCentimos);
    expect(r.ingresosPorServicio.reduce((s, i) => s + i.citas, 0)).toBe(r.clinica.completadas);
  });
});

describe('Invariante 2 — la clínica es la suma de sus profesionales', () => {
  const claves: (keyof Indicadores)[] = [
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
  it.each(claves)('clinica.%s = Σ profesionales', (clave) => {
    expect(r.clinica[clave]).toBe(r.profesionales.reduce((s, p) => s + (p[clave] as number), 0));
  });

  it('profesionales en el orden de la agenda', () => {
    expect(r.profesionales.map((p) => p.nombre)).toEqual(['María', 'Jorge', 'Lucía']);
  });
});
