import { afterAll, inject } from 'vitest';
import { cerrarBd } from '../../src/db/cliente';

process.env.DATABASE_URL = inject('urlBd');
process.env.SESION_SECRETO ??= 'secreto-de-pruebas-de-integracion-32-caracteres';

afterAll(async () => {
  await cerrarBd();
});
