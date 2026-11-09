# Implementation Plan: Recordatorios de cita por correo electrónico

**Branch**: `recordatorio` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-recordatorios-cita/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Cada día a las 08:00 (hora de la clínica) un comando, `pnpm recordatorios`, envía un correo
de recordatorio por cada cita reservada del día siguiente cuyo paciente tenga correo, como
máximo uno por cita aunque se ejecute varias veces o a la vez. Sin servidor SMTP configurado,
los correos se escriben como `.eml` en `datos/salida-correo/`. Cada correo lleva el enlace
personal del paciente (005 FR-001, FR-008) y el enunciado de la política de cancelación
tal como lo da 005 FR-016; el paciente cancela, si está en plazo, desde el portal (002) con las
reglas de la 005. La 003 no escribe en la agenda (revisión cruzada S2 y S4).

Enfoque técnico, sobre el stack de la 001: la unicidad la impone la BD
(`UNIQUE (cita_id)` + «reclamar antes de enviar»); **Nodemailer** es la única dependencia
nueva y cubre SMTP y el modo simulado con el mismo mensaje; el enlace y el límite de
cancelación de cada cita se toman de la 005, sin token ni plazo propios. Detalle en
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Node.js 22 LTS (igual que la 001)

**Primary Dependencies**: las de la 001 (Next.js 16, React 19, Drizzle ORM, Zod 4,
date-fns 4 + @date-fns/tz, shadcn/ui) + **nodemailer** (nueva, R3); en desarrollo,
**mailparser** para comprobar los `.eml` en tests

**Storage**: PostgreSQL 18 (la de la 001): tablas nuevas `recordatorio` y
`ejecucion_recordatorios` (ningún cambio en `cita`); ficheros `.eml`
en `datos/salida-correo/` en modo simulado

**Testing**: Vitest (unitarias + integración con Testcontainers); sin E2E propios (la 003 no
tiene pantallas)

**Target Platform**: servidor Node.js 22 con un planificador diario (cron del sistema o del
hosting, `CRON_TZ=Europe/Madrid`); correo legible en clientes habituales

**Project Type**: aplicación web full-stack existente (un solo proyecto) + un comando de línea

**Performance Goals**: una ejecución trata las ~30 citas diarias de una clínica en segundos

**Constraints**: como máximo 1 recordatorio por cita, también con ejecuciones simultáneas
(SC-001); solo el enlace personal de la 005 (FR-019); el límite del correo coincide al minuto
con el de la 005 (SC-007); hora local de la clínica en el correo; 360 px y contraste AA
(SC-006)

**Scale/Scope**: una clínica por instalación; ~20–35 citas al día; 1 comando, 1 plantilla de
correo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Puertas derivadas de `.specify/memory/constitution.md` (v1.0.0). Evaluación previa a la
investigación y repetida tras el diseño (mismo resultado):

- [x] **I. Spec primero**: ✅ spec 003 (antes 002) aprobada el 2026-11-08 por su propietario,
      alineada con la 005 (P1 resuelta: se mantiene la víspera). Ya no pide enmienda a la 001 (se retira
      su FR-018a de recordatorios); depende de la 005 (acceso y cancelación) y de la 002
      (portal). El registro de la 003 en `specs/MAPA.md` lo hace el propietario de la 001. El
      plan no añade comportamiento: el envío interrumpido (R2) está en la spec (FR-010 y
      FR-005).
- [x] **II. Números**: ✅ sin importes (el correo no muestra precio). Ventana = día natural
      siguiente en la zona IANA de la clínica, convertida a UTC; cubre días de 23 y 25 h
      (tabla en data-model.md); fechas «lunes, 16/11/2026» y «10:00–10:45» con el formateador
      de la 001.
- [x] **III. Solape**: ✅ no aplica: la 003 no escribe en la agenda (spec FR-021, «Writes to
      the agenda?: No»). Las pruebas de concurrencia de la cancelación del paciente son de la
      005. Aquí se prueba que una ejecución no cambia ninguna fila de `cita`.
