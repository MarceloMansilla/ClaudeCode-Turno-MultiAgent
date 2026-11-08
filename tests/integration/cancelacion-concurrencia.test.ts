/**
 * Spec 005, SC-003 y Principio III: la cancelación del paciente escribe en la agenda.
 * - Ráfagas de cancelaciones simultáneas de la misma cita: exactamente 1 cambio de estado.
 * - Cancelación del paciente y alta de recepción en el mismo hueco a la vez: 0 solapes.
 */
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita } from '@/db/esquema';
import { crearTokenAcceso } from '@/lib/acceso-paciente';
import { fijarAhora } from '@/lib/reloj';
import { cambiarEstadoCita, crearCita } from '@/servicios/citas';
import { confirmarCifrasPaciente } from '@/servicios/enlaces';
import { cancelarCitaPaciente } from '@/servicios/portal-paciente';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, insertarCita, type Escenario } from '../helpers/fabrica';

// Reloj: sábado 14/11 a las 09:00, así todas las citas (lunes a miércoles) están en plazo.
const RAFAGAS = 100;
let e: Escenario;
let cookie: string;

beforeAll(() => fijarAhora('2026-11-14T09:00:00+01:00'));
beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
  const r = await confirmarCifrasPaciente(e.tokenAna, '5678');
  if (!r.ok) throw new Error(r.mensaje);
  cookie = await crearTokenAcceso(r.datos.acceso);
});
afterEach(() => fijarAhora('2026-11-14T09:00:00+01:00'));

/** Una cita nueva de Ana con María en un hueco distinto para cada ráfaga. */
async function citaDeRafaga(i: number) {
  const dia = 16 + Math.floor(i / 40); // lunes 16 … miércoles 18 (40 huecos de 15 min por día)
  const minutos = 9 * 60 + (i % 40) * 15;
  const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
  return insertarCita(e, { profesionalId: e.maria, fecha: `2026-11-${dia}`, hora, minutos: 15 });
}

const leer = async (id: string) => (await obtenerBd().select().from(cita).where(eq(cita.id, id)))[0]!;

describe('SC-003 — cancelaciones simultáneas de la misma cita', () => {
  it(`${RAFAGAS} ráfagas paciente + paciente: exactamente 1 cambio por ráfaga`, async () => {
    for (let i = 0; i < RAFAGAS; i++) {
      const c = await citaDeRafaga(i);
      const r = await Promise.all([
        cancelarCitaPaciente(e.tokenAna, cookie, c.id),
        cancelarCitaPaciente(e.tokenAna, cookie, c.id),
      ]);
      expect(r.filter((x) => x.ok)).toHaveLength(1);
      expect(r.find((x) => !x.ok)).toMatchObject({ codigo: 'ESTADO_CAMBIADO' });
      expect(await leer(c.id)).toMatchObject({ estado: 'cancelada', canceladaPor: 'paciente' });
    }
  }, 120_000);

  it(`${RAFAGAS} ráfagas paciente + recepción: exactamente 1 cambio y un único origen`, async () => {
    for (let i = 0; i < RAFAGAS; i++) {
      const c = await citaDeRafaga(i);
      const [pac, rec] = await Promise.all([
        cancelarCitaPaciente(e.tokenAna, cookie, c.id),
        cambiarEstadoCita(e.clinicaId, c.id, 'cancelar'),
      ]);
      expect([pac, rec].filter((x) => x.ok)).toHaveLength(1);
      const final = await leer(c.id);
      expect(final.estado).toBe('cancelada');
      expect(final.canceladaPor).toBe(pac.ok ? 'paciente' : 'recepcion');
    }
  }, 120_000);
});

describe('Principio III — cancelación del paciente + alta de recepción en el mismo hueco', () => {
  const paresSolapados = async () => {
    const { rows } = await obtenerBd().execute(sql`
      SELECT count(*)::int AS pares FROM cita a JOIN cita b
        ON a.profesional_id = b.profesional_id AND a.id < b.id
       AND tstzrange(a.inicio, a.fin, '[)') && tstzrange(b.inicio, b.fin, '[)')
     WHERE a.estado IN ('reservada', 'completada') AND b.estado IN ('reservada', 'completada')`);
    return (rows[0] as { pares: number }).pares;
  };

  it('50 repeticiones: nunca quedan dos citas activas solapadas; el alta se registra o se rechaza', async () => {
    const resultados = new Set<string>();
    for (let i = 0; i < 50; i++) {
      await obtenerBd().delete(cita);
      const c = await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45 });
      const [cancel, alta] = await Promise.all([
        cancelarCitaPaciente(e.tokenAna, cookie, c.id),
        crearCita(e.clinicaId, {
          profesionalId: e.maria,
          servicioId: e.sesionFisio,
          fecha: '2026-11-16',
          hora: '10:00',
          paciente: { id: e.luis },
        }),
      ]);
      expect(cancel.ok).toBe(true);
      if (!alta.ok) expect(['SOLAPE', 'HUECO_OCUPADO_A_LA_VEZ']).toContain(alta.codigo);
      resultados.add(alta.ok ? 'registrada' : alta.codigo);
      expect(await paresSolapados()).toBe(0);
    }
    expect(resultados.size).toBeGreaterThan(0);
  }, 120_000);
});
