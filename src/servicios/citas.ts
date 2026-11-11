/**
 * Escritura en la agenda (Principio III). Alta de cita (US2) y cambios de estado (US3).
 *
 * La garantía anti-solape NO depende de este código: la impone la BD con `cita_sin_solape`.
 * Aquí se comprueba antes el conflicto solo para explicarlo a recepción con la cita con la que
 * choca; si dos altas llegan a la vez y ambas pasan esa comprobación, la BD rechaza una
 * (23P01) y se responde HUECO_OCUPADO_A_LA_VEZ.
 */
import { randomUUID } from 'node:crypto';
import { and, asc, eq, gt, inArray, lt } from 'drizzle-orm';
import { enTransaccionConReintento, obtenerBd, type Ejecutor, type Tx } from '@/db/cliente';
import { esReintentable, esViolacion, PG_VIOLACION_EXCLUSION } from '@/db/errores-pg';
import { cita, type EstadoCita, type OrigenCancelacion } from '@/db/esquema';
import {
  ESTADO_DESTINO,
  ESTADOS_QUE_OCUPAN,
  ETIQUETA_ESTADO,
  validarTransicion,
  type AccionCita,
} from '@/dominio/estados';
import { exito, fallo, mensajes, type Fallo, type Resultado } from '@/dominio/errores';
import { comprobarHorario, esMultiploDe15 } from '@/dominio/horario';
import { ahora as reloj } from '@/lib/reloj';
import { esFechaValida, esHoraValida, fechaLocal, horaLocal, instanteLocal } from '@/lib/zona';
import { ETIQUETA_ESPECIALIDAD, obtenerClinica, obtenerProfesional, obtenerServicio } from './catalogo';
import { crearPaciente, obtenerPaciente, type DatosPacienteNuevo } from './pacientes';

export interface EntradaCrearCita {
  profesionalId: string;
  servicioId: string;
  fecha: string; // 'AAAA-MM-DD', día local de la clínica
  hora: string; // 'HH:mm', hora local
  paciente: { id: string } | { nuevo: DatosPacienteNuevo };
}

export interface CitaCreada {
  id: string;
  fecha: string;
  inicio: string;
  fin: string;
  profesionalId: string;
  pacienteId: string;
  pacienteNombre: string;
}

/** Fallo de negocio lanzado dentro de una transacción para deshacerla. */
class Rechazo extends Error {
  constructor(readonly fallo: Fallo) {
    super(fallo.mensaje);
  }
}

/** US2 — FR-009–FR-016c. */
export async function crearCita(
  clinicaId: string,
  entrada: EntradaCrearCita,
): Promise<Resultado<CitaCreada>> {
  // 1. Datos
  if (!esFechaValida(entrada.fecha) || !esHoraValida(entrada.hora)) {
    return fallo('DATOS_NO_VALIDOS', mensajes.datosIncompletos());
  }
  const [clinica, prof, srv] = await Promise.all([
    obtenerClinica(clinicaId),
    obtenerProfesional(clinicaId, entrada.profesionalId),
    obtenerServicio(clinicaId, entrada.servicioId),
  ]);
  if (!clinica || !prof || !srv) return fallo('NO_ENCONTRADO', mensajes.datosNoEncontrados());

  // 2. Servicio compatible (FR-009a)
  if (srv.especialidad !== prof.especialidad) {
    return fallo(
      'SERVICIO_INCOMPATIBLE',
      mensajes.servicioIncompatible(prof.nombre, srv.nombre, ETIQUETA_ESPECIALIDAD[prof.especialidad]),
      { campo: 'servicio' },
    );
  }

  // 3. Granularidad (FR-014)
  if (!esMultiploDe15(entrada.hora)) {
    return fallo('HORA_NO_VALIDA', mensajes.horaNoValida(), { campo: 'hora' });
  }

  // 4. Horario (FR-014)
  const problema = comprobarHorario(entrada.fecha, entrada.hora, srv.duracionMinutos, {
    horaApertura: clinica.horaApertura,
    horaCierre: clinica.horaCierre,
    diasLaborables: clinica.diasLaborables,
  });
  if (problema) {
    const mensaje =
      problema.motivo === 'no_laborable'
        ? mensajes.diaNoLaborable()
        : problema.motivo === 'antes_apertura'
          ? mensajes.antesDeApertura(problema.apertura)
          : mensajes.terminaDespuesDelCierre(problema.fin, problema.cierre);
    return fallo('FUERA_DE_HORARIO', mensaje, { campo: 'hora' });
  }

  // 5. Pasado (RN2, FR-013), comprobado en el momento de registrar
  const zona = clinica.zonaHoraria;
  const inicio = instanteLocal(entrada.fecha, entrada.hora, zona);
  const fin = new Date(inicio.getTime() + srv.duracionMinutos * 60_000);
  if (inicio.getTime() < reloj().getTime()) {
    return fallo('EN_EL_PASADO', mensajes.enElPasado(), { campo: 'hora' });
  }

  // 6–7. Paciente (existente o nuevo) e inserción, todo en una transacción
  try {
    return await enTransaccionConReintento(async (tx) => {
      const pac = await resolverPaciente(clinicaId, entrada.paciente, tx);

      const conflicto = await citaQueChoca(tx, prof.id, inicio, fin);
      if (conflicto) {
        throw new Rechazo(
          fallo(
            'SOLAPE',
            mensajes.solape(prof.nombre, horaLocal(conflicto.inicio, zona), horaLocal(conflicto.fin, zona)),
            {
              campo: 'hora',
              detalle: { inicio: horaLocal(conflicto.inicio, zona), fin: horaLocal(conflicto.fin, zona) },
            },
          ),
        );
      }

      const id = randomUUID();
      try {
        // Punto de guardado: si la BD detecta el solape (carrera), se informa sin perder la tx.
        await tx.transaction(async (sp) => {
          await sp.insert(cita).values({
            id,
            clinicaId,
            profesionalId: prof.id,
            servicioId: srv.id,
            pacienteId: pac.id,
            inicio,
            fin,
            estado: 'reservada',
          });
        });
      } catch (error) {
        if (esViolacion(error, PG_VIOLACION_EXCLUSION)) {
          throw new Rechazo(fallo('HUECO_OCUPADO_A_LA_VEZ', mensajes.huecoOcupadoALaVez(), { campo: 'hora' }));
        }
        throw error;
      }

      return exito<CitaCreada>({
        id,
        fecha: entrada.fecha,
        inicio: entrada.hora,
        fin: horaLocal(fin, zona),
        profesionalId: prof.id,
        pacienteId: pac.id,
        pacienteNombre: pac.nombre,
      });
    }, esReintentable);
  } catch (error) {
    if (error instanceof Rechazo) return error.fallo;
    throw error;
  }
}

