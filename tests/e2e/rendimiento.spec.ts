/** SC-004: la agenda del día se muestra completa en menos de 2 segundos. */
import { expect, test } from '@playwright/test';
import { agendaDe, entrar, HOY, JORGE, MARIA, recargarSemilla } from './apoyo';

test.beforeAll(recargarSemilla);

test('cambiar de profesional y de día muestra la agenda en menos de 2 s', async ({ page }) => {
  await entrar(page);
  for (const destino of [agendaDe(JORGE.id, HOY), agendaDe(MARIA.id, '2026-11-10'), agendaDe(MARIA.id, '2026-10-20')]) {
    const t0 = Date.now();
    await page.goto(destino);
    await expect(page.getByRole('list', { name: /^Agenda de / })).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(2000);
  }
});

test('SC-004 — /analitica se muestra completa en menos de 2 s', async ({ page }) => {
  await entrar(page);
  const t0 = Date.now();
  await page.goto('/analitica');
  await expect(page.getByRole('table', { name: 'Ingresos por servicio' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Evolución semanal de la clínica' })).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(2000);
});
