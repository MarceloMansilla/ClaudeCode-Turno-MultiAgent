/**
 * Agenda del día de un profesional (FR-005–FR-008, contracts/server-actions.md `obtenerAgendaDia`).
 */
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { obtenerBd } from '@/db/cliente';
import { cita, paciente, servicio, type EstadoCita, type Especialidad } from '@/db/esquema';
import { accionesDisponibles, ETIQUETA_ESTADO, type AccionCita } from '@/dominio/estados';
import { esLaborable } from '@/dominio/horario';
import { calcularHuecosLibres, type Hueco } from '@/dominio/huecos';
import { formatearFecha, formatearPrecio } from '@/lib/formato';
import { ahora as reloj } from '@/lib/reloj';
import { fechaLocal, horaLocal, rangoDelDia } from '@/lib/zona';
import { obtenerClinica, obtenerProfesional } from './catalogo';

export interface CitaVista {
  id: string;
  inicio: string; // 'HH:mm'
  fin: string;
  estado: EstadoCita;
  etiquetaEstado: string;
  paciente: { id: string; nombre: string; telefono: string };
  servicio: { nombre: string; duracionMinutos: number; precio: string };
  accionesDisponibles: AccionCita[];
}

export interface AgendaDia {
  profesional: { id: string; nombre: string; especialidad: Especialidad };
  fecha: string;
  etiquetaFecha: string;
  esHoy: boolean;
  laborable: boolean;
  horario: { apertura: string; cierre: string };
  ahora: string | null; // 'HH:mm' si la fecha es hoy
  citas: CitaVista[];
  huecosLibres: Hueco[];
}

/** `null` si el profesional no existe en la clínica de la sesión. */
export async function obtenerAgendaDia(
  clinicaId: string,
  profesionalId: string,
  fecha: string,
): Promise<AgendaDia | null> {
  const [clin, prof] = await Promise.all([
    obtenerClinica(clinicaId),
    obtenerProfesional(clinicaId, profesionalId),
  ]);
  if (!clin || !prof) return null;

  const zona = clin.zonaHoraria;
  const { desde, hasta } = rangoDelDia(fecha, zona);
  const filas = await obtenerBd()
    .select({
      id: cita.id,
      inicio: cita.inicio,
      fin: cita.fin,
      estado: cita.estado,
      pacienteId: cita.pacienteId,
      pacienteNombre: paciente.nombre,
      pacienteTelefono: paciente.telefono,
      servicioNombre: servicio.nombre,
      duracion: servicio.duracionMinutos,
      precio: servicio.precioCentimos,
    })
    .from(cita)
    .innerJoin(paciente, eq(paciente.id, cita.pacienteId))
    .innerJoin(servicio, eq(servicio.id, cita.servicioId))
    .where(
      and(
        eq(cita.clinicaId, clinicaId),
        eq(cita.profesionalId, profesionalId),
        gte(cita.inicio, desde),
        lt(cita.inicio, hasta),
      ),
    )
    .orderBy(asc(cita.inicio), asc(cita.creadoEn));

  const ahora = reloj();
  const horario = {
    horaApertura: clin.horaApertura,
    horaCierre: clin.horaCierre,
    diasLaborables: clin.diasLaborables,
  };
  const esHoy = fechaLocal(ahora, zona) === fecha;

  return {
    profesional: { id: prof.id, nombre: prof.nombre, especialidad: prof.especialidad },
    fecha,
    etiquetaFecha: formatearFecha(fecha),
    esHoy,
    laborable: esLaborable(fecha, horario),
    horario: { apertura: clin.horaApertura.slice(0, 5), cierre: clin.horaCierre.slice(0, 5) },
    ahora: esHoy ? horaLocal(ahora, zona) : null,
    citas: filas.map((f) => ({
      id: f.id,
      inicio: horaLocal(f.inicio, zona),
      fin: horaLocal(f.fin, zona),
      estado: f.estado,
      etiquetaEstado: ETIQUETA_ESTADO[f.estado],
      paciente: { id: f.pacienteId, nombre: f.pacienteNombre, telefono: f.pacienteTelefono },
      servicio: {
        nombre: f.servicioNombre,
        duracionMinutos: f.duracion,
        precio: formatearPrecio(f.precio),
      },
      accionesDisponibles: accionesDisponibles(f, ahora),
    })),
    huecosLibres: calcularHuecosLibres(fecha, filas, horario, zona, ahora),
  };
}
