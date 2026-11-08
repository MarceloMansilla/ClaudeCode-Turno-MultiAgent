/** Ayudas de los tests de la spec 003 (recordatorios). */
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleParser, type ParsedMail } from 'mailparser';
import type { ConfiguracionCorreo } from '../../src/correo/configuracion';
import { crearTransporte, type Transporte } from '../../src/correo/transporte';
import { ejecutarRecordatorios } from '../../src/servicios/recordatorios';

export const URL_PUBLICA = 'https://citas.clinicaeleva.es';
export const REMITENTE = 'recordatorios@clinicaeleva.example';

export async function carpetaTemporal(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'citaclara-correo-'));
}

export async function borrarCarpeta(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

export function configSimulado(salidaDir: string): ConfiguracionCorreo {
  return { modo: 'simulado', urlPublica: URL_PUBLICA, remitente: REMITENTE, salidaDir };
}

export function ejecutar(ahora: string, salidaDir: string, transporte?: Transporte) {
  const config = configSimulado(salidaDir);
  return ejecutarRecordatorios({ ahora: new Date(ahora), config, transporte: transporte ?? crearTransporte(config) });
}

export async function ficherosEml(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith('.eml')).sort();
  } catch {
    return [];
  }
}

export async function leerEml(dir: string, nombre: string): Promise<ParsedMail> {
  return simpleParser(await readFile(join(dir, nombre)));
}

/** Transporte que siempre falla (FR-010). */
export const transporteQueFalla: Transporte = {
  modo: 'smtp',
  async enviar() {
    throw new Error('conexión rechazada por el servidor de pruebas');
  },
};
