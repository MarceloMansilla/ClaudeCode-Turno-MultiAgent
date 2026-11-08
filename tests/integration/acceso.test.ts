import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fijarAhora } from '@/lib/reloj';
import { crearToken, verificarToken } from '@/lib/token-sesion';
import { verificarClave } from '@/servicios/acceso';
import { listarProfesionales } from '@/servicios/catalogo';
import { vaciarTablas } from '../helpers/bd';
import { CLAVE_PRUEBAS, crearEscenario, type Escenario } from '../helpers/fabrica';

let e: Escenario;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
});

afterEach(() => fijarAhora(undefined));

describe('FR-001 / FR-002 — clave de la clínica', () => {
  it('FR-001 — con la clave correcta se obtiene la clínica de la instalación', async () => {
    expect(await verificarClave(CLAVE_PRUEBAS)).toBe(e.clinicaId);
  });

  it('FR-002 — con una clave incorrecta, vacía o casi igual no hay acceso', async () => {
    expect(await verificarClave('otra')).toBeNull();
    expect(await verificarClave('')).toBeNull();
    expect(await verificarClave(`${CLAVE_PRUEBAS} `)).toBeNull();
  });

  it('FR-001 — sin clínica registrada no hay acceso', async () => {
    await vaciarTablas();
    expect(await verificarClave(CLAVE_PRUEBAS)).toBeNull();
  });
});

describe('Sesión (FR-001, FR-003, research R7)', () => {
  it('el token de sesión identifica a la clínica', async () => {
    const token = await crearToken(e.clinicaId);
    expect(await verificarToken(token)).toBe(e.clinicaId);
  });

  it('la sesión caduca a las 12 horas', async () => {
    fijarAhora('2026-11-09T08:00:00+01:00');
    const token = await crearToken(e.clinicaId);
    fijarAhora('2026-11-09T19:59:00+01:00');
    expect(await verificarToken(token)).toBe(e.clinicaId);
    fijarAhora('2026-11-09T20:00:01+01:00');
    expect(await verificarToken(token)).toBeNull();
  });

  it('un token manipulado o ausente no da acceso', async () => {
    const token = await crearToken(e.clinicaId);
    expect(await verificarToken(`${token.slice(0, -2)}xx`)).toBeNull();
    expect(await verificarToken(undefined)).toBeNull();
    expect(await verificarToken('no-es-un-token')).toBeNull();
  });
});

describe('FR-004 — los datos pertenecen a la clínica de la sesión', () => {
  it('los servicios solo devuelven datos del clinicaId indicado', async () => {
    expect((await listarProfesionales(e.clinicaId)).map((p) => p.nombre)).toEqual([
      'María',
      'Jorge',
      'Lucía',
    ]);
    expect(await listarProfesionales('00000000-0000-4000-8000-000000000000')).toEqual([]);
  });
});
