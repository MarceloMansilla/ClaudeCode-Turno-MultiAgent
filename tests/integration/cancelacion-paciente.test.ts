/**
 * Spec 005, US2 — cancelar con más de 24 horas de margen (FR-009–FR-015). Cita de referencia:
 * María, «Sesión de fisioterapia», lunes 16/11/2026 10:00–10:45.
 */
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita } from '@/db/esquema';
import { crearTokenAcceso } from '@/lib/acceso-paciente';
import { fijarAhora } from '@/lib/reloj';
import { cambiarEstadoCita, crearCita } from '@/servicios/citas';
import { confirmarCifrasPaciente } from '@/servicios/enlaces';
import { cancelarCitaPaciente, pantallaPaciente } from '@/servicios/portal-paciente';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, insertarCita, type Escenario } from '../helpers/fabrica';

const ENUNCIADO =
  'Puede cancelar esta cita desde su enlace antes del domingo, 15/11/2026 a las 10:00. ' +
  'Después, llame a Clínica de Pruebas al 911 000 222.';
let e: Escenario;
let citaId: string;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
  citaId = (await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45 })).id;
});
afterEach(() => fijarAhora(undefined));

/** Entra como Ana con el reloj en `instante` y devuelve el valor de la cookie de acceso. */
async function accesoDeAna(instante: string) {
  fijarAhora(instante);
  const r = await confirmarCifrasPaciente(e.tokenAna, '5678');
  if (!r.ok) throw new Error(r.mensaje);
  return crearTokenAcceso(r.datos.acceso);
}

const leer = async (id: string) =>
  (await obtenerBd().select().from(cita).where(eq(cita.id, id)))[0]!;

