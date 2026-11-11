/**
 * Cookie de acceso del paciente en Server Actions y páginas (spec 005, FR-006b). Next.js solo
 * permite escribirla en Server Functions o en el proxy; las páginas solo la leen.
 */
import { cookies } from 'next/headers';
import {
  crearTokenAcceso,
  NOMBRE_COOKIE_PACIENTE,
  opcionesCookieAcceso,
  RUTA_COOKIE_PACIENTE,
  type AccesoPaciente,
} from './acceso-paciente';

export async function abrirAcceso(acceso: AccesoPaciente): Promise<void> {
  (await cookies()).set(NOMBRE_COOKIE_PACIENTE, await crearTokenAcceso(acceso), opcionesCookieAcceso());
}

export async function cerrarAcceso(): Promise<void> {
  (await cookies()).delete({ name: NOMBRE_COOKIE_PACIENTE, path: RUTA_COOKIE_PACIENTE });
}

/** Valor crudo de la cookie; se verifica junto con el token de la URL en el servicio. */
export async function cookieDeAcceso(): Promise<string | undefined> {
  return (await cookies()).get(NOMBRE_COOKIE_PACIENTE)?.value;
}