export interface EstadoActualizado {
  id: string;
  estado: EstadoCita;
  etiquetaEstado: string;
  profesionalId: string;
  fecha: string;
}

/** US3 — FR-017–FR-020 y FR-018a: completar, cancelar o marcar no asistida una cita reservada. */
export async function cambiarEstadoCita(
  clinicaId: string,
  citaId: string,
  accion: AccionCita,
): Promise<Resultado<EstadoActualizado>> {
  const clinica = await obtenerClinica(clinicaId);
  const actual = await leerCita(clinicaId, citaId);
  if (!clinica || !actual) return fallo('NO_ENCONTRADO', mensajes.citaNoEncontrada());
  const zona = clinica.zonaHoraria;
  const vista = (c: { id: string; estado: EstadoCita; profesionalId: string; inicio: Date }) => ({
    id: c.id,
    estado: c.estado,
    etiquetaEstado: ETIQUETA_ESTADO[c.estado],
    profesionalId: c.profesionalId,
    fecha: fechaLocal(c.inicio, zona),
  });

  const ahora = reloj();
  const problema = validarTransicion(actual, accion, ahora);
  if (problema === 'ESTADO_CAMBIADO') {
    return fallo('ESTADO_CAMBIADO', mensajes.estadoCambiado(ETIQUETA_ESTADO[actual.estado]), { detalle: vista(actual) });
  }
  if (problema === 'CANCELACION_TARDIA') return fallo('CANCELACION_TARDIA', mensajes.cancelacionTardia());
  if (problema === 'TRANSICION_NO_PERMITIDA') return fallo('TRANSICION_NO_PERMITIDA', mensajes.transicionNoPermitida());

  if (accion === 'cancelar') {
    // Vía de recepción: origen `recepcion` (FR-018a; no es una entrada, el cliente no puede
    // elegirlo) y su plazo, hasta la hora de inicio (FR-018).
    const r = await cancelarCita(obtenerBd(), { clinicaId, citaId, origen: 'recepcion', ahora, inicioMinimo: ahora });
    if (r.ok) return exito(vista(r.cita));
    if (r.motivo === 'no_encontrada') return fallo('NO_ENCONTRADO', mensajes.citaNoEncontrada());
    if (r.motivo === 'fuera_de_plazo') return fallo('CANCELACION_TARDIA', mensajes.cancelacionTardia());
    return fallo('ESTADO_CAMBIADO', mensajes.estadoCambiado(ETIQUETA_ESTADO[r.actual.estado]), {
      detalle: vista(r.actual),
    });
  }

  // Actualización condicional: solo prospera si sigue reservada (FR-020).
  const [actualizada] = await obtenerBd()
    .update(cita)
    .set({ estado: ESTADO_DESTINO[accion], estadoCambiadoEn: ahora, canceladaPor: null })
    .where(and(eq(cita.id, citaId), eq(cita.clinicaId, clinicaId), eq(cita.estado, 'reservada')))
    .returning({ id: cita.id, estado: cita.estado, profesionalId: cita.profesionalId, inicio: cita.inicio });
  if (!actualizada) {
    const ahoraMismo = (await leerCita(clinicaId, citaId))!;
    return fallo('ESTADO_CAMBIADO', mensajes.estadoCambiado(ETIQUETA_ESTADO[ahoraMismo.estado]), {
      detalle: vista(ahoraMismo),
    });
  }
  return exito(vista(actualizada));
}

