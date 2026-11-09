/**
 * Spec 005, US1 — entrar con el enlace personal y las 4 cifras (FR-001–FR-007, FR-006a/b).
 */
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd, type Ejecutor } from '@/db/cliente';
import { enlacePaciente, paciente } from '@/db/esquema';
import { crearTokenAcceso } from '@/lib/acceso-paciente';
import { fijarAhora } from '@/lib/reloj';
import { cambiarEstadoCita, crearCita } from '@/servicios/citas';
import { confirmarCifrasPaciente, resolverToken } from '@/servicios/enlaces';
import { pantallaPaciente } from '@/servicios/portal-paciente';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, fijarIntentos, insertarCita, type Escenario } from '../helpers/fabrica';

const AHORA = '2026-11-09T12:10:00+01:00';
const INVENTADO = 'NoExisteNoExisteNoExisteNoExisteNoExiste123';
let e: Escenario;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
  fijarAhora(AHORA);
});
afterEach(() => fijarAhora(undefined));

const fallos = async (pacienteId: string) =>
  (await obtenerBd().select().from(enlacePaciente).where(eq(enlacePaciente.pacienteId, pacienteId)))[0]!;

/** Abre el acceso de Ana como lo haría la Server Action y devuelve el valor de la cookie. */
async function entrarComoAna(token = e.tokenAna) {
  const r = await confirmarCifrasPaciente(token, '5678');
  if (!r.ok) throw new Error(r.mensaje);
  return crearTokenAcceso(r.datos.acceso);
}

describe('US1 #1 / FR-006 — acceso con enlace + 4 cifras, solo a los datos propios', () => {
  it('las cifras correctas abren el acceso y solo se ven citas de Ana', async () => {
    await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-16', hora: '10:00', minutos: 45, pacienteId: e.ana });
    await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-16', hora: '11:00', minutos: 45, pacienteId: e.luis });
    await insertarCita(e, { profesionalId: e.jorge, fecha: '2026-11-16', hora: '10:00', minutos: 45, pacienteId: e.luis });

    const cookie = await entrarComoAna();
    const p = await pantallaPaciente(e.tokenAna, cookie);
    expect(p).toMatchObject({ tipo: 'dentro', pacienteId: e.ana });
    if (p.tipo !== 'dentro') return;
    expect(p.citas).toHaveLength(1);
    expect(p.citas[0]).toMatchObject({ fecha: 'lunes, 16/11/2026', hora: '10:00', servicio: 'Sesión de fisioterapia', profesional: 'María' });
  });

  it('solo muestra citas reservadas futuras, ordenadas por inicio', async () => {
    await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-17', hora: '09:00', minutos: 45 });
    await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-16', hora: '09:00', minutos: 45 });
    await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-16', hora: '12:00', minutos: 45, estado: 'cancelada' });
    await insertarCita(e, { profesionalId: e.maria, fecha: '2026-11-06', hora: '09:00', minutos: 45, estado: 'completada' });
    const p = await pantallaPaciente(e.tokenAna, await entrarComoAna());
    expect(p.tipo === 'dentro' && p.citas.map((c) => `${c.fecha} ${c.hora}`)).toEqual([
      'lunes, 16/11/2026 09:00',
      'martes, 17/11/2026 09:00',
    ]);
  });

  it('sin cookie, o con la cookie de Luis, el enlace de Ana solo pide las cifras', async () => {
    expect(await pantallaPaciente(e.tokenAna, undefined)).toMatchObject({ tipo: 'cifras' });
    const r = await confirmarCifrasPaciente(e.tokenLuis, '0111');
    const cookieLuis = r.ok ? await crearTokenAcceso(r.datos.acceso) : '';
    expect(await pantallaPaciente(e.tokenAna, cookieLuis)).toMatchObject({ tipo: 'cifras' });
  });
});

