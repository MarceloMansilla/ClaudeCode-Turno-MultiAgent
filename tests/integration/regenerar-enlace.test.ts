/**
 * Spec 005, US3 — regenerar un enlace comprometido (FR-004, FR-005, SC-002). Las acciones del
 * panel leen la sesión de `next/headers`, que aquí se sustituye por una cookie de prueba.
 */
import { asc, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita, enlacePaciente } from '@/db/esquema';
import { crearTokenAcceso } from '@/lib/acceso-paciente';
import { fijarAhora } from '@/lib/reloj';
import { crearToken } from '@/lib/token-sesion';
import { confirmarCifrasPaciente, obtenerEnlace, regenerarEnlace, resolverToken } from '@/servicios/enlaces';
import { cancelarCitaPaciente, pantallaPaciente } from '@/servicios/portal-paciente';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, fijarIntentos, insertarCita, type Escenario } from '../helpers/fabrica';

const cookieDeSesion = vi.hoisted(() => ({ valor: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (cookieDeSesion.valor ? { value: cookieDeSesion.valor } : undefined) }),
}));
const { obtenerEnlacePaciente, regenerarEnlacePaciente } = await import('@/acciones/enlaces');

const INVENTADO = 'NoExisteNoExisteNoExisteNoExisteNoExiste123';
let e: Escenario;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
  fijarAhora('2026-11-14T09:00:00+01:00');
  cookieDeSesion.valor = undefined;
});
afterEach(() => fijarAhora(undefined));

const enlaceDeAna = async () =>
  obtenerBd().select().from(enlacePaciente).where(eq(enlacePaciente.pacienteId, e.ana));
const citasDeAna = () => obtenerBd().select().from(cita).where(eq(cita.pacienteId, e.ana)).orderBy(asc(cita.id));
const tokenDeRuta = (ruta: string) => ruta.replace(/^\/p\//, '');

async function cookieDeAna(token: string) {
  const r = await confirmarCifrasPaciente(token, '5678');
  if (!r.ok) throw new Error(r.mensaje);
  return crearTokenAcceso(r.datos.acceso);
}

describe('US3 — regenerar el enlace', () => {
  it('US3 #1 / FR-004 — genera un token B ≠ A con formato válido y sigue habiendo una sola fila', async () => {
    const r = await regenerarEnlace(e.clinicaId, e.ana);
    expect(r).toMatchObject({ ok: true, datos: { paciente: 'Ana Pérez', generadoEn: 'sábado, 14/11/2026 09:00' } });
    const b = r.ok ? tokenDeRuta(r.datos.ruta) : '';
    expect(b).not.toBe(e.tokenAna);
    expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await enlaceDeAna()).toHaveLength(1);
  });

  it('US3 #2 / SC-002 — el enlace anterior responde exactamente igual que uno inventado', async () => {
    await regenerarEnlace(e.clinicaId, e.ana);
    expect(await resolverToken(e.tokenAna)).toBeNull();
    expect(await confirmarCifrasPaciente(e.tokenAna, '5678')).toEqual(await confirmarCifrasPaciente(INVENTADO, '5678'));
    expect(await pantallaPaciente(e.tokenAna, undefined)).toEqual(await pantallaPaciente(INVENTADO, undefined));
  });

  it('US3 #3 — con B y las cifras de Ana se entra y sus citas no han cambiado', async () => {
    await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45 });
    await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-06', hora: '10:00', minutos: 45, estado: 'completada' });
    const antes = await citasDeAna();
    const r = await regenerarEnlace(e.clinicaId, e.ana);
    const b = r.ok ? tokenDeRuta(r.datos.ruta) : '';
    expect(await pantallaPaciente(b, await cookieDeAna(b))).toMatchObject({ tipo: 'dentro', pacienteId: e.ana });
    expect(await citasDeAna()).toEqual(antes);
  });

  it('US3 #5 — con A bloqueado, B empieza sin fallos ni pausa', async () => {
    await fijarIntentos(e.ana, { fallosSeguidos: 10, pausaHasta: new Date('2026-11-14T09:10:00+01:00') });
    const r = await regenerarEnlace(e.clinicaId, e.ana);
    expect((await enlaceDeAna())[0]).toMatchObject({ fallosSeguidos: 0, pausaHasta: null });
    const b = r.ok ? tokenDeRuta(r.datos.ruta) : '';
    expect(await confirmarCifrasPaciente(b, '5678')).toMatchObject({ ok: true });
  });

  it('US3 #4 / FR-006b — un acceso abierto con A deja de servir al instante', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45 });
    const cookieA = await cookieDeAna(e.tokenAna);
    const r = await regenerarEnlace(e.clinicaId, e.ana);
    const b = r.ok ? tokenDeRuta(r.datos.ruta) : '';
    expect(await cancelarCitaPaciente(e.tokenAna, cookieA, c.id)).toMatchObject({ codigo: 'ENLACE_NO_VALIDO' });
    expect(await cancelarCitaPaciente(b, cookieA, c.id)).toMatchObject({ codigo: 'ACCESO_CADUCADO' });
    expect(await pantallaPaciente(b, cookieA)).toMatchObject({ tipo: 'cifras' });
    expect((await obtenerBd().select().from(cita).where(eq(cita.id, c.id)))[0]!.estado).toBe('reservada');
  });

  it('FR-005 — obtenerEnlace devuelve la ruta vigente y su fecha de generación', async () => {
    expect(await obtenerEnlace(e.clinicaId, e.ana)).toEqual({
      ok: true,
      datos: { ruta: `/p/${e.tokenAna}`, generadoEn: 'lunes, 02/11/2026 09:00', paciente: 'Ana Pérez' },
    });
  });

  it('una ficha inexistente o de otra clínica: NO_ENCONTRADO, sin cambiar nada', async () => {
    const otra = '00000000-0000-4000-8000-000000000000';
    expect(await obtenerEnlace(e.clinicaId, otra)).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect(await regenerarEnlace(otra, e.ana)).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect((await enlaceDeAna())[0]!.token).toBe(e.tokenAna);
  });
});

describe('Acciones del panel (contracts/server-actions.md)', () => {
  it('sin sesión: SESION_CADUCADA y el enlace no cambia', async () => {
    expect(await obtenerEnlacePaciente({ pacienteId: e.ana })).toMatchObject({ codigo: 'SESION_CADUCADA' });
    expect(await regenerarEnlacePaciente({ pacienteId: e.ana })).toMatchObject({ codigo: 'SESION_CADUCADA' });
    expect((await enlaceDeAna())[0]!.token).toBe(e.tokenAna);
  });

  it('con sesión: copia y regenera; un pacienteId mal formado da NO_ENCONTRADO', async () => {
    cookieDeSesion.valor = await crearToken(e.clinicaId);
    expect(await obtenerEnlacePaciente({ pacienteId: e.ana })).toMatchObject({ ok: true, datos: { ruta: `/p/${e.tokenAna}` } });
    const r = await regenerarEnlacePaciente({ pacienteId: e.ana });
    expect(r.ok && r.datos.ruta).not.toBe(`/p/${e.tokenAna}`);
    expect(await obtenerEnlacePaciente({ pacienteId: 'no-es-un-uuid' })).toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});
