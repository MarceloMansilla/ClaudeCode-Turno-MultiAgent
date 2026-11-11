/** Preparación global E2E: crea `citaclara_e2e` si no existe, migra y carga la semilla. */
import { Client } from 'pg';
import { aplicarMigraciones } from '../../src/db/migrar';
import { recargarSemilla, URL_BD_E2E } from './apoyo';

export default async function prepararBd() {
  const url = new URL(URL_BD_E2E);
  const nombre = url.pathname.slice(1);
  const admin = new Client({ connectionString: Object.assign(new URL(URL_BD_E2E), { pathname: '/postgres' }).toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre]);
    if (!rowCount) await admin.query(`CREATE DATABASE "${nombre.replace(/"/g, '')}"`);
  } finally {
    await admin.end();
  }
  await aplicarMigraciones(URL_BD_E2E);
  await recargarSemilla();
}
