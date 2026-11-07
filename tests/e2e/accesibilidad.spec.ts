/** SC-006, Principio VII: accesibilidad WCAG 2.2 AA y uso sin desplazamiento horizontal. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { agendaDe, entrar, HOY, LUNES_SIGUIENTE, MARIA, recargarSemilla } from './apoyo';

test.beforeAll(recargarSemilla);

async function sinInfracciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

async function sinScrollHorizontal(page: Page) {
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
}

test('pantalla de entrada: sin infracciones AA ni desplazamiento horizontal', async ({ page }) => {
  await page.goto('/entrar');
  await sinInfracciones(page);
  await sinScrollHorizontal(page);
});

test('agenda del día: sin infracciones AA ni desplazamiento horizontal', async ({ page }) => {
  await entrar(page);
  await page.goto(agendaDe(MARIA.id, HOY));
  await sinInfracciones(page);
  await sinScrollHorizontal(page);
});

test('alta de cita: sin infracciones AA ni desplazamiento horizontal', async ({ page }) => {
  await entrar(page);
  await page.goto(`${agendaDe(MARIA.id, LUNES_SIGUIENTE)}/nueva?hora=10:00`);
  await expect(page.getByRole('dialog', { name: 'Nueva cita' })).toBeVisible();
  await sinInfracciones(page);
  await sinScrollHorizontal(page);
});

test('objetivos táctiles de al menos 44×44 px en la agenda', async ({ page }) => {
  await entrar(page);
  await page.goto(agendaDe(MARIA.id, HOY));
  const pequenos = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('main a, main button, main select, main input'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ el: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 44 || r.width < 44)
      .map(({ el, r }) => `${el} (${Math.round(r.width)}×${Math.round(r.height)})`),
  );
  expect(pequenos).toEqual([]);
});

test('el panel se maneja solo con teclado: entrar con Tab y Enter', async ({ page }) => {
  await page.goto('/entrar');
  await page.keyboard.type('eleva-demo');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/agenda\//);
});