interface CitaLeida {
  id: string;
  estado: EstadoCita;
  profesionalId: string;
  inicio: Date;
}

export type ResultadoCancelacion =
  | { ok: true; cita: CitaLeida }
  | { ok: false; motivo: 'no_encontrada' }
  | { ok: false; motivo: 'estado_cambiado'; actual: CitaLeida }
  | { ok: false; motivo: 'fuera_de_plazo'; actual: CitaLeida };

/**
 * Operación única de cancelación (revisión cruzada S7; spec 005 research R7): la transición
 * «reservada» → «cancelada» la hacen recepción y el paciente con este mismo `UPDATE`
 * condicional, que comprueba estado y plazo en la propia escritura. De dos cancelaciones
 * simultáneas solo una cambia el estado (FR-020, 005 FR-014). Pasar a `cancelada` saca la cita
 * de `cita_sin_solape`: el hueco queda libre al confirmarse (001 FR-006, 005 FR-013).
 *
 * - Recepción: `origen = 'recepcion'`, `inicioMinimo = ahora` (001 FR-018).
 * - Paciente: `origen = 'paciente'`, su `pacienteId` e `inicioMinimo = ahora + 24 h` (005 FR-009).
 */
export async function cancelarCita(
  ejecutor: Ejecutor,
  datos: {
    clinicaId: string;
    citaId: string;
    origen: OrigenCancelacion;
    ahora: Date;
    inicioMinimo: Date;
    pacienteId?: string;
  },
): Promise<ResultadoCancelacion> {
  const deLaFicha = (id: string) =>
    and(
      eq(cita.id, id),
      eq(cita.clinicaId, datos.clinicaId),
      datos.pacienteId ? eq(cita.pacienteId, datos.pacienteId) : undefined,
    );
  const columnas = { id: cita.id, estado: cita.estado, profesionalId: cita.profesionalId, inicio: cita.inicio };

  const [cancelada] = await ejecutor
    .update(cita)
    .set({ estado: 'cancelada', estadoCambiadoEn: datos.ahora, canceladaPor: datos.origen })
    .where(and(deLaFicha(datos.citaId), eq(cita.estado, 'reservada'), gt(cita.inicio, datos.inicioMinimo)))
    .returning(columnas);
  if (cancelada) return { ok: true, cita: cancelada };

  // Nada cambió: se relee para explicar el motivo. «No existe» y «no es de este paciente» no
  // se distinguen (005 FR-006).
  const [actual] = await ejecutor.select(columnas).from(cita).where(deLaFicha(datos.citaId)).limit(1);
  if (!actual) return { ok: false, motivo: 'no_encontrada' };
  if (actual.estado !== 'reservada') return { ok: false, motivo: 'estado_cambiado', actual };
  return { ok: false, motivo: 'fuera_de_plazo', actual };
}

async function leerCita(clinicaId: string, citaId: string) {
  const [fila] = await obtenerBd()
    .select({ id: cita.id, estado: cita.estado, profesionalId: cita.profesionalId, inicio: cita.inicio })
    .from(cita)
    .where(and(eq(cita.id, citaId), eq(cita.clinicaId, clinicaId)))
    .limit(1);
  return fila;
}

async function resolverPaciente(
  clinicaId: string,
  paciente: EntradaCrearCita['paciente'],
  tx: Tx,
): Promise<{ id: string; nombre: string }> {
  if ('id' in paciente) {
    const existente = await obtenerPaciente(clinicaId, paciente.id, tx);
    if (!existente) throw new Rechazo(fallo('NO_ENCONTRADO', mensajes.datosNoEncontrados(), { campo: 'paciente' }));
    return existente;
  }
  const creado = await crearPaciente(clinicaId, paciente.nuevo, tx);
  if (!creado.ok) throw new Rechazo(creado);
  return creado.datos;
}

async function citaQueChoca(tx: Tx, profesionalId: string, inicio: Date, fin: Date) {
  const [fila] = await tx
    .select({ inicio: cita.inicio, fin: cita.fin })
    .from(cita)
    .where(
      and(
        eq(cita.profesionalId, profesionalId),
        inArray(cita.estado, [...ESTADOS_QUE_OCUPAN]),
        lt(cita.inicio, fin),
        gt(cita.fin, inicio),
      ),
    )
    .orderBy(asc(cita.inicio))
    .limit(1);
  return fila;
}
