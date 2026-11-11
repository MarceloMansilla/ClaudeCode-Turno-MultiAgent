import { sql } from 'drizzle-orm';
import { obtenerBd } from '../../src/db/cliente';

/** Vacía todas las tablas de negocio (llamar en `beforeEach`). */
export async function vaciarTablas(): Promise<void> {
  await obtenerBd().execute(
    sql`TRUNCATE TABLE cita, paciente, servicio, profesional, clinica RESTART IDENTITY CASCADE`,
  );
}
