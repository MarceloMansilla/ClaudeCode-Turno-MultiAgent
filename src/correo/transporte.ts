/**
 * Envío del recordatorio (spec 003, FR-009, FR-010; research R3). El mismo mensaje sale por
 * SMTP o, sin `SMTP_URL`, se escribe tal cual como `.eml` (modo simulado): nada sale al exterior.
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import nodemailer from 'nodemailer';
import type { ModoCorreo } from '@/db/esquema';
import { fechaLocal, horaLocal } from '@/lib/zona';
import type { ConfiguracionCorreo } from './configuracion';
import type { CorreoRecordatorio } from './componer-recordatorio';

export interface MensajeRecordatorio {
  citaId: string;
  inicio: Date;
  zona: string;
  clinicaNombre: string;
  destinatario: string;
  fecha: Date;
  correo: CorreoRecordatorio;
}

export interface ResultadoEnvio {
  /** Ruta relativa del `.eml` (modo simulado). */
  fichero?: string;
}

/** Interfaz inyectable: los tests pueden pasar un transporte que falla. */
export interface Transporte {
  modo: ModoCorreo;
  enviar(mensaje: MensajeRecordatorio): Promise<ResultadoEnvio>;
}

const TIEMPO_MAXIMO_MS = 30_000;

/** `AAAA-MM-DD_HHmm_<citaId>.eml` con la fecha y hora local de la cita. */
export function nombreFicheroEml(citaId: string, inicio: Date, zona: string): string {
  return `${fechaLocal(inicio, zona)}_${horaLocal(inicio, zona).replace(':', '')}_${citaId}.eml`;
}

function opcionesMensaje(config: ConfiguracionCorreo, m: MensajeRecordatorio) {
  const dominio = new URL(config.urlPublica).hostname;
  return {
    from: { name: m.clinicaNombre, address: config.remitente },
    to: m.destinatario,
    subject: m.correo.asunto,
    text: m.correo.texto,
    html: m.correo.html,
    messageId: `<recordatorio-${m.citaId}@${dominio}>`,
    date: m.fecha,
  };
}

export function crearTransporte(config: ConfiguracionCorreo): Transporte {
  if (config.modo === 'smtp' && config.smtpUrl) {
    // Nodemailer lee las opciones de la cadena de conexión (`?connectionTimeout=…`).
    const url = new URL(config.smtpUrl);
    for (const opcion of ['connectionTimeout', 'greetingTimeout', 'socketTimeout']) {
      if (!url.searchParams.has(opcion)) url.searchParams.set(opcion, String(TIEMPO_MAXIMO_MS));
    }
    const smtp = nodemailer.createTransport(url.toString());
    return {
      modo: 'smtp',
      async enviar(m) {
        await smtp.sendMail(opcionesMensaje(config, m));
        return {};
      },
    };
  }

  const simulado = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
  return {
    modo: 'simulado',
    async enviar(m) {
      const info = await simulado.sendMail(opcionesMensaje(config, m));
      const nombre = nombreFicheroEml(m.citaId, m.inicio, m.zona);
      await mkdir(config.salidaDir, { recursive: true });
      const destino = join(config.salidaDir, nombre);
      const temporal = `${destino}.${process.pid}.tmp`;
      // Escritura atómica: temporal + renombrado (sobrescribe el de esa cita, si existía).
      await writeFile(temporal, info.message as Buffer);
      await rename(temporal, destino);
      return { fichero: posix.join(config.salidaDir.replace(/\\/g, '/'), nombre) };
    },
  };
}
