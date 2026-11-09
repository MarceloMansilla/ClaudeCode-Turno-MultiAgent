/**
 * Spec 005, US2 — cancelar con más de 24 h de margen (quickstart 8–11, SC-006). Con AHORA_E2E
 * (lunes 09/11/2026 12:10) se preparan dos citas de P con María:
 * - martes 10/11 10:00 → faltan 21 h 50 min: fuera de plazo;
 * - miércoles 11/11 10:00 → faltan 45 h 50 min: cancelable.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { cita } from '../../src/db/esquema';
import { instanteLocal } from '../../src/lib/zona';
import {
  agendaDe,
  conBd,
  crearCitaDeP,
  ENLACE_P,
  entrar,
  MARIA,
  recargarSemilla,
  vaciarDia,
} from './apoyo';

const Z = 'Europe/Madrid';
const MARTES = '2026-11-10';
const MIERCOLES = '2026-11-11';
let citaMartes: string;
let citaMiercoles: string;

const estadoDe = (id: string) =>
  conBd(async (bd) => (await bd.select().from(cita).where(eq(cita.id, id)))[0]!);

async function entrarComoP(page: Page) {
  await page.goto(ENLACE_P.ruta);
  await page.getByLabel('Escriba las 4 últimas cifras de su teléfono').fill(ENLACE_P.cifras);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Sus próximas citas' })).toBeVisible();
}

const tarjeta = (page: Page, fecha: string) => page.locator('article', { hasText: `${fecha} · 10:00` });

test.beforeEach(async () => {
  await recargarSemilla();
  await vaciarDia(MARIA.id, MARTES);
  await vaciarDia(MARIA.id, MIERCOLES);
  citaMartes = await crearCitaDeP(MARTES, '10:00');
  citaMiercoles = await crearCitaDeP(MIERCOLES, '10:00');
});

test('quickstart 8 — US2 #1: cancelar en plazo con confirmación', async ({ page }) => {
  await entrarComoP(page);
  const miercoles = tarjeta(page, 'miércoles, 11/11/2026');
  await miercoles.getByRole('button', { name: 'Cancelar cita' }).click();

  const dialogo = page.getByRole('alertdialog', { name: '¿Cancelar su cita?' });
  await expect(dialogo).toContainText(
    'Sesión de fisioterapia con María, el miércoles, 11/11/2026 a las 10:00. El hueco quedará libre para otro paciente.',
  );
  await expect(dialogo.getByRole('button', { name: 'No, mantener cita' })).toBeFocused();
  await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze().then((r) => expect(r.violations).toEqual([]));

  await dialogo.getByRole('button', { name: 'Sí, cancelar mi cita' }).click();
  await expect(page.getByText('Su cita del miércoles, 11/11/2026 a las 10:00 está cancelada.')).toBeVisible();
  await expect(tarjeta(page, 'miércoles, 11/11/2026')).toHaveCount(0);
  expect(await estadoDe(citaMiercoles)).toMatchObject({ estado: 'cancelada', canceladaPor: 'paciente' });
});

test('Escape o «No, mantener cita» cierran sin cancelar', async ({ page }) => {
  await entrarComoP(page);
  await tarjeta(page, 'miércoles, 11/11/2026').getByRole('button', { name: 'Cancelar cita' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect((await estadoDe(citaMiercoles)).estado).toBe('reservada');
});

test('quickstart 10 — US2 #2: fuera de plazo no hay «Cancelar» y se ve el enunciado con el teléfono', async ({ page }) => {
  await entrarComoP(page);
  const martes = tarjeta(page, 'martes, 10/11/2026');
  await expect(martes.getByRole('button', { name: 'Cancelar cita' })).toHaveCount(0);
  await expect(martes).toContainText(
    'Puede cancelar esta cita desde su enlace antes del lunes, 09/11/2026 a las 10:00. Después, llame a Clínica Eleva al 911 234 567.',
  );
  await expect(martes.getByRole('link', { name: '911 234 567' })).toHaveAttribute('href', 'tel:+34911234567');
});

test('US2 #3: con el diálogo abierto, si la cita pasa a estar fuera de plazo, se rechaza y sigue reservada', async ({ page }) => {
  await entrarComoP(page);
  await tarjeta(page, 'miércoles, 11/11/2026').getByRole('button', { name: 'Cancelar cita' }).click();
  // Se adelanta la cita al martes a las 11:00: su plazo venció el lunes a las 11:00.
  const inicio = instanteLocal(MARTES, '11:00', Z);
  await conBd((bd) =>
    bd.update(cita).set({ inicio, fin: new Date(inicio.getTime() + 45 * 60_000) }).where(eq(cita.id, citaMiercoles)),
  );
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, cancelar mi cita' }).click();
  await expect(page.getByText('Ya no puede cancelar esta cita desde su enlace.', { exact: false })).toBeVisible();
  expect((await estadoDe(citaMiercoles)).estado).toBe('reservada');
});

test('quickstart 11 — US2 #6: recepción sí cancela desde el panel la cita fuera de plazo', async ({ page }) => {
  await entrar(page);
  await page.goto(agendaDe(MARIA.id, MARTES));
  const bloque = page.locator('article', { hasText: ENLACE_P.nombre }).filter({ hasText: '10:00' });
  await bloque.getByRole('button', { name: 'Cancelar cita' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, cancelar la cita' }).click();
  await expect(page.locator('article[data-estado="cancelada"]', { hasText: ENLACE_P.nombre })).toBeVisible();
  expect(await estadoDe(citaMartes)).toMatchObject({ estado: 'cancelada', canceladaPor: 'recepcion' });
});

test('SC-006: en móvil, abrir el enlace, escribir las cifras y cancelar en menos de 1 minuto', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'solo en el móvil de 360 px');
  const inicio = Date.now();
  await entrarComoP(page);
  await tarjeta(page, 'miércoles, 11/11/2026').getByRole('button', { name: 'Cancelar cita' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, cancelar mi cita' }).click();
  await expect(page.getByText('Su cita del miércoles, 11/11/2026 a las 10:00 está cancelada.')).toBeVisible();
  expect(Date.now() - inicio).toBeLessThan(60_000);
});
