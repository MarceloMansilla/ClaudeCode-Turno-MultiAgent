/**
 * Proceso diario de recordatorios (spec 003, FR-001–FR-006, FR-009, FR-010, FR-017, FR-019–FR-022;
 * research R1, R2 y R8; data-model.md).
 *
 * Solo lee la agenda: no escribe en `cita` (FR-021). Escribe únicamente `recordatorio` y
 * `ejecucion_recordatorios`. El enlace y el enunciado de la política son los de la 005.
 */
import { randomUUID } from 'node:crypto';
import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
import { obtenerBd } from '@/db/cliente';
import {
  cita,
  clinica,
  ejecucionRecordatorios,
  enlacePaciente,
  paciente,
  profesional,
  recordatorio,
  servicio,
  type ModoCorreo,
} from '@/db/esquema';
import { componerRecordatorio } from '@/correo/componer-recordatorio';
import type { ConfiguracionCorreo } from '@/correo/configuracion';
import type { Transporte } from '@/correo/transporte';
import { rutaEnlacePaciente } from '@/dominio/enlace';
import { enunciadoPoliticaCancelacion } from '@/dominio/politica-cancelacion';
import {
  clasificarCita,
  DETALLE_INTERRUMPIDO,
  totalizar,
  type ResultadoCita,
  type ResumenEjecucion,
} from '@/dominio/resultado-recordatorio';
import { calcularVentana } from '@/dominio/ventana-recordatorio';
import { formatearFecha } from '@/lib/formato';
import { fechaLocal, horaLocal } from '@/lib/zona';

export interface EjecucionHecha {
  id: string;
  clinicaNombre: string;
  zona: string;
  iniciadaEn: Date;
  fechaObjetivo: string;
  ventanaDesde: Date;
  ventanaHasta: Date;
  modo: ModoCorreo;
  salidaDir?: string;
  resumen: ResumenEjecucion;
}

/** Intenta quedarse con el envío de una cita (R2): solo quien obtiene la fila envía. */
async function reclamar(
  datos: { clinicaId: string; citaId: string; destinatario: string; modo: ModoCorreo },
  ahora: Date,
): Promise<boolean> {
  const bd = obtenerBd();
  const nuevo = await bd
    .insert(recordatorio)
    .values({
      id: randomUUID(),
      clinicaId: datos.clinicaId,
      citaId: datos.citaId,
      destinatario: datos.destinatario,
      modo: datos.modo,
      estado: 'enviando',
      intentos: 1,
      generadoEn: ahora,
      ultimoIntentoEn: ahora,
    })
    .onConflictDoNothing({ target: recordatorio.citaId })
    .returning({ id: recordatorio.id });
  if (nuevo.length > 0) return true;

  // FR-010: un envío fallido se reintenta; uno enviado o en curso, nunca.
  const reintento = await bd
    .update(recordatorio)
    .set({
      estado: 'enviando',
      intentos: sql`${recordatorio.intentos} + 1`,
      ultimoIntentoEn: ahora,
      destinatario: datos.destinatario,
      modo: datos.modo,
      ultimoError: null,
    })
    .where(and(eq(recordatorio.citaId, datos.citaId), eq(recordatorio.estado, 'fallido')))
    .returning({ id: recordatorio.id });
  return reintento.length > 0;
}

function mensajeDeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

