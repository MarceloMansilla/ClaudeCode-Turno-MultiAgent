/**
 * Enlace personal del paciente (spec 005): creación con cada ficha (FR-001), resolución del
 * token, segundo paso con las 4 cifras (FR-006, FR-006a) y, para recepción, copia y
 * regeneración (FR-004, FR-005).
 */
import { randomBytes } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { enTransaccion, obtenerBd, type Ejecutor } from '@/db/cliente';
import { clinica, enlacePaciente, paciente } from '@/db/esquema';
import {
  registrarIntento,
  rutaEnlacePaciente,
  tieneFormatoDeToken,
  ultimasCuatroCifras,
} from '@/dominio/enlace';
import { exito, fallo, mensajes, type Resultado } from '@/dominio/errores';
import { huella, type AccesoPaciente } from '@/lib/acceso-paciente';
import { ahora as reloj } from '@/lib/reloj';
import { formatearFecha } from '@/lib/formato';
import { fechaLocal, horaLocal } from '@/lib/zona';

/** 32 bytes aleatorios en base64url sin relleno: 43 caracteres (FR-002, research R2). */
export function generarToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Crea el enlace de una ficha recién creada, dentro de la misma transacción que la ficha, de
 * modo que nunca exista una ficha sin enlace (FR-001, research R3).
 */
export async function crearEnlace(ejecutor: Ejecutor, pacienteId: string, ahora: Date): Promise<string> {
  const token = generarToken();
  await ejecutor.insert(enlacePaciente).values({ pacienteId, token, generadoEn: ahora });
  return token;
}

/** Nombre, teléfono y zona de una clínica: lo único que ve quien no ha entrado (FR-007). */
export interface ClinicaPublica {
  id: string;
  nombre: string;
  telefono: string;
  zonaHoraria: string;
}

const columnasClinica = {
  id: clinica.id,
  nombre: clinica.nombre,
  telefono: clinica.telefono,
  zonaHoraria: clinica.zonaHoraria,
};

/**
 * La clínica de la instalación (001 FR-001: una por instalación). Es la que se muestra con un
 * enlace no válido, que no pertenece a ninguna ficha.
 */
export async function clinicaDeLaInstalacion(bd: Ejecutor = obtenerBd()): Promise<ClinicaPublica | undefined> {
  const [fila] = await bd.select(columnasClinica).from(clinica).orderBy(asc(clinica.id)).limit(1);
  return fila;
}

export interface EnlaceResuelto {
  pacienteId: string;
  clinica: ClinicaPublica;
  fallosSeguidos: number;
  pausaHasta: Date | null;
}

/**
 * La ficha a la que da acceso un token vigente, o `null` si el token no es válido (inventado,
 * mal copiado o regenerado: FR-007, sin distinguirlos). Un token sin formato no consulta la BD.
 */
export async function resolverToken(token: string, bd: Ejecutor = obtenerBd()): Promise<EnlaceResuelto | null> {
  if (!tieneFormatoDeToken(token)) return null;
  const [fila] = await bd
    .select({
      pacienteId: enlacePaciente.pacienteId,
      fallosSeguidos: enlacePaciente.fallosSeguidos,
      pausaHasta: enlacePaciente.pausaHasta,
      clinica: columnasClinica,
    })
    .from(enlacePaciente)
    .innerJoin(paciente, eq(paciente.id, enlacePaciente.pacienteId))
    .innerJoin(clinica, eq(clinica.id, paciente.clinicaId))
    .where(eq(enlacePaciente.token, token))
    .limit(1);
  return fila ?? null;
}

/** Respuesta única para cualquier enlace no válido (FR-007). */
export async function falloEnlaceNoValido(bd: Ejecutor = obtenerBd()) {
  const c = await clinicaDeLaInstalacion(bd);
  return fallo('ENLACE_NO_VALIDO', mensajes.enlaceNoValido(c?.nombre ?? 'la clínica', c?.telefono ?? ''));
}

/**
 * Segundo paso del acceso (FR-006, FR-006a, research R4). Si las cifras son correctas devuelve
 * el acceso que la Server Action guarda en la cookie (`abrirAcceso`).
 *
 * Los intentos simultáneos (también desde varios dispositivos) se serializan con un bloqueo de
 * la fila del enlace, de modo que la cuenta de fallos es exacta. Una entrada que no son 4
 * cifras se rechaza sin contar como fallo.
 */