describe('US1 #2 / FR-007 — enlace no válido', () => {
  it('un token con formato que no existe y uno sin formato dan la misma respuesta, sin datos', async () => {
    const conFormato = await confirmarCifrasPaciente(INVENTADO, '5678');
    const sinFormato = await confirmarCifrasPaciente('abc', '5678');
    expect(conFormato).toEqual(sinFormato);
    expect(conFormato).toEqual({
      ok: false,
      codigo: 'ENLACE_NO_VALIDO',
      mensaje: 'Este enlace no es válido. Pida uno nuevo a Clínica de Pruebas en el 911 000 222.',
    });
    expect(JSON.stringify(conFormato)).not.toMatch(/Ana|Luis|Pérez|Gómez/);
    expect(await pantallaPaciente(INVENTADO, undefined)).toEqual(await pantallaPaciente('abc', undefined));
    expect(await pantallaPaciente(INVENTADO, undefined)).toMatchObject({ tipo: 'no_valido', clinica: { nombre: 'Clínica de Pruebas' } });
  });

  it('un token sin formato no consulta la BD', async () => {
    let consultas = 0;
    const bdQueCuenta = new Proxy({} as Ejecutor, {
      get: () => {
        consultas++;
        throw new Error('no debería consultar la BD');
      },
    });
    expect(await resolverToken(`${e.tokenAna} `, bdQueCuenta)).toBeNull();
    expect(await resolverToken(e.tokenAna.slice(0, 40), bdQueCuenta)).toBeNull();
    expect(consultas).toBe(0);
  });

  it('edge case «Enlace mal copiado»: con mayúsculas cambiadas no es válido', async () => {
    expect(await resolverToken(e.tokenAna.toUpperCase())).toBeNull();
  });
});

describe('US1 #3 / FR-003 — el enlace es estable', () => {
  it('no cambia al abrirlo, al reservar ni al cancelar citas', async () => {
    const antes = (await fallos(e.ana)).token;
    await entrarComoAna();
    await entrarComoAna();
    const nueva = await crearCita(e.clinicaId, {
      profesionalId: e.maria,
      servicioId: e.sesionFisio,
      fecha: '2026-11-16',
      hora: '10:00',
      paciente: { id: e.ana },
    });
    expect(nueva.ok).toBe(true);
    if (nueva.ok) expect(await cambiarEstadoCita(e.clinicaId, nueva.datos.id, 'cancelar')).toMatchObject({ ok: true });
    expect((await fallos(e.ana)).token).toBe(antes);
    expect(await pantallaPaciente(antes, await entrarComoAna(antes))).toMatchObject({ tipo: 'dentro' });
  });
});

