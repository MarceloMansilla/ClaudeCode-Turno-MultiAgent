import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': src } },
  test: {
    projects: [
      {
        resolve: { alias: { '@': src } },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve: { alias: { '@': src } },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          // Un único PostgreSQL real (Testcontainers) compartido; los archivos van en serie
          // porque cada uno vacía las tablas.
          globalSetup: ['tests/helpers/global-bd.ts'],
          setupFiles: ['tests/helpers/entorno-bd.ts'],
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 180_000,
        },
      },
    ],
  },
});
