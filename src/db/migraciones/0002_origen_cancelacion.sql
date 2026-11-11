-- Enmienda revisión cruzada S2 de la 001 (FR-018a): origen de la cancelación.
-- Toda cita cancelada registra quién la canceló (`recepcion` | `paciente`); las demás no tienen
-- origen. Antes de esta migración solo existía la cancelación de recepción, así que las
-- canceladas existentes se rellenan con `recepcion` ANTES de imponer la restricción.

CREATE TYPE "public"."origen_cancelacion" AS ENUM('recepcion', 'paciente');--> statement-breakpoint
ALTER TABLE "cita" ADD COLUMN "cancelada_por" "origen_cancelacion";--> statement-breakpoint
UPDATE "cita" SET "cancelada_por" = 'recepcion' WHERE "estado" = 'cancelada';--> statement-breakpoint
ALTER TABLE "cita" ADD CONSTRAINT "cita_origen_cancelacion" CHECK (("cita"."estado" = 'cancelada') = ("cita"."cancelada_por" IS NOT NULL));