describe('US1 #4–#6 / FR-006a — límite de intentos', () => {
  it('US1 #4 — cifras erróneas: CIFRAS_INCORRECTAS y sin acceso', async () => {
    expect(await confirmarCifrasPaciente(e.tokenAna, '0000')).toEqual({
      ok: false,
      codigo: 'CIFRAS_INCORRECTAS',
      mensaje: 'Esas cifras no coinciden con el teléfono de su ficha. Revíselas e inténtelo de nuevo.',
      campo: 'cifras',
    });
    expect((await fallos(e.ana)).fallosSeguidos).toBe(1);
  });

  it('US1 #5 — el 5.º fallo pausa 15 min (el correcto también se rechaza); el 10.º bloquea', async () => {
    for (let i = 0; i < 4; i++) expect(await confirmarCifrasPaciente(e.tokenAna, '0000')).toMatchObject({ codigo: 'CIFRAS_INCORRECTAS' });
    expect(await confirmarCifrasPaciente(e.tokenAna, '0000')).toEqual({
      ok: false,
      codigo: 'ACCESO_EN_PAUSA',
      mensaje: 'Ha hecho demasiados intentos. Podrá volver a intentarlo a las 12:25.',
      detalle: { hasta: '12:25' },
    });
    expect(await pantallaPaciente(e.tokenAna, undefined)).toMatchObject({ tipo: 'pausa', hasta: '12:25' });
    // Dentro de la pausa: el correcto se rechaza sin comprobar y no cuenta.
    fijarAhora('2026-11-09T12:24:59+01:00');
    expect(await confirmarCifrasPaciente(e.tokenAna, '5678')).toMatchObject({ codigo: 'ACCESO_EN_PAUSA' });
    expect((await fallos(e.ana)).fallosSeguidos).toBe(5);

    // Pasada la pausa se puede volver a probar; el 10.º fallo bloquea.
    fijarAhora('2026-11-09T12:25:00+01:00');
    for (let i = 6; i <= 9; i++) expect(await confirmarCifrasPaciente(e.tokenAna, '0000')).toMatchObject({ codigo: 'CIFRAS_INCORRECTAS' });
    expect(await confirmarCifrasPaciente(e.tokenAna, '0000')).toEqual({
      ok: false,
      codigo: 'ENLACE_BLOQUEADO',
      mensaje: 'Este enlace se ha bloqueado por seguridad. Pida uno nuevo a Clínica de Pruebas en el 911 000 222.',
    });
    expect(await confirmarCifrasPaciente(e.tokenAna, '5678')).toMatchObject({ codigo: 'ENLACE_BLOQUEADO' });
    expect(await pantallaPaciente(e.tokenAna, undefined)).toMatchObject({ tipo: 'bloqueado' });
  });

  it('FR-006a — un enlace bloqueado no muestra datos ni con un acceso abierto antes', async () => {
    const cookie = await entrarComoAna();
    await fijarIntentos(e.ana, { fallosSeguidos: 10 });
    expect(await pantallaPaciente(e.tokenAna, cookie)).toMatchObject({ tipo: 'bloqueado' });
  });

  it('US1 #6 — con 3 fallos, las cifras correctas dan acceso y la cuenta vuelve a cero', async () => {
    await fijarIntentos(e.ana, { fallosSeguidos: 3 });
    expect(await confirmarCifrasPaciente(e.tokenAna, '5678')).toMatchObject({ ok: true });
    expect(await fallos(e.ana)).toMatchObject({ fallosSeguidos: 0, pausaHasta: null });
  });

  it('DATOS_NO_VALIDOS con «12a4» o «123» no cuenta como fallo', async () => {
    for (const cifras of ['12a4', '123', '', '12345']) {
      expect(await confirmarCifrasPaciente(e.tokenAna, cifras)).toEqual({
        ok: false,
        codigo: 'DATOS_NO_VALIDOS',
        mensaje: 'Escriba las 4 últimas cifras de su teléfono.',
        campo: 'cifras',
      });
    }
    expect((await fallos(e.ana)).fallosSeguidos).toBe(0);
  });

  it('edge case «Recepción cambia el teléfono»: valen las cifras nuevas, no las antiguas, y el token no cambia', async () => {
    await obtenerBd().update(paciente).set({ telefono: '611 222 333', telefonoNormalizado: '611222333' }).where(eq(paciente.id, e.ana));
    expect(await confirmarCifrasPaciente(e.tokenAna, '5678')).toMatchObject({ codigo: 'CIFRAS_INCORRECTAS' });
    expect(await confirmarCifrasPaciente(e.tokenAna, '2333')).toMatchObject({ ok: true });
    expect((await fallos(e.ana)).token).toBe(e.tokenAna);
  });
});

describe('US1 #7 / FR-006b — el acceso caduca a los 30 minutos sin actividad', () => {
  it('a los 29 minutos sigue dentro; a los 31 se vuelven a pedir las cifras', async () => {
    const cookie = await entrarComoAna();
    fijarAhora('2026-11-09T12:39:00+01:00');
    expect(await pantallaPaciente(e.tokenAna, cookie)).toMatchObject({ tipo: 'dentro' });
    fijarAhora('2026-11-09T12:41:00+01:00');
    expect(await pantallaPaciente(e.tokenAna, cookie)).toEqual({
      tipo: 'cifras',
      clinica: expect.objectContaining({ nombre: 'Clínica de Pruebas' }),
    });
  });
});
