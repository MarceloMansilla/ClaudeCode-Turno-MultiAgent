/**
 * Spec 005, US1 — entrar con el enlace personal (quickstart 1–5). Reloj del servidor fijo en
 * AHORA_E2E (lunes 09/11/2026 12:10), así que US1 #7 (30 min) se prueba en unitarias e
 * integración, no aquí.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { enlacePaciente } from '../../src/db/esquema';
import { conBd, ENLACE_P, recargarSemilla } from './apoyo';

const INVENTADO = '/p/NoExisteNoExisteNoExisteNoExisteNoExiste123';

async function sinInfracciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

const fijarFallos = (n: number) =>
  conBd((bd) => bd.update(enlacePaciente).set({ fallosSeguidos: n }).where(eq(enlacePaciente.pacienteId, ENLACE_P.pacienteId)));

async function escribirCifras(page: Page, cifras: string) {
  await page.getByLabel('Escriba las 4 últimas cifras de su teléfono').fill(cifras);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.beforeEach(recargarSemilla);

test('quickstart 1–2 — US1 #1: enlace + 4 cifras dan acceso solo a las citas de P', async ({ page }) => {
  await page.goto(ENLACE_P.ruta);
  await expect(page).toHaveTitle('CitaClara · Clínica Eleva');
  await expect(page.getByRole('heading', { name: 'Confirme que es usted' })).toBeVisible();
  await expect(page.getByText('Clínica Eleva').first()).toBeVisible();
  await expect(page.getByRole('link', { name: '911 234 567' })).toHaveAttribute('href', 'tel:+34911234567');
  await expect(page.getByText(ENLACE_P.nombre)).toHaveCount(0);
  await sinInfracciones(page);

  await escribirCifras(page, ENLACE_P.cifras);
  await expect(page.getByRole('heading', { name: 'Sus próximas citas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible();
  await sinInfracciones(page);
});

test('quickstart 3 — US1 #2: un enlace inventado da «Enlace no válido» (404) sin ningún dato', async ({ page }) => {
  const respuesta = await page.goto(INVENTADO);
  expect(respuesta?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible();
  await expect(page.getByText('Este enlace no es válido. Pida uno nuevo a Clínica Eleva en el 911 234 567.')).toBeVisible();
  await expect(page.getByRole('link', { name: '911 234 567' })).toHaveAttribute('href', 'tel:+34911234567');
  await sinInfracciones(page);
});

test('research R10 — las respuestas de /p/* no filtran el token ni se indexan ni se cachean', async ({ page }) => {
  const respuesta = await page.goto(ENLACE_P.ruta);
  const cabeceras = respuesta!.headers();
  expect(cabeceras['referrer-policy']).toBe('no-referrer');
  expect(cabeceras['x-robots-tag']).toBe('noindex, nofollow');
  expect(cabeceras['cache-control']).toContain('no-store');
});

test('US1 #4: cifras erróneas → mensaje bajo el campo y el foco vuelve a él', async ({ page }) => {
  await page.goto(ENLACE_P.ruta);
  await escribirCifras(page, '0000');
  await expect(page.getByText('Esas cifras no coinciden con el teléfono de su ficha. Revíselas e inténtelo de nuevo.')).toBeVisible();
  await expect(page.getByLabel('Escriba las 4 últimas cifras de su teléfono')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Sus próximas citas' })).toHaveCount(0);
});

test('quickstart 4–5 — US1 #5: 5 fallos pausan hasta las 12:25; con 10, «Enlace bloqueado»', async ({ page }) => {
  await page.goto(ENLACE_P.ruta);
  const campo = page.getByLabel('Escriba las 4 últimas cifras de su teléfono');
  for (let i = 0; i < 5; i++) {
    await escribirCifras(page, '0000');
    // Esperar a que el intento termine (el formulario vacía el campo) antes de escribir el
    // siguiente; si no, el vaciado llega después de `fill` y se envía el campo vacío.
    if (i < 4) await expect(campo).toHaveValue('');
  }
  await expect(page.getByText('Ha hecho demasiados intentos. Podrá volver a intentarlo a las 12:25.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('Escriba las 4 últimas cifras de su teléfono')).toBeDisabled();
  await sinInfracciones(page);

  await fijarFallos(10);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Enlace bloqueado' })).toBeVisible();
  await expect(page.getByLabel('Escriba las 4 últimas cifras de su teléfono')).toHaveCount(0);
  await sinInfracciones(page);
});

test('US1 #6: con 3 fallos previos, las cifras correctas dan acceso', async ({ page }) => {
  await fijarFallos(3);
  await page.goto(ENLACE_P.ruta);
  await escribirCifras(page, ENLACE_P.cifras);
  await expect(page.getByRole('heading', { name: 'Sus próximas citas' })).toBeVisible();
});
