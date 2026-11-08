import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita } from '@/db/esquema';
import { fijarAhora } from '@/lib/reloj';
import { cambiarEstadoCita, crearCita } from '@/servicios/citas';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, insertarCita, type Escenario } from '../helpers/fabrica';

const HOY = '2026-11-09';
let e: Escenario;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
  fijarAhora('2026-11-09T12:10:00+01:00');
});
afterEach(() => fijarAhora(undefined));

const estadoDe = async (id: string) =>
  (await obtenerBd().select({ estado: cita.estado }).from(cita).where(eq(cita.id, id)))[0]!.estado;

describe('US3 — desenlace de la cita', () => {
  it('US3 #1 — cancelar antes del inicio libera el hueco y se puede volver a reservar', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '16:00', minutos: 45 });
    expect(await cambiarEstadoCita(e.clinicaId, c.id, 'cancelar')).toMatchObject({
      ok: true,
      datos: { estado: 'cancelada', etiquetaEstado: 'Cancelada', fecha: HOY, profesionalId: e.maria },
    });
    expect(await estadoDe(c.id)).toBe('cancelada');
    const nueva = await crearCita(e.clinicaId, {
      profesionalId: e.maria,
      servicioId: e.sesionFisio,
      fecha: HOY,
      hora: '16:00',
      paciente: { id: e.luis },
    });
    expect(nueva.ok).toBe(true);
  });

  it('US3 #2 — completar desde la hora de inicio', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '11:00', minutos: 45 });
    expect(await cambiarEstadoCita(e.clinicaId, c.id, 'completar')).toMatchObject({ ok: true, datos: { estado: 'completada' } });
  });

  it('US3 #3 — no asistida desde la hora de inicio (también justo a la hora)', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '12:00', minutos: 45 });
    fijarAhora('2026-11-09T12:00:00+01:00');
    expect(await cambiarEstadoCita(e.clinicaId, c.id, 'no_asistida')).toMatchObject({ ok: true, datos: { estado: 'no_asistida' } });
  });

  it('FR-018 — cancelar una cita ya empezada: CANCELACION_TARDIA', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '12:00', minutos: 45 });
    expect(await cambiarEstadoCita(e.clinicaId, c.id, 'cancelar')).toMatchObject({
      ok: false,
      codigo: 'CANCELACION_TARDIA',
      mensaje: 'Esta cita ya ha empezado. Márcala como completada o no asistida.',
    });
    expect(await estadoDe(c.id)).toBe('reservada');
  });

  it('FR-019 — completar o no asistida antes del inicio: TRANSICION_NO_PERMITIDA', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '16:00', minutos: 45 });
    for (const accion of ['completar', 'no_asistida'] as const) {
      expect(await cambiarEstadoCita(e.clinicaId, c.id, accion)).toMatchObject({
        codigo: 'TRANSICION_NO_PERMITIDA',
        mensaje: 'Esta cita todavía no ha empezado.',
      });
    }
  });

  it('FR-017 — los estados finales no tienen salida', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '09:00', minutos: 45, estado: 'completada' });
    expect(await cambiarEstadoCita(e.clinicaId, c.id, 'no_asistida')).toMatchObject({
      codigo: 'ESTADO_CAMBIADO',
      mensaje: 'Esta cita ya figura como completada. Hemos actualizado la agenda.',
      detalle: { estado: 'completada' },
    });
  });

  it('FR-020 — dos cambios simultáneos sobre la misma cita: uno prospera, el otro ESTADO_CAMBIADO', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '11:00', minutos: 45 });
    const [a, b] = await Promise.all([
      cambiarEstadoCita(e.clinicaId, c.id, 'completar'),
      cambiarEstadoCita(e.clinicaId, c.id, 'no_asistida'),
    ]);
    const exitos = [a, b].filter((r) => r.ok);
    const fallos = [a, b].filter((r) => !r.ok);
    expect(exitos).toHaveLength(1);
    expect(fallos[0]).toMatchObject({ codigo: 'ESTADO_CAMBIADO' });
    const final = await estadoDe(c.id);
    expect(fallos[0]).toMatchObject({ detalle: { estado: final } });
  });

  it('cita inexistente o de otra clínica: NO_ENCONTRADO', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '16:00', minutos: 45 });
    expect(await cambiarEstadoCita(e.clinicaId, '00000000-0000-4000-8000-000000000000', 'cancelar')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
      mensaje: 'No encontramos esa cita. Actualiza la agenda e inténtalo de nuevo.',
    });
    expect(await cambiarEstadoCita('00000000-0000-4000-8000-000000000000', c.id, 'cancelar')).toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});
