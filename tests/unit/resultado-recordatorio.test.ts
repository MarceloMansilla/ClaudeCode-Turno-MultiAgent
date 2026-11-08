import { describe, expect, it } from 'vitest';
import {
  clasificarCita,
  textoResultado,
  totalizar,
  type ResultadoCita,
} from '@/dominio/resultado-recordatorio';

const AHORA = new Date('2026-11-09T07:00:00Z');
const hace = (min: number) => new Date(AHORA.getTime() - min * 60_000);

describe('FR-004 / FR-005 clasificación de cada cita de la ventana', () => {
  it('FR-004 sin correo → sin_correo', () => {
    expect(clasificarCita({ email: null, recordatorio: null, ahora: AHORA }).tipo).toBe('sin_correo');
    expect(clasificarCita({ email: '  ', recordatorio: null, ahora: AHORA }).tipo).toBe('sin_correo');
  });

  it('FR-004 correo con formato inválido → correo_no_valido', () => {
    expect(clasificarCita({ email: 'ana@', recordatorio: null, ahora: AHORA }).tipo).toBe('correo_no_valido');
    expect(clasificarCita({ email: 'ana arroba x.es', recordatorio: null, ahora: AHORA }).tipo).toBe(
      'correo_no_valido',
    );
  });

  it('FR-002 sin recordatorio → a_enviar; FR-010 fallido → a_enviar (se reintenta)', () => {
    expect(clasificarCita({ email: 'ana@example.com', recordatorio: null, ahora: AHORA }).tipo).toBe('a_enviar');
    expect(
      clasificarCita({
        email: 'ana@example.com',
        recordatorio: { estado: 'fallido', ultimoIntentoEn: hace(60) },
        ahora: AHORA,
      }).tipo,
    ).toBe('a_enviar');
  });

  it('FR-003 enviado → ya_enviado_antes', () => {
    expect(
      clasificarCita({
        email: 'ana@example.com',
        recordatorio: { estado: 'enviado', ultimoIntentoEn: hace(600) },
        ahora: AHORA,
      }).tipo,
    ).toBe('ya_enviado_antes');
  });

  it('FR-003 enviando de ≤ 10 min (otra ejecución en curso) → ya_enviado_antes', () => {
    expect(
      clasificarCita({
        email: 'ana@example.com',
        recordatorio: { estado: 'enviando', ultimoIntentoEn: hace(10) },
        ahora: AHORA,
      }).tipo,
    ).toBe('ya_enviado_antes');
  });

  it('FR-010 enviando de > 10 min → interrumpido (no se reintenta)', () => {
    expect(
      clasificarCita({
        email: 'ana@example.com',
        recordatorio: { estado: 'enviando', ultimoIntentoEn: hace(11) },
        ahora: AHORA,
      }).tipo,
    ).toBe('interrumpido');
  });
});

describe('FR-005 totales y textos del resumen', () => {
  const base = { hora: '09:00', profesional: 'María' };
  const citas: ResultadoCita[] = [
    { ...base, citaId: 'a', resultado: 'enviado' },
    { ...base, citaId: 'b', resultado: 'enviado' },
    { ...base, citaId: 'c', resultado: 'ya_enviado_antes' },
    { ...base, citaId: 'd', resultado: 'sin_correo' },
    { ...base, citaId: 'e', resultado: 'correo_no_valido' },
    { ...base, citaId: 'f', resultado: 'fallido' },
    { ...base, citaId: 'g', resultado: 'fallido', interrumpido: true },
  ];

  it('FR-005 cuenta cada resultado; «fallido (interrumpido)» cuenta en fallidos', () => {
    expect(totalizar(citas)).toEqual({ enviado: 2, yaEnviadoAntes: 1, sinCorreo: 1, correoNoValido: 1, fallido: 2 });
  });

  it('FR-005 textos de cada resultado', () => {
    expect(citas.map(textoResultado)).toEqual([
      'enviado',
      'enviado',
      'ya enviado antes',
      'sin correo',
      'correo no válido',
      'fallido',
      'fallido (interrumpido)',
    ]);
  });
});
