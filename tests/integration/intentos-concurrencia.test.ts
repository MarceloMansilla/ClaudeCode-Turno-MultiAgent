/**
 * Spec 005, FR-006a — edge case «Fallos desde varios dispositivos»: los fallos cuentan para el
 * mismo enlace y la cuenta es exacta aunque los intentos lleguen a la vez (research R4).
 */
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { enlacePaciente } from '@/db/esquema';
import { fijarAhora } from '@/lib/reloj';
import { confirmarCifrasPaciente } from '@/servicios/enlaces';
import { vaciarTablas } from '../helpers/bd';
import { crearEscenario, fijarIntentos, type Escenario } from '../helpers/fabrica';

let e: Escenario;

beforeEach(async () => {
  await vaciarTablas();
  e = await crearEscenario();
  fijarAhora('2026-11-09T12:10:00+01:00');
});
afterEach(() => fijarAhora(undefined));

const fallosDeAna = async () =>
  (await obtenerBd().select().from(enlacePaciente).where(eq(enlacePaciente.pacienteId, e.ana)))[0]!.fallosSeguidos;

const rafaga = async (n: number, cifras: string) => {
  const r = await Promise.all(Array.from({ length: n }, () => confirmarCifrasPaciente(e.tokenAna, cifras)));
  const cuenta: Record<string, number> = {};
  for (const x of r) {
    const clave = x.ok ? 'ok' : x.codigo;
    cuenta[clave] = (cuenta[clave] ?? 0) + 1;
  }
  return cuenta;
};

describe('FR-006a — intentos simultáneos sobre el mismo enlace', () => {
  it('20 fallos simultáneos: exactamente 5 cuentan (4 incorrectas + 1 que pausa) y el resto se rechaza en pausa', async () => {
    expect(await rafaga(20, '0000')).toEqual({ CIFRAS_INCORRECTAS: 4, ACCESO_EN_PAUSA: 16 });
    expect(await fallosDeAna()).toBe(5);
  });

  it('pasada la pausa, otros 20 simultáneos llegan exactamente a 10 y bloquean el enlace', async () => {
    await rafaga(20, '0000');
    fijarAhora('2026-11-09T12:25:00+01:00');
    expect(await rafaga(20, '0000')).toEqual({ CIFRAS_INCORRECTAS: 4, ENLACE_BLOQUEADO: 16 });
    expect(await fallosDeAna()).toBe(10);
  });

  it('10 aciertos simultáneos con 3 fallos previos: todos entran y la cuenta queda a 0', async () => {
    await fijarIntentos(e.ana, { fallosSeguidos: 3 });
    expect(await rafaga(10, '5678')).toEqual({ ok: 10 });
    expect(await fallosDeAna()).toBe(0);
  });
});
