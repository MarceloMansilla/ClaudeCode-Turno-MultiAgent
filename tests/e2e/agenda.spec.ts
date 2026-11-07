import { expect, test } from '@playwright/test';
import { agendaDe, conBd, entrar, HOY, JORGE, MARIA, recargarSemilla } from './apoyo';
import { cita } from '../../src/db/esquema';
import { and, eq } from 'drizzle-orm';

test.beforeAll(recargarSemilla);

test.describe('US1 — agenda del día', () => {
  test('US1 #3 — al entrar se ve hoy (lunes 09/11/2026) de María, con citas y huecos', async ({ page }) => {
    await entrar(page);
    await expect(page).toHaveURL(agendaDe(MARIA.id, HOY));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/lunes, 09\/11\/2026/i);
    await expect(page.getByText('Hoy', { exact: true }).first()).toBeVisible();
    const agenda = page.getByRole('list', { name: 'Agenda de María' });
    await expect(agenda.getByRole('article').first()).toBeVisible();
    await expect(agenda.locator('[data-hueco]').first()).toBeVisible();
    await expect(page.getByLabel('Ahora, 12:10')).toBeVisible();
  });

  test('US1 #4 — cambiar a Jorge y al día siguiente', async ({ page, isMobile }) => {
    await entrar(page);
    if (isMobile) {
      await page.getByLabel('Profesional', { exact: true }).selectOption(JORGE.id);
    } else {
      await page.getByRole('navigation', { name: 'Profesionales' }).getByRole('link', { name: /Jorge/ }).click();
    }
    await expect(page).toHaveURL(agendaDe(JORGE.id, HOY));
    await page.getByRole('link', { name: 'Día siguiente' }).click();
    await expect(page).toHaveURL(agendaDe(JORGE.id, '2026-11-10'));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/martes, 10\/11\/2026/i);
    await page.getByLabel('Elegir fecha').fill('2026-11-12');
    await expect(page).toHaveURL(agendaDe(JORGE.id, '2026-11-12'));
  });

  test('US1 #5 — una cita cancelada aparece atenuada y su hueco, libre', async ({ page }) => {
    // Primera cita cancelada de María en la historia de la semilla.
    const [cancelada] = await conBd((bd) =>
      bd.select().from(cita).where(and(eq(cita.profesionalId, MARIA.id), eq(cita.estado, 'cancelada'))).limit(1),
    );
    const fecha = cancelada!.inicio.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
    const hora = cancelada!.inicio.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' });
    await entrar(page);
    await page.goto(agendaDe(MARIA.id, fecha));
    const bloque = page.locator(`article[data-estado="cancelada"]`, { hasText: hora }).first();
    await expect(bloque).toContainText('Cancelada');
    // En la historia no hay huecos reservables; el tramo cancelado figura como libre (pasado).
    await expect(page.locator('[data-hueco="pasado"]').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^Reservar/ })).toHaveCount(0);
  });

  test('día no laborable: «La clínica no abre este día.»', async ({ page }) => {
    await entrar(page);
    await page.goto(agendaDe(MARIA.id, '2026-11-14'));
    await expect(page.getByText('La clínica no abre este día.')).toBeVisible();
  });

  test('agenda inexistente: «No encontramos esa agenda»', async ({ page }) => {
    await entrar(page);
    await page.goto(agendaDe('00000000-0000-4000-8000-000000000000', HOY));
    await expect(page.getByRole('heading', { name: 'No encontramos esa agenda' })).toBeVisible();
  });
});
