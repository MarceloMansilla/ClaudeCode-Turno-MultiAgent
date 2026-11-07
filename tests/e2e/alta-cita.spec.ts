import { expect, test, type Page } from '@playwright/test';
import { agendaDe, entrar, HOY, LUNES_SIGUIENTE, MARIA, PACIENTE_1, recargarSemilla, vaciarDia } from './apoyo';

const panel = (page: Page) => page.getByRole('dialog', { name: 'Nueva cita' });

async function abrirAlta(page: Page, fecha: string, hora: string) {
  await page.goto(`${agendaDe(MARIA.id, fecha)}/nueva?hora=${hora}`);
  await expect(panel(page)).toBeVisible();
}

async function elegirServicio(page: Page, nombre: RegExp) {
  const select = panel(page).getByLabel('Servicio');
  const valor = await select.locator('option', { hasText: nombre }).getAttribute('value');
  await select.selectOption(valor!);
}

async function elegirPacienteExistente(page: Page) {
  await panel(page).getByLabel('Buscar paciente').fill(PACIENTE_1.telefono.slice(0, 7));
  await panel(page).getByRole('button', { name: new RegExp(PACIENTE_1.nombre) }).click();
}

const reservar = (page: Page) => panel(page).getByRole('button', { name: 'Reservar cita' }).click();

test.beforeAll(recargarSemilla);
test.beforeEach(async ({ page }) => {
  await vaciarDia(MARIA.id, LUNES_SIGUIENTE);
  await entrar(page);
});

