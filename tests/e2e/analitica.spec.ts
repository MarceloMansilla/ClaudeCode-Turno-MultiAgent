/** Spec 004 — página «Analítica» del panel (semilla 2026-11-09, «ahora» = 09/11/2026 12:10). */
import { expect, test } from '@playwright/test';
import { huellaBd } from '../helpers/huella-bd';
import { conBd, entrar, recargarSemilla } from './apoyo';

const NBSP = ' ';
const conNbsp = (t: string) => t.replace(/ (€|%)/g, `${NBSP}$1`);

test.beforeAll(recargarSemilla);

test.describe('Acceso y navegación', () => {
  test('US1 #1 — sin sesión, /analitica redirige a /entrar sin mostrar ninguna cifra', async ({ page }) => {
    await page.goto('/analitica');
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByLabel('Clave de la clínica')).toBeVisible();
    await expect(page.getByText(/%|€/)).toHaveCount(0);
  });

  test('US1 #2 — FR-002: desde la agenda, «Analítica» abre la página sin pedir clave y «Agenda» vuelve', async ({ page }) => {
    await entrar(page);
    const nav = page.getByRole('navigation', { name: 'Secciones del panel' });
    await expect(nav.getByRole('link', { name: 'Agenda' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Analítica' }).click();
    await expect(page).toHaveURL(/\/analitica$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Analítica' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Analítica' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Agenda' })).not.toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Agenda' }).click();
    await expect(page).toHaveURL(/\/agenda\/[0-9a-f-]{36}\/\d{4}-\d{2}-\d{2}$/);
  });

  test('FR-001 — sesión caducada: al recargar /analitica se vuelve a pedir la clave', async ({ page, context, baseURL }) => {
    await entrar(page);
    await page.goto('/analitica');
    await context.clearCookies();
    await context.addCookies([{ name: 'citaclara_sesion', value: 'token-caducado', url: baseURL! }]);
    await page.reload();
    await expect(page).toHaveURL(/\/entrar\?motivo=sesion$/);
    await expect(page.getByText(/%|€/)).toHaveCount(0);
  });
});

test.describe('US1 — cifras del periodo', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page);
    await page.goto('/analitica');
  });

  test('US1 #3 — periodo «Últimas 8 semanas: 14/09/2026 – 08/11/2026» sin la semana en curso', async ({ page }) => {
    await expect(page.getByText('Últimas 8 semanas: 14/09/2026 – 08/11/2026')).toBeVisible();
    await expect(page.getByText('La semana en curso no se incluye.')).toBeVisible();
    await expect(page.getByText(/09\/11\/2026/)).toHaveCount(0);
  });

  test('US1 #4 — ingresos por servicio al céntimo y total 47.140,00 €', async ({ page }) => {
    const tabla = page.getByRole('table', { name: 'Ingresos por servicio' });
    for (const [servicio, importe] of [
      ['Sesión de fisioterapia', '20.800,00 €'],
      ['Primera visita de fisioterapia', '8.200,00 €'],
      ['Consulta de nutrición', '12.740,00 €'],
      ['Primera visita de nutrición', '5.400,00 €'],
      ['Total', '47.140,00 €'],
    ] as const) {
      await expect(tabla.getByRole('row', { name: new RegExp(`^${servicio}`) })).toContainText(conNbsp(importe));
    }
  });

  test('US1 #5 — no asistencia por profesional con sus recuentos', async ({ page }) => {
    const tabla = page.getByRole('table', { name: 'No asistencia por profesional' });
    for (const [nombre, tasa] of [
      ['María', '10,5 %'],
      ['Jorge', '13,0 %'],
      ['Lucía', '9,7 %'],
      ['Clínica', '10,9 %'],
    ] as const) {
      await expect(tabla.getByRole('row', { name: new RegExp(`^${nombre}`) })).toContainText(conNbsp(tasa));
    }
    // «Jorge: 50 no asistidas de 385»
    await expect(page.locator('[data-grafico="grafico-no-asistencia"] [data-barra="Jorge"]')).toContainText(conNbsp('13,0 % (50 de 385)'));
  });

  test('US1 #6 — ocupación por profesional y de la clínica', async ({ page }) => {
    const tabla = page.getByRole('table', { name: 'Ocupación por profesional' });
    for (const [nombre, valor] of [
      ['María', '71,6 %'],
      ['Jorge', '71,2 %'],
      ['Lucía', '68,4 %'],
      ['Clínica', '70,4 %'],
    ] as const) {
      await expect(tabla.getByRole('row', { name: new RegExp(`^${nombre}`) })).toContainText(conNbsp(valor));
    }
  });

  test('US1 #7, FR-013 — cada gráfico tiene nombre accesible y tabla, y cada barra muestra etiqueta y valor en texto', async ({ page }) => {
    for (const titulo of ['Ocupación por profesional', 'No asistencia por profesional', 'Ingresos por servicio']) {
      const bloque = page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: titulo }) });
      await expect(bloque.getByRole('img', { name: titulo })).toBeVisible();
      await expect(bloque.getByRole('table', { name: titulo })).toBeVisible();
    }
    for (const id of ['grafico-ocupacion', 'grafico-no-asistencia', 'grafico-ingresos']) {
      const barras = page.locator(`[data-grafico="${id}"] [data-barra]`);
      const n = await barras.count();
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const barra = barras.nth(i);
        const textos = await barra.locator('text').allTextContents();
        expect(textos[0]).toBe(await barra.getAttribute('data-barra'));
        expect(textos[1]).toMatch(/\d/);
      }
    }
  });

  test('FR-015 — la página no tiene formularios ni botones de envío', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Analítica' })).toBeVisible();
    await expect(page.locator('main form')).toHaveCount(0);
    await expect(page.locator('main button[type=submit]')).toHaveCount(0);
  });

  test('SC-003 — la BD queda idéntica tras cargar y recorrer la página', async ({ page }) => {
    const antes = await conBd((bd) => huellaBd(bd));
    await page.reload();
    await page.getByText('Ver detalle por profesional').click();
    await page.mouse.wheel(0, 10_000);
    await page.goto('/agenda');
    await page.goto('/analitica');
    await expect(page.getByRole('heading', { level: 1, name: 'Analítica' })).toBeVisible();
    expect(await conBd((bd) => huellaBd(bd))).toEqual(antes);
  });
});

