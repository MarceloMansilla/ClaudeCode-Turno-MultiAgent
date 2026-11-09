/**
 * Token de sesión firmado (research.md R7): contiene el `clinicaId` y caduca a las 12 horas.
 * Funciones puras (sin cookies) para poder usarlas en el proxy, en el servidor y en tests.
 */
import { jwtVerify, SignJWT } from 'jose';
import { ahora } from './reloj';

export const NOMBRE_COOKIE = 'citaclara_sesion';
export const DURACION_SESION_SEGUNDOS = 12 * 60 * 60;

/** Clave de firma de las cookies (panel y, en la spec 005, acceso del paciente). */
export function secreto(): Uint8Array {
  const valor = process.env.SESION_SECRETO;
  if (!valor || valor.length < 32) {
    throw new Error('SESION_SECRETO debe tener al menos 32 caracteres.');
  }
  return new TextEncoder().encode(valor);
}

export async function crearToken(clinicaId: string): Promise<string> {
  const emitido = Math.floor(ahora().getTime() / 1000);
  return new SignJWT({ clinicaId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(emitido)
    .setExpirationTime(emitido + DURACION_SESION_SEGUNDOS)
    .sign(secreto());
}

/** Devuelve el `clinicaId` si el token es auténtico y no ha caducado; si no, `null`. */
export async function verificarToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secreto(), {
      algorithms: ['HS256'],
      currentDate: ahora(),
    });
    return typeof payload.clinicaId === 'string' ? payload.clinicaId : null;
  } catch {
    return null;
  }
}
