/**
 * Acceso abierto del paciente (spec 005, FR-006b, research R5): tras confirmar las 4 cifras, el
 * dispositivo recibe una cookie firmada que vale 30 minutos sin actividad y que el proxy renueva
 * en cada petición a `/p/*`. Lleva la huella (SHA-256) del token con el que se abrió: al
 * regenerar el enlace cambia el token y todas las cookies anteriores dejan de servir.
 *
 * Funciones puras (sin `next/headers`) para usarlas en el proxy, en el servidor y en tests. La
 * lectura y escritura de la cookie en Server Actions y páginas está en `sesion-paciente.ts`.
 */
import { createHash } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { ahora } from './reloj';
import { secreto } from './token-sesion';

export const NOMBRE_COOKIE_PACIENTE = 'citaclara_paciente';
export const DURACION_ACCESO_SEGUNDOS = 30 * 60;
/** Solo se envía a las rutas del paciente, nunca al panel. */
export const RUTA_COOKIE_PACIENTE = '/p';
/** Distingue esta cookie de la del panel, que se firma con la misma clave. */
const TIPO = 'acceso_paciente';

export interface AccesoPaciente {
  pacienteId: string;
  clinicaId: string;
  huella: string;
}

/** SHA-256 del token, en hexadecimal. */
export function huella(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Firma un acceso que caduca dentro de 30 minutos (contados desde `ahora()`). */
export async function crearTokenAcceso(acceso: AccesoPaciente): Promise<string> {
  const emitido = Math.floor(ahora().getTime() / 1000);
  return new SignJWT({ tipo: TIPO, ...acceso })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(emitido)
    .setExpirationTime(emitido + DURACION_ACCESO_SEGUNDOS)
    .sign(secreto());
}

/**
 * El acceso de la cookie si es auténtico, no ha caducado y se abrió con el token de la URL;
 * si no, `null`. No consulta la BD: quien lo use comprueba además que el token sigue vigente.
 */
export async function verificarTokenAcceso(
  valor: string | undefined,
  tokenUrl: string,
): Promise<AccesoPaciente | null> {
  if (!valor) return null;
  try {
    const { payload } = await jwtVerify(valor, secreto(), {
      algorithms: ['HS256'],
      currentDate: ahora(),
    });
    const { tipo, pacienteId, clinicaId, huella: h } = payload;
    if (tipo !== TIPO || typeof pacienteId !== 'string' || typeof clinicaId !== 'string') return null;
    if (typeof h !== 'string' || h !== huella(tokenUrl)) return null;
    return { pacienteId, clinicaId, huella: h };
  } catch {
    return null;
  }
}

/** Opciones de la cookie (FR-006b): `httpOnly`, `SameSite=Lax`, limitada a `/p`, 30 minutos. */
export function opcionesCookieAcceso() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.CITACLARA_COOKIE_INSEGURA !== '1',
    sameSite: 'lax' as const,
    path: RUTA_COOKIE_PACIENTE,
    maxAge: DURACION_ACCESO_SEGUNDOS,
  };
}

/** Token de una ruta `/p/<token>[/…]`, o `null` si la ruta no es del paciente. */
export function tokenDeRuta(pathname: string): string | null {
  const m = /^\/p\/([^/]+)/.exec(pathname);
  return m ? decodeURIComponent(m[1]!) : null;
}
