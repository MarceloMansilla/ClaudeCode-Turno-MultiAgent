/**
 * Apoyo común a las pruebas E2E. Usa la BD `citaclara_e2e` con la semilla de 2026-11-09 y el
 * «ahora» fijo del playwright.config.ts (lunes 09/11/2026, 12:10).
 */
import { expect, type Page } from '@playwright/test';
import { and, eq, gte, lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as esquema from '../../src/db/esquema';
import { instanteLocal, sumarDias } from '../../src/lib/zona';
import { cargarSemilla } from '../../src/semilla/cargar';
import { generarSemilla } from '../../src/semilla/generar';

export const URL_BD_E2E =
  process.env.DATABASE_URL_E2E ?? 'postgres://citaclara:citaclara@localhost:5432/citaclara_e2e';
export const CLAVE = 'eleva-demo';
export const REFERENCIA = '2026-11-09';
export const HOY = REFERENCIA;
export const LUNES_SIGUIENTE = '2026-11-16';

// FR-021: los identificadores de la semilla son deterministas, así que se pueden citar.
const semilla = generarSemilla(REFERENCIA, 'irrelevante');
export const MARIA = semilla.profesionales[0]!;
export const JORGE = semilla.profesionales[1]!;
export const LUCIA = semilla.profesionales[2]!;
export const PACIENTE_1 = semilla.pacientes[0]!;

export function conBd<T>(trabajo: (bd: ReturnType<typeof drizzle<typeof esquema>>) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: URL_BD_E2E, max: 2 });
  return trabajo(drizzle(pool, { schema: esquema })).finally(() => pool.end());
}

export function recargarSemilla() {
  return conBd((bd) => cargarSemilla(bd, REFERENCIA, CLAVE));
}

/** Deja vacío el día de un profesional (estado de partida conocido para las pruebas de alta). */
export function vaciarDia(profesionalId: string, fecha: string) {
  return conBd((bd) =>
    bd
      .delete(esquema.cita)
      .where(
        and(
          eq(esquema.cita.profesionalId, profesionalId),
          gte(esquema.cita.inicio, instanteLocal(fecha, '00:00', 'Europe/Madrid')),
          lt(esquema.cita.inicio, instanteLocal(sumarDias(fecha, 1), '00:00', 'Europe/Madrid')),
        ),
      ),
  );
}

export async function entrar(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('Clave de la clínica').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/agenda\/[0-9a-f-]{36}\/\d{4}-\d{2}-\d{2}$/);
}

export const agendaDe = (profesionalId: string, fecha: string) => `/agenda/${profesionalId}/${fecha}`;
