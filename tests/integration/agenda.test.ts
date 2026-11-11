import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fijarAhora } from '@/lib/reloj';
import { obtenerAgendaDia } from '@/servicios/agenda';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, insertarCita, type Escenario } from '../helpers/fabrica';

const LUNES = '2026-11-16';
let e: Escenario;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
  fijarAhora('2026-11-16T12:10:00+01:00');
});
afterEach(() => fijarAhora(undefined));

describe('US1 — agenda del día (FR-005, FR-006)', () => {
  it('FR-005 — citas en orden cronológico con hora, paciente, servicio y estado; todos los estados', async () => {
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '12:00', minutos: 60, servicioId: e.primeraFisio, pacienteId: e.luis });
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '09:00', minutos: 45, estado: 'completada' });
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '10:00', minutos: 45, estado: 'cancelada' });
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '11:00', minutos: 45, estado: 'no_asistida' });
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '16:00', minutos: 45 });

    const agenda = (await obtenerAgendaDia(e.clinicaId, e.maria, LUNES))!;
    expect(agenda.etiquetaFecha).toBe('lunes, 16/11/2026');
    expect(agenda.laborable).toBe(true);
    expect(agenda.esHoy).toBe(true);
    expect(agenda.citas.map((c) => [c.inicio, c.fin, c.estado])).toEqual([
      ['09:00', '09:45', 'completada'],
      ['10:00', '10:45', 'cancelada'],
      ['11:00', '11:45', 'no_asistida'],
      ['12:00', '13:00', 'reservada'],
      ['16:00', '16:45', 'reservada'],
    ]);
    const primera = agenda.citas[3]!;
    // Spec 005 (T048): la vista incluye el id de la ficha para el menú «Enlace del paciente».
    expect(primera.paciente).toEqual({ id: e.luis, nombre: 'Luis Gómez', telefono: '699000111' });
    expect(primera.servicio).toEqual({
      nombre: 'Primera visita de fisioterapia',
      duracionMinutos: 60,
      precio: '50,00 €',
    });
    expect(primera.etiquetaEstado).toBe('Reservada');
  });

  it('accionesDisponibles según la hora: empezada → completar/no asistida; futura → cancelar', async () => {
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '12:00', minutos: 45 });
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '16:00', minutos: 45 });
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '09:00', minutos: 45, estado: 'completada' });
    const { citas } = (await obtenerAgendaDia(e.clinicaId, e.maria, LUNES))!;
    expect(citas.map((c) => c.accionesDisponibles)).toEqual([[], ['completar', 'no_asistida'], ['cancelar']]);
  });

  it('FR-006 — huecos libres: canceladas no ocupan; tramo pasado no reservable', async () => {
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '09:00', minutos: 45, estado: 'completada' });
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '10:00', minutos: 45, estado: 'cancelada' });
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '13:00', minutos: 60 });
    const { huecosLibres } = (await obtenerAgendaDia(e.clinicaId, e.maria, LUNES))!;
    expect(huecosLibres).toEqual([
      { inicio: '09:45', fin: '12:15', reservable: false },
      { inicio: '12:15', fin: '13:00', reservable: true },
      { inicio: '14:00', fin: '20:00', reservable: true },
    ]);
  });

  it('solo aparecen las citas del profesional y del día pedidos, incluidas 09:00 y 19:45 locales', async () => {
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '09:00', minutos: 45 });
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '19:15', minutos: 45 });
    await insertarCita(e, { profesionalId: e.jorge, fecha: LUNES, hora: '10:00', minutos: 45 });
    await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-17', hora: '09:00', minutos: 45 });
    const { citas } = (await obtenerAgendaDia(e.clinicaId, e.maria, LUNES))!;
    expect(citas.map((c) => c.inicio)).toEqual(['09:00', '19:15']);
  });

  it('día no laborable: sin huecos', async () => {
    const agenda = (await obtenerAgendaDia(e.clinicaId, e.maria, '2026-11-14'))!;
    expect(agenda.laborable).toBe(false);
    expect(agenda.huecosLibres).toEqual([]);
  });

  it('FR-004 — profesional inexistente o de otra clínica: null', async () => {
    expect(await obtenerAgendaDia(e.clinicaId, '00000000-0000-4000-8000-000000000000', LUNES)).toBeNull();
    expect(await obtenerAgendaDia('00000000-0000-4000-8000-000000000000', e.maria, LUNES)).toBeNull();
  });
});
