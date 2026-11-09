/**
 * Lo que ve el paciente en `/p/[token]` (spec 005, contracts/ui-routes.md). La lista de citas es
 * la superficie mínima y provisional de research R1: la 002 la sustituye por sus pantallas.
 */
import { and, asc, eq, gte } from 'drizzle-orm';
import { obtenerBd } from '@/db/cliente';
import { cita, profesional, servicio } from '@/db/esquema';
import { estadoEnlace } from '@/dominio/enlace';
import { exito, fallo, mensajes, type Resultado } from '@/dominio/errores';
import { ETIQUETA_ESTADO } from '@/dominio/estados';
import { inicioMinimoCancelacionPaciente, pacientePuedeCancelar } from '@/dominio/plazo-paciente';
import { enunciadoPoliticaCancelacion } from '@/dominio/politica-cancelacion';
import { verificarTokenAcceso } from '@/lib/acceso-paciente';
import { formatearFecha } from '@/lib/formato';
import { ahora as reloj } from '@/lib/reloj';
import { fechaLocal, horaLocal } from '@/lib/zona';
import { cancelarCita } from './citas';
import { clinicaDeLaInstalacion, falloEnlaceNoValido, resolverToken, type ClinicaPublica } from './enlaces';

export interface CitaDelPaciente {
  id: string;
  /** «lunes, 16/11/2026» */
  fecha: string;
  /** «10:00» */
  hora: string;
  servicio: string;
  profesional: string;
  inicio: Date;
  /** FR-011: solo si está reservada y faltan más de 24 h (005 FR-009). */
  puedeCancelar: boolean;
  /** FR-016: enunciado de la política para esta cita, con su límite. */
  enunciado: string;
}

/** FR-006: solo citas de ese paciente en su clínica, reservadas y futuras, por orden de inicio. */
export async function proximasCitas(
  clinica: ClinicaPublica,
  pacienteId: string,
  ahora: Date,
): Promise<CitaDelPaciente[]> {
  const { id: clinicaId, zonaHoraria } = clinica;
  const filas = await obtenerBd()
    .select({
      id: cita.id,
      inicio: cita.inicio,
      servicio: servicio.nombre,
      profesional: profesional.nombre,
    })
    .from(cita)
    .innerJoin(servicio, eq(servicio.id, cita.servicioId))
    .innerJoin(profesional, eq(profesional.id, cita.profesionalId))
    .where(
      and(
        eq(cita.clinicaId, clinicaId),
        eq(cita.pacienteId, pacienteId),
        eq(cita.estado, 'reservada'),
        gte(cita.inicio, ahora),
      ),
    )
    .orderBy(asc(cita.inicio));
  return filas.map((f) => ({
    ...f,
    fecha: formatearFecha(fechaLocal(f.inicio, zonaHoraria)),
    hora: horaLocal(f.inicio, zonaHoraria),
    puedeCancelar: pacientePuedeCancelar({ estado: 'reservada', inicio: f.inicio }, ahora),
    enunciado: enunciadoDe(clinica, f.inicio),
  }));
}

export type PantallaPaciente =
  | { tipo: 'no_valido'; clinica: ClinicaPublica | undefined }
  | { tipo: 'bloqueado'; clinica: ClinicaPublica }
  | { tipo: 'pausa'; clinica: ClinicaPublica; hasta: string }
  | { tipo: 'cifras'; clinica: ClinicaPublica }
  | { tipo: 'dentro'; clinica: ClinicaPublica; pacienteId: string; citas: CitaDelPaciente[] };

/**
 * Decide la pantalla de `/p/[token]` en cada carga (data-model.md, «Estados del enlace»). Hasta
 * completar los dos pasos (FR-006) no sale de aquí ningún dato de pacientes ni de citas: solo
 * el nombre y el teléfono de la clínica.
 */
