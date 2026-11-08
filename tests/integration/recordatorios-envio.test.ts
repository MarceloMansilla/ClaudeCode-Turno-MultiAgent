import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita, clinica, enlacePaciente, recordatorio } from '@/db/esquema';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, insertarCita, type Escenario } from '../helpers/fabrica';
import {
  borrarCarpeta,
  carpetaTemporal,
  ejecutar,
  ficherosEml,
  leerEml,
  REMITENTE,
  transporteQueFalla,
  URL_PUBLICA,
} from '../helpers/recordatorios';

const DOMINGO_0800 = '2026-11-15T08:00:00+01:00';
const NUEVO_TOKEN = 'NuevoNuevoNuevoNuevoNuevoNuevoNuevoNuevo-_1';

let dir: string;
let esc: Escenario;
beforeEach(async () => {
  dir = await carpetaTemporal();
  await vaciarTablas();
  esc = await crearEscenario();
});
afterEach(async () => {
  await borrarCarpeta(dir);
});

describe('FR-009 modo simulado', () => {
  it('FR-009 / US1 #6 cada recordatorio se guarda como .eml legible, idéntico al que se enviaría', async () => {
    const c = await insertarCita(esc, { profesionalId: esc.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45 });
    const e = await ejecutar(DOMINGO_0800, dir);
    expect(e.modo).toBe('simulado');
    expect(await ficherosEml(dir)).toEqual([`2026-11-16_1000_${c.id}.eml`]);
    const correo = await leerEml(dir, `2026-11-16_1000_${c.id}.eml`);
    expect(correo.from?.value).toEqual([{ name: 'Clínica de Pruebas', address: REMITENTE }]);
    expect(correo.to && 'value' in correo.to ? correo.to.value[0]?.address : '').toBe('ana@example.com');
    expect(correo.subject).toBe('Recordatorio de su cita en Clínica de Pruebas: lunes, 16/11/2026, 10:00');
    expect(correo.messageId).toBe(`<recordatorio-${c.id}@citas.clinicaeleva.es>`);
    expect(correo.date?.toISOString()).toBe(new Date(DOMINGO_0800).toISOString());
    expect(correo.text).toContain(`${URL_PUBLICA}/p/${esc.tokenAna}`);
    expect(correo.html).toContain('Ver o cancelar mi cita');
    const [rec] = await obtenerBd().select().from(recordatorio);
    expect(rec?.fichero?.endsWith(`2026-11-16_1000_${c.id}.eml`)).toBe(true);
  });
});

describe('FR-010 envío fallido e interrumpido', () => {
  it('FR-010 / US1 #7 un envío fallido no cuenta como enviado y se reintenta con el enlace vigente', async () => {
    const c = await insertarCita(esc, { profesionalId: esc.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45 });
    const fallida = await ejecutar(DOMINGO_0800, dir, transporteQueFalla);
    expect(fallida.resumen.totales).toMatchObject({ enviado: 0, fallido: 1 });
    expect(fallida.resumen.citas[0]?.detalle).toContain('conexión rechazada');
    const [tras] = await obtenerBd().select().from(recordatorio);
    expect(tras).toMatchObject({ estado: 'fallido', intentos: 1 });

    // Recepción regenera el enlace de Ana entre medias (005 FR-004): el reintento lleva el nuevo.
    await obtenerBd().update(enlacePaciente).set({ token: NUEVO_TOKEN }).where(eq(enlacePaciente.pacienteId, esc.ana));
    const reintento = await ejecutar('2026-11-15T12:00:00+01:00', dir);
    expect(reintento.resumen.totales).toMatchObject({ enviado: 1, fallido: 0 });
    const [final] = await obtenerBd().select().from(recordatorio);
    expect(final).toMatchObject({ estado: 'enviado', intentos: 2, ultimoError: null });
    const correo = await leerEml(dir, `2026-11-16_1000_${c.id}.eml`);
    expect(correo.text).toContain(`${URL_PUBLICA}/p/${NUEVO_TOKEN}`);
    expect(correo.text).not.toContain(esc.tokenAna);
  });

  it('FR-010 si la cita se cancela antes del reintento, no se reintenta', async () => {
    const c = await insertarCita(esc, { profesionalId: esc.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45 });
    await ejecutar(DOMINGO_0800, dir, transporteQueFalla);
    await obtenerBd().update(cita).set({ estado: 'cancelada', canceladaPor: 'paciente' }).where(eq(cita.id, c.id));
    const reintento = await ejecutar('2026-11-15T12:00:00+01:00', dir);
    expect(reintento.resumen.citas).toHaveLength(0);
    expect(await ficherosEml(dir)).toHaveLength(0);
    const [rec] = await obtenerBd().select().from(recordatorio);
    expect(rec?.estado).toBe('fallido');
  });

  it('FR-010 / FR-005 un envío interrumpido (enviando de hace 15 min) no se reintenta y sale como «fallido (interrumpido)»', async () => {
    const c = await insertarCita(esc, { profesionalId: esc.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45 });
    const [cli] = await obtenerBd().select().from(clinica);
    const hace15 = new Date(new Date(DOMINGO_0800).getTime() - 15 * 60_000);
    await obtenerBd().insert(recordatorio).values({
      id: crypto.randomUUID(),
      clinicaId: cli!.id,
      citaId: c.id,
      destinatario: 'ana@example.com',
      modo: 'smtp',
      estado: 'enviando',
      generadoEn: hace15,
      ultimoIntentoEn: hace15,
    });
    const e = await ejecutar(DOMINGO_0800, dir);
    expect(e.resumen.citas).toEqual([
      expect.objectContaining({ citaId: c.id, resultado: 'fallido', interrumpido: true }),
    ]);
    expect(e.resumen.totales.fallido).toBe(1);
    expect(await ficherosEml(dir)).toHaveLength(0);
    const [rec] = await obtenerBd().select().from(recordatorio);
    expect(rec?.estado).toBe('enviando');
  });
});
