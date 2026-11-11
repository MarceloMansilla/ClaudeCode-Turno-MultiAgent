/** Convierte la semilla pura de la 001 en la entrada de `calcularAnalitica` (spec 004). */
import type { EntradaAnalitica } from '../../src/dominio/analitica';
import { generarSemilla } from '../../src/semilla/generar';

export function entradaDeSemilla(fechaReferencia: string, ahora: Date | string): EntradaAnalitica {
  const s = generarSemilla(fechaReferencia, 'irrelevante');
  return {
    ahora: new Date(ahora),
    clinica: s.clinica,
    profesionales: [...s.profesionales].sort((a, b) => a.orden - b.orden),
    servicios: s.servicios,
    citas: s.citas,
  };
}

export const AHORA_SEMILLA = '2026-11-09T12:10:00+01:00';
