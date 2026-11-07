/**
 * Protección optimista de rutas (Next.js 16 «proxy», antes «middleware»). La comprobación
 * definitiva se repite en cada página y acción con `exigirSesion` / `clinicaDeSesion`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { NOMBRE_COOKIE, verificarToken } from '@/lib/token-sesion';

export async function proxy(peticion: NextRequest) {
  const clinicaId = await verificarToken(peticion.cookies.get(NOMBRE_COOKIE)?.value);
  const { pathname } = peticion.nextUrl;

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
  matcher: ['/', '/entrar', '/agenda/:path*', '/analitica', '/analitica/:path*'],
};
