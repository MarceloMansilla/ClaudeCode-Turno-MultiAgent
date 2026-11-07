/** Spec 004 — `obtenerAnalitica` contra PostgreSQL real con la semilla 2026-11-09. */
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { clinica } from '@/db/esquema';
import { fijarAhora } from '@/lib/reloj';
import { cargarSemilla } from '@/semilla/cargar';
import { obtenerAnalitica } from '@/servicios/analitica';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, insertarCita } from '../helpers/fabrica';
import { huellaBd } from '../helpers/huella-bd';

const AHORA = '2026-11-09T12:10:00+01:00';

async function clinicaEleva(): Promise<string> {
  const [fila] = await obtenerBd().select({ id: clinica.id }).from(clinica).where(eq(clinica.nombre, 'Clínica Eleva'));
  return fila!.id;
}

beforeEach(async () => {
  await vaciarTablas();
  await cargarSemilla(obtenerBd(), '2026-11-09', 'clave');
  fijarAhora(AHORA);
});

afterAll(() => fijarAhora(undefined));

describe('US1 #4–#6 — cifras del periodo desde la BD', () => {
  it('coinciden con las «Cifras de referencia» de la spec', async () => {
    const r = await obtenerAnalitica(await clinicaEleva());
    expect(r.periodo.etiqueta).toBe('14/09/2026 – 08/11/2026');
    expect(r.profesionales.map((p) => [p.nombre, p.noAsistidas, p.completadas + p.noAsistidas, p.tasaNoAsistenciaDecimas])).toEqual([
      ['María', 41, 390, 105],
      ['Jorge', 50, 385, 130],
      ['Lucía', 52, 536, 97],
    ]);
    expect(r.clinica.tasaNoAsistenciaDecimas).toBe(109);
    expect(r.profesionales.map((p) => [p.minutosOcupados, p.ocupacionDecimas])).toEqual([
      [18900, 716],
      [18795, 712],
      [18045, 684],
    ]);
    expect(r.clinica.ocupacionDecimas).toBe(704);
    expect(r.ingresosPorServicio.map((i) => [i.nombre, i.citas, i.importeCentimos])).toEqual([
      ['Sesión de fisioterapia', 520, 2080000],
      ['Primera visita de fisioterapia', 164, 820000],
      ['Consulta de nutrición', 364, 1274000],
      ['Primera visita de nutrición', 120, 540000],
    ]);
    expect(r.ingresosTotalCentimos).toBe(4714000);
  });
});

describe('US2 — evolución semanal desde la BD', () => {
  it('US2 #2 — ingresos semanales al céntimo y su suma = total', async () => {
    const r = await obtenerAnalitica(await clinicaEleva());
    expect(r.semanas.map((s) => [s.lunes, s.ingresosCentimos])).toEqual([
      ['2026-09-14', 554000],
      ['2026-09-21', 552500],
      ['2026-09-28', 568500],
      ['2026-10-05', 609000],
      ['2026-10-12', 642500],
      ['2026-10-19', 585000],
      ['2026-10-26', 564500],
      ['2026-11-02', 638000],
    ]);
    expect(r.semanas.reduce((a, s) => a + s.ingresosCentimos, 0)).toBe(r.ingresosTotalCentimos);
  });

  it('US2 #5 — detalle de la semana del 02/11/2026: María 50/1/3, Jorge 41/2/4, Lucía 66/6/8', async () => {
    const r = await obtenerAnalitica(await clinicaEleva());
    const semana = r.semanas.find((s) => s.lunes === '2026-11-02')!;
    expect(semana.porProfesional.map((p) => [p.nombre, p.completadas, p.noAsistidas, p.canceladas])).toEqual([
      ['María', 50, 1, 3],
      ['Jorge', 41, 2, 4],
      ['Lucía', 66, 6, 8],
    ]);
  });
});

describe('FR-003 — solo datos de la clínica de la sesión', () => {
  it('otra clínica con citas completadas en el periodo no altera ninguna cifra de Clínica Eleva', async () => {
    const id = await clinicaEleva();
    const antes = await obtenerAnalitica(id);

    const otra = await crearEscenario();
    for (const hora of ['09:00', '10:00', '11:00']) {
      await insertarCita(otra, { profesionalId: otra.maria, fecha: '2026-10-14', hora, minutos: 45, estado: 'completada' });
    }
    await insertarCita(otra, { profesionalId: otra.jorge, fecha: '2026-10-15', hora: '10:00', minutos: 45, estado: 'no_asistida' });

    expect(await obtenerAnalitica(id)).toEqual(antes);
    const deLaOtra = await obtenerAnalitica(otra.clinicaId);
    expect(deLaOtra.clinica.completadas).toBe(3);
    expect(deLaOtra.ingresosTotalCentimos).toBe(12000);
  });
});

describe('SC-003, FR-015 — solo lectura', () => {
  it('la huella de la BD es idéntica antes y después de obtener la analítica', async () => {
    const antes = await huellaBd(obtenerBd());
    expect(antes['cita']!.filas).toBeGreaterThan(1425);
    await obtenerAnalitica(await clinicaEleva());
    await obtenerAnalitica(await clinicaEleva());
    expect(await huellaBd(obtenerBd())).toEqual(antes);
  });
});