test.describe('US2 — evolución semanal', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page);
    await page.goto('/analitica');
  });

  test('US2 #1 — 8 semanas, de la del 14/09/2026 a la del 02/11/2026, en orden', async ({ page }) => {
    const tabla = page.getByRole('table', { name: 'Evolución semanal de la clínica' });
    await expect(tabla.getByRole('row', { name: /^Total/ })).toBeVisible();
    expect(await tabla.locator('tbody th[scope=row]').allTextContents()).toEqual([
      'semana del 14/09/2026',
      'semana del 21/09/2026',
      'semana del 28/09/2026',
      'semana del 05/10/2026',
      'semana del 12/10/2026',
      'semana del 19/10/2026',
      'semana del 26/10/2026',
      'semana del 02/11/2026',
      'Total',
    ]);
  });

  test('US2 #2 — ingresos semanales y total 47.140,00 €', async ({ page }) => {
    const tabla = page.getByRole('table', { name: 'Evolución semanal de la clínica' });
    await expect(tabla.getByRole('row', { name: /^Total/ })).toBeVisible();
    expect(await tabla.locator('tbody tr td:last-child').allTextContents()).toEqual(
      ['5.540,00 €', '5.525,00 €', '5.685,00 €', '6.090,00 €', '6.425,00 €', '5.850,00 €', '5.645,00 €', '6.380,00 €', '47.140,00 €'].map(conNbsp),
    );
  });

  test('US2 #3 — no asistencia de la clínica: 12,7 % la primera semana y 5,4 % la última', async ({ page }) => {
    const tabla = page.getByRole('table', { name: 'Evolución semanal de la clínica' });
    await expect(tabla.getByRole('row', { name: /^semana del 14\/09\/2026/ })).toContainText(conNbsp('12,7 %'));
    await expect(tabla.getByRole('row', { name: /^semana del 02\/11\/2026/ })).toContainText(conNbsp('5,4 %'));
  });

  test('US2 #4, US2 #5 — detalle por profesional: Jorge 80,0 % la semana del 12/10 y recuentos de la del 02/11', async ({ page }) => {
    await page.getByText('Ver detalle por profesional').click();
    const celdas = (semana: string, nombre: string) => page.locator(`tr[data-semana="${semana}"][data-profesional="${nombre}"] td`);
    await expect(celdas('2026-10-12', 'Jorge').nth(4)).toHaveText(conNbsp('80,0 %'));
    for (const [nombre, c, na, can] of [
      ['María', '50', '1', '3'],
      ['Jorge', '41', '2', '4'],
      ['Lucía', '66', '6', '8'],
    ] as const) {
      await expect(celdas('2026-11-02', nombre).nth(0)).toHaveText(c);
      await expect(celdas('2026-11-02', nombre).nth(1)).toHaveText(na);
      await expect(celdas('2026-11-02', nombre).nth(2)).toHaveText(can);
    }
  });

  test('FR-013 — los gráficos de evolución tienen nombre accesible', async ({ page }) => {
    await expect(page.getByRole('img', { name: 'Ocupación semanal por profesional y de la clínica' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'No asistencia semanal por profesional y de la clínica' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Ingresos por semana' })).toBeVisible();
  });
});