export async function confirmarCifrasPaciente(
  token: string,
  cifras: string,
): Promise<Resultado<{ acceso: AccesoPaciente }>> {
  if (!tieneFormatoDeToken(token)) return falloEnlaceNoValido();
  if (!/^\d{4}$/.test(cifras)) {
    if (!(await resolverToken(token))) return falloEnlaceNoValido();
    return fallo('DATOS_NO_VALIDOS', mensajes.cifrasNoValidas(), { campo: 'cifras' });
  }

  return enTransaccion(async (tx) => {
    const [fila] = await tx
      .select({
        pacienteId: enlacePaciente.pacienteId,
        fallosSeguidos: enlacePaciente.fallosSeguidos,
        pausaHasta: enlacePaciente.pausaHasta,
        telefonoNormalizado: paciente.telefonoNormalizado,
        clinica: columnasClinica,
      })
      .from(enlacePaciente)
      .innerJoin(paciente, eq(paciente.id, enlacePaciente.pacienteId))
      .innerJoin(clinica, eq(clinica.id, paciente.clinicaId))
      .where(eq(enlacePaciente.token, token))
      .for('update', { of: enlacePaciente });
    if (!fila) return falloEnlaceNoValido(tx);

    const ahora = reloj();
    // Se compara con el teléfono que figura AHORA en la ficha (edge case «Recepción cambia el
    // teléfono de la ficha»).
    const acierto = cifras === ultimasCuatroCifras(fila.telefonoNormalizado);
    const tras = registrarIntento(fila, acierto, ahora);
    if (tras.cambia) {
      await tx
        .update(enlacePaciente)
        .set({ fallosSeguidos: tras.fallosSeguidos, pausaHasta: tras.pausaHasta })
        .where(eq(enlacePaciente.pacienteId, fila.pacienteId));
    }

    const { nombre, telefono, zonaHoraria } = fila.clinica;
    switch (tras.resultado) {
      case 'acceso':
        return exito({
          acceso: { pacienteId: fila.pacienteId, clinicaId: fila.clinica.id, huella: huella(token) },
        });
      case 'cifras_incorrectas':
        return fallo('CIFRAS_INCORRECTAS', mensajes.cifrasIncorrectas(), { campo: 'cifras' });
      case 'en_pausa': {
        const hasta = horaLocal(tras.pausaHasta!, zonaHoraria);
        return fallo('ACCESO_EN_PAUSA', mensajes.accesoEnPausa(hasta), { detalle: { hasta } });
      }
      case 'bloqueado':
        return fallo('ENLACE_BLOQUEADO', mensajes.enlaceBloqueado(nombre, telefono));
    }
  });
}

/** Lo que recepción necesita para entregar el enlace (FR-005). */
export interface EnlaceParaRecepcion {
  /** '/p/<token>'; el cliente forma la URL completa con su origen. */
  ruta: string;
  /** «lunes, 09/11/2026 08:00» en la hora de la clínica. */
  generadoEn: string;
  paciente: string;
}

async function enlaceDeLaFicha(bd: Ejecutor, clinicaId: string, pacienteId: string) {
  const [fila] = await bd
    .select({
      token: enlacePaciente.token,
      generadoEn: enlacePaciente.generadoEn,
      paciente: paciente.nombre,
      zonaHoraria: clinica.zonaHoraria,
    })
    .from(enlacePaciente)
    .innerJoin(paciente, eq(paciente.id, enlacePaciente.pacienteId))
    .innerJoin(clinica, eq(clinica.id, paciente.clinicaId))
    .where(and(eq(enlacePaciente.pacienteId, pacienteId), eq(paciente.clinicaId, clinicaId)))
    .limit(1);
  return fila;
}

function paraRecepcion(f: { token: string; generadoEn: Date; paciente: string; zonaHoraria: string }): EnlaceParaRecepcion {
  return {
    ruta: rutaEnlacePaciente(f.token),
    generadoEn: `${formatearFecha(fechaLocal(f.generadoEn, f.zonaHoraria))} ${horaLocal(f.generadoEn, f.zonaHoraria)}`,
    paciente: f.paciente,
  };
}

/** FR-005: el enlace vigente de una ficha de la clínica de la sesión, para copiarlo. */
export async function obtenerEnlace(clinicaId: string, pacienteId: string): Promise<Resultado<EnlaceParaRecepcion>> {
  const fila = await enlaceDeLaFicha(obtenerBd(), clinicaId, pacienteId);
  if (!fila) return fallo('NO_ENCONTRADO', mensajes.datosNoEncontrados());
  return exito(paraRecepcion(fila));
}

/**
 * FR-004: sustituye el token de la ficha en la misma fila. En ese instante el anterior deja de
 * existir (cualquier petición con él es un enlace no válido y todos los accesos abiertos con él
 * terminan, FR-006b) y los contadores vuelven a cero, también si estaba bloqueado (FR-006a).
 * No cambia ninguna cita ni ningún dato de la ficha.
 */
export async function regenerarEnlace(
  clinicaId: string,
  pacienteId: string,
  ahora: Date = reloj(),
): Promise<Resultado<EnlaceParaRecepcion>> {
  return enTransaccion(async (tx) => {
    if (!(await enlaceDeLaFicha(tx, clinicaId, pacienteId))) {
      return fallo('NO_ENCONTRADO', mensajes.datosNoEncontrados());
    }
    await tx
      .update(enlacePaciente)
      .set({ token: generarToken(), generadoEn: ahora, fallosSeguidos: 0, pausaHasta: null })
      .where(eq(enlacePaciente.pacienteId, pacienteId));
    return exito(paraRecepcion((await enlaceDeLaFicha(tx, clinicaId, pacienteId))!));
  });
}
