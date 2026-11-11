/**
 * Spec 005, US3 — copiar y regenerar el enlace desde el panel (quickstart 6–7). La pestaña del
 * paciente y la de recepción comparten navegador pero no cookies: la del paciente va en `/p`.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { cita, enlacePaciente } from '../../src/db/esquema';
import { agendaDe, conBd, crearCitaDeP, ENLACE_P, entrar, MARIA, recargarSemilla, vaciarDia } from './apoyo';

const DIA = '2026-11-11';
let citaId: string;

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test.beforeEach(async () => {
  await recargarSemilla();
  await vaciarDia(MARIA.id, DIA);
  citaId = await crearCitaDeP(DIA, '10:00');
});

const bloqueDeP = (page: Page) => page.locator('article', { hasText: ENLACE_P.nombre }).filter({ hasText: '10:00' });
const tokenActual = () =>
  conBd(async (bd) => (await bd.select().from(enlacePaciente).where(eq(enlacePaciente.pacienteId, ENLACE_P.pacienteId)))[0]!.token);

async function abrirMenu(page: Page) {
  await entrar(page);
  await page.goto(agendaDe(MARIA.id, DIA));
  await bloqueDeP(page).getByRole('button', { name: 'Enlace del paciente' }).click();
}

async function entrarComoPaciente(page: Page, ruta: string) {
  await page.goto(ruta);
  await page.getByLabel('Escriba las 4 últimas cifras de su teléfono').fill(ENLACE_P.cifras);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Sus próximas citas' })).toBeVisible();
}

test('FR-005: «Copiar enlace» deja la URL completa en el portapapeles', async ({ page, baseURL }) => {
  await abrirMenu(page);
  await new AxeBuilder({ page }).include('[role="menu"]').analyze().then((r) => expect(r.violations).toEqual([]));
  await page.getByRole('menuitem', { name: 'Copiar enlace' }).click();
  await expect(page.getByText(`Enlace de ${ENLACE_P.nombre} copiado`)).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}${ENLACE_P.ruta}`);
});

test('quickstart 6 — US3 #1–#3: generar enlace nuevo; el antiguo da «Enlace no válido» y el nuevo deja entrar', async ({ page, context }) => {
  await abrirMenu(page);
  await page.getByRole('menuitem', { name: 'Generar enlace nuevo' }).click();
  const dialogo = page.getByRole('alertdialog', { name: `¿Generar un enlace nuevo para ${ENLACE_P.nombre}?` });
  await expect(dialogo).toContainText(
    'El enlace actual dejará de funcionar ahora mismo, también si estaba bloqueado. Sus citas no cambian. Tendrás que darle el enlace nuevo.',
  );
  await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze().then((r) => expect(r.violations).toEqual([]));

  // «Cancelar» no cambia nada.
  await dialogo.getByRole('button', { name: 'Cancelar' }).click();
  expect(await tokenActual()).toBe(ENLACE_P.token);

  await bloqueDeP(page).getByRole('button', { name: 'Enlace del paciente' }).click();
  await page.getByRole('menuitem', { name: 'Generar enlace nuevo' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Generar enlace nuevo' }).click();
  await expect(page.getByText('Enlace nuevo generado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar' })).toBeVisible();
  const nuevo = await tokenActual();
  expect(nuevo).not.toBe(ENLACE_P.token);

  const paciente = await context.newPage();
  await paciente.goto(ENLACE_P.ruta);
  await expect(paciente.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible();
  await entrarComoPaciente(paciente, `/p/${nuevo}`);
  await expect(paciente.locator('article', { hasText: 'miércoles, 11/11/2026 · 10:00' })).toBeVisible();
});

test('US3 #5: con el enlace bloqueado, el nuevo deja entrar', async ({ page, context }) => {
  await conBd((bd) => bd.update(enlacePaciente).set({ fallosSeguidos: 10 }).where(eq(enlacePaciente.pacienteId, ENLACE_P.pacienteId)));
  await abrirMenu(page);
  await page.getByRole('menuitem', { name: 'Generar enlace nuevo' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Generar enlace nuevo' }).click();
  await expect(page.getByText('Enlace nuevo generado')).toBeVisible();
  await entrarComoPaciente(await context.newPage(), `/p/${await tokenActual()}`);
});

test('quickstart 7 — US3 #4: con la pestaña del paciente abierta, regenerar y cancelar da «Enlace no válido»', async ({ page, context }) => {
  const paciente = await context.newPage();
  await entrarComoPaciente(paciente, ENLACE_P.ruta);

  await abrirMenu(page);
  await page.getByRole('menuitem', { name: 'Generar enlace nuevo' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Generar enlace nuevo' }).click();
  await expect(page.getByText('Enlace nuevo generado')).toBeVisible();

  await paciente.locator('article', { hasText: 'miércoles, 11/11/2026 · 10:00' }).getByRole('button', { name: 'Cancelar cita' }).click();
  await paciente.getByRole('alertdialog').getByRole('button', { name: 'Sí, cancelar mi cita' }).click();
  await expect(paciente.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible();
  expect((await conBd((bd) => bd.select().from(cita).where(eq(cita.id, citaId))))[0]!.estado).toBe('reservada');
});
