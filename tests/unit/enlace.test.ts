import { describe, expect, it } from 'vitest';
import {
  estadoEnlace,
  PAUSA_MS,
  registrarIntento,
  rutaEnlacePaciente,
  tieneFormatoDeToken,
  ultimasCuatroCifras,
  type IntentosEnlace,
} from '@/dominio/enlace';

const AHORA = new Date('2026-11-09T11:10:00Z');
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abcde';
const limpio: IntentosEnlace = { fallosSeguidos: 0, pausaHasta: null };
const conFallos = (n: number, pausaHasta: Date | null = null): IntentosEnlace => ({ fallosSeguidos: n, pausaHasta });

describe('FR-002 — formato del token', () => {
  it('43 caracteres base64url son un token con formato válido', () => {
    expect(TOKEN).toHaveLength(43);
    expect(tieneFormatoDeToken(TOKEN)).toBe(true);
  });

  it.each([
    ['cortado', TOKEN.slice(0, 42)],
    ['con un carácter de más', `${TOKEN}A`],
    ['con espacios', ` ${TOKEN.slice(1)}`],
    ['con «+»', `+${TOKEN.slice(1)}`],
    ['con «/»', `/${TOKEN.slice(1)}`],
    ['con «=»', `${TOKEN.slice(0, 42)}=`],
    ['vacío', ''],
  ])('edge case «Enlace mal copiado»: %s no tiene formato', (_, token) => {
    expect(tieneFormatoDeToken(token)).toBe(false);
  });
});

describe('FR-008 / FR-006 — ruta y segundo paso', () => {
  it('rutaEnlacePaciente forma /p/<token>', () => {
    expect(rutaEnlacePaciente(TOKEN)).toBe(`/p/${TOKEN}`);
  });

  it('las 4 últimas cifras del teléfono normalizado', () => {
    expect(ultimasCuatroCifras('612345678')).toBe('5678');
  });
});

describe('FR-006a — límite de intentos', () => {
  it('fallos 1–4 → cifras_incorrectas y la cuenta sube', () => {
    for (let previos = 0; previos < 4; previos++) {
      expect(registrarIntento(conFallos(previos), false, AHORA)).toEqual({
        fallosSeguidos: previos + 1,
        pausaHasta: null,
        resultado: 'cifras_incorrectas',
        cambia: true,
      });
    }
  });

  it('el 5.º fallo seguido → en_pausa hasta ahora + 15 min', () => {
    expect(registrarIntento(conFallos(4), false, AHORA)).toEqual({
      fallosSeguidos: 5,
      pausaHasta: new Date(AHORA.getTime() + PAUSA_MS),
      resultado: 'en_pausa',
      cambia: true,
    });
    expect(PAUSA_MS).toBe(15 * 60 * 1000);
  });

  it('durante la pausa, cualquier intento (también el correcto) → en_pausa sin contar', () => {
    const pausa = conFallos(5, new Date(AHORA.getTime() + 60_000));
    for (const acierto of [true, false]) {
      expect(registrarIntento(pausa, acierto, AHORA)).toEqual({ ...pausa, resultado: 'en_pausa', cambia: false });
    }
  });

  it('pasada la pausa, los fallos 6.º–9.º → cifras_incorrectas', () => {
    const pasada = new Date(AHORA.getTime() - 1);
    expect(estadoEnlace(conFallos(5, pasada), AHORA)).toBe('vigente');
    expect(registrarIntento(conFallos(5, pasada), false, AHORA)).toMatchObject({ fallosSeguidos: 6, resultado: 'cifras_incorrectas' });
    expect(registrarIntento(conFallos(8), false, AHORA)).toMatchObject({ fallosSeguidos: 9, resultado: 'cifras_incorrectas' });
  });

  it('la pausa vence exactamente a su hora', () => {
    expect(estadoEnlace(conFallos(5, AHORA), AHORA)).toBe('vigente');
    expect(estadoEnlace(conFallos(5, new Date(AHORA.getTime() + 1)), AHORA)).toBe('en_pausa');
  });

  it('el 10.º fallo seguido → bloqueado; un enlace bloqueado rechaza también el acierto', () => {
    expect(registrarIntento(conFallos(9), false, AHORA)).toMatchObject({ fallosSeguidos: 10, resultado: 'bloqueado', cambia: true });
    expect(estadoEnlace(conFallos(10), AHORA)).toBe('bloqueado');
    expect(registrarIntento(conFallos(10), true, AHORA)).toMatchObject({ fallosSeguidos: 10, resultado: 'bloqueado', cambia: false });
  });

  it('US1 #6 — con 3 fallos, un acierto → acceso y cuenta a 0', () => {
    expect(registrarIntento(conFallos(3), true, AHORA)).toEqual({
      fallosSeguidos: 0,
      pausaHasta: null,
      resultado: 'acceso',
      cambia: true,
    });
  });

  it('un acierto sin fallos previos no necesita guardar nada', () => {
    expect(registrarIntento(limpio, true, AHORA)).toEqual({ ...limpio, resultado: 'acceso', cambia: false });
  });
});
