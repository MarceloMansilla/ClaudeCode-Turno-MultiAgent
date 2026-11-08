/**
 * Carga la semilla en la BD en una sola transacción, respetando todas las restricciones
 * (si el generador produjese un solape, `cita_sin_solape` haría fallar la carga).
 */
import { hash } from '@node-rs/argon2';
import { sql } from 'drizzle-orm';
import type { Bd } from '@/db/cliente';
import { cita, clinica, enlacePaciente, paciente, profesional, servicio } from '@/db/esquema';
import { generarSemilla, resumirSemilla, type ResumenSemilla } from './generar';

const LOTE = 500;

export async function cargarSemilla(
  bd: Bd,
  fechaReferencia: string,
  clave: string,
): Promise<ResumenSemilla> {
  const datos = generarSemilla(fechaReferencia, await hash(clave));
  await bd.transaction(async (tx) => {
    await tx.execute(
      sql`TRUNCATE TABLE cita, paciente, servicio, profesional, clinica RESTART IDENTITY CASCADE`,
    );
    await tx.insert(clinica).values(datos.clinica);
    await tx.insert(profesional).values(datos.profesionales);
    await tx.insert(servicio).values(datos.servicios);
    await tx.insert(paciente).values(datos.pacientes);
    for (let i = 0; i < datos.citas.length; i += LOTE) {
      await tx.insert(cita).values(datos.citas.slice(i, i + LOTE));
    }
    await tx.insert(enlacePaciente).values(datos.enlaces); // spec 005, FR-019
  });
  return resumirSemilla(datos, fechaReferencia);
}

export function imprimirResumen(r: ResumenSemilla): string {
  const lineas = [
    `Semilla de Clínica Eleva — fecha de referencia ${r.fechaReferencia}`,
    `Historia: ${r.primerDiaHistoria} … día anterior a la referencia · Futuro: hasta ${r.ultimoDiaFuturo}`,
    `Pacientes: ${r.pacientes} · Citas: ${r.totalCitas}`,
    `Historia: ${r.historia.total} citas → ${r.historia.completada} completadas, ` +
      `${r.historia.cancelada} canceladas (${r.porcentajeCancelada.toLocaleString('es-ES')} %), ` +
      `${r.historia.no_asistida} no asistidas (${r.porcentajeNoAsistida.toLocaleString('es-ES')} %)`,
    `Futuro: ${r.futuro.reservada} citas reservadas`,
    'Por profesional (reservada / completada / cancelada / no asistida):',
    ...Object.entries(r.porProfesional).map(
      ([nombre, e]) =>
        `  ${nombre}: ${e.reservada} / ${e.completada} / ${e.cancelada} / ${e.no_asistida}`,
    ),
  ];
  return lineas.join('\n');
}
