CREATE TYPE "public"."estado_recordatorio" AS ENUM('enviando', 'enviado', 'fallido');--> statement-breakpoint
CREATE TYPE "public"."modo_correo" AS ENUM('simulado', 'smtp');--> statement-breakpoint
CREATE TABLE "ejecucion_recordatorios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clinica_id" uuid NOT NULL,
	"iniciada_en" timestamp with time zone NOT NULL,
	"terminada_en" timestamp with time zone,
	"fecha_objetivo" date NOT NULL,
	"ventana_desde" timestamp with time zone NOT NULL,
	"ventana_hasta" timestamp with time zone NOT NULL,
	"modo" "modo_correo" NOT NULL,
	"resumen" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recordatorio" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clinica_id" uuid NOT NULL,
	"cita_id" uuid NOT NULL,
	"destinatario" text NOT NULL,
	"modo" "modo_correo" NOT NULL,
	"estado" "estado_recordatorio" NOT NULL,
	"intentos" smallint DEFAULT 1 NOT NULL,
	"generado_en" timestamp with time zone NOT NULL,
	"ultimo_intento_en" timestamp with time zone NOT NULL,
	"enviado_en" timestamp with time zone,
	"ultimo_error" text,
	"fichero" text,
	CONSTRAINT "recordatorio_cita_unica" UNIQUE("cita_id"),
	CONSTRAINT "recordatorio_intentos_validos" CHECK ("recordatorio"."intentos" >= 1)
);
--> statement-breakpoint
ALTER TABLE "ejecucion_recordatorios" ADD CONSTRAINT "ejecucion_recordatorios_clinica_id_clinica_id_fk" FOREIGN KEY ("clinica_id") REFERENCES "public"."clinica"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_clinica_id_clinica_id_fk" FOREIGN KEY ("clinica_id") REFERENCES "public"."clinica"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_cita_id_cita_id_fk" FOREIGN KEY ("cita_id") REFERENCES "public"."cita"("id") ON DELETE no action ON UPDATE no action;