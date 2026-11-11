/** Spec 004, Edge Cases «Sin historia»: sin citas, mensaje y ningún gráfico ni cifra. */
import { expect, test } from '@playwright/test';
import { cita } from '../../src/db/esquema';
import { conBd, entrar, recargarSemilla } from './apoyo';

test.beforeAll(async () => {
  await recargarSemilla();
  await conBd((bd) => bd.delete(cita));
});

test.afterAll(recargarSemilla);

test('Edge Cases — sin citas: «Todavía no hay citas suficientes…» y ningún gráfico', async ({ page }) => {
  await entrar(page);
  await page.goto('/analitica');
  await expect(page.getByText('Todavía no hay citas suficientes para mostrar la analítica.')).toBeVisible();
  await expect(page.getByRole('img')).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.locator('main').getByText(/%|€/)).toHaveCount(0);
});
