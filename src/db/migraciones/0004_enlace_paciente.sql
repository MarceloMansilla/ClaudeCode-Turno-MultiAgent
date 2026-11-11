-- Spec 005 (acceso y cancelación del paciente): enlace personal de cada ficha (data-model.md).
-- Una fila por ficha (FR-001); el token son 32 bytes aleatorios en base64url sin relleno
-- (43 caracteres, FR-002, research R2). Al final se crea el enlace de las fichas que ya existen.

CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TABLE "enlace_paciente" (
	"paciente_id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"generado_en" timestamp with time zone NOT NULL,
	"fallos_seguidos" smallint DEFAULT 0 NOT NULL,
	"pausa_hasta" timestamp with time zone,
	CONSTRAINT "enlace_paciente_token_unico" UNIQUE("token"),
	CONSTRAINT "enlace_paciente_fallos_validos" CHECK ("enlace_paciente"."fallos_seguidos" >= 0),
	CONSTRAINT "enlace_paciente_token_valido" CHECK ("enlace_paciente"."token" ~ '^[A-Za-z0-9_-]{43}$')
);
--> statement-breakpoint
ALTER TABLE "enlace_paciente" ADD CONSTRAINT "enlace_paciente_paciente_id_paciente_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."paciente"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "enlace_paciente" ("paciente_id", "token", "generado_en")
  SELECT "id", translate(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+/', '-_'), now() FROM "paciente";
