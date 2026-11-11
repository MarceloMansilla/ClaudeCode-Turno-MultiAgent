/**
 * Reloj de la aplicación. Toda regla que dependa de «ahora» (RN2, FR-018, FR-019) lo obtiene
 * de aquí, para poder fijarlo en tests (`fijarAhora`) y en demostraciones/E2E
 * (`CITACLARA_AHORA`, ISO 8601 con zona).
 */
let fijado: Date | undefined;

export function ahora(): Date {
  if (fijado) return new Date(fijado);
  const desdeEntorno = process.env.CITACLARA_AHORA?.trim();
  if (desdeEntorno) {
    const valor = new Date(desdeEntorno);
    if (Number.isNaN(valor.getTime())) {
      throw new Error(`CITACLARA_AHORA no es una fecha válida: «${desdeEntorno}».`);
    }
    return valor;
  }
  return new Date();
}

/** Solo para tests: fija «ahora» (o lo libera con `undefined`). */
export function fijarAhora(instante: Date | string | undefined): void {
  fijado = instante === undefined ? undefined : new Date(instante);
}
