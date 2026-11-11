-- Restricciones que Drizzle no modela (specs/001-agenda-core/data-model.md).

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint

-- RN1, FR-011, FR-012 (Principio III, NO NEGOCIABLE): un profesional no puede tener dos citas
-- reservadas o completadas cuyos intervalos semiabiertos [inicio, fin) se solapen. La garantía
-- es atómica: de dos inserciones simultáneas que se solapan, solo una puede confirmarse.
ALTER TABLE "cita" ADD CONSTRAINT "cita_sin_solape"
  EXCLUDE USING gist (
    "profesional_id" WITH =,
    tstzrange("inicio", "fin", '[)') WITH &&
  ) WHERE ("estado" IN ('reservada', 'completada'));
--> statement-breakpoint

-- FR-016b: el teléfono es único dentro de cada clínica (comparado ya normalizado).
CREATE UNIQUE INDEX "paciente_telefono_unico" ON "paciente" ("clinica_id", "telefono_normalizado");
--> statement-breakpoint

-- Búsqueda de pacientes sin distinguir mayúsculas ni tildes (FR-016). unaccent() no es
-- IMMUTABLE, así que se envuelve para poder indexarla.
CREATE OR REPLACE FUNCTION citaclara_sin_tildes(texto text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, texto)) $$;
