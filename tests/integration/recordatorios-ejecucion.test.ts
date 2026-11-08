import { asc, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita, ejecucionRecordatorios, enlacePaciente, paciente, recordatorio } from '@/db/esquema';
import { rutaEnlacePaciente } from '@/dominio/enlace';
import { limiteCancelacionPaciente } from '@/dominio/plazo-paciente';
import { enunciadoPoliticaCancelacion } from '@/dominio/politica-cancelacion';
import { formatearLimite } from '@/lib/formato';
import { cargarSemilla } from '@/semilla/cargar';
import { TELEFONO_ELEVA } from '@/semilla/generar';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, crearPaciente, insertarCita, ZONA, type Escenario } from '../helpers/fabrica';
import { borrarCarpeta, carpetaTemporal, ejecutar, ficherosEml, leerEml, URL_PUBLICA } from '../helpers/recordatorios';

/** Cifras de referencia de la semilla 2026-11-09 (quickstart.md, docs/datos-demo.md). */
const LUNES_0800 = '2026-11-09T08:00:00+01:00';
const RESERVADAS_MARTES = 26;
const CON_CORREO_MARTES = 20;
const SIN_CORREO_MARTES = 6;

let dir: string;
beforeEach(async () => {
  dir = await carpetaTemporal();
});
afterEach(async () => {
  await borrarCarpeta(dir);
});

describe('US1 sobre la semilla 2026-11-09 (Principio V)', () => {
  beforeEach(async () => {
    await cargarSemilla(obtenerBd(), '2026-11-09', 'eleva-demo');
  });

  it('US1 #1 / US1 #5 / FR-002 la ejecución del lunes 08:00 recuerda las citas reservadas del martes con correo', async () => {
    const e = await ejecutar(LUNES_0800, dir);
    expect(e.fechaObjetivo).toBe('2026-11-10');
    expect(e.resumen.citas).toHaveLength(RESERVADAS_MARTES);
    expect(e.resumen.totales).toEqual({
      enviado: CON_CORREO_MARTES,
      yaEnviadoAntes: 0,
      sinCorreo: SIN_CORREO_MARTES,
      correoNoValido: 0,
      fallido: 0,
    });
    const ficheros = await ficherosEml(dir);
    expect(ficheros).toHaveLength(CON_CORREO_MARTES);
    for (const f of ficheros) expect(f.startsWith('2026-11-10_')).toBe(true);
  });

  it('US1 #8 / FR-019 / FR-020 / SC-007 cada correo lleva el enlace personal de su paciente, ningún otro, y el enunciado de la 005', async () => {
    await ejecutar(LUNES_0800, dir);
    const filas = await obtenerBd()
      .select({ citaId: cita.id, inicio: cita.inicio, token: enlacePaciente.token, email: paciente.email })
      .from(recordatorio)
      .innerJoin(cita, eq(cita.id, recordatorio.citaId))
      .innerJoin(enlacePaciente, eq(enlacePaciente.pacienteId, cita.pacienteId))
      .innerJoin(paciente, eq(paciente.id, cita.pacienteId));
    expect(filas).toHaveLength(CON_CORREO_MARTES);
    const ficheros = await ficherosEml(dir);
    for (const f of filas) {
      const nombre = ficheros.find((n) => n.endsWith(`_${f.citaId}.eml`));
      expect(nombre).toBeDefined();
      const correo = await leerEml(dir, nombre!);
      const texto = correo.text ?? '';
      const enlace = `${URL_PUBLICA}${rutaEnlacePaciente(f.token)}`;
      expect(new Set(texto.match(/https?:\/\/\S+/g))).toEqual(new Set([enlace]));
      expect(correo.to && 'text' in correo.to ? correo.to.text : '').toContain(f.email!);
      // SC-007: el límite del correo es el mismo instante que aplica la 005 al cancelar.
      const enunciado = enunciadoPoliticaCancelacion({
        inicio: f.inicio,
        zonaHoraria: ZONA,
        clinicaNombre: 'Clínica Eleva',
        clinicaTelefono: TELEFONO_ELEVA,
      });
      expect(texto).toContain(enunciado);
      expect(texto).toContain(formatearLimite(limiteCancelacionPaciente(f.inicio), ZONA));
    }
  });

  it('FR-021 una ejecución no cambia ninguna fila de cita', async () => {
    const antes = await obtenerBd().select().from(cita).orderBy(asc(cita.id));
    await ejecutar(LUNES_0800, dir);
    const despues = await obtenerBd().select().from(cita).orderBy(asc(cita.id));
    expect(despues).toEqual(antes);
  });

  it('US1 #2 / FR-003 una segunda ejecución no envía nada nuevo', async () => {
    await ejecutar(LUNES_0800, dir);
    const segunda = await ejecutar('2026-11-09T12:00:00+01:00', dir);
    expect(segunda.resumen.totales).toMatchObject({ enviado: 0, yaEnviadoAntes: CON_CORREO_MARTES, sinCorreo: SIN_CORREO_MARTES });
    expect(await ficherosEml(dir)).toHaveLength(CON_CORREO_MARTES);
  });

  it('FR-005 / FR-006 queda el resumen de la ejecución y un recordatorio por cita', async () => {
    const e = await ejecutar(LUNES_0800, dir);
    const [fila] = await obtenerBd().select().from(ejecucionRecordatorios).where(eq(ejecucionRecordatorios.id, e.id));
    expect(fila).toMatchObject({
      fechaObjetivo: '2026-11-10',
      modo: 'simulado',
      ventanaDesde: new Date('2026-11-09T23:00:00Z'),
      ventanaHasta: new Date('2026-11-10T23:00:00Z'),
      iniciadaEn: new Date(LUNES_0800),
    });
    expect(fila!.terminadaEn).not.toBeNull();
    expect(fila!.resumen.totales.enviado).toBe(CON_CORREO_MARTES);
    const horas = fila!.resumen.citas.map((c) => c.hora);
    expect(horas).toEqual([...horas].sort());

    const recs = await obtenerBd().select().from(recordatorio);
    expect(recs).toHaveLength(CON_CORREO_MARTES);
    for (const r of recs) {
      expect(r).toMatchObject({ estado: 'enviado', modo: 'simulado', intentos: 1, generadoEn: new Date(LUNES_0800) });
      expect(r.destinatario).toContain('@');
      expect(r.fichero).toMatch(/2026-11-10_\d{4}_.+\.eml$/);
    }
  });

  it('Edge Cases (fin de semana): la ejecución del viernes cubre el sábado, sin citas', async () => {
    const e = await ejecutar('2026-11-13T08:00:00+01:00', dir);
    expect(e.fechaObjetivo).toBe('2026-11-14');
    expect(e.resumen.citas).toHaveLength(0);
    expect(await ficherosEml(dir)).toHaveLength(0);
  });
});