export async function pantallaPaciente(token: string, cookie: string | undefined): Promise<PantallaPaciente> {
  const enlace = await resolverToken(token);
  if (!enlace) return { tipo: 'no_valido', clinica: await clinicaDeLaInstalacion() };

  const ahora = reloj();
  const estado = estadoEnlace(enlace, ahora);
  // FR-006a: un enlace bloqueado no muestra datos, ni siquiera con un acceso abierto antes.
  if (estado === 'bloqueado') return { tipo: 'bloqueado', clinica: enlace.clinica };

  const acceso = await verificarTokenAcceso(cookie, token);
  if (acceso && acceso.pacienteId === enlace.pacienteId && acceso.clinicaId === enlace.clinica.id) {
    return {
      tipo: 'dentro',
      clinica: enlace.clinica,
      pacienteId: enlace.pacienteId,
      citas: await proximasCitas(enlace.clinica, enlace.pacienteId, ahora),
    };
  }
  if (estado === 'en_pausa') {
    return { tipo: 'pausa', clinica: enlace.clinica, hasta: horaLocal(enlace.pausaHasta!, enlace.clinica.zonaHoraria) };
  }
  return { tipo: 'cifras', clinica: enlace.clinica };
}

function enunciadoDe(clinica: ClinicaPublica, inicio: Date): string {
  return enunciadoPoliticaCancelacion({
    inicio,
    zonaHoraria: clinica.zonaHoraria,
    clinicaNombre: clinica.nombre,
    clinicaTelefono: clinica.telefono,
  });
}

export interface CitaCanceladaPorPaciente {
  citaId: string;
  fecha: string;
  hora: string;
  mensaje: string;
}

/**
 * Cancelación por el paciente (FR-009–FR-014), en el orden de contracts/server-actions.md:
 * token vigente → acceso abierto con la huella de ese token → `cancelarCita` con origen
 * `paciente`, que comprueba estado y plazo con `ahora()` en el momento de procesarla (no al
 * mostrar la pantalla). El paciente y la clínica salen del enlace, nunca del cliente (FR-006).
 */
export async function cancelarCitaPaciente(
  token: string,
  cookie: string | undefined,
  citaId: string,
): Promise<Resultado<CitaCanceladaPorPaciente>> {
  const enlace = await resolverToken(token);
  if (!enlace) return falloEnlaceNoValido();
  const { clinica } = enlace;
  const ahora = reloj();
  if (estadoEnlace(enlace, ahora) === 'bloqueado') {
    return fallo('ENLACE_BLOQUEADO', mensajes.enlaceBloqueado(clinica.nombre, clinica.telefono));
  }
  const acceso = await verificarTokenAcceso(cookie, token);
  if (!acceso || acceso.pacienteId !== enlace.pacienteId || acceso.clinicaId !== clinica.id) {
    return fallo('ACCESO_CADUCADO', mensajes.accesoCaducado());
  }

  const r = await cancelarCita(obtenerBd(), {
    clinicaId: clinica.id,
    citaId,
    origen: 'paciente',
    ahora,
    pacienteId: enlace.pacienteId,
    inicioMinimo: inicioMinimoCancelacionPaciente(ahora),
  });
  if (r.ok) {
    const fecha = formatearFecha(fechaLocal(r.cita.inicio, clinica.zonaHoraria));
    const hora = horaLocal(r.cita.inicio, clinica.zonaHoraria);
    return exito({ citaId: r.cita.id, fecha, hora, mensaje: mensajes.citaCanceladaPorPaciente(fecha, hora) });
  }
  if (r.motivo === 'no_encontrada') return fallo('NO_ENCONTRADO', mensajes.citaDelPacienteNoEncontrada());
  if (r.motivo === 'estado_cambiado') {
    return fallo('ESTADO_CAMBIADO', mensajes.estadoCambiadoPaciente(ETIQUETA_ESTADO[r.actual.estado]), {
      detalle: { estado: r.actual.estado },
    });
  }
  const enunciado = enunciadoDe(clinica, r.actual.inicio);
  return fallo('FUERA_DE_PLAZO', mensajes.fueraDePlazo(enunciado), { detalle: { enunciado } });
}
