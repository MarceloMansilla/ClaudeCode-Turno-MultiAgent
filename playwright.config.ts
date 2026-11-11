import { defineConfig, devices } from '@playwright/test';

/** «Ahora» fijo para que las pruebas E2E sean deterministas (quickstart.md). */
export const AHORA_E2E = '2026-11-09T12:10:00+01:00';
const PUERTO = 3100;
const BD_E2E =
  process.env.DATABASE_URL_E2E ?? 'postgres://citaclara:citaclara@localhost:5432/citaclara_e2e';

export default defineConfig({
  testDir: 'tests/e2e',
  // Las pruebas comparten la BD de demostración y algunas la modifican: en serie.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/e2e/preparar-bd.ts',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'portatil',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'movil',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 360, height: 800 },
      },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}/entrar`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: BD_E2E,
      CITACLARA_AHORA: AHORA_E2E,
      SESION_SECRETO: 'secreto-de-pruebas-e2e-de-al-menos-32-caracteres',
      CLAVE_DEMO: 'eleva-demo',
      NODE_ENV: 'production',
      CITACLARA_COOKIE_INSEGURA: '1',
    },
  },
});
