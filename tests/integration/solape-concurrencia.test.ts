/**
 * Principio III (NO NEGOCIABLE) — FR-011, FR-012, SC-001: intentos activos de provocar solapes,
 * incluidas ráfagas de altas simultáneas sobre el mismo hueco.
 */
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita } from '@/db/esquema';
import { fijarAhora } from '@/lib/reloj';
import { instanteLocal } from '@/lib/zona';
import { crearPrng } from '@/semilla/prng';
import { crearCita, type EntradaCrearCita } from '@/servicios/citas';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, ZONA, type Escenario } from '../helpers/fabrica';

const LUNES = '2026-11-16';
let e: Escenario;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
  fijarAhora('2026-11-09T12:10:00+01:00');
});
afterEach(() => fijarAhora(undefined));

const alta = (hora: string, servicioId = e.sesionFisio, fecha = LUNES, profesionalId = e.maria): EntradaCrearCita => ({
  profesionalId,
  servicioId,
  fecha,
  hora,
  paciente: { id: e.ana },
});

async function paresSolapados(): Promise<number> {
  const { rows } = await obtenerBd().execute<{ pares: number }>(sql`
    SELECT count(*)::int AS pares FROM cita a JOIN cita b
      ON a.profesional_id = b.profesional_id AND a.id < b.id
     AND tstzrange(a.inicio, a.fin, '[)') && tstzrange(b.inicio, b.fin, '[)')
   WHERE a.estado IN ('reservada', 'completada') AND b.estado IN ('reservada', 'completada')`);
  return rows[0]!.pares;
}

describe('US2 #7 / FR-012 — reservas simultáneas', () => {
  it('ráfaga de 10 altas en paralelo sobre el mismo hueco: exactamente 1 registrada', async () => {
    const resultados = await Promise.all(Array.from({ length: 10 }, () => crearCita(e.clinicaId, alta('10:00'))));
    const ok = resultados.filter((r) => r.ok);
    const rechazos = resultados.filter((r) => !r.ok);
    expect(ok).toHaveLength(1);
    expect(rechazos).toHaveLength(9);
    for (const r of rechazos) {
      expect(['SOLAPE', 'HUECO_OCUPADO_A_LA_VEZ']).toContain(!r.ok && r.codigo);
    }
    expect(await obtenerBd().select().from(cita).where(eq(cita.profesionalId, e.maria))).toHaveLength(1);
  });

  it('ráfaga sobre huecos parcialmente solapados (10:00, 10:15, 10:30, 10:45 de 60 min): sin solapes', async () => {
    const horas = ['10:00', '10:15', '10:30', '10:45', '09:30', '11:00', '10:15', '09:15'];
    const resultados = await Promise.all(horas.map((h) => crearCita(e.clinicaId, alta(h, e.primeraFisio))));
    expect(resultados.some((r) => r.ok)).toBe(true);
    expect(await paresSolapados()).toBe(0);
  });

  it('SC-001 — 100 ráfagas deterministas de 10 altas (1.000 intentos): 0 solapes', async () => {
    const azar = crearPrng(424242);
    const servicios = [e.sesionFisio, e.primeraFisio];
    const dias = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
    let intentos = 0;
    let registradas = 0;
    for (let rafaga = 0; rafaga < 100; rafaga++) {
      const fecha = azar.elegir(dias);
      const profesionalId = azar.elegir([e.maria, e.jorge]);
      const lote = Array.from({ length: 10 }, () => {
        const minutos = 9 * 60 + 15 * azar.entero(0, 39);
        const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
        return alta(hora, azar.elegir(servicios), fecha, profesionalId);
      });
      const resultados = await Promise.all(lote.map((x) => crearCita(e.clinicaId, x)));
      intentos += lote.length;
      registradas += resultados.filter((r) => r.ok).length;
      for (const r of resultados) {
        if (!r.ok) expect(['SOLAPE', 'HUECO_OCUPADO_A_LA_VEZ', 'FUERA_DE_HORARIO']).toContain(r.codigo);
      }
    }
    expect(intentos).toBe(1000);
    expect(registradas).toBeGreaterThan(0);
    expect(await paresSolapados()).toBe(0);
  }, 180_000);
});

describe('FR-012 — ninguna vía de escritura se salta la regla', () => {
  const insertarDirecto = (hora: string, minutos: number, estado: 'reservada' | 'completada' | 'cancelada' | 'no_asistida' = 'reservada') => {
    const inicio = instanteLocal(LUNES, hora, ZONA);
    return obtenerBd().insert(cita).values({
      id: randomUUID(),
      clinicaId: e.clinicaId,
      profesionalId: e.maria,
      servicioId: e.sesionFisio,
      pacienteId: e.ana,
      inicio,
      fin: new Date(inicio.getTime() + minutos * 60_000),
      estado,
      canceladaPor: estado === 'cancelada' ? 'recepcion' : null, // FR-018a
    });
  };

  it('un INSERT directo en SQL que solapa es rechazado por la BD (cita_sin_solape)', async () => {
    await insertarDirecto('10:00', 45);
    await expect(insertarDirecto('10:30', 60)).rejects.toSatisfy((err: unknown) =>
      JSON.stringify(err, Object.getOwnPropertyNames(err)).includes('cita_sin_solape') ||
      String((err as { cause?: { constraint?: string } }).cause?.constraint) === 'cita_sin_solape',
    );
  });

  it('canceladas y no asistidas pueden convivir con una cita en el mismo tramo', async () => {
    await insertarDirecto('10:00', 45, 'cancelada');
    await insertarDirecto('10:00', 45, 'no_asistida');
    await insertarDirecto('10:00', 45, 'reservada');
    expect(await paresSolapados()).toBe(0);
  });

  it('reactivar por SQL una cancelada que solaparía es rechazado', async () => {
    await insertarDirecto('10:00', 45, 'cancelada');
    await insertarDirecto('10:15', 45, 'reservada');
    // Se quita también el origen para que el único motivo de rechazo sea el solape.
    await expect(
      obtenerBd()
        .update(cita)
        .set({ estado: 'reservada', canceladaPor: null })
        .where(eq(cita.estado, 'cancelada')),
    ).rejects.toSatisfy((err: unknown) =>
      JSON.stringify(err, Object.getOwnPropertyNames(err)).includes('cita_sin_solape') ||
      String((err as { cause?: { constraint?: string } }).cause?.constraint) === 'cita_sin_solape',
    );
  });
});
