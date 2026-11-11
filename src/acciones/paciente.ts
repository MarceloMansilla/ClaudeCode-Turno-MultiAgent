'use server';

/**
 * Acciones del paciente (spec 005, contracts/server-actions.md). No usan la sesión del panel: el
 * paciente y la clínica salen siempre del token de la URL y de la cookie de acceso, nunca de
 * datos del cliente (FR-006).
 */
import { mensajes, fallo, type Resultado } from '@/dominio/errores';
import { abrirAcceso, cerrarAcceso, cookieDeAcceso } from '@/lib/sesion-paciente';
import { confirmarCifrasPaciente, falloEnlaceNoValido } from '@/servicios/enlaces';
import { cancelarCitaPaciente, type CitaCanceladaPorPaciente } from '@/servicios/portal-paciente';
import { esquemaCancelarMiCita, esquemaConfirmarCifras, esquemaToken } from './esquemas';

/** Segundo paso del acceso (FR-006, FR-006a). Si va bien, abre el acceso de 30 minutos. */
export async function confirmarCifras(entrada: unknown): Promise<Resultado<Record<string, never>>> {
  const datos = esquemaConfirmarCifras.safeParse(entrada);
  if (!datos.success) {
    const token = esquemaToken.safeParse(entrada);
    if (!token.success) return falloEnlaceNoValido();
    return fallo('DATOS_NO_VALIDOS', mensajes.cifrasNoValidas(), { campo: 'cifras' });
  }
  const r = await confirmarCifrasPaciente(datos.data.token, datos.data.cifras.trim());
  if (!r.ok) return r;
  await abrirAcceso(r.datos.acceso);
  return { ok: true, datos: {} };
}

/**
 * Cancelación por el paciente (FR-009–FR-014). Solo se llama desde «Sí, cancelar mi cita» del
 * diálogo de confirmación (FR-012). El plazo se comprueba aquí, al procesarla.
 */
export async function cancelarMiCita(entrada: unknown): Promise<Resultado<CitaCanceladaPorPaciente>> {
  const datos = esquemaCancelarMiCita.safeParse(entrada);
  if (!datos.success) {
    if (!esquemaToken.safeParse(entrada).success) return falloEnlaceNoValido();
    return fallo('NO_ENCONTRADO', mensajes.citaDelPacienteNoEncontrada());
  }
  return cancelarCitaPaciente(datos.data.token, await cookieDeAcceso(), datos.data.citaId);
}

/** «Salir»: borra la cookie de acceso. Siempre `ok`. */
export async function salir(): Promise<Resultado<Record<string, never>>> {
  await cerrarAcceso();
  return { ok: true, datos: {} };
}
