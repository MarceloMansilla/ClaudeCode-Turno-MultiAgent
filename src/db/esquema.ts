/**
 * Esquema de datos de CitaClara (specs/001-agenda-core/data-model.md).
 *
 * La restricción anti-solape `cita_sin_solape` (RN1, FR-011, FR-012) y el índice único de
 * teléfono (FR-016b) se crean en la migración SQL propia `0001_restricciones.sql`, porque
 * Drizzle no modela restricciones de exclusión.
 *
 * Enmienda revisión cruzada S2–S5: origen de la cancelación (`cita.cancelada_por`, FR-018a) y
 * teléfono de contacto de la clínica (`clinica.telefono`, FR-022). Sus migraciones
 * (`0002_origen_cancelacion.sql`, `0003_telefono_clinica.sql`) rellenan los datos existentes
 * antes de imponer las restricciones.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const especialidadEnum = pgEnum('especialidad', ['fisioterapia', 'nutricion']);

export const estadoCitaEnum = pgEnum('estado_cita', [
  'reservada',
  'completada',
  'cancelada',
  'no_asistida',
]);

/** FR-018a: exactamente dos valores. El paciente cancela por un único canal (spec 005, FR-013). */
export const origenCancelacionEnum = pgEnum('origen_cancelacion', ['recepcion', 'paciente']);

export type Especialidad = (typeof especialidadEnum.enumValues)[number];
export type EstadoCita = (typeof estadoCitaEnum.enumValues)[number];
export type OrigenCancelacion = (typeof origenCancelacionEnum.enumValues)[number];

export const clinica = pgTable(
  'clinica',
  {
    id: uuid('id').primaryKey(),
    nombre: text('nombre').notNull(),
    /** Teléfono de contacto tal como se muestra (FR-022). */
    telefono: text('telefono').notNull(),
    zonaHoraria: text('zona_horaria').notNull(),
    horaApertura: time('hora_apertura').notNull(),
    horaCierre: time('hora_cierre').notNull(),
    /** Días ISO (1 = lunes … 7 = domingo). */
    diasLaborables: smallint('dias_laborables').array().notNull(),
    claveHash: text('clave_hash').notNull(),
  },
  (t) => [
    check('clinica_nombre_valido', sql`char_length(${t.nombre}) between 1 and 120`),
    check('clinica_horario_valido', sql`${t.horaCierre} > ${t.horaApertura}`),
    // FR-022: mismas reglas que el teléfono del paciente (FR-016c, src/dominio/telefono.ts):
    // 9 cifras que empiezan por 6–9, con o sin +34 / 0034 / 34, ignorando separadores.
    check(
      'clinica_telefono_valido',
      sql`regexp_replace(${t.telefono}, '[[:space:]().-]', '', 'g') ~ '^((\\+|00)?34)?[6-9][0-9]{8}$'`,
    ),
  ],
);

export const profesional = pgTable(
  'profesional',
  {
    id: uuid('id').primaryKey(),
    clinicaId: uuid('clinica_id')
      .notNull()
      .references(() => clinica.id),
    nombre: text('nombre').notNull(),
    especialidad: especialidadEnum('especialidad').notNull(),
    orden: smallint('orden').notNull(),
  },
  (t) => [index('profesional_clinica_orden_idx').on(t.clinicaId, t.orden)],
);

export const servicio = pgTable(
  'servicio',
  {
    id: uuid('id').primaryKey(),
    clinicaId: uuid('clinica_id')
      .notNull()
      .references(() => clinica.id),
    nombre: text('nombre').notNull(),
    especialidad: especialidadEnum('especialidad').notNull(),
    duracionMinutos: integer('duracion_minutos').notNull(),
    precioCentimos: integer('precio_centimos').notNull(),
  },
  (t) => [
    // FR-014: la duración de todo servicio es múltiplo de 15 minutos.
    check(
      'servicio_duracion_valida',
      sql`${t.duracionMinutos} > 0 and ${t.duracionMinutos} % 15 = 0`,
    ),
    check('servicio_precio_valido', sql`${t.precioCentimos} >= 0`),
  ],
);

export const paciente = pgTable(
  'paciente',
  {
    id: uuid('id').primaryKey(),
    clinicaId: uuid('clinica_id')
      .notNull()
      .references(() => clinica.id),
    nombre: text('nombre').notNull(),
    telefono: text('telefono').notNull(),
    telefonoNormalizado: text('telefono_normalizado').notNull(),
    email: text('email'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('paciente_clinica_nombre_idx').on(t.clinicaId, t.nombre),
    // FR-016c: 9 cifras que empiezan por 6, 7, 8 o 9.
    check('paciente_telefono_valido', sql`${t.telefonoNormalizado} ~ '^[6-9][0-9]{8}$'`),
  ],
);

export const cita = pgTable(
  'cita',
  {
    id: uuid('id').primaryKey(),
    clinicaId: uuid('clinica_id')
      .notNull()
      .references(() => clinica.id),
    profesionalId: uuid('profesional_id')
      .notNull()
      .references(() => profesional.id),
    servicioId: uuid('servicio_id')
      .notNull()
      .references(() => servicio.id),
    pacienteId: uuid('paciente_id')
      .notNull()
      .references(() => paciente.id),
    inicio: timestamp('inicio', { withTimezone: true }).notNull(),
    fin: timestamp('fin', { withTimezone: true }).notNull(),
    estado: estadoCitaEnum('estado').notNull().default('reservada'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    estadoCambiadoEn: timestamp('estado_cambiado_en', { withTimezone: true }),
    /** FR-018a: quién canceló; nulo salvo si la cita está cancelada. */
    canceladaPor: origenCancelacionEnum('cancelada_por'),
  },
  (t) => [
    index('cita_agenda_idx').on(t.clinicaId, t.profesionalId, t.inicio),
    check('cita_fin_posterior', sql`${t.fin} > ${t.inicio}`),
    check(
      'cita_origen_cancelacion',
      sql`(${t.estado} = 'cancelada') = (${t.canceladaPor} IS NOT NULL)`,
    ),
  ],
);

/**
 * Enlace personal del paciente (spec 005, data-model.md): exactamente uno vigente por ficha
 * (clave primaria `paciente_id`, FR-001). Regenerarlo sustituye el token en la misma fila, así
 * que un token regenerado deja de existir y es indistinguible de uno inventado (FR-004, FR-007).
 * El token se guarda en claro para que recepción pueda copiarlo (FR-005, research R2).
 * «Bloqueado» es derivado: `fallos_seguidos >= 10` (FR-006a).
 */
export const enlacePaciente = pgTable(
  'enlace_paciente',
  {
    pacienteId: uuid('paciente_id')
      .primaryKey()
      .references(() => paciente.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique('enlace_paciente_token_unico'),
    generadoEn: timestamp('generado_en', { withTimezone: true }).notNull(),
    fallosSeguidos: smallint('fallos_seguidos').notNull().default(0),
    pausaHasta: timestamp('pausa_hasta', { withTimezone: true }),
  },
  (t) => [
    check('enlace_paciente_fallos_validos', sql`${t.fallosSeguidos} >= 0`),
    check('enlace_paciente_token_valido', sql`${t.token} ~ '^[A-Za-z0-9_-]{43}$'`),
  ],
);

export type Clinica = typeof clinica.$inferSelect;
export type Profesional = typeof profesional.$inferSelect;
export type Servicio = typeof servicio.$inferSelect;
export type Paciente = typeof paciente.$inferSelect;
export type Cita = typeof cita.$inferSelect;
export type EnlacePaciente = typeof enlacePaciente.$inferSelect;
