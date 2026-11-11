import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as esquema from './esquema';

export type Bd = NodePgDatabase<typeof esquema>;
/** Transacción de Drizzle (mismo API de consulta que `Bd`). */
export type Tx = Parameters<Parameters<Bd['transaction']>[0]>[0];
/** Cualquier ejecutor de consultas: la BD o una transacción abierta. */
export type Ejecutor = Bd | Tx;

let pool: Pool | undefined;
let bd: Bd | undefined;

/** Devuelve la conexión compartida, creada a partir de `DATABASE_URL` en el primer uso. */
export function obtenerBd(): Bd {
  if (!bd) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Falta la variable de entorno DATABASE_URL.');
    pool = new Pool({ connectionString: url, max: 20 });
    bd = drizzle(pool, { schema: esquema });
  }
  return bd;
}

/** Ejecuta `trabajo` dentro de una transacción: o se confirma todo o no se guarda nada. */
export function enTransaccion<T>(trabajo: (tx: Tx) => Promise<T>): Promise<T> {
  return obtenerBd().transaction(trabajo);
}

/**
 * Como `enTransaccion`, pero repite la transacción completa (hasta `intentos` veces) si
 * PostgreSQL la aborta para resolver una carrera (interbloqueo o fallo de serialización).
 * Al repetirla, el trabajo ve ya confirmada la operación ganadora y responde con normalidad.
 */
export async function enTransaccionConReintento<T>(
  trabajo: (tx: Tx) => Promise<T>,
  esReintentable: (error: unknown) => boolean,
  intentos = 3,
): Promise<T> {
  for (let intento = 1; ; intento++) {
    try {
      return await enTransaccion(trabajo);
    } catch (error) {
      if (intento >= intentos || !esReintentable(error)) throw error;
      await new Promise((r) => setTimeout(r, 5 + Math.random() * 20 * intento));
    }
  }
}

/** Cierra el pool (scripts y tests). */
export async function cerrarBd(): Promise<void> {
  await pool?.end();
  pool = undefined;
  bd = undefined;
}
