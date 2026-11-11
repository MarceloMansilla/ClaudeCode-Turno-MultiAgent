/**
 * «Huella» de las tablas de negocio (spec 004, SC-003 / FR-015, research R7): recuento y hash
 * ordenado de cada fila. Si dos huellas son iguales, la BD no ha cambiado.
 */
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface Huella {
  [tabla: string]: { filas: number; hash: string | null };
}

const TABLAS = ['clinica', 'profesional', 'servicio', 'paciente', 'cita'] as const;

/** Acepta la BD de la app (`obtenerBd()`) o la de E2E (`conBd`). */
export async function huellaBd(ejecutor: NodePgDatabase<Record<string, unknown>>): Promise<Huella> {
  const partes = TABLAS.map(
    (t) =>
      `SELECT '${t}' AS tabla, count(*)::int AS filas, md5(string_agg(t::text, '|' ORDER BY t.id)) AS hash FROM ${t} t`,
  );
  const resultado = await ejecutor.execute<{ tabla: string; filas: number; hash: string | null }>(
    sql.raw(partes.join(' UNION ALL ')),
  );
  return Object.fromEntries(resultado.rows.map((r) => [r.tabla, { filas: r.filas, hash: r.hash }]));
}
