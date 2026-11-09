/**
 * Reglas puras del enlace personal del paciente (spec 005: FR-001, FR-002, FR-006a, FR-008;
 * research R2 y R4). Sin acceso a BD.
 */

/** 32 bytes en base64url sin relleno (FR-002, research R2). */
export const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function tieneFormatoDeToken(token: string): boolean {
  return FORMATO_TOKEN.test(token);
}

/**
 * 005, FR-008: único enlace de paciente. Todo enlace que CitaClara entregue o envíe a un
 * paciente, por cualquier canal (portal, recordatorios de la 003, canales futuros), se forma
 * con esta función. Los enlaces no llevan ninguna marca de canal (FR-013).
 */
export function rutaEnlacePaciente(token: string): string {
  return `/p/${token}`;
}

/** Segundo paso del acceso (FR-006): las 4 últimas cifras del teléfono normalizado de la ficha. */
export function ultimasCuatroCifras(telefonoNormalizado: string): string {
  return telefonoNormalizado.slice(-4);
}

/** FR-006a: al 5.º fallo seguido, pausa de 15 minutos; al 10.º, enlace bloqueado. */
export const FALLOS_PARA_PAUSA = 5;
export const FALLOS_PARA_BLOQUEO = 10;
export const PAUSA_MS = 15 * 60 * 1000;

export interface IntentosEnlace {
  fallosSeguidos: number;
  pausaHasta: Date | null;
}

export type EstadoEnlace = 'bloqueado' | 'en_pausa' | 'vigente';

/** Estado derivado del enlace (data-model.md, «Estados del enlace»). */
export function estadoEnlace(intentos: IntentosEnlace, ahora: Date): EstadoEnlace {
  if (intentos.fallosSeguidos >= FALLOS_PARA_BLOQUEO) return 'bloqueado';
  if (intentos.pausaHasta && intentos.pausaHasta.getTime() > ahora.getTime()) return 'en_pausa';
  return 'vigente';
}

export type ResultadoIntento = 'acceso' | 'cifras_incorrectas' | 'en_pausa' | 'bloqueado';

export interface TrasIntento extends IntentosEnlace {
  resultado: ResultadoIntento;
  /** Si el intento cambia los contadores y hay que guardarlos. */
  cambia: boolean;
}

/**
 * Aplica un intento de las 4 cifras en el orden de research R4:
 * 1. bloqueado → se rechaza sin comprobar;
 * 2. en pausa → se rechaza sin comprobar y sin contar (también el correcto);
 * 3. acierto → cuenta a cero y acceso; fallo → +1, y al 5.º pausa, al 10.º bloqueo.
 */
export function registrarIntento(intentos: IntentosEnlace, acierto: boolean, ahora: Date): TrasIntento {
  const estado = estadoEnlace(intentos, ahora);
  if (estado === 'bloqueado') return { ...intentos, resultado: 'bloqueado', cambia: false };
  if (estado === 'en_pausa') return { ...intentos, resultado: 'en_pausa', cambia: false };

  if (acierto) {
    const cambia = intentos.fallosSeguidos !== 0 || intentos.pausaHasta !== null;
    return { fallosSeguidos: 0, pausaHasta: null, resultado: 'acceso', cambia };
  }

  const fallosSeguidos = intentos.fallosSeguidos + 1;
  if (fallosSeguidos >= FALLOS_PARA_BLOQUEO) {
    return { fallosSeguidos, pausaHasta: null, resultado: 'bloqueado', cambia: true };
  }
  if (fallosSeguidos === FALLOS_PARA_PAUSA) {
    return {
      fallosSeguidos,
      pausaHasta: new Date(ahora.getTime() + PAUSA_MS),
      resultado: 'en_pausa',
      cambia: true,
    };
  }
  return { fallosSeguidos, pausaHasta: null, resultado: 'cifras_incorrectas', cambia: true };
}
