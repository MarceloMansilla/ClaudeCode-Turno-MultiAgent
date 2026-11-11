CREATE TYPE "public"."especialidad" AS ENUM('fisioterapia', 'nutricion');--> statement-breakpoint
CREATE TYPE "public"."estado_cita" AS ENUM('reservada', 'completada', 'cancelada', 'no_asistida');--> statement-breakpoint
CREATE TABLE "cita" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clinica_id" uuid NOT NULL,
	"profesional_id" uuid NOT NULL,
	"servicio_id" uuid NOT NULL,
	"paciente_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fin" timestamp with time zone NOT NULL,
	"estado" "estado_cita" DEFAULT 'reservada' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"estado_cambiado_en" timestamp with time zone,
	CONSTRAINT "cita_fin_posterior" CHECK ("cita"."fin" > "cita"."inicio")
);
--> statement-breakpoint
CREATE TABLE "clinica" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"zona_horaria" text NOT NULL,
	"hora_apertura" time NOT NULL,
	"hora_cierre" time NOT NULL,
	"dias_laborables" smallint[] NOT NULL,
	"clave_hash" text NOT NULL,
	CONSTRAINT "clinica_nombre_valido" CHECK (char_length("clinica"."nombre") between 1 and 120),
	CONSTRAINT "clinica_horario_valido" CHECK ("clinica"."hora_cierre" > "clinica"."hora_apertura")
);
--> statement-breakpoint
CREATE TABLE "paciente" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clinica_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text NOT NULL,
	"telefono_normalizado" text NOT NULL,
	"email" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paciente_telefono_valido" CHECK ("paciente"."telefono_normalizado" ~ '^[6-9][0-9]{8}$')
);
--> statement-breakpoint
CREATE TABLE "profesional" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clinica_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"especialidad" "especialidad" NOT NULL,
	"orden" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicio" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clinica_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"especialidad" "especialidad" NOT NULL,
	"duracion_minutos" integer NOT NULL,
	"precio_centimos" integer NOT NULL,
	CONSTRAINT "servicio_duracion_valida" CHECK ("servicio"."duracion_minutos" > 0 and "servicio"."duracion_minutos" % 15 = 0),
	CONSTRAINT "servicio_precio_valido" CHECK ("servicio"."precio_centimos" >= 0)
);
--> statement-breakpoint
ALTER TABLE "cita" ADD CONSTRAINT "cita_clinica_id_clinica_id_fk" FOREIGN KEY ("clinica_id") REFERENCES "public"."clinica"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cita" ADD CONSTRAINT "cita_profesional_id_profesional_id_fk" FOREIGN KEY ("profesional_id") REFERENCES "public"."profesional"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cita" ADD CONSTRAINT "cita_servicio_id_servicio_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cita" ADD CONSTRAINT "cita_paciente_id_paciente_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."paciente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_clinica_id_clinica_id_fk" FOREIGN KEY ("clinica_id") REFERENCES "public"."clinica"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profesional" ADD CONSTRAINT "profesional_clinica_id_clinica_id_fk" FOREIGN KEY ("clinica_id") REFERENCES "public"."clinica"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_clinica_id_clinica_id_fk" FOREIGN KEY ("clinica_id") REFERENCES "public"."clinica"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cita_agenda_idx" ON "cita" USING btree ("clinica_id","profesional_id","inicio");--> statement-breakpoint
CREATE INDEX "paciente_clinica_nombre_idx" ON "paciente" USING btree ("clinica_id","nombre");--> statement-breakpoint
CREATE INDEX "profesional_clinica_orden_idx" ON "profesional" USING btree ("clinica_id","orden");