/**
 * FR-018a (enmienda revisión cruzada S2): toda cita cancelada registra su origen
 * (`recepcion` | `paciente`) y el momento de la cancelación; las demás no tienen origen.
 * La BD lo garantiza con `cita_origen_cancelacion`, sea cual sea la vía de escritura.
 */
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita } from '@/db/esquema';
import { fijarAhora } from '@/lib/reloj';
import { instanteLocal } from '@/lib/zona';
import { cambiarEstadoCita } from '@/servicios/citas';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, insertarCita, ZONA, type Escenario } from '../helpers/fabrica';

const HOY = '2026-11-09';
const AHORA = '2026-11-09T12:10:00+01:00';
let e: Escenario;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
  fijarAhora(AHORA);
});
afterEach(() => fijarAhora(undefined));

const leer = async (id: string) =>
  (
    await obtenerBd()
      .select({ estado: cita.estado, canceladaPor: cita.canceladaPor, estadoCambiadoEn: cita.estadoCambiadoEn })
      .from(cita)
      .where(eq(cita.id, id))
  )[0]!;

/** Nombre de la restricción violada, venga el error de pg directamente o envuelto por Drizzle. */
const restriccion = (err: unknown) =>
  (err as { constraint?: string }).constraint ??
  (err as { cause?: { constraint?: string } }).cause?.constraint;

describe('FR-018a — origen de la cancelación', () => {
  it('cancelar desde recepción deja cancelada_por = recepcion y el momento de la cancelación', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '16:00', minutos: 45 });
    expect(await cambiarEstadoCita(e.clinicaId, c.id, 'cancelar')).toMatchObject({ ok: true });
    expect(await leer(c.id)).toEqual({
      estado: 'cancelada',
      canceladaPor: 'recepcion',
      estadoCambiadoEn: new Date(AHORA),
    });
  });

  it('completar y no asistida dejan cancelada_por nulo', async () => {
    const a = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '09:00', minutos: 45 });
    const b = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '10:00', minutos: 45 });
    expect(await cambiarEstadoCita(e.clinicaId, a.id, 'completar')).toMatchObject({ ok: true });
    expect(await cambiarEstadoCita(e.clinicaId, b.id, 'no_asistida')).toMatchObject({ ok: true });
    expect(await leer(a.id)).toMatchObject({ estado: 'completada', canceladaPor: null });
    expect(await leer(b.id)).toMatchObject({ estado: 'no_asistida', canceladaPor: null });
  });

  it('un UPDATE SQL directo a cancelada sin origen es rechazado por cita_origen_cancelacion', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '16:00', minutos: 45 });
    const error = await obtenerBd()
      .execute(sql`UPDATE cita SET estado = 'cancelada' WHERE id = ${c.id}`)
      .catch((err: unknown) => err);
    expect(restriccion(error)).toBe('cita_origen_cancelacion');
    expect(await leer(c.id)).toMatchObject({ estado: 'reservada', canceladaPor: null });
  });

  it('un origen en una cita que no está cancelada es rechazado por cita_origen_cancelacion', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '16:00', minutos: 45 });
    const error = await obtenerBd()
      .execute(sql`UPDATE cita SET cancelada_por = 'paciente' WHERE id = ${c.id}`)
      .catch((err: unknown) => err);
    expect(restriccion(error)).toBe('cita_origen_cancelacion');

    const inicio = instanteLocal(HOY, '18:00', ZONA);
    const insercion = await obtenerBd()
      .insert(cita)
      .values({
        id: randomUUID(),
        clinicaId: e.clinicaId,
        profesionalId: e.maria,
        servicioId: e.sesionFisio,
        pacienteId: e.ana,
        inicio,
        fin: new Date(inicio.getTime() + 45 * 60_000),
        estado: 'completada',
        canceladaPor: 'recepcion',
      })
      .catch((err: unknown) => err);
    expect(restriccion(insercion)).toBe('cita_origen_cancelacion');
  });

  it('solo existen los valores recepcion y paciente (enum origen_cancelacion)', async () => {
    const { rows } = await obtenerBd().execute(
      sql`SELECT unnest(enum_range(NULL::origen_cancelacion))::text AS valor`,
    );
    expect(rows.map((r) => r.valor)).toEqual(['recepcion', 'paciente']);

    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '16:00', minutos: 45 });
    await expect(
      obtenerBd().execute(
        sql`UPDATE cita SET estado = 'cancelada', cancelada_por = 'portal' WHERE id = ${c.id}`,
      ),
    ).rejects.toThrow();
    expect(await leer(c.id)).toMatchObject({ estado: 'reservada', canceladaPor: null });
  });

  it('una cancelación del paciente escrita con su origen es aceptada por la BD', async () => {
    const c = await insertarCita(e, { profesionalId: e.maria, fecha: HOY, hora: '16:00', minutos: 45 });
    await obtenerBd()
      .update(cita)
      .set({ estado: 'cancelada', canceladaPor: 'paciente', estadoCambiadoEn: new Date(AHORA) })
      .where(eq(cita.id, c.id));
    expect(await leer(c.id)).toMatchObject({ estado: 'cancelada', canceladaPor: 'paciente' });
  });
});