- [x] **IV. Simplicidad**: ✅ comando + cron del sistema en vez de programador residente; una
      dependencia nueva (Nodemailer) para los dos modos de envío; sin motor de plantillas, sin
      tabla de detalle; sin credenciales ni páginas propias (las de la 005 y la 002).
      Alternativas descartadas en research.md.
- [x] **V. Datos demo**: ✅ la 003 no cambia la semilla; usa los enlaces personales que añade la
      005 (FR-019). Cifras reproducibles de recordatorios por día
      para la fecha de referencia 2026-11-09 en quickstart.md (p. ej. ejecución del
      09/11/2026: 26 citas, 20 enviados, 6 sin correo; segunda ejecución: 0 enviados); se
      publican en `docs/datos-demo.md` al implementar.
- [x] **VI. Tests**: ✅ cada FR, escenario y SC con test nombrado por su identificador (R10);
      suite verde como condición de integración.
- [x] **VII. Interfaz**: ✅ sin pantallas propias; el correo es legible desde 360 px con
      contraste AA (SC-006). Recepción no necesita nada nuevo.
- [x] **VIII. Idioma**: ✅ correo, salida del comando y documentación en español de España;
      trato de usted al paciente, también en el enunciado de la 005 (S10).

## Project Structure

### Documentation (this feature)

```text
specs/003-recordatorios-cita/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── comando-recordatorios.md
│   └── correo-recordatorio.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

Solo lo que añade o toca la 003 sobre la estructura de la 001:

```text
src/
├── dominio/
│   ├── ventana-recordatorio.ts       # día objetivo y ventana UTC a partir de «ahora» y zona
│   └── resultado-recordatorio.ts     # clasificación de cada cita (enviado, sin correo…)
├── servicios/
│   └── recordatorios.ts              # ejecutar ejecución, reclamar/enviar/marcar
├── correo/
│   ├── componer-recordatorio.ts      # asunto, texto y HTML (función pura)
│   └── transporte.ts                 # SMTP o simulado según SMTP_URL
└── db/
    ├── esquema.ts                    # + recordatorio, ejecucion_recordatorios
    └── migraciones/                  # + migración de la 003 (generada tras rebasar, R11)

scripts/
└── recordatorios.ts                  # comando `pnpm recordatorios`

tests/
├── unit/          # ventana (incl. cambio de hora), plantilla, clasificación
└── integration/   # duplicados y simultaneidad, reintentos, enlace y enunciado, sin escrituras en cita

datos/salida-correo/                  # modo simulado; en .gitignore
docs/datos-demo.md                    # + sección «Recordatorios»
```

Archivos de la 001 que se tocan (solo añadidos): `src/db/esquema.ts` (tablas propias, ningún
cambio en `cita`), `tests/helpers/fabrica.ts`, `package.json` (dependencia y script),
`.env.example`, `.gitignore`, `README.md` y `docs/datos-demo.md`. **No** se tocan
`servicios/citas.ts`, `dominio/errores.ts`, `next.config.ts`, `proxy.ts` ni la semilla.

**Structure Decision**: mismo proyecto Next.js de la 001. Las reglas puras nuevas van en
`src/dominio`, el caso de uso en `src/servicios/recordatorios.ts` (lo usa el
comando), y todo lo relativo al correo en `src/correo` para aislar la única dependencia
nueva. El enlace (`rutaEnlacePaciente`) y el enunciado (`enunciadoPoliticaCancelacion`) se
importan de la 005.

## Dependencias y orden

1. **La 001 integrada en `main`** y esta rama rebasada sobre ella (aquí aún no hay código).
2. Migración de la 003 generada **después** del rebase (otras features en paralelo también
   añaden migraciones).
3. **La 005 implementada**: enlace personal vigente por ficha, enlaces en la semilla
   (005 FR-019) y límite de cancelación de una cita expuestos para el correo (R5, R11).
4. ~~Pregunta abierta P1~~: resuelta el 2026-11-08 (se mantiene la víspera; R1 sin cambios).

## Complexity Tracking

Sin violaciones de la constitución que justificar.