test.describe('US2 — alta de cita', () => {
  test('quickstart 5 — US2 #1: desde un hueco libre, reserva 10:00–10:45', async ({ page }) => {
    await page.goto(agendaDe(MARIA.id, LUNES_SIGUIENTE));
    await page.getByRole('link', { name: 'Reservar a las 09:00' }).click();
    await expect(panel(page)).toBeVisible();
    await panel(page).getByLabel('Hora').selectOption('10:00');
    await elegirServicio(page, /^Sesión de fisioterapia/);
    await expect(panel(page).getByText('Termina a las')).toContainText('10:45');
    await elegirPacienteExistente(page);
    await reservar(page);
    await expect(page).toHaveURL(agendaDe(MARIA.id, LUNES_SIGUIENTE));
    await expect(page.getByText(`Cita reservada: 10:00–10:45 · ${PACIENTE_1.nombre}`)).toBeVisible();
    await expect(page.locator('article[data-estado="reservada"]', { hasText: '10:00–10:45' })).toBeVisible();
  });

  test('quickstart 6 y 7 — US2 #2 solape rechazado y US2 #3 contigua permitida', async ({ page }) => {
    await abrirAlta(page, LUNES_SIGUIENTE, '10:00');
    await elegirPacienteExistente(page);
    await reservar(page);
    await expect(page).toHaveURL(agendaDe(MARIA.id, LUNES_SIGUIENTE));

    await abrirAlta(page, LUNES_SIGUIENTE, '10:30');
    await elegirServicio(page, /^Primera visita de fisioterapia/);
    await elegirPacienteExistente(page);
    await reservar(page);
    await expect(panel(page).getByRole('alert')).toHaveText('María ya tiene una cita de 10:00 a 10:45. Elige otro hueco.');

    // Se mantiene la «Primera visita» (60 min): contigua a 10:00–10:45, termina a las 11:45.
    await panel(page).getByLabel('Hora').selectOption('10:45');
    await reservar(page);
    await expect(page.locator('article', { hasText: '10:45–11:45' })).toBeVisible();
  });

  test('quickstart 8 — US2 #6: hoy a las 12:00 (ahora 12:10) es pasado', async ({ page }) => {
    await abrirAlta(page, HOY, '12:00');
    await elegirPacienteExistente(page);
    await reservar(page);
    await expect(panel(page).getByRole('alert')).toHaveText('No se pueden crear citas en el pasado.');
  });

  test('quickstart 9 — US2 #8: 60 min a las 19:30 termina después del cierre', async ({ page }) => {
    await abrirAlta(page, LUNES_SIGUIENTE, '19:30');
    await elegirServicio(page, /^Primera visita de fisioterapia/);
    await elegirPacienteExistente(page);
    await reservar(page);
    await expect(panel(page).getByRole('alert')).toHaveText(
      'La cita terminaría a las 20:30, después del cierre (20:00). Elige una hora anterior.',
    );
  });

  test('quickstart 10 — FR-016b: teléfono ya registrado → «Usar esta ficha»', async ({ page }) => {
    await abrirAlta(page, LUNES_SIGUIENTE, '11:00');
    await panel(page).getByRole('button', { name: 'Paciente nuevo' }).click();
    await panel(page).getByLabel('Nombre y apellidos').fill('Otra Persona');
    await panel(page).getByLabel('Teléfono').fill(`+34 ${PACIENTE_1.telefonoNormalizado}`);
    await reservar(page);
    await expect(panel(page).getByText(`Ya hay un paciente con este teléfono: ${PACIENTE_1.nombre}.`)).toBeVisible();
    await panel(page).getByRole('button', { name: 'Usar esta ficha' }).click();
    await reservar(page);
    await expect(page.getByText(`Cita reservada: 11:00–11:45 · ${PACIENTE_1.nombre}`)).toBeVisible();
  });

  test('quickstart 16 — FR-016c: teléfono extranjero rechazado', async ({ page }) => {
    await abrirAlta(page, LUNES_SIGUIENTE, '11:00');
    await panel(page).getByRole('button', { name: 'Paciente nuevo' }).click();
    await panel(page).getByLabel('Nombre y apellidos').fill('John Smith');
    await panel(page).getByLabel('Teléfono').fill('+44 7700 900123');
    await reservar(page);
    await expect(panel(page).getByText('Revisa el teléfono: debe ser un número español de 9 cifras.')).toBeVisible();
  });

  test('US2 #9 — paciente nuevo: se crea la ficha y la cita', async ({ page }) => {
    await abrirAlta(page, LUNES_SIGUIENTE, '12:00');
    await panel(page).getByRole('button', { name: 'Paciente nuevo' }).click();
    await panel(page).getByLabel('Nombre y apellidos').fill('Paciente Nuevo E2E');
    await panel(page).getByLabel('Teléfono').fill('699 123 456');
    await reservar(page);
    await expect(page.getByText('Cita reservada: 12:00–12:45 · Paciente Nuevo E2E')).toBeVisible();
  });

  test('quickstart 11 — FR-009a: con María solo se ofrecen servicios de Fisioterapia', async ({ page }) => {
    await abrirAlta(page, LUNES_SIGUIENTE, '10:00');
    const opciones = await panel(page).getByLabel('Servicio').locator('option').allTextContents();
    expect(opciones).toEqual([
      'Sesión de fisioterapia · 45 min · 40,00 €',
      'Primera visita de fisioterapia · 60 min · 50,00 €',
    ]);
  });

  test('quickstart 14 — US2 #7: dos puestos reservan el mismo hueco a la vez → solo uno', async ({ page, browser }) => {
    const otro = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' });
    const page2 = await otro.newPage();
    await entrar(page2);
    for (const p of [page, page2]) {
      await abrirAlta(p, LUNES_SIGUIENTE, '15:00');
      await elegirPacienteExistente(p);
    }
    await Promise.all([reservar(page), reservar(page2)]);

    const exito = (p: Page) => p.waitForURL(agendaDe(MARIA.id, LUNES_SIGUIENTE), { timeout: 10_000 }).then(() => true, () => false);
    const [ok1, ok2] = await Promise.all([exito(page), exito(page2)]);
    expect([ok1, ok2].filter(Boolean)).toHaveLength(1);
    const perdedora = ok1 ? page2 : page;
    await expect(panel(perdedora).getByRole('alert')).toHaveText(
      /^(María ya tiene una cita de 15:00 a 15:45\. Elige otro hueco\.|Este hueco se acaba de ocupar desde otro puesto\. Elige otro hueco\.)$/,
    );
    await otro.close();
  });
});
