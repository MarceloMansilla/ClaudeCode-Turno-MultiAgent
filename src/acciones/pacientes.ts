'use server';

import { exito, fallo, mensajes, type Resultado } from '@/dominio/errores';
import { clinicaDeSesion } from '@/lib/sesion';
import { buscarPacientes as buscar, type PacienteResumen } from '@/servicios/pacientes';
import { esquemaBuscarPacientes } from './esquemas';

/** FR-016: búsqueda por nombre o teléfono (máximo 10). */
export async function buscarPacientes(entrada: { texto: string }): Promise<Resultado<PacienteResumen[]>> {
  const clinicaId = await clinicaDeSesion();
  if (!clinicaId) return fallo('SESION_CADUCADA', mensajes.sesionCaducada());
  const datos = esquemaBuscarPacientes.safeParse(entrada);
  if (!datos.success) return exito([]);
  return exito(await buscar(clinicaId, datos.data.texto));
}
