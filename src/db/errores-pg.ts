/** Códigos de error de PostgreSQL que la aplicación traduce a mensajes de negocio. */
export const PG_VIOLACION_EXCLUSION = '23P01'; // cita_sin_solape
export const PG_VIOLACION_UNICIDAD = '23505'; // paciente_telefono_unico
/**
 * Transacción abortada por PostgreSQL al resolver una carrera (interbloqueo o fallo de
 * serialización). Ocurre, p. ej., cuando dos altas simultáneas que se solapan comprueban a la
 * vez la restricción de exclusión: PostgreSQL aborta una y la otra continúa. Se puede reintentar.
 */
export const PG_REINTENTABLES = ['40P01', '40001'] as const;

interface ConCodigo {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
}

/** Busca el error original de `pg` (Drizzle puede envolverlo en `cause`). */
function errorPg(error: unknown): ConCodigo | undefined {
  let actual: unknown = error;
  for (let i = 0; i < 5 && actual && typeof actual === 'object'; i++) {
    const e = actual as ConCodigo;
    if (typeof e.code === 'string') return e;
    actual = e.cause;
  }
  return undefined;
}

export function esReintentable(error: unknown): boolean {
  const codigo = errorPg(error)?.code;
  return typeof codigo === 'string' && (PG_REINTENTABLES as readonly string[]).includes(codigo);
}

export function esViolacion(error: unknown, codigo: string, restriccion?: string): boolean {
  const e = errorPg(error);
  if (!e || e.code !== codigo) return false;
  return restriccion === undefined || e.constraint === restriccion;
}
