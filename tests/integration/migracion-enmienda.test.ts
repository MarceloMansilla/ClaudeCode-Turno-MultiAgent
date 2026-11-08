/**
 * Migración de la enmienda revisión cruzada S2–S5 de la 001 sobre una BD que ya tiene datos
 * con el esquema anterior (solo `0000_inicial` y `0001_restricciones`):
 * - S2 (FR-018a): las canceladas existentes quedan con `cancelada_por = 'recepcion'` y la
 *   restricción `cita_origen_cancelacion` queda activa.
 * - S3 (FR-022): la clínica de demostración recibe su teléfono; cualquier otra clínica obliga a
 *   rellenarlo a mano antes de migrar, con un mensaje que lo explica.
 */
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

const CARPETA = fileURLToPath(new URL('../../src/db/migraciones', import.meta.url));
const MIGRACIONES_ANTERIORES = ['0000_inicial', '0001_restricciones'];

interface Diario {
  entries: { tag: string }[];
}

let carpetaAnterior: string;
const pools: Pool[] = [];

beforeAll(() => {
  // Copia de las migraciones tal como estaban antes de la enmienda.
  carpetaAnterior = mkdtempSync(join(tmpdir(), 'citaclara-migraciones-'));
  mkdirSync(join(carpetaAnterior, 'meta'));
  const diario = JSON.parse(readFileSync(join(CARPETA, 'meta', '_journal.json'), 'utf8')) as Diario;
  diario.entries = diario.entries.filter((m) => MIGRACIONES_ANTERIORES.includes(m.tag));
  writeFileSync(join(carpetaAnterior, 'meta', '_journal.json'), JSON.stringify(diario));
  for (const tag of MIGRACIONES_ANTERIORES) {
    copyFileSync(join(CARPETA, `${tag}.sql`), join(carpetaAnterior, `${tag}.sql`));
  }
});

afterAll(async () => {
  await Promise.all(pools.map((p) => p.end()));
  rmSync(carpetaAnterior, { recursive: true, force: true });
});

