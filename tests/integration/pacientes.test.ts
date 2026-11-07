import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { enTransaccion, obtenerBd } from '@/db/cliente';
import { paciente } from '@/db/esquema';
import { buscarPacientes, crearPaciente } from '@/servicios/pacientes';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, type Escenario } from '../helpers/fabrica';

let e: Escenario;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
});

const crear = (nombre: string, telefono: string, email?: string) =>
  enTransaccion((tx) => crearPaciente(e.clinicaId, { nombre, telefono, email }, tx));

describe('FR-016 — búsqueda de pacientes', () => {
  it('por nombre sin distinguir mayúsculas ni tildes', async () => {
    await crear('María Núñez', '611 222 333');
    expect((await buscarPacientes(e.clinicaId, 'maria')).map((p) => p.nombre)).toEqual(['María Núñez']);
    expect((await buscarPacientes(e.clinicaId, 'NUÑEZ')).map((p) => p.nombre)).toEqual(['María Núñez']);
    expect((await buscarPacientes(e.clinicaId, 'perez')).map((p) => p.nombre)).toEqual(['Ana Pérez']);
  });

  it('por teléfono en cualquier formato', async () => {
    expect((await buscarPacientes(e.clinicaId, '612 345')).map((p) => p.nombre)).toEqual(['Ana Pérez']);
    expect((await buscarPacientes(e.clinicaId, '+34 612-345-678')).map((p) => p.nombre)).toEqual(['Ana Pérez']);
  });

  it('como máximo 10 resultados y nada con menos de 2 caracteres', async () => {
    for (let i = 0; i < 12; i++) await crear(`Paciente Prueba ${i}`, `6000000${String(i).padStart(2, '0')}`);
    expect(await buscarPacientes(e.clinicaId, 'prueba')).toHaveLength(10);
    expect(await buscarPacientes(e.clinicaId, 'p')).toEqual([]);
  });
});

describe('FR-016a/b/c — alta de ficha', () => {
  it('FR-016a — crea la ficha con nombre, teléfono y correo opcional', async () => {
    const r = await crear('Marta Ruiz', '655-111-222', 'marta@example.com');
    expect(r).toMatchObject({ ok: true, datos: { nombre: 'Marta Ruiz', telefono: '655-111-222' } });
    const [f] = await obtenerBd().select().from(paciente).where(eq(paciente.telefonoNormalizado, '655111222'));
    expect(f!.email).toBe('marta@example.com');
  });

  it('valida nombre, teléfono y correo con mensajes claros', async () => {
    expect(await crear(' ', '655111222')).toMatchObject({ codigo: 'DATOS_NO_VALIDOS', campo: 'nombre', mensaje: 'Escribe el nombre del paciente.' });
    expect(await crear('John Smith', '+44 7700 900123')).toMatchObject({
      codigo: 'DATOS_NO_VALIDOS',
      campo: 'telefono',
      mensaje: 'Revisa el teléfono: debe ser un número español de 9 cifras.',
    });
    expect(await crear('Marta Ruiz', '655111222', 'no-es-correo')).toMatchObject({ campo: 'email' });
  });

  it('FR-016b — teléfono ya registrado (otro formato): TELEFONO_DUPLICADO con la ficha existente', async () => {
    expect(await crear('Otra Ana', '+34 612 34 56 78')).toMatchObject({
      ok: false,
      codigo: 'TELEFONO_DUPLICADO',
      mensaje: 'Ya hay un paciente con este teléfono: Ana Pérez.',
      detalle: { pacienteId: e.ana, nombre: 'Ana Pérez' },
    });
  });

  it('FR-016b — 2 altas simultáneas con el mismo teléfono: solo 1 ficha', async () => {
    const resultados = await Promise.all([crear('Pedro Uno', '677 888 999'), crear('Pedro Dos', '677-888-999')]);
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(resultados.find((r) => !r.ok)).toMatchObject({ codigo: 'TELEFONO_DUPLICADO' });
    expect(await obtenerBd().select().from(paciente).where(eq(paciente.telefonoNormalizado, '677888999'))).toHaveLength(1);
  });
});
