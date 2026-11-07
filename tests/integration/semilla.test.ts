import { asc, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita, clinica, paciente, profesional, servicio } from '@/db/esquema';
import { verificarClave } from '@/servicios/acceso';
import { cargarSemilla } from '@/semilla/cargar';

const REFERENCIA = '2026-11-09';
const CLAVE = 'eleva-demo';

async function volcado() {
  const bd = obtenerBd();
  const [c] = await bd.select().from(clinica);
  const clinicaSinHash = { ...c!, claveHash: '(excluido)' };
  return {
    clinica: clinicaSinHash,
    profesionales: await bd.select().from(profesional).orderBy(asc(profesional.id)),
    servicios: await bd.select().from(servicio).orderBy(asc(servicio.id)),
    pacientes: await bd.select().from(paciente).orderBy(asc(paciente.id)),
    citas: await bd.select().from(cita).orderBy(asc(cita.id)),
  };
}

describe('FR-021–FR-024 — carga de la semilla en PostgreSQL real', () => {
  it('se carga sin violar ninguna restricción (incluida cita_sin_solape) y es idéntica al recargar', async () => {
    const r1 = await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const primera = await volcado();
    const r2 = await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const segunda = await volcado();

    expect(r2).toEqual(r1);
    // FR-021: mismo contenido e identificadores; solo puede cambiar el hash de la clave.
    expect(segunda).toEqual(primera);
    expect(primera.pacientes).toHaveLength(40);
    expect(primera.citas).toHaveLength(r1.totalCitas);
  });

  it('la clave de demostración funciona tras cada carga (hash distinto, misma clave)', async () => {
    await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const [{ claveHash: h1 }] = await obtenerBd().select({ claveHash: clinica.claveHash }).from(clinica) as [{ claveHash: string }];
    expect(await verificarClave(CLAVE)).not.toBeNull();
    await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const [{ claveHash: h2 }] = await obtenerBd().select({ claveHash: clinica.claveHash }).from(clinica) as [{ claveHash: string }];
    expect(h2).not.toBe(h1);
    expect(await verificarClave(CLAVE)).not.toBeNull();
  });

  it('FR-024 — la BD confirma que no hay pares de citas solapadas que ocupen hueco', async () => {
    await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const { rows } = await obtenerBd().execute(sql`
      SELECT count(*)::int AS pares FROM cita a JOIN cita b
        ON a.profesional_id = b.profesional_id AND a.id < b.id
       AND tstzrange(a.inicio, a.fin, '[)') && tstzrange(b.inicio, b.fin, '[)')
     WHERE a.estado IN ('reservada', 'completada') AND b.estado IN ('reservada', 'completada')`);
    expect(rows[0]).toEqual({ pares: 0 });
  });
});
