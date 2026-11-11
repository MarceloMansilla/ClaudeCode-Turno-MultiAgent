'use server';

import { revalidatePath } from 'next/cache';
import { fallo, mensajes, type Resultado } from '@/dominio/errores';
import { clinicaDeSesion } from '@/lib/sesion';
import {
  cambiarEstadoCita as cambiar,
  crearCita as crear,
  type CitaCreada,
  type EstadoActualizado,
} from '@/servicios/citas';
import { esquemaCambiarEstado, esquemaCrearCita } from './esquemas';

/** US2 — alta de cita (con alta rápida de paciente opcional). */
export async function crearCita(entrada: unknown): Promise<Resultado<CitaCreada>> {
  const clinicaId = await clinicaDeSesion();
  if (!clinicaId) return fallo('SESION_CADUCADA', mensajes.sesionCaducada());
  const datos = esquemaCrearCita.safeParse(entrada);
  if (!datos.success) return fallo('DATOS_NO_VALIDOS', mensajes.datosIncompletos());

  const resultado = await crear(clinicaId, datos.data);
  if (resultado.ok) revalidatePath(`/agenda/${datos.data.profesionalId}/${datos.data.fecha}`);
  return resultado;
}

/** US3 — completar, cancelar o marcar no asistida (FR-017–FR-020). */
export async function cambiarEstadoCita(entrada: unknown): Promise<Resultado<EstadoActualizado>> {
  const clinicaId = await clinicaDeSesion();
  if (!clinicaId) return fallo('SESION_CADUCADA', mensajes.sesionCaducada());
  const datos = esquemaCambiarEstado.safeParse(entrada);
  if (!datos.success) return fallo('NO_ENCONTRADO', mensajes.citaNoEncontrada());

  const resultado = await cambiar(clinicaId, datos.data.citaId, datos.data.accion);
  const afectada = resultado.ok
    ? resultado.datos
    : (resultado.detalle as EstadoActualizado | undefined);
  if (afectada) revalidatePath(`/agenda/${afectada.profesionalId}/${afectada.fecha}`);
  return resultado;
}
