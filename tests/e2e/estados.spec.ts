import { expect, test } from '@playwright/test';
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { cita, paciente } from '../../src/db/esquema';
import { horaLocal, instanteLocal } from '../../src/lib/zona';
import { AHORA_E2E } from '../../playwright.config';
import { agendaDe, conBd, entrar, HOY, MARIA, recargarSemilla } from './apoyo';

const Z = 'Europe/Madrid';
const AHORA = new Date(AHORA_E2E);

/** Citas reservadas de María hoy, con su paciente, en orden. */
function reservadasDeHoy() {
  return conBd((bd) =>
    bd
      .select({ id: cita.id, inicio: cita.inicio, fin: cita.fin, paciente: paciente.nombre })
      .from(cita)
      .innerJoin(paciente, eq(paciente.id, cita.pacienteId))
      .where(
        and(
          eq(cita.profesionalId, MARIA.id),
          eq(cita.estado, 'reservada'),
          gte(cita.inicio, instanteLocal(HOY, '00:00', Z)),
          lt(cita.inicio, instanteLocal('2026-11-10', '00:00', Z)),
        ),
      )
      .orderBy(asc(cita.inicio)),
  );
}

test.beforeEach(async ({ page }) => {
  await recargarSemilla();
  await entrar(page);
  await page.goto(agendaDe(MARIA.id, HOY));
});

test('quickstart 12 — US3 #1: cancelar con confirmación deja la cita cancelada y el hueco libre', async ({ page }) => {
  const futura = (await reservadasDeHoy()).find((c) => c.inicio > AHORA)!;
  const rango = `${horaLocal(futura.inicio, Z)}–${horaLocal(futura.fin, Z)}`;
  const bloque = page.locator('article', { hasText: rango }).filter({ hasText: futura.paciente });

  await bloque.getByRole('button', { name: 'Cancelar cita' }).click();
  const dialogo = page.getByRole('alertdialog');
  await expect(dialogo).toContainText(`¿Cancelar la cita de ${futura.paciente} (${rango})?`);
  await dialogo.getByRole('button', { name: 'Sí, cancelar la cita' }).click();

  await expect(page.locator('article[data-estado="cancelada"]', { hasText: rango })).toBeVisible();
  await expect(page.getByRole('link', { name: `Reservar a las ${horaLocal(futura.inicio, Z)}` })).toBeVisible();
});

test('cancelar se puede abandonar con «Volver» sin cambiar nada', async ({ page }) => {
  const futura = (await reservadasDeHoy()).find((c) => c.inicio > AHORA)!;
  const rango = `${horaLocal(futura.inicio, Z)}–${horaLocal(futura.fin, Z)}`;
  const bloque = page.locator('article', { hasText: rango });
  await bloque.getByRole('button', { name: 'Cancelar cita' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Volver' }).click();
  await expect(bloque).toHaveAttribute('data-estado', 'reservada');
});

test('quickstart 13 — US3 #2–#4: cita empezada → «Completar» y «No asistió», sin «Cancelar»', async ({ page }) => {
  const [pasada, otraPasada] = (await reservadasDeHoy()).filter((c) => c.inicio <= AHORA);
  expect(pasada).toBeDefined();
  const rango = `${horaLocal(pasada!.inicio, Z)}–${horaLocal(pasada!.fin, Z)}`;
  const bloque = page.locator('article', { hasText: rango });
  await expect(bloque.getByRole('button', { name: 'Completar' })).toBeVisible();
  await expect(bloque.getByRole('button', { name: 'No asistió' })).toBeVisible();
  await expect(bloque.getByRole('button', { name: 'Cancelar cita' })).toHaveCount(0);

  await bloque.getByRole('button', { name: 'Completar' }).click();
  await expect(bloque).toHaveAttribute('data-estado', 'completada');
  await expect(bloque.getByRole('button')).toHaveCount(0);

  if (otraPasada) {
    const rango2 = `${horaLocal(otraPasada.inicio, Z)}–${horaLocal(otraPasada.fin, Z)}`;
    const bloque2 = page.locator('article', { hasText: rango2 });
    await bloque2.getByRole('button', { name: 'No asistió' }).click();
    await expect(bloque2).toHaveAttribute('data-estado', 'no_asistida');
    await expect(bloque2).toContainText('No asistida');
  }
});