export async function ejecutarRecordatorios({
  ahora,
  config,
  transporte,
}: {
  ahora: Date;
  config: ConfiguracionCorreo;
  transporte: Transporte;
}): Promise<EjecucionHecha> {
  const bd = obtenerBd();
  const arranque = Date.now();
  const [laClinica] = await bd.select().from(clinica).limit(1);
  if (!laClinica) throw new Error('No hay ninguna clínica en la base de datos (¿falta pnpm seed?).');
  const zona = laClinica.zonaHoraria;
  const ventana = calcularVentana(ahora, zona);

  const filas = await bd
    .select({
      citaId: cita.id,
      inicio: cita.inicio,
      fin: cita.fin,
      pacienteNombre: paciente.nombre,
      email: paciente.email,
      token: enlacePaciente.token,
      profesional: profesional.nombre,
      servicio: servicio.nombre,
      recEstado: recordatorio.estado,
      recUltimoIntento: recordatorio.ultimoIntentoEn,
    })
    .from(cita)
    .innerJoin(paciente, eq(paciente.id, cita.pacienteId))
    .innerJoin(profesional, eq(profesional.id, cita.profesionalId))
    .innerJoin(servicio, eq(servicio.id, cita.servicioId))
    .leftJoin(enlacePaciente, eq(enlacePaciente.pacienteId, cita.pacienteId))
    .leftJoin(recordatorio, eq(recordatorio.citaId, cita.id))
    .where(
      and(
        eq(cita.clinicaId, laClinica.id),
        eq(cita.estado, 'reservada'),
        gte(cita.inicio, ventana.desde),
        lt(cita.inicio, ventana.hasta),
      ),
    )
    .orderBy(asc(cita.inicio), asc(profesional.orden));

  const citas: ResultadoCita[] = [];
  for (const f of filas) {
    const base = { citaId: f.citaId, hora: horaLocal(f.inicio, zona), profesional: f.profesional };
    const clase = clasificarCita({
      email: f.email,
      recordatorio: f.recEstado && f.recUltimoIntento ? { estado: f.recEstado, ultimoIntentoEn: f.recUltimoIntento } : null,
      ahora,
    });

    if (clase.tipo === 'sin_correo' || clase.tipo === 'correo_no_valido' || clase.tipo === 'ya_enviado_antes') {
      citas.push({ ...base, resultado: clase.tipo });
      continue;
    }
    if (clase.tipo === 'interrumpido') {
      citas.push({ ...base, resultado: 'fallido', interrumpido: true, detalle: DETALLE_INTERRUMPIDO });
      continue;
    }
    if (!f.token) {
      // La 005 garantiza un enlace por ficha (005 FR-001); sin él no hay correo que componer.
      citas.push({ ...base, resultado: 'fallido', detalle: 'la ficha no tiene enlace personal (005, FR-001)' });
      continue;
    }

    const destinatario = f.email!.trim();
    const ganada = await reclamar(
      { clinicaId: laClinica.id, citaId: f.citaId, destinatario, modo: transporte.modo },
      ahora,
    );
    if (!ganada) {
      citas.push({ ...base, resultado: 'ya_enviado_antes' });
      continue;
    }

    try {
      const correo = componerRecordatorio({
        clinica: { nombre: laClinica.nombre },
        paciente: { nombre: f.pacienteNombre },
        profesional: { nombre: f.profesional },
        servicio: { nombre: f.servicio },
        inicio: f.inicio,
        fin: f.fin,
        zona,
        enlacePersonal: `${config.urlPublica}${rutaEnlacePaciente(f.token)}`,
        enunciado: enunciadoPoliticaCancelacion({
          inicio: f.inicio,
          zonaHoraria: zona,
          clinicaNombre: laClinica.nombre,
          clinicaTelefono: laClinica.telefono,
        }),
      });
      const envio = await transporte.enviar({
        citaId: f.citaId,
        inicio: f.inicio,
        zona,
        clinicaNombre: laClinica.nombre,
        destinatario,
        fecha: ahora,
        correo,
      });
      await bd
        .update(recordatorio)
        .set({ estado: 'enviado', enviadoEn: ahora, fichero: envio.fichero ?? null, ultimoError: null })
        .where(eq(recordatorio.citaId, f.citaId));
      citas.push({ ...base, resultado: 'enviado' });
    } catch (error) {
      const detalle = mensajeDeError(error);
      await bd
        .update(recordatorio)
        .set({ estado: 'fallido', ultimoError: detalle })
        .where(eq(recordatorio.citaId, f.citaId));
      citas.push({ ...base, resultado: 'fallido', detalle });
    }
  }

  const resumen: ResumenEjecucion = { totales: totalizar(citas), citas };
  const id = randomUUID();
  await bd.insert(ejecucionRecordatorios).values({
    id,
    clinicaId: laClinica.id,
    iniciadaEn: ahora,
    terminadaEn: new Date(ahora.getTime() + (Date.now() - arranque)),
    fechaObjetivo: ventana.fechaObjetivo,
    ventanaDesde: ventana.desde,
    ventanaHasta: ventana.hasta,
    modo: transporte.modo,
    resumen,
  });

  return {
    id,
    clinicaNombre: laClinica.nombre,
    zona,
    iniciadaEn: ahora,
    fechaObjetivo: ventana.fechaObjetivo,
    ventanaDesde: ventana.desde,
    ventanaHasta: ventana.hasta,
    modo: transporte.modo,
    ...(transporte.modo === 'simulado' ? { salidaDir: config.salidaDir } : {}),
    resumen,
  };
}

/** Salida del comando (contracts/comando-recordatorios.md). Sin nombres ni correos de pacientes. */
export function textoEjecucion(e: EjecucionHecha, textoResultado: (c: ResultadoCita) => string): string {
  const ancho = Math.max(0, ...e.resumen.citas.map((c) => c.profesional.length));
  const modo = e.modo === 'simulado' ? `modo simulado (${e.salidaDir})` : 'modo SMTP';
  const t = e.resumen.totales;
  return [
    `Recordatorios de ${e.clinicaNombre} — ejecución del ${formatearFecha(fechaLocal(e.iniciadaEn, e.zona))} a las ${horaLocal(e.iniciadaEn, e.zona)}`,
    `Citas del ${formatearFecha(e.fechaObjetivo)} · ${modo}`,
    '',
    ...(e.resumen.citas.length === 0
      ? ['  (ninguna cita reservada)']
      : e.resumen.citas.map((c) => `  ${c.hora}  ${c.profesional.padEnd(ancho)}  ${textoResultado(c)}`)),
    '',
    `Enviados: ${t.enviado} · Ya enviados antes: ${t.yaEnviadoAntes} · Sin correo: ${t.sinCorreo} · ` +
      `Correo no válido: ${t.correoNoValido} · Fallidos: ${t.fallido}`,
  ].join('\n');
}
