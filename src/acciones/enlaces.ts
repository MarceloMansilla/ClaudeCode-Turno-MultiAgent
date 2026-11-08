'use server';

/**
 * Acciones del panel sobre el enlace del paciente (spec 005, FR-004, FR-005). Exigen la sesión
 * de recepción; la clínica sale de la sesión (001 FR-004) y la ficha tiene que ser suya.
 */
import { fallo, mensajes, type Resultado } from '@/dominio/errores';
import { clinicaDeSesion } from '@/lib/sesion';
import { obtenerEnlace, regenerarEnlace, type EnlaceParaRecepcion } from '@/servicios/enlaces';
import { esquemaPacienteId } from './esquemas';

async function conFicha(
  entrada: unknown,
  trabajo: (clinicaId: string, pacienteId: string) => Promise<Resultado<EnlaceParaRecepcion>>,
): Promise<Resultado<EnlaceParaRecepcion>> {
  const clinicaId = await clinicaDeSesion();
  if (!clinicaId) return fallo('SESION_CADUCADA', mensajes.sesionCaducada());
  const datos = esquemaPacienteId.safeParse(entrada);
  if (!datos.success) return fallo('NO_ENCONTRADO', mensajes.datosNoEncontrados());
  return trabajo(clinicaId, datos.data.pacienteId);
}

/** FR-005: «Copiar enlace». */
export async function obtenerEnlacePaciente(entrada: unknown): Promise<Resultado<EnlaceParaRecepcion>> {
  return conFicha(entrada, obtenerEnlace);
}

/** FR-004: «Generar enlace nuevo», solo tras el diálogo de confirmación. */
export async function regenerarEnlacePaciente(entrada: unknown): Promise<Resultado<EnlaceParaRecepcion>> {
  return conFicha(entrada, (clinicaId, pacienteId) => regenerarEnlace(clinicaId, pacienteId));
}
