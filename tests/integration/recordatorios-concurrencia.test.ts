import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { recordatorio } from '@/db/esquema';
import { cargarSemilla } from '@/semilla/cargar';
import { borrarCarpeta, carpetaTemporal, ejecutar, ficherosEml } from '../helpers/recordatorios';

const LUNES_0800 = '2026-11-09T08:00:00+01:00';
const CON_CORREO_MARTES = 20;

let dir: string;
beforeEach(async () => {
  dir = await carpetaTemporal();
  await cargarSemilla(obtenerBd(), '2026-11-09', 'eleva-demo');
});
afterEach(async () => {
  await borrarCarpeta(dir);
});

describe('FR-003 / SC-001 como máximo un recordatorio por cita', () => {
  it('US1 #3 / FR-003 dos ejecuciones simultáneas generan un solo recordatorio por cita', async () => {
    const [a, b] = await Promise.all([ejecutar(LUNES_0800, dir), ejecutar(LUNES_0800, dir)]);
    expect(a.resumen.totales.enviado + b.resumen.totales.enviado).toBe(CON_CORREO_MARTES);
    expect(await obtenerBd().select().from(recordatorio)).toHaveLength(CON_CORREO_MARTES);
    expect(await ficherosEml(dir)).toHaveLength(CON_CORREO_MARTES);
  });

  it('SC-001 10 ejecuciones seguidas y después 2 simultáneas: 0 duplicados', async () => {
    let enviados = 0;
    for (let i = 0; i < 10; i++) enviados += (await ejecutar(LUNES_0800, dir)).resumen.totales.enviado;
    const [a, b] = await Promise.all([ejecutar(LUNES_0800, dir), ejecutar(LUNES_0800, dir)]);
    enviados += a.resumen.totales.enviado + b.resumen.totales.enviado;
    expect(enviados).toBe(CON_CORREO_MARTES);
    const filas = await obtenerBd().select().from(recordatorio);
    expect(filas).toHaveLength(CON_CORREO_MARTES);
    expect(filas.every((r) => r.estado === 'enviado' && r.intentos === 1)).toBe(true);
    expect(await ficherosEml(dir)).toHaveLength(CON_CORREO_MARTES);
  });
});
