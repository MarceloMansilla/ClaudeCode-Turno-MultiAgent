/**
 * Lectura del catálogo de la clínica. Toda consulta filtra por `clinicaId`, que siempre sale de
 * la sesión (FR-004).
 */
import { and, asc, eq } from 'drizzle-orm';
import { obtenerBd, type Ejecutor } from '@/db/cliente';
import {
  clinica,
  profesional,
  servicio,
  type Clinica,
  type Especialidad,
  type Profesional,
  type Servicio,
} from '@/db/esquema';

export const ETIQUETA_ESPECIALIDAD: Record<Especialidad, string> = {
  fisioterapia: 'Fisioterapia',
  nutricion: 'Nutrición',
};

export async function obtenerClinica(
  clinicaId: string,
  bd: Ejecutor = obtenerBd(),
): Promise<Clinica | undefined> {
  const [fila] = await bd.select().from(clinica).where(eq(clinica.id, clinicaId)).limit(1);
  return fila;
}

export async function listarProfesionales(
  clinicaId: string,
  bd: Ejecutor = obtenerBd(),
): Promise<Profesional[]> {
  return bd
    .select()
    .from(profesional)
    .where(eq(profesional.clinicaId, clinicaId))
    .orderBy(asc(profesional.orden), asc(profesional.nombre));
}

export async function obtenerProfesional(
  clinicaId: string,
  profesionalId: string,
  bd: Ejecutor = obtenerBd(),
): Promise<Profesional | undefined> {
  const [fila] = await bd
    .select()
    .from(profesional)
    .where(and(eq(profesional.clinicaId, clinicaId), eq(profesional.id, profesionalId)))
    .limit(1);
  return fila;
}

/** FR-009a: los servicios que puede atender un profesional son los de su especialidad. */
export async function listarServiciosDeEspecialidad(
  clinicaId: string,
  especialidad: Especialidad,
  bd: Ejecutor = obtenerBd(),
): Promise<Servicio[]> {
  return bd
    .select()
    .from(servicio)
    .where(and(eq(servicio.clinicaId, clinicaId), eq(servicio.especialidad, especialidad)))
    .orderBy(asc(servicio.duracionMinutos), asc(servicio.nombre));
}

export async function obtenerServicio(
  clinicaId: string,
  servicioId: string,
  bd: Ejecutor = obtenerBd(),
): Promise<Servicio | undefined> {
  const [fila] = await bd
    .select()
    .from(servicio)
    .where(and(eq(servicio.clinicaId, clinicaId), eq(servicio.id, servicioId)))
    .limit(1);
  return fila;
}

/**
 * Todos los servicios de la clínica (spec 004, ingresos por servicio), en el orden del
 * catálogo: especialidad y, dentro de cada una, el mismo orden que
 * `listarServiciosDeEspecialidad`.
 */
export async function listarServicios(
  clinicaId: string,
  bd: Ejecutor = obtenerBd(),
): Promise<Servicio[]> {
  return bd
    .select()
    .from(servicio)
    .where(eq(servicio.clinicaId, clinicaId))
    .orderBy(asc(servicio.especialidad), asc(servicio.duracionMinutos), asc(servicio.nombre));
}
