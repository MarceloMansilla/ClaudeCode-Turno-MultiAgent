import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  crearTokenAcceso,
  huella,
  opcionesCookieAcceso,
  tokenDeRuta,
  verificarTokenAcceso,
} from '@/lib/acceso-paciente';
import { fijarAhora } from '@/lib/reloj';
import { crearToken } from '@/lib/token-sesion';

const TOKEN = 'AnaAnaAnaAnaAnaAnaAnaAnaAnaAnaAnaAnaAnaAna0';
const OTRO = 'LuisLuisLuisLuisLuisLuisLuisLuisLuisLuis-_0';
const acceso = {
  pacienteId: '11111111-1111-4111-8111-111111111111',
  clinicaId: '22222222-2222-4222-8222-222222222222',
  huella: huella(TOKEN),
};

beforeAll(() => {
  process.env.SESION_SECRETO ??= 'secreto-de-pruebas-unitarias-de-32-caracteres';
});
afterEach(() => fijarAhora(undefined));

describe('FR-006b — acceso abierto de 30 minutos sin actividad', () => {
  it('US1 #7 — emitido a las 10:00: vale a las 10:29 y ya no a las 10:31', async () => {
    fijarAhora('2026-11-15T10:00:00+01:00');
    const cookie = await crearTokenAcceso(acceso);
    fijarAhora('2026-11-15T10:29:00+01:00');
    expect(await verificarTokenAcceso(cookie, TOKEN)).toEqual(acceso);
    fijarAhora('2026-11-15T10:31:00+01:00');
    expect(await verificarTokenAcceso(cookie, TOKEN)).toBeNull();
  });

  it('renovarla a las 10:20 la deja válida hasta las 10:50', async () => {
    fijarAhora('2026-11-15T10:20:00+01:00');
    const renovada = await crearTokenAcceso(acceso);
    fijarAhora('2026-11-15T10:49:00+01:00');
    expect(await verificarTokenAcceso(renovada, TOKEN)).not.toBeNull();
    fijarAhora('2026-11-15T10:51:00+01:00');
    expect(await verificarTokenAcceso(renovada, TOKEN)).toBeNull();
  });

  it('US3 #4 — con otro token en la URL (enlace regenerado) no vale: la huella no coincide', async () => {
    const cookie = await crearTokenAcceso(acceso);
    expect(await verificarTokenAcceso(cookie, OTRO)).toBeNull();
  });

  it('una firma alterada, un valor vacío o la cookie del panel no valen', async () => {
    const cookie = await crearTokenAcceso(acceso);
    const alterada = `${cookie.slice(0, -2)}${cookie.at(-2) === 'A' ? 'B' : 'A'}${cookie.at(-1)}`;
    expect(await verificarTokenAcceso(alterada, TOKEN)).toBeNull();
    expect(await verificarTokenAcceso(undefined, TOKEN)).toBeNull();
    expect(await verificarTokenAcceso('', TOKEN)).toBeNull();
    expect(await verificarTokenAcceso(await crearToken(acceso.clinicaId), TOKEN)).toBeNull();
  });

  it('la cookie es httpOnly, SameSite=Lax, limitada a /p y de 30 minutos', () => {
    expect(opcionesCookieAcceso()).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/p', maxAge: 1800 });
  });

  it('la huella es el SHA-256 hexadecimal del token y no lo contiene', () => {
    expect(huella(TOKEN)).toMatch(/^[0-9a-f]{64}$/);
    expect(huella(TOKEN)).not.toBe(huella(OTRO));
  });

  it('tokenDeRuta extrae el token de /p/<token>', () => {
    expect(tokenDeRuta(`/p/${TOKEN}`)).toBe(TOKEN);
    expect(tokenDeRuta(`/p/${TOKEN}/algo`)).toBe(TOKEN);
    expect(tokenDeRuta('/agenda')).toBeNull();
  });
});
