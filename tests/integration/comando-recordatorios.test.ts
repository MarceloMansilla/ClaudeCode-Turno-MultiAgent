import { spawn } from 'node:child_process';
import { and, asc, eq, gte } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerBd } from '@/db/cliente';
import { cita, clinica, ejecucionRecordatorios, paciente, recordatorio } from '@/db/esquema';
import { cargarSemilla } from '@/semilla/cargar';
import { borrarCarpeta, carpetaTemporal, ficherosEml, REMITENTE, URL_PUBLICA } from '../helpers/recordatorios';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const LUNES_0800 = '2026-11-09T08:00:00+01:00';

function lanzar(env: Record<string, string | undefined>): Promise<{ codigo: number; salida: string; error: string }> {
  return new Promise((resolver, rechazar) => {
    const entorno: NodeJS.ProcessEnv = {
      NODE_ENV: 'test',
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      DATABASE_URL: process.env.DATABASE_URL,
      ...env,
    };
    const hijo = spawn(process.execPath, ['--import', 'tsx', 'scripts/recordatorios.ts'], {
      cwd: RAIZ,
      env: entorno,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let salida = '';
    let error = '';
    hijo.stdout.on('data', (d: Buffer) => (salida += d.toString()));
    hijo.stderr.on('data', (d: Buffer) => (error += d.toString()));
    hijo.on('error', rechazar);
    hijo.on('close', (codigo: number | null) => resolver({ codigo: codigo ?? -1, salida, error }));
  });
}

let dir: string;
beforeEach(async () => {
  dir = await carpetaTemporal();
  await cargarSemilla(obtenerBd(), '2026-11-09', 'eleva-demo');
});
afterEach(async () => {
  await borrarCarpeta(dir);
});

const base = () => ({ CITACLARA_AHORA: LUNES_0800, URL_PUBLICA, CORREO_REMITENTE: REMITENTE, SALIDA_CORREO_DIR: dir });

describe('FR-001 / FR-005 / FR-010 comando pnpm recordatorios (contracts/comando-recordatorios.md)', () => {
  it('FR-001 configuración inválida (sin URL_PUBLICA) → código 1, mensaje que nombra la variable, nada enviado', async () => {
    const r = await lanzar({ ...base(), URL_PUBLICA: undefined });
    expect(r.codigo).toBe(1);
    expect(r.error).toContain('URL_PUBLICA');
    expect(await ficherosEml(dir)).toHaveLength(0);
    expect(await obtenerBd().select().from(ejecucionRecordatorios)).toHaveLength(0);
  });

  it('FR-001 / FR-005 modo simulado → código 0 y resumen en español sin datos de pacientes', async () => {
    const r = await lanzar(base());
    expect(r.error).toBe('');
    expect(r.codigo).toBe(0);
    const lineas = r.salida.trimEnd().split('\n');
    expect(lineas[0]).toBe('Recordatorios de Clínica Eleva — ejecución del lunes, 09/11/2026 a las 08:00');
    expect(lineas[1]).toBe(`Citas del martes, 10/11/2026 · modo simulado (${dir})`);
    expect(lineas.at(-1)).toBe('Enviados: 20 · Ya enviados antes: 0 · Sin correo: 6 · Correo no válido: 0 · Fallidos: 0');
    const citas = lineas.filter((l) => /^ {2}\d{2}:\d{2} {2}/.test(l));
    expect(citas).toHaveLength(26);
    for (const l of citas) expect(l).toMatch(/ {2}(enviado|sin correo)$/);
    const pacientes = await obtenerBd().select({ nombre: paciente.nombre, email: paciente.email }).from(paciente);
    for (const p of pacientes) {
      expect(r.salida).not.toContain(p.nombre);
      if (p.email) expect(r.salida).not.toContain(p.email);
    }
    expect(await ficherosEml(dir)).toHaveLength(20);
  });

  it('FR-010 SMTP inalcanzable → código 2 y fallidos en el resumen', async () => {
    const r = await lanzar({ ...base(), SMTP_URL: 'smtp://127.0.0.1:1' });
    expect(r.codigo).toBe(2);
    expect(r.salida).toMatch(/Fallidos: 20$/m);
    expect(await ficherosEml(dir)).toHaveLength(0);
  }, 120_000);

  it('FR-005 / FR-010 un envío interrumpido sale como «fallido (interrumpido)» y da código 2', async () => {
    const [cli] = await obtenerBd().select().from(clinica);
    const [primera] = await obtenerBd()
      .select()
      .from(cita)
      .where(and(eq(cita.estado, 'reservada'), gte(cita.inicio, new Date('2026-11-09T23:00:00Z'))))
      .orderBy(asc(cita.inicio))
      .limit(1);
    const hace15 = new Date(new Date(LUNES_0800).getTime() - 15 * 60_000);
    await obtenerBd().insert(recordatorio).values({
      id: crypto.randomUUID(),
      clinicaId: cli!.id,
      citaId: primera!.id,
      destinatario: 'x@example.com',
      modo: 'smtp',
      estado: 'enviando',
      generadoEn: hace15,
      ultimoIntentoEn: hace15,
    });
    const r = await lanzar(base());
    expect(r.codigo).toBe(2);
    expect(r.salida).toMatch(/fallido \(interrumpido\)$/m);
    expect(r.salida).toMatch(/Fallidos: 1$/m);
  });
});
