import { describe, expect, it } from 'vitest';
import { formatearFecha, formatearHora, formatearPrecio, formatearRango } from '@/lib/formato';
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
