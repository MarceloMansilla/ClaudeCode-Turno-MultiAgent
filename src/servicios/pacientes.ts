/**
 * Fichas de paciente (FR-016, FR-016a, FR-016b, FR-016c).
 */
import { randomUUID } from 'node:crypto';
import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { obtenerBd, type Ejecutor, type Tx } from '@/db/cliente';
import { esViolacion, PG_VIOLACION_UNICIDAD } from '@/db/errores-pg';
import { paciente } from '@/db/esquema';
import { exito, fallo, mensajes, type Resultado } from '@/dominio/errores';
import { cifrasDeBusqueda, normalizarTelefono } from '@/dominio/telefono';

export interface PacienteResumen {
  id: string;
  nombre: string;
  telefono: string;
}

export interface DatosPacienteNuevo {
  nombre: string;
  telefono: string;
  email?: string | null;
}

const MAX_RESULTADOS = 10;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** FR-016: búsqueda por nombre (sin distinguir mayúsculas ni tildes) o por teléfono. */
export async function buscarPacientes(
  clinicaId: string,
  texto: string,
  bd: Ejecutor = obtenerBd(),
): Promise<PacienteResumen[]> {
  const t = texto.trim();
  if (t.length < 2) return [];
  const cifras = cifrasDeBusqueda(t);
  const porNombre = sql`citaclara_sin_tildes(${paciente.nombre}) like '%' || citaclara_sin_tildes(${t}) || '%'`;
  const condicion = cifras ? or(porNombre, like(paciente.telefonoNormalizado, `%${cifras}%`)) : porNombre;
  return bd
    .select({ id: paciente.id, nombre: paciente.nombre, telefono: paciente.telefono })
    .from(paciente)
    .where(and(eq(paciente.clinicaId, clinicaId), condicion))
    .orderBy(asc(paciente.nombre))
    .limit(MAX_RESULTADOS);
}

export async function obtenerPaciente(
  clinicaId: string,
  pacienteId: string,
  bd: Ejecutor = obtenerBd(),
): Promise<PacienteResumen | undefined> {
  const [fila] = await bd
    .select({ id: paciente.id, nombre: paciente.nombre, telefono: paciente.telefono })
    .from(paciente)
    .where(and(eq(paciente.clinicaId, clinicaId), eq(paciente.id, pacienteId)))
    .limit(1);
  return fila;
}

async function buscarPorTelefono(
  clinicaId: string,
  normalizado: string,
  bd: Ejecutor,
): Promise<PacienteResumen | undefined> {
  const [fila] = await bd
    .select({ id: paciente.id, nombre: paciente.nombre, telefono: paciente.telefono })
    .from(paciente)
    .where(and(eq(paciente.clinicaId, clinicaId), eq(paciente.telefonoNormalizado, normalizado)))
    .limit(1);
  return fila;
}

/** Valida los datos de una ficha nueva sin tocar la BD. */
export function validarPacienteNuevo(
  datos: DatosPacienteNuevo,
): Resultado<{ nombre: string; telefono: string; telefonoNormalizado: string; email: string | null }> {
  const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
  if (nombre.length < 2 || nombre.length > 120) {
    return fallo('DATOS_NO_VALIDOS', mensajes.nombreNoValido(), { campo: 'nombre' });
  }
  const telefonoNormalizado = normalizarTelefono(datos.telefono);
  if (!telefonoNormalizado) {
    return fallo('DATOS_NO_VALIDOS', mensajes.telefonoNoValido(), { campo: 'telefono' });
  }
  const email = datos.email?.trim() || null;
  if (email && !RE_EMAIL.test(email)) {
    return fallo('DATOS_NO_VALIDOS', mensajes.emailNoValido(), { campo: 'email' });
  }
  return exito({ nombre, telefono: datos.telefono.trim(), telefonoNormalizado, email });
}

/**
 * FR-016a/b: crea la ficha dentro de la transacción `tx`. Si el teléfono ya existe (también si
 * otra alta simultánea acaba de registrarlo) devuelve TELEFONO_DUPLICADO con la ficha existente.
 */
export async function crearPaciente(
  clinicaId: string,
  datos: DatosPacienteNuevo,
  tx: Tx,
): Promise<Resultado<PacienteResumen>> {
  const validado = validarPacienteNuevo(datos);
  if (!validado.ok) return validado;
  const v = validado.datos;

  const duplicado = (existente: PacienteResumen) =>
    fallo('TELEFONO_DUPLICADO', mensajes.telefonoDuplicado(existente.nombre), {
      campo: 'telefono',
      detalle: { pacienteId: existente.id, nombre: existente.nombre, telefono: existente.telefono },
    });

  const previo = await buscarPorTelefono(clinicaId, v.telefonoNormalizado, tx);
  if (previo) return duplicado(previo);

  const id = randomUUID();
  try {
    // Punto de guardado: si el índice único salta, la transacción exterior sigue utilizable.
    await tx.transaction(async (sp) => {
      await sp.insert(paciente).values({
        id,
        clinicaId,
        nombre: v.nombre,
        telefono: v.telefono,
        telefonoNormalizado: v.telefonoNormalizado,
        email: v.email,
      });
    });
  } catch (error) {
    if (esViolacion(error, PG_VIOLACION_UNICIDAD)) {
      const existente = await buscarPorTelefono(clinicaId, v.telefonoNormalizado, tx);
      if (existente) return duplicado(existente);
      return fallo('TELEFONO_DUPLICADO', mensajes.telefonoDuplicado('otro paciente'), { campo: 'telefono' });
    }
    throw error;
  }
  return exito({ id, nombre: v.nombre, telefono: v.telefono });
}
