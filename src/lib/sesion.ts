/**
 * Sesión del panel en cookie `httpOnly` (FR-001, FR-003, research.md R7). Solo para código de
 * servidor de Next.js (Server Components y Server Actions).
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { crearToken, DURACION_SESION_SEGUNDOS, NOMBRE_COOKIE, verificarToken } from './token-sesion';

export async function abrirSesion(clinicaId: string): Promise<void> {
  const almacen = await cookies();
  almacen.set(NOMBRE_COOKIE, await crearToken(clinicaId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.CITACLARA_COOKIE_INSEGURA !== '1',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACION_SESION_SEGUNDOS,
  });
}

export async function cerrarSesion(): Promise<void> {
  (await cookies()).delete(NOMBRE_COOKIE);
}

/** `clinicaId` de la sesión actual, o `null` si no hay sesión válida. */
export async function clinicaDeSesion(): Promise<string | null> {
  return verificarToken((await cookies()).get(NOMBRE_COOKIE)?.value);
}

/**
 * Para páginas: devuelve el `clinicaId` o redirige a la pantalla de entrada con el aviso de
 * sesión terminada (SESION_CADUCADA).
 */
export async function exigirSesion(): Promise<string> {
  const clinicaId = await clinicaDeSesion();
  if (!clinicaId) redirect('/entrar?motivo=sesion');
  return clinicaId;
}
