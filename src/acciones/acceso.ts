'use server';

import { redirect } from 'next/navigation';
import { mensajes } from '@/dominio/errores';
import { abrirSesion, cerrarSesion } from '@/lib/sesion';
import { verificarClave } from '@/servicios/acceso';

export interface EstadoEntrar {
  error?: string;
}

/** FR-001, FR-002: comprueba la clave y abre la sesión (12 h). */
export async function entrar(_previo: EstadoEntrar, datos: FormData): Promise<EstadoEntrar> {
  const clave = String(datos.get('clave') ?? '');
  const clinicaId = await verificarClave(clave);
  if (!clinicaId) return { error: mensajes.claveIncorrecta() };
  await abrirSesion(clinicaId);
  redirect('/agenda');
}

/** FR-003: cierra la sesión y vuelve a pedir la clave. */
export async function salir(): Promise<void> {
  await cerrarSesion();
  redirect('/entrar');
}