/** Crea una BD vacía en el mismo servidor de pruebas y devuelve un pool hacia ella. */
async function bdNueva(): Promise<Pool> {
  const nombre = `migracion_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: inject('urlBd'), max: 1 });
  await admin.query(`CREATE DATABASE ${nombre}`);
  await admin.end();
  const url = new URL(inject('urlBd'));
  url.pathname = `/${nombre}`;
  const pool = new Pool({ connectionString: url.toString(), max: 1 });
  pools.push(pool);
  return pool;
}

/** Datos con el esquema anterior: una cita de cada estado final más una reservada. */
async function sembrarEsquemaAnterior(pool: Pool, nombreClinica: string) {
  const [clinicaId, profId, srvId, pacId] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  await pool.query(
    `INSERT INTO clinica (id, nombre, zona_horaria, hora_apertura, hora_cierre, dias_laborables, clave_hash)
     VALUES ($1, $2, 'Europe/Madrid', '09:00', '20:00', '{1,2,3,4,5}', 'hash')`,
    [clinicaId, nombreClinica],
  );
  await pool.query(
    `INSERT INTO profesional (id, clinica_id, nombre, especialidad, orden) VALUES ($1, $2, 'María', 'fisioterapia', 1)`,
    [profId, clinicaId],
  );
  await pool.query(
    `INSERT INTO servicio (id, clinica_id, nombre, especialidad, duracion_minutos, precio_centimos)
     VALUES ($1, $2, 'Sesión de fisioterapia', 'fisioterapia', 45, 4000)`,
    [srvId, clinicaId],
  );
  await pool.query(
    `INSERT INTO paciente (id, clinica_id, nombre, telefono, telefono_normalizado)
     VALUES ($1, $2, 'Ana Pérez', '612 345 678', '612345678')`,
    [pacId, clinicaId],
  );
  const citas = [
    ['cancelada', '2026-11-02T09:00Z'],
    ['cancelada', '2026-11-03T09:00Z'],
    ['completada', '2026-11-04T09:00Z'],
    ['no_asistida', '2026-11-05T09:00Z'],
    ['reservada', '2026-11-16T09:00Z'],
  ] as const;
  for (const [estado, inicio] of citas) {
    await pool.query(
      `INSERT INTO cita (id, clinica_id, profesional_id, servicio_id, paciente_id, inicio, fin, estado, estado_cambiado_en)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $6::timestamptz + interval '45 minutes', $7::estado_cita,
               CASE WHEN $7::estado_cita = 'reservada' THEN NULL ELSE $6::timestamptz END)`,
      [randomUUID(), clinicaId, profId, srvId, pacId, inicio, estado],
    );
  }
}

const migrarA = (pool: Pool, carpeta: string) => migrate(drizzle(pool), { migrationsFolder: carpeta });

describe('Enmienda S2–S5 de la 001 — migración sobre datos existentes', () => {
  it('S2: las canceladas anteriores quedan de recepción y la restricción queda activa; S3: Clínica Eleva recibe su teléfono', async () => {
    const pool = await bdNueva();
    await migrarA(pool, carpetaAnterior);
    await sembrarEsquemaAnterior(pool, 'Clínica Eleva');

    await migrarA(pool, CARPETA);

    const { rows } = await pool.query(
      `SELECT estado::text AS estado, cancelada_por::text AS origen, count(*)::int AS n
         FROM cita GROUP BY estado, cancelada_por ORDER BY estado`,
    );
    expect(rows).toEqual([
      { estado: 'cancelada', origen: 'recepcion', n: 2 },
      { estado: 'completada', origen: null, n: 1 },
      { estado: 'no_asistida', origen: null, n: 1 },
      { estado: 'reservada', origen: null, n: 1 },
    ]);

    const restriccion = await pool.query(
      `SELECT convalidated FROM pg_constraint WHERE conname = 'cita_origen_cancelacion'`,
    );
    expect(restriccion.rows).toEqual([{ convalidated: true }]);
    await expect(
      pool.query(`UPDATE cita SET estado = 'cancelada' WHERE estado = 'reservada'`),
    ).rejects.toMatchObject({ constraint: 'cita_origen_cancelacion' });

    const clinicas = await pool.query(`SELECT telefono FROM clinica`);
    expect(clinicas.rows).toEqual([{ telefono: '911 234 567' }]);
    const columna = await pool.query(
      `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'clinica' AND column_name = 'telefono'`,
    );
    expect(columna.rows).toEqual([{ is_nullable: 'NO' }]);
  });

  it('S3: otra clínica sin teléfono detiene la migración con un mensaje claro y migra tras rellenarlo', async () => {
    const pool = await bdNueva();
    await migrarA(pool, carpetaAnterior);
    await sembrarEsquemaAnterior(pool, 'Clínica Norte');

    // El error de PostgreSQL (no el texto de la consulta que Drizzle añade al envolverlo).
    const error = await migrarA(pool, CARPETA).then(
      () => undefined,
      (err: unknown) => (err as { cause?: unknown }).cause ?? err,
    );
    expect(error).toMatchObject({
      code: 'P0001',
      message: 'La clínica «Clínica Norte» no tiene teléfono de contacto (spec 001, FR-022).',
    });
    expect((error as { hint?: string }).hint).toContain('UPDATE clinica SET telefono');
    // La migración es atómica: no ha quedado nada a medias.
    const sinOrigen = await pool.query(
      `SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'cita' AND column_name = 'cancelada_por'`,
    );
    expect(sinOrigen.rows).toEqual([{ n: 0 }]);

    // Lo que indica el mensaje: añadir la columna y rellenarla antes de volver a migrar.
    await pool.query(`ALTER TABLE clinica ADD COLUMN telefono text`);
    await pool.query(`UPDATE clinica SET telefono = '944 000 111'`);
    await migrarA(pool, CARPETA);

    const clinicas = await pool.query(`SELECT telefono FROM clinica`);
    expect(clinicas.rows).toEqual([{ telefono: '944 000 111' }]);
  });
});
