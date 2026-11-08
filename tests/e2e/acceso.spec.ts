import { expect, test } from '@playwright/test';
import { agendaDe, CLAVE, entrar, HOY, MARIA } from './apoyo';

test.describe('Acceso con clave de clínica', () => {
  test('US1 #1 — sin sesión, /agenda redirige a /entrar sin mostrar datos', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole('heading', { name: 'Panel de recepción' })).toBeVisible();
    await expect(page.getByText('María')).toHaveCount(0);
  });

  test('US1 #2 — clave incorrecta: mensaje claro y sin acceso', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('Clave de la clínica').fill('otra');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.locator('#clave-error')).toHaveText('La clave no es correcta. Revísala e inténtalo de nuevo.');
    await expect(page.locator('#clave-error')).toHaveAttribute('role', 'alert');
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test('FR-003 — cerrar sesión vuelve a pedir la clave', async ({ page }) => {
    await entrar(page);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await page.goto(agendaDe(MARIA.id, HOY));
    await expect(page).toHaveURL(/\/entrar/);
  });

  test('sesión caducada o manipulada: vuelve a /entrar con el aviso de sesión terminada', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'citaclara_sesion', value: 'token-caducado', url: baseURL! }]);
    await page.goto(agendaDe(MARIA.id, HOY));
    await expect(page).toHaveURL(/\/entrar\?motivo=sesion$/);
    await expect(page.getByRole('status')).toHaveText(
      'Tu sesión ha terminado. Vuelve a introducir la clave de la clínica.',
    );
    await page.getByLabel('Clave de la clínica').fill(CLAVE);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/agenda\//);
  });
});
