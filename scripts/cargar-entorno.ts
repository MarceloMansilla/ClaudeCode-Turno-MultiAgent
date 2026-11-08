/** Carga `.env` si existe (los scripts se ejecutan fuera de Next.js). */
try {
  process.loadEnvFile('.env');
} catch {
  // Sin .env: se usan las variables del entorno.
}
