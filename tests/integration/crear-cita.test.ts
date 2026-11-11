import { and, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita, paciente } from '@/db/esquema';
import { fijarAhora } from '@/lib/reloj';
import { crearCita, type EntradaCrearCita } from '@/servicios/citas';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, insertarCita, type Escenario } from '../helpers/fabrica';

const LUNES = '2026-11-16';
let e: Escenario;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
  fijarAhora('2026-11-09T12:10:00+01:00');
});
afterEach(() => fijarAhora(undefined));

const alta = (cambios: Partial<EntradaCrearCita> = {}): EntradaCrearCita => ({
  profesionalId: e.maria,
  servicioId: e.sesionFisio,
  fecha: LUNES,
  hora: '10:00',
  paciente: { id: e.ana },
  ...cambios,
});

const citasDe = (profesionalId: string) =>
  obtenerBd().select().from(cita).where(eq(cita.profesionalId, profesionalId));

describe('US2 — alta de cita', () => {
  it('US2 #1 — FR-009/FR-010: fin = inicio + duración y estado reservada', async () => {
    const r = await crearCita(e.clinicaId, alta());
    expect(r).toMatchObject({ ok: true, datos: { inicio: '10:00', fin: '10:45', pacienteNombre: 'Ana Pérez' } });
    const [guardada] = await citasDe(e.maria);
    expect(guardada!.estado).toBe('reservada');
    expect(guardada!.inicio.toISOString()).toBe('2026-11-16T09:00:00.000Z');
    expect(guardada!.fin.toISOString()).toBe('2026-11-16T09:45:00.000Z');
  });

  it('US2 #2 — SOLAPE: 60 min a las 10:30 choca con 10:00–10:45 y no se guarda nada', async () => {
    await crearCita(e.clinicaId, alta());
    const r = await crearCita(e.clinicaId, alta({ servicioId: e.primeraFisio, hora: '10:30' }));
    expect(r).toMatchObject({
      ok: false,
      codigo: 'SOLAPE',
      mensaje: 'María ya tiene una cita de 10:00 a 10:45. Elige otro hueco.',
    });
    expect(await citasDe(e.maria)).toHaveLength(1);
  });

  it('US2 #3 — contigua a las 10:45 se registra', async () => {
    await crearCita(e.clinicaId, alta());
    expect((await crearCita(e.clinicaId, alta({ hora: '10:45' }))).ok).toBe(true);
  });

  it('US2 #4 — una cita cancelada no bloquea el hueco', async () => {
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '10:00', minutos: 45, estado: 'cancelada' });
    expect((await crearCita(e.clinicaId, alta())).ok).toBe(true);
  });

  it('FR-011 — una cita completada sí bloquea; una no asistida no', async () => {
    fijarAhora('2026-11-01T12:00:00+01:00');
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '10:00', minutos: 45, estado: 'completada' });
    await insertarCita(e, { profesionalId: e.maria, fecha: LUNES, hora: '12:00', minutos: 45, estado: 'no_asistida' });
    expect(await crearCita(e.clinicaId, alta({ hora: '10:15' }))).toMatchObject({ codigo: 'SOLAPE' });
    expect((await crearCita(e.clinicaId, alta({ hora: '12:00' }))).ok).toBe(true);
  });

  it('US2 #5 — el solape solo afecta al mismo profesional', async () => {
    await crearCita(e.clinicaId, alta({ profesionalId: e.jorge }));
    expect((await crearCita(e.clinicaId, alta())).ok).toBe(true);
  });

  it('US2 #6 — RN2: hoy a las 12:00 con «ahora» 12:10 es EN_EL_PASADO, comprobado al guardar', async () => {
    const hoy = '2026-11-09';
    expect(await crearCita(e.clinicaId, alta({ fecha: hoy, hora: '12:00' }))).toEqual(
      expect.objectContaining({ ok: false, codigo: 'EN_EL_PASADO', mensaje: 'No se pueden crear citas en el pasado.' }),
    );
    expect(await crearCita(e.clinicaId, alta({ fecha: '2026-11-06', hora: '10:00' }))).toMatchObject({ codigo: 'EN_EL_PASADO' });
    // El formulario se abrió a las 12:10 para las 12:15; si se guarda a las 12:16, ya es pasado.
    fijarAhora('2026-11-09T12:16:00+01:00');
    expect(await crearCita(e.clinicaId, alta({ fecha: hoy, hora: '12:15' }))).toMatchObject({ codigo: 'EN_EL_PASADO' });
    fijarAhora('2026-11-09T12:10:00+01:00');
    expect((await crearCita(e.clinicaId, alta({ fecha: hoy, hora: '12:15' }))).ok).toBe(true);
  });

  it('US2 #8 — FUERA_DE_HORARIO: 60 min a las 19:30 terminaría a las 20:30', async () => {
    expect(await crearCita(e.clinicaId, alta({ servicioId: e.primeraFisio, hora: '19:30' }))).toMatchObject({
      codigo: 'FUERA_DE_HORARIO',
      mensaje: 'La cita terminaría a las 20:30, después del cierre (20:00). Elige una hora anterior.',
    });
    expect((await crearCita(e.clinicaId, alta({ servicioId: e.primeraFisio, hora: '19:00' }))).ok).toBe(true);
    expect(await crearCita(e.clinicaId, alta({ hora: '08:45' }))).toMatchObject({
      codigo: 'FUERA_DE_HORARIO',
      mensaje: 'La clínica abre a las 09:00. Elige una hora a partir de esa.',
    });
  });

  it.each([['2026-11-14', 'sábado'], ['2026-11-15', 'domingo']])(
    'FR-014 — el %s (%s) no admite citas',
    async (fecha) => {
      expect(await crearCita(e.clinicaId, alta({ fecha }))).toMatchObject({
        codigo: 'FUERA_DE_HORARIO',
        mensaje: 'La clínica no abre este día. Elige un día de lunes a viernes.',
      });
    },
  );

  it('FR-014 — HORA_NO_VALIDA si no empieza en múltiplo de 15', async () => {
    expect(await crearCita(e.clinicaId, alta({ hora: '10:10' }))).toMatchObject({
      codigo: 'HORA_NO_VALIDA',
      mensaje: 'Las citas empiezan en punto, y cuarto, y media o menos cuarto.',
    });
  });

  it('FR-009a — SERVICIO_INCOMPATIBLE: «Consulta de nutrición» con María', async () => {
    expect(await crearCita(e.clinicaId, alta({ servicioId: e.consultaNutricion }))).toMatchObject({
      codigo: 'SERVICIO_INCOMPATIBLE',
      mensaje: 'María no atiende «Consulta de nutrición». Elige un servicio de Fisioterapia.',
    });
    expect((await crearCita(e.clinicaId, alta({ profesionalId: e.lucia, servicioId: e.consultaNutricion }))).ok).toBe(true);
  });

  it('US2 #9 — FR-016a: paciente nuevo + cita en una sola operación', async () => {
    const r = await crearCita(e.clinicaId, alta({ paciente: { nuevo: { nombre: '  Marta  Ruiz ', telefono: '+34 655 111 222' } } }));
    expect(r).toMatchObject({ ok: true, datos: { pacienteNombre: 'Marta Ruiz' } });
    const [ficha] = await obtenerBd().select().from(paciente).where(eq(paciente.telefonoNormalizado, '655111222'));
    expect(ficha).toMatchObject({ nombre: 'Marta Ruiz', telefono: '+34 655 111 222', email: null });
  });

  it('si la cita falla, la ficha de paciente nuevo no se crea', async () => {
    await crearCita(e.clinicaId, alta());
    const r = await crearCita(e.clinicaId, alta({ paciente: { nuevo: { nombre: 'Marta Ruiz', telefono: '655111222' } } }));
    expect(r).toMatchObject({ codigo: 'SOLAPE' });
    expect(await obtenerBd().select().from(paciente).where(eq(paciente.telefonoNormalizado, '655111222'))).toHaveLength(0);
  });

  it('FR-016b — paciente nuevo con un teléfono existente en otro formato: TELEFONO_DUPLICADO', async () => {
    const r = await crearCita(e.clinicaId, alta({ paciente: { nuevo: { nombre: 'Ana P.', telefono: '+34 612-345-678' } } }));
    expect(r).toMatchObject({
      ok: false,
      codigo: 'TELEFONO_DUPLICADO',
      mensaje: 'Ya hay un paciente con este teléfono: Ana Pérez.',
      detalle: { pacienteId: e.ana, nombre: 'Ana Pérez' },
    });
    expect(await citasDe(e.maria)).toHaveLength(0);
  });

  it('FR-016c — teléfono extranjero rechazado con el mensaje del contrato', async () => {
    expect(await crearCita(e.clinicaId, alta({ paciente: { nuevo: { nombre: 'John Smith', telefono: '+44 7700 900123' } } }))).toMatchObject({
      codigo: 'DATOS_NO_VALIDOS',
      campo: 'telefono',
      mensaje: 'Revisa el teléfono: debe ser un número español de 9 cifras.',
    });
  });

  it('profesional, servicio o paciente inexistentes: NO_ENCONTRADO', async () => {
    const otro = '00000000-0000-4000-8000-000000000000';
    expect(await crearCita(e.clinicaId, alta({ profesionalId: otro }))).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect(await crearCita(e.clinicaId, alta({ paciente: { id: otro } }))).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect(
      await obtenerBd().select().from(cita).where(and(eq(cita.clinicaId, e.clinicaId))),
    ).toHaveLength(0);
  });
});
