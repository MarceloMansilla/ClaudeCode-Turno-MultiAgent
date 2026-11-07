/**
 * Fábrica de datos mínimos para tests de integración: una única clínica (FR-001, una clínica
 * por instalación) con la misma forma que Clínica Eleva.
 */
import { randomUUID } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { obtenerBd } from '../../src/db/cliente';
import {
  cita,
  clinica,
  paciente,
  profesional,
  servicio,
  type Cita,
  type EstadoCita,
} from '../../src/db/esquema';
import { instanteLocal } from '../../src/lib/zona';

export const CLAVE_PRUEBAS = 'clave-de-pruebas';
export const ZONA = 'Europe/Madrid';

export interface Escenario {
  clinicaId: string;
  maria: string;
  jorge: string;
  lucia: string;
  sesionFisio: string; // 45 min, 40,00 €
  primeraFisio: string; // 60 min, 50,00 €
  consultaNutricion: string; // 30 min, 35,00 €
  primeraNutricion: string; // 45 min, 45,00 €
  ana: string; // paciente con teléfono 612 345 678
  luis: string; // paciente con teléfono 699 000 111
}

export async function crearEscenario(): Promise<Escenario> {
  const bd = obtenerBd();
  const e: Escenario = {
    clinicaId: randomUUID(),
    maria: randomUUID(),
    jorge: randomUUID(),
    lucia: randomUUID(),
    sesionFisio: randomUUID(),
    primeraFisio: randomUUID(),
    consultaNutricion: randomUUID(),
    primeraNutricion: randomUUID(),
    ana: randomUUID(),
    luis: randomUUID(),
  };
  await bd.insert(clinica).values({
    id: e.clinicaId,
    nombre: 'Clínica de Pruebas',
    zonaHoraria: ZONA,
    horaApertura: '09:00',
    horaCierre: '20:00',
    diasLaborables: [1, 2, 3, 4, 5],
    claveHash: await hash(CLAVE_PRUEBAS),
  });
  await bd.insert(profesional).values([
    { id: e.maria, clinicaId: e.clinicaId, nombre: 'María', especialidad: 'fisioterapia', orden: 1 },
    { id: e.jorge, clinicaId: e.clinicaId, nombre: 'Jorge', especialidad: 'fisioterapia', orden: 2 },
    { id: e.lucia, clinicaId: e.clinicaId, nombre: 'Lucía', especialidad: 'nutricion', orden: 3 },
  ]);
  await bd.insert(servicio).values([
    { id: e.sesionFisio, clinicaId: e.clinicaId, nombre: 'Sesión de fisioterapia', especialidad: 'fisioterapia', duracionMinutos: 45, precioCentimos: 4000 },
    { id: e.primeraFisio, clinicaId: e.clinicaId, nombre: 'Primera visita de fisioterapia', especialidad: 'fisioterapia', duracionMinutos: 60, precioCentimos: 5000 },
    { id: e.consultaNutricion, clinicaId: e.clinicaId, nombre: 'Consulta de nutrición', especialidad: 'nutricion', duracionMinutos: 30, precioCentimos: 3500 },
    { id: e.primeraNutricion, clinicaId: e.clinicaId, nombre: 'Primera visita de nutrición', especialidad: 'nutricion', duracionMinutos: 45, precioCentimos: 4500 },
  ]);
  await bd.insert(paciente).values([
    { id: e.ana, clinicaId: e.clinicaId, nombre: 'Ana Pérez', telefono: '612 345 678', telefonoNormalizado: '612345678', email: 'ana@example.com' },
    { id: e.luis, clinicaId: e.clinicaId, nombre: 'Luis Gómez', telefono: '699000111', telefonoNormalizado: '699000111' },
  ]);
  return e;
}

/** Inserta una cita directamente (sin pasar por el servicio) en hora local de la clínica. */
export async function insertarCita(
  e: Escenario,
  datos: {
    profesionalId: string;
    servicioId?: string;
    pacienteId?: string;
    fecha: string;
    hora: string;
    minutos: number;
    estado?: EstadoCita;
  },
): Promise<Cita> {
  const inicio = instanteLocal(datos.fecha, datos.hora, ZONA);
  const fin = new Date(inicio.getTime() + datos.minutos * 60_000);
  const [fila] = await obtenerBd()
    .insert(cita)
    .values({
      id: randomUUID(),
      clinicaId: e.clinicaId,
      profesionalId: datos.profesionalId,
      servicioId: datos.servicioId ?? e.sesionFisio,
      pacienteId: datos.pacienteId ?? e.ana,
      inicio,
      fin,
      estado: datos.estado ?? 'reservada',
    })
    .returning();
  return fila!;
}
