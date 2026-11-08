/** SC-006, Principio VII: accesibilidad WCAG 2.2 AA y uso sin desplazamiento horizontal. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { AHORA_E2E } from '../../playwright.config';
import { enlacePaciente } from '../../src/db/esquema';
import { agendaDe, conBd, crearCitaDeP, ENLACE_P, entrar, HOY, LUNES_SIGUIENTE, MARIA, recargarSemilla, vaciarDia } from './apoyo';

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

// Spec 005 (Principio VII): pantallas de /p/[token] y diálogos nuevos, en portátil y móvil.
test.describe('spec 005 — pantallas del paciente', () => {
  test.beforeEach(async () => {
    await recargarSemilla();
    await vaciarDia(MARIA.id, '2026-11-11');
    await crearCitaDeP('2026-11-11', '10:00');
  });

  const fijarIntentosDeP = (fallosSeguidos: number, pausaHasta: Date | null = null) =>
    conBd((bd) =>
      bd.update(enlacePaciente).set({ fallosSeguidos, pausaHasta }).where(eq(enlacePaciente.pacienteId, ENLACE_P.pacienteId)),
    );

  async function revisar(page: Page) {
    await sinInfracciones(page);
    await sinScrollHorizontal(page);
    const pequenos = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('main a, main button, main input'))
        .filter((el) => el.offsetParent !== null && !el.closest('p'))
        .map((el) => ({ el: el.textContent?.trim() || el.tagName, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.height < 44)
        .map(({ el, r }) => `${el} (${Math.round(r.width)}×${Math.round(r.height)})`),
    );
    expect(pequenos).toEqual([]);
  }

  test('no válido, cifras, en pausa, bloqueado y próximas citas', async ({ page }) => {
    await page.goto('/p/NoExisteNoExisteNoExisteNoExisteNoExiste123');
    await revisar(page);

    await page.goto(ENLACE_P.ruta);
    await revisar(page);

    await fijarIntentosDeP(5, new Date(new Date(AHORA_E2E).getTime() + 15 * 60_000)); // reloj fijo del servidor
    await page.reload();
    await revisar(page);

    await fijarIntentosDeP(10);
    await page.reload();
    await revisar(page);

    await fijarIntentosDeP(0);
    await page.reload();
    await page.getByLabel('Escribe las 4 últimas cifras de tu teléfono').fill(ENLACE_P.cifras);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { name: 'Tus próximas citas' })).toBeVisible();
    await revisar(page);
  });

  test('recorrido con teclado: cifras → Entrar → Cancelar cita → Escape', async ({ page }) => {
    await page.goto(ENLACE_P.ruta);
    await expect(page.getByLabel('Escribe las 4 últimas cifras de tu teléfono')).toBeFocused();
    await page.keyboard.type(ENLACE_P.cifras);
    await page.keyboard.press('Enter');
    const cancelar = page.locator('article', { hasText: 'miércoles, 11/11/2026 · 10:00' }).getByRole('button', { name: 'Cancelar cita' });
    await expect(cancelar).toBeVisible();
    await cancelar.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await sinInfracciones(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(cancelar).toBeVisible();
  });

  test('diálogo «Generar enlace nuevo» del panel', async ({ page }) => {
    await entrar(page);
    await page.goto(agendaDe(MARIA.id, '2026-11-11'));
    await page.locator('article', { hasText: ENLACE_P.nombre }).getByRole('button', { name: 'Enlace del paciente' }).click();
    await page.getByRole('menuitem', { name: 'Generar enlace nuevo' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    // El menú se desvanece al cerrarse; con él a media opacidad, axe da un falso color-contrast.
    await expect(page.getByRole('menu')).toHaveCount(0);
    await sinInfracciones(page);
    await sinScrollHorizontal(page);
  });
});
