import { asc, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { enTransaccion, obtenerBd } from '@/db/cliente';
import { cita, clinica, enlacePaciente, paciente, profesional, servicio } from '@/db/esquema';
import { verificarClave } from '@/servicios/acceso';
import { cargarSemilla } from '@/semilla/cargar';
import { crearPaciente } from '@/servicios/pacientes';

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

describe('FR-018a (enmienda S2) — origen de las canceladas en la BD', () => {
  it('las 114 canceladas son de recepción y ninguna otra cita tiene origen', async () => {
    await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const { rows } = await obtenerBd().execute(sql`
      SELECT estado::text AS estado, cancelada_por::text AS origen, count(*)::int AS n
        FROM cita GROUP BY estado, cancelada_por ORDER BY estado, cancelada_por`);
    expect(rows).toEqual([
      { estado: 'cancelada', origen: 'recepcion', n: 114 },
      { estado: 'completada', origen: null, n: 1168 },
      { estado: 'no_asistida', origen: null, n: 143 },
      { estado: 'reservada', origen: null, n: 280 },
    ]);
  });
});

describe('FR-022 (enmienda S3) — teléfono de contacto de la clínica', () => {
  it('Clínica Eleva tiene el teléfono «911 234 567»', async () => {
    await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const filas = await obtenerBd().select({ nombre: clinica.nombre, telefono: clinica.telefono }).from(clinica);
    expect(filas).toEqual([{ nombre: 'Clínica Eleva', telefono: '911 234 567' }]);
  });

  it('la BD rechaza un teléfono de clínica que no es español de 9 cifras (FR-016c) y acepta sus variantes', async () => {
    await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const fijar = (telefono: string) =>
      obtenerBd().execute(sql`UPDATE clinica SET telefono = ${telefono}`);
    for (const valido of ['911234567', '+34 911 234 567', '0034 911-234-567', '(91) 123.45.67']) {
      await expect(fijar(valido)).resolves.toBeDefined();
    }
    for (const invalido of ['', '511 234 567', '91 123 456', '+44 7700 900123']) {
      await expect(fijar(invalido)).rejects.toThrow();
    }
  });
});

describe('Spec 005 — enlaces personales en la BD', () => {
  it('FR-019: la carga deja 40 enlaces, uno por paciente, idénticos al recargar', async () => {
    await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const leer = () =>
      obtenerBd().select().from(enlacePaciente).orderBy(asc(enlacePaciente.pacienteId));
    const primera = await leer();
    expect(primera).toHaveLength(40);
    const pacientes = await obtenerBd().select({ id: paciente.id }).from(paciente);
    expect(new Set(primera.map((e) => e.pacienteId))).toEqual(new Set(pacientes.map((p) => p.id)));
    await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    expect(await leer()).toEqual(primera);
  });

  it('FR-001: una ficha creada con crearPaciente nace con exactamente un enlace', async () => {
    await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const [{ id: clinicaId }] = (await obtenerBd().select({ id: clinica.id }).from(clinica)) as [{ id: string }];
    const creada = await enTransaccion((tx) =>
      crearPaciente(clinicaId, { nombre: 'Paciente Nuevo', telefono: '600 000 001' }, tx),
    );
    expect(creada.ok).toBe(true);
    const id = creada.ok ? creada.datos.id : '';
    const enlaces = await obtenerBd().select().from(enlacePaciente).where(eq(enlacePaciente.pacienteId, id));
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]!.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(enlaces[0]!.fallosSeguidos).toBe(0);
  });

  it('FR-001: una ficha rechazada por teléfono duplicado no deja enlace huérfano', async () => {
    await cargarSemilla(obtenerBd(), REFERENCIA, CLAVE);
    const [{ id: clinicaId }] = (await obtenerBd().select({ id: clinica.id }).from(clinica)) as [{ id: string }];
    const [existente] = await obtenerBd().select().from(paciente).limit(1);
    const r = await enTransaccion((tx) =>
      crearPaciente(clinicaId, { nombre: 'Otra Persona', telefono: existente!.telefono }, tx),
    );
    expect(r).toMatchObject({ ok: false, codigo: 'TELEFONO_DUPLICADO' });
    const { rows } = await obtenerBd().execute(sql`SELECT count(*)::int AS n FROM enlace_paciente`);
    expect(rows[0]).toEqual({ n: 40 });
  });
});
