/**
 * Códigos de error y mensajes visibles (contracts/server-actions.md, FR-015, Principio VII):
 * en español de España, sin jerga técnica y diciendo qué ha pasado y qué hacer.
 */
export type CodigoError =
  | 'CLAVE_INCORRECTA'
  | 'SESION_CADUCADA'
  | 'SOLAPE'
  | 'HUECO_OCUPADO_A_LA_VEZ'
  | 'EN_EL_PASADO'
  | 'FUERA_DE_HORARIO'
  | 'HORA_NO_VALIDA'
  | 'SERVICIO_INCOMPATIBLE'
  | 'TELEFONO_DUPLICADO'
  | 'DATOS_NO_VALIDOS'
  | 'CANCELACION_TARDIA'
  | 'TRANSICION_NO_PERMITIDA'
  | 'ESTADO_CAMBIADO'
  | 'NO_ENCONTRADO';

export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: CodigoError; mensaje: string; detalle?: unknown; campo?: string };

export type Fallo = Extract<Resultado<never>, { ok: false }>;

export function exito<T>(datos: T): Resultado<T> {
  return { ok: true, datos };
}

export function fallo(
  codigo: CodigoError,
  mensaje: string,
  extra: { detalle?: unknown; campo?: string } = {},
): Fallo {
  return { ok: false, codigo, mensaje, ...extra };
}

/** Mensajes del contrato. Las horas llegan ya formateadas ('HH:mm'). */
export const mensajes = {
  claveIncorrecta: () => 'La clave no es correcta. Revísala e inténtalo de nuevo.',
  sesionCaducada: () => 'Tu sesión ha terminado. Vuelve a introducir la clave de la clínica.',
  solape: (profesional: string, desde: string, hasta: string) =>
    `${profesional} ya tiene una cita de ${desde} a ${hasta}. Elige otro hueco.`,
  huecoOcupadoALaVez: () => 'Este hueco se acaba de ocupar desde otro puesto. Elige otro hueco.',
  enElPasado: () => 'No se pueden crear citas en el pasado.',
  terminaDespuesDelCierre: (fin: string, cierre: string) =>
    `La cita terminaría a las ${fin}, después del cierre (${cierre}). Elige una hora anterior.`,
  antesDeApertura: (apertura: string) =>
    `La clínica abre a las ${apertura}. Elige una hora a partir de esa.`,
  diaNoLaborable: () => 'La clínica no abre este día. Elige un día de lunes a viernes.',
  horaNoValida: () => 'Las citas empiezan en punto, y cuarto, y media o menos cuarto.',
  servicioIncompatible: (profesional: string, servicio: string, especialidad: string) =>
    `${profesional} no atiende «${servicio}». Elige un servicio de ${especialidad}.`,
  telefonoDuplicado: (nombre: string) => `Ya hay un paciente con este teléfono: ${nombre}.`,
  telefonoNoValido: () => 'Revisa el teléfono: debe ser un número español de 9 cifras.',
  nombreNoValido: () => 'Escribe el nombre del paciente.',
  emailNoValido: () => 'Revisa el correo electrónico: no parece válido.',
  cancelacionTardia: () => 'Esta cita ya ha empezado. Márcala como completada o no asistida.',
  transicionNoPermitida: () => 'Esta cita todavía no ha empezado.',
  estadoCambiado: (estado: string) =>
    `Esta cita ya figura como ${estado.toLowerCase()}. Hemos actualizado la agenda.`,
  citaNoEncontrada: () => 'No encontramos esa cita. Actualiza la agenda e inténtalo de nuevo.',
  datosNoEncontrados: () =>
    'No encontramos el profesional, el servicio o el paciente elegidos. Actualiza la página.',
  datosIncompletos: () => 'Faltan datos de la cita. Revisa el formulario.',
} as const;
