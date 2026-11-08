/**
 * Configuración del envío de recordatorios (spec 003, contracts/comando-recordatorios.md,
 * «Configuración»). Sin `SMTP_URL` → modo simulado (FR-009).
 */
import { z } from 'zod';
import type { ModoCorreo } from '@/db/esquema';

export interface ConfiguracionCorreo {
  modo: ModoCorreo;
  /** Base del enlace personal, sin barra final (p. ej. `https://citas.clinicaeleva.es`). */
  urlPublica: string;
  remitente: string;
  smtpUrl?: string;
  salidaDir: string;
}

export class ErrorConfiguracion extends Error {
  constructor(
    readonly variable: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorConfiguracion';
  }
}

const SALIDA_POR_DEFECTO = 'datos/salida-correo';

function texto(env: NodeJS.ProcessEnv, nombre: string): string | undefined {
  const valor = env[nombre]?.trim();
  return valor ? valor : undefined;
}

/** Lee y valida la configuración; lanza `ErrorConfiguracion` nombrando la variable culpable. */
export function leerConfiguracionCorreo(env: NodeJS.ProcessEnv = process.env): ConfiguracionCorreo {
  const urlPublica = texto(env, 'URL_PUBLICA');
  if (!urlPublica) {
    throw new ErrorConfiguracion('URL_PUBLICA', 'Falta la variable de entorno URL_PUBLICA (p. ej. https://citas.clinicaeleva.es).');
  }
  if (!/^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(urlPublica) || urlPublica.endsWith('/')) {
    throw new ErrorConfiguracion(
      'URL_PUBLICA',
      `URL_PUBLICA debe empezar por http:// o https:// y no terminar en «/»: «${urlPublica}».`,
    );
  }

  const remitente = texto(env, 'CORREO_REMITENTE');
  if (!remitente) {
    throw new ErrorConfiguracion('CORREO_REMITENTE', 'Falta la variable de entorno CORREO_REMITENTE.');
  }
  if (!z.email().safeParse(remitente).success) {
    throw new ErrorConfiguracion('CORREO_REMITENTE', `CORREO_REMITENTE no es un correo válido: «${remitente}».`);
  }

  const smtpUrl = texto(env, 'SMTP_URL');
  if (smtpUrl && !/^smtps?:\/\//.test(smtpUrl)) {
    throw new ErrorConfiguracion('SMTP_URL', 'SMTP_URL debe empezar por smtp:// o smtps://.');
  }

  return {
    modo: smtpUrl ? 'smtp' : 'simulado',
    urlPublica,
    remitente,
    ...(smtpUrl ? { smtpUrl } : {}),
    salidaDir: texto(env, 'SALIDA_CORREO_DIR') ?? SALIDA_POR_DEFECTO,
  };
}