describe('US1 sobre un escenario mínimo', () => {
  let esc: Escenario;
  beforeEach(async () => {
    await vaciarTablas();
    esc = await crearEscenario();
  });

  it('US1 #1 el correo de Ana tiene el asunto y los datos de su cita', async () => {
    await insertarCita(esc, { profesionalId: esc.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45 });
    const e = await ejecutar('2026-11-15T08:00:00+01:00', dir);
    expect(e.resumen.totales.enviado).toBe(1);
    const [nombre] = await ficherosEml(dir);
    const correo = await leerEml(dir, nombre!);
    expect(correo.subject).toBe('Recordatorio de su cita en Clínica de Pruebas: lunes, 16/11/2026, 10:00');
    expect(correo.text).toContain('Hola, Ana:');
    expect(correo.text).toContain('lunes, 16/11/2026');
    expect(correo.text).toContain('10:00–10:45');
    expect(correo.text).toContain('Profesional: María');
    expect(correo.text).toContain('Servicio:    Sesión de fisioterapia');
    expect(correo.text).toContain(`${URL_PUBLICA}/p/${esc.tokenAna}`);
  });

  it('US1 #4 no se recuerdan citas canceladas, completadas ni no asistidas', async () => {
    await insertarCita(esc, { profesionalId: esc.maria, fecha: '2026-11-16', hora: '09:00', minutos: 45, estado: 'cancelada' });
    await insertarCita(esc, { profesionalId: esc.jorge, fecha: '2026-11-16', hora: '09:00', minutos: 45, estado: 'completada' });
    await insertarCita(esc, { profesionalId: esc.lucia, fecha: '2026-11-16', hora: '09:00', minutos: 30, servicioId: esc.consultaNutricion, estado: 'no_asistida' });
    const reservada = await insertarCita(esc, { profesionalId: esc.maria, fecha: '2026-11-16', hora: '11:00', minutos: 45 });
    const e = await ejecutar('2026-11-15T08:00:00+01:00', dir);
    expect(e.resumen.citas.map((c) => c.citaId)).toEqual([reservada.id]);
  });

  it('US1 #5 / FR-004 sin correo → «sin correo»; correo inválido → «correo no válido»; ningún correo para ellas', async () => {
    const invalido = await crearPaciente(esc, { nombre: 'Rosa Vidal', telefono: '611 222 333', email: 'rosa@' });
    await insertarCita(esc, { profesionalId: esc.maria, pacienteId: esc.luis, fecha: '2026-11-16', hora: '09:00', minutos: 45 });
    await insertarCita(esc, { profesionalId: esc.jorge, pacienteId: invalido.id, fecha: '2026-11-16', hora: '09:00', minutos: 45 });
    const e = await ejecutar('2026-11-15T08:00:00+01:00', dir);
    expect(e.resumen.citas.map((c) => c.resultado)).toEqual(['sin_correo', 'correo_no_valido']);
    expect(await ficherosEml(dir)).toHaveLength(0);
    expect(await obtenerBd().select().from(recordatorio)).toHaveLength(0);
  });

  it('FR-017 una cita cancelada y creada de nuevo recibe su propio recordatorio; la cancelada, ninguno más', async () => {
    const original = await insertarCita(esc, { profesionalId: esc.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45 });
    await ejecutar('2026-11-15T08:00:00+01:00', dir);
    // Recepción la cancela el lunes a las 08:30 y crea otra para el miércoles 18/11/2026 a las 12:00.
    await obtenerBd()
      .update(cita)
      .set({ estado: 'cancelada', canceladaPor: 'recepcion', estadoCambiadoEn: new Date('2026-11-16T08:30:00+01:00') })
      .where(eq(cita.id, original.id));
    const nueva = await insertarCita(esc, { profesionalId: esc.maria, fecha: '2026-11-18', hora: '12:00', minutos: 45 });
    const martes = await ejecutar('2026-11-17T08:00:00+01:00', dir);
    expect(martes.resumen.citas).toEqual([expect.objectContaining({ citaId: nueva.id, resultado: 'enviado' })]);
    const otraVez = await ejecutar('2026-11-15T09:00:00+01:00', dir);
    expect(otraVez.resumen.citas).toHaveLength(0);
    expect(await ficherosEml(dir)).toHaveLength(2);
  });
});
