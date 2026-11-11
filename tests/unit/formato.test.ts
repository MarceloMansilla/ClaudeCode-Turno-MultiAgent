import { describe, expect, it } from 'vitest';
import {
  formatearEntero,
  formatearFecha,
  formatearHora,
  formatearLimite,
  formatearPorcentaje,
  formatearPrecio,
  formatearRango,
} from '@/lib/formato';
import { instanteLocal } from '@/lib/zona';

const NBSP = ' ';

describe('Principio II — formato español', () => {
  it('fecha con día de la semana y día antes que mes: «lunes, 16/11/2026»', () => {
    expect(formatearFecha('2026-11-16')).toBe('lunes, 16/11/2026');
    expect(formatearFecha('2026-11-10')).toBe('martes, 10/11/2026');
  });

  it('hora en formato de 24 h en la hora local de la clínica', () => {
    expect(formatearHora(instanteLocal('2026-11-16', '19:45', 'Europe/Madrid'), 'Europe/Madrid')).toBe(
      '19:45',
    );
  });

  it('rango «10:00–10:45» con guion largo', () => {
    expect(formatearRango('10:00', '10:45')).toBe('10:00–10:45');
  });

  it.each([
    [4000, `40,00${NBSP}€`],
    [5000, `50,00${NBSP}€`],
    [3500, `35,00${NBSP}€`],
    [4500, `45,00${NBSP}€`],
    [5, `0,05${NBSP}€`],
  ])('precio %i céntimos → %s', (centimos, esperado) => {
    expect(formatearPrecio(centimos)).toBe(esperado);
  });

  it('rechaza importes que no sean céntimos enteros', () => {
    expect(() => formatearPrecio(40.5)).toThrow();
  });
});

describe('Principio II — enteros y porcentajes (clarificación 2026-11-07: separador de miles siempre)', () => {
  it.each([
    [1311, '1.311'],
    [3300, '3.300'],
    [47, '47'],
    [0, '0'],
  ])('formatearEntero(%i) → «%s»', (n, esperado) => {
    expect(formatearEntero(n)).toBe(esperado);
  });

  it.each([
    [105, `10,5${NBSP}%`],
    [800, `80,0${NBSP}%`],
    [0, `0,0${NBSP}%`],
    [1000, `100,0${NBSP}%`],
  ])('formatearPorcentaje(%i décimas) → «%s»', (decimas, esperado) => {
    expect(formatearPorcentaje(decimas)).toBe(esperado);
  });

  it('formatearPorcentaje(null) → «Sin datos» (denominador 0)', () => {
    expect(formatearPorcentaje(null)).toBe('Sin datos');
  });

  it('importes con separador de miles: «5.540,00 €» y «47.140,00 €»', () => {
    expect(formatearPrecio(554000)).toBe(`5.540,00${NBSP}€`);
    expect(formatearPrecio(4714000)).toBe(`47.140,00${NBSP}€`);
  });

  it('solo acepta enteros', () => {
    expect(() => formatearEntero(1.5)).toThrow();
    expect(() => formatearPorcentaje(10.5)).toThrow();
  });
});

describe('formatearLimite (spec 005, FR-016)', () => {
  it('«domingo, 15/11/2026 a las 10:00» en la hora local de la clínica', () => {
    expect(formatearLimite(new Date('2026-11-15T09:00:00Z'), 'Europe/Madrid')).toBe('domingo, 15/11/2026 a las 10:00');
    expect(formatearLimite(new Date('2026-11-15T09:00:00Z'), 'Atlantic/Canary')).toBe('domingo, 15/11/2026 a las 09:00');
  });
});
