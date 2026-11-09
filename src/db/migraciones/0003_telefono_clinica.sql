-- Enmienda revisión cruzada S3 de la 001 (FR-022): teléfono de contacto de la clínica, que la
-- spec 005 muestra al paciente. Es obligatorio y sigue las reglas de FR-016c.
--
-- Relleno de las instalaciones existentes: la clínica de demostración recibe el teléfono que
-- fija la spec («911 234 567»). Para cualquier otra clínica no se inventa un número: la
-- migración se detiene y explica cómo rellenarlo. La columna se crea con IF NOT EXISTS para
-- que, tras añadirla y rellenarla a mano, la migración pueda volver a ejecutarse.

ALTER TABLE "clinica" ADD COLUMN IF NOT EXISTS "telefono" text;--> statement-breakpoint
UPDATE "clinica" SET "telefono" = '911 234 567' WHERE "telefono" IS NULL AND "nombre" = 'Clínica Eleva';--> statement-breakpoint
DO $$
DECLARE
  sin_telefono text;
BEGIN
  SELECT "nombre" INTO sin_telefono FROM "clinica" WHERE "telefono" IS NULL LIMIT 1;
  IF sin_telefono IS NOT NULL THEN
    RAISE EXCEPTION 'La clínica «%» no tiene teléfono de contacto (spec 001, FR-022).', sin_telefono
      USING HINT = 'Ejecuta ALTER TABLE clinica ADD COLUMN telefono text; UPDATE clinica SET telefono = ''<teléfono>''; y vuelve a lanzar pnpm db:migrate.';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "clinica" ALTER COLUMN "telefono" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clinica" ADD CONSTRAINT "clinica_telefono_valido" CHECK (regexp_replace("clinica"."telefono", '[[:space:]().-]', '', 'g') ~ '^((\+|00)?34)?[6-9][0-9]{8}$');
