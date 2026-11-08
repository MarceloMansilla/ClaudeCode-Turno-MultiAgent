import './cargar-entorno';
import { aplicarMigraciones } from '../src/db/migrar';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL. Copia .env.example a .env.');
  process.exit(1);
}

await aplicarMigraciones(url);
console.log('Migraciones aplicadas.');
