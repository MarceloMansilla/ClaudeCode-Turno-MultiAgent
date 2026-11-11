/**
 * Protección optimista de rutas (Next.js 16 «proxy», antes «middleware»). La comprobación
 * definitiva se repite en cada página y acción con `exigirSesion` / `clinicaDeSesion` (panel) o
 * con el token de la URL y la cookie de acceso (paciente).
 */
import { NextResponse, type NextRequest } from 'next/server';
import {
  crearTokenAcceso,
  NOMBRE_COOKIE_PACIENTE,
  opcionesCookieAcceso,
  tokenDeRuta,
  verificarTokenAcceso,
} from '@/lib/acceso-paciente';
import { NOMBRE_COOKIE, verificarToken } from '@/lib/token-sesion';

/** Spec 005, research R10: el token va en la URL, así que no se filtra, no se indexa ni se cachea. */
const CABECERAS_PACIENTE = {
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
} as const;

/**
 * Rutas del paciente (`/p/*`, spec 005). No exigen la sesión del panel. Si la cookie de acceso
 * es válida para el token de la URL, se renueva otros 30 minutos: cada petición del paciente,
 * también las Server Actions (POST a esta ruta), reinicia el plazo (FR-006b, research R5).
 */
async function rutaDelPaciente(peticion: NextRequest): Promise<NextResponse> {
  const respuesta = NextResponse.next();
  for (const [nombre, valor] of Object.entries(CABECERAS_PACIENTE)) respuesta.headers.set(nombre, valor);

  const token = tokenDeRuta(peticion.nextUrl.pathname);
  const acceso = token
    ? await verificarTokenAcceso(peticion.cookies.get(NOMBRE_COOKIE_PACIENTE)?.value, token)
    : null;
  if (acceso) {
    respuesta.cookies.set(NOMBRE_COOKIE_PACIENTE, await crearTokenAcceso(acceso), opcionesCookieAcceso());
  }
  return respuesta;
}

export async function proxy(peticion: NextRequest) {
  const { pathname } = peticion.nextUrl;
  if (pathname.startsWith('/p/')) return rutaDelPaciente(peticion);

  const clinicaId = await verificarToken(peticion.cookies.get(NOMBRE_COOKIE)?.value);
  const esPanel = pathname.startsWith('/agenda') || pathname.startsWith('/analitica');
  if (esPanel && !clinicaId) {
    const destino = new URL('/entrar', peticion.url);
    if (peticion.cookies.has(NOMBRE_COOKIE)) destino.searchParams.set('motivo', 'sesion');
    return NextResponse.redirect(destino);
  }
  if (pathname === '/entrar' && clinicaId) {
    return NextResponse.redirect(new URL('/agenda', peticion.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/entrar', '/agenda/:path*', '/analitica', '/analitica/:path*', '/p/:path*'],
};
