/**
 * Esquema de datos de CitaClara (specs/001-agenda-core/data-model.md).
 *
 * La restricción anti-solape `cita_sin_solape` (RN1, FR-011, FR-012) y el índice único de
 * teléfono (FR-016b) se crean en la migración SQL propia `0001_restricciones.sql`, porque
 * Drizzle no modela restricciones de exclusión.
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

export type Especialidad = (typeof especialidadEnum.enumValues)[number];
export type EstadoCita = (typeof estadoCitaEnum.enumValues)[number];

export const clinica = pgTable(
  'clinica',
  {
    id: uuid('id').primaryKey(),
    nombre: text('nombre').notNull(),
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
  },
  (t) => [
    index('cita_agenda_idx').on(t.clinicaId, t.profesionalId, t.inicio),
    check('cita_fin_posterior', sql`${t.fin} > ${t.inicio}`),
  ],
);

export type Clinica = typeof clinica.$inferSelect;
export type Profesional = typeof profesional.$inferSelect;
export type Servicio = typeof servicio.$inferSelect;
export type Paciente = typeof paciente.$inferSelect;
export type Cita = typeof cita.$inferSelect;