describe('US2 — cancelación por el paciente', () => {
  it('US2 #1 — a las 09:00 del domingo (faltan 25 h) se cancela con origen paciente', async () => {
    const cookie = await accesoDeAna('2026-11-15T09:00:00+01:00');
    expect(await cancelarCitaPaciente(e.tokenAna, cookie, citaId)).toEqual({
      ok: true,
      datos: {
        citaId,
        fecha: 'lunes, 16/11/2026',
        hora: '10:00',
        mensaje: 'Su cita del lunes, 16/11/2026 a las 10:00 está cancelada.',
      },
    });
    expect(await leer(citaId)).toMatchObject({
      estado: 'cancelada',
      canceladaPor: 'paciente',
      estadoCambiadoEn: new Date('2026-11-15T09:00:00+01:00'),
    });
  });

  it('US2 #2 — a las 11:00 (faltan 23 h) no se ofrece cancelar y se muestra el enunciado', async () => {
    const cookie = await accesoDeAna('2026-11-15T11:00:00+01:00');
    const p = await pantallaPaciente(e.tokenAna, cookie);
    expect(p.tipo === 'dentro' && p.citas).toEqual([
      expect.objectContaining({ id: citaId, puedeCancelar: false, enunciado: ENUNCIADO }),
    ]);
  });

  it('a las 09:00 se ofrece cancelar, con el mismo enunciado (SC-004: mismo límite que el aplicado)', async () => {
    const p = await pantallaPaciente(e.tokenAna, await accesoDeAna('2026-11-15T09:00:00+01:00'));
    expect(p.tipo === 'dentro' && p.citas[0]).toMatchObject({ puedeCancelar: true, enunciado: ENUNCIADO });
  });

  it('US2 #3 — una petición a las 11:00 (pantalla abierta desde antes) se rechaza con el enunciado y la cita sigue reservada', async () => {
    const cookie = await accesoDeAna('2026-11-15T10:45:00+01:00');
    fijarAhora('2026-11-15T11:00:00+01:00');
    expect(await cancelarCitaPaciente(e.tokenAna, cookie, citaId)).toEqual({
      ok: false,
      codigo: 'FUERA_DE_PLAZO',
      mensaje: `Ya no puede cancelar esta cita desde su enlace. ${ENUNCIADO}`,
      detalle: { enunciado: ENUNCIADO },
    });
    expect(await leer(citaId)).toMatchObject({ estado: 'reservada', canceladaPor: null });
  });

  it('US2 #4 — a las 09:59:59 se cancela; a las 10:00:00 se rechaza', async () => {
    const otra = (await insertarCita(e, { profesionalId: e.jorge, fecha: '2026-11-16', hora: '10:00', minutos: 45 })).id;
    const cookie = await accesoDeAna('2026-11-15T09:59:59+01:00');
    expect(await cancelarCitaPaciente(e.tokenAna, cookie, citaId)).toMatchObject({ ok: true });
    fijarAhora('2026-11-15T10:00:00+01:00');
    expect(await cancelarCitaPaciente(e.tokenAna, cookie, otra)).toMatchObject({ ok: false, codigo: 'FUERA_DE_PLAZO' });
    expect((await leer(otra)).estado).toBe('reservada');
  });

  it('US2 #5 — tras cancelar, recepción registra otra cita de María en ese hueco', async () => {
    const cookie = await accesoDeAna('2026-11-15T09:00:00+01:00');
    expect(await cancelarCitaPaciente(e.tokenAna, cookie, citaId)).toMatchObject({ ok: true });
    const nueva = await crearCita(e.clinicaId, {
      profesionalId: e.maria,
      servicioId: e.sesionFisio,
      fecha: '2026-11-16',
      hora: '10:00',
      paciente: { id: e.luis },
    });
    expect(nueva).toMatchObject({ ok: true, datos: { inicio: '10:00', pacienteId: e.luis } });
  });

  it('US2 #6 / FR-015 — a las 11:00 recepción sí cancela (su plazo es hasta el inicio)', async () => {
    fijarAhora('2026-11-15T11:00:00+01:00');
    expect(await cambiarEstadoCita(e.clinicaId, citaId, 'cancelar')).toMatchObject({ ok: true });
    expect(await leer(citaId)).toMatchObject({ estado: 'cancelada', canceladaPor: 'recepcion' });
  });

  it('FR-006 — con el acceso de Ana no se puede cancelar una cita de Luis (NO_ENCONTRADO)', async () => {
    const deLuis = (await insertarCita(e, { profesionalId: e.jorge, fecha: '2026-11-17', hora: '10:00', minutos: 45, pacienteId: e.luis })).id;
    const cookie = await accesoDeAna('2026-11-15T09:00:00+01:00');
    expect(await cancelarCitaPaciente(e.tokenAna, cookie, deLuis)).toEqual({
      ok: false,
      codigo: 'NO_ENCONTRADO',
      mensaje: 'No encontramos esa cita. Actualice la página.',
    });
    expect((await leer(deLuis)).estado).toBe('reservada');
    expect(await cancelarCitaPaciente(e.tokenAna, cookie, '00000000-0000-4000-8000-000000000000')).toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('FR-014 — si recepción ya la cambió, ESTADO_CAMBIADO con el estado actual', async () => {
    const cookie = await accesoDeAna('2026-11-15T09:00:00+01:00');
    await cambiarEstadoCita(e.clinicaId, citaId, 'cancelar');
    expect(await cancelarCitaPaciente(e.tokenAna, cookie, citaId)).toEqual({
      ok: false,
      codigo: 'ESTADO_CAMBIADO',
      mensaje: 'Esta cita ya figura como cancelada.',
      detalle: { estado: 'cancelada' },
    });
    expect((await leer(citaId)).canceladaPor).toBe('recepcion');
  });

  it('sin acceso abierto, o caducado tras 30 min, ACCESO_CADUCADO y no se cancela nada', async () => {
    fijarAhora('2026-11-15T09:00:00+01:00');
    expect(await cancelarCitaPaciente(e.tokenAna, undefined, citaId)).toEqual({
      ok: false,
      codigo: 'ACCESO_CADUCADO',
      mensaje: 'Por seguridad, vuelva a escribir las 4 últimas cifras de su teléfono.',
    });
    const cookie = await accesoDeAna('2026-11-15T08:00:00+01:00');
    fijarAhora('2026-11-15T08:31:00+01:00');
    expect(await cancelarCitaPaciente(e.tokenAna, cookie, citaId)).toMatchObject({ codigo: 'ACCESO_CADUCADO' });
    expect((await leer(citaId)).estado).toBe('reservada');
  });

  it('un token no válido da ENLACE_NO_VALIDO aunque la cookie sea válida', async () => {
    const cookie = await accesoDeAna('2026-11-15T09:00:00+01:00');
    expect(await cancelarCitaPaciente('NoExisteNoExisteNoExisteNoExisteNoExiste123', cookie, citaId)).toMatchObject({
      codigo: 'ENLACE_NO_VALIDO',
    });
  });

  it('edge case «menos de 24 h de antelación»: una cita reservada el domingo para el lunes nunca es cancelable', async () => {
    const cookie = await accesoDeAna('2026-11-15T12:00:00+01:00');
    const lunes = await crearCita(e.clinicaId, {
      profesionalId: e.jorge,
      servicioId: e.sesionFisio,
      fecha: '2026-11-16',
      hora: '09:00',
      paciente: { id: e.ana },
    });
    const id = lunes.ok ? lunes.datos.id : '';
    const p = await pantallaPaciente(e.tokenAna, cookie);
    expect(p.tipo === 'dentro' && p.citas.find((c) => c.id === id)?.puedeCancelar).toBe(false);
    expect(await cancelarCitaPaciente(e.tokenAna, cookie, id)).toMatchObject({ codigo: 'FUERA_DE_PLAZO' });
  });

  it('edge case «Varias citas»: a 25 h y a 23 h se evalúan cada una con su inicio', async () => {
    const cerca = (await insertarCita(e, { profesionalId: e.jorge, fecha: '2026-11-16', hora: '08:00', minutos: 45 })).id;
    // 25 h antes de la de las 10:00 son las 09:00 del domingo; la de las 08:00 queda a 23 h.
    const cookie = await accesoDeAna('2026-11-15T09:00:00+01:00');
    const p = await pantallaPaciente(e.tokenAna, cookie);
    const porId = new Map(p.tipo === 'dentro' ? p.citas.map((c) => [c.id, c.puedeCancelar]) : []);
    expect(porId.get(citaId)).toBe(true);
    expect(porId.get(cerca)).toBe(false);
  });

  it('regresión de la 001: recepción sigue recibiendo CANCELACION_TARDIA con la cita ya empezada', async () => {
    fijarAhora('2026-11-16T10:05:00+01:00');
    expect(await cambiarEstadoCita(e.clinicaId, citaId, 'cancelar')).toMatchObject({ codigo: 'CANCELACION_TARDIA' });
    expect((await leer(citaId)).estado).toBe('reservada');
  });
});
