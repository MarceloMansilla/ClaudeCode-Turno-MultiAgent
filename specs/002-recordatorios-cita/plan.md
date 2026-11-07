# Implementation Plan: Recordatorios de cita por correo electrónico

**Branch**: `recordatorio` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-recordatorios-cita/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Cada día a las 08:00 (hora de la clínica) un comando, `pnpm recordatorios`, envía un correo
de recordatorio por cada cita reservada del día siguiente cuyo paciente tenga correo, como
máximo uno por cita aunque se ejecute varias veces o a la vez. Sin servidor SMTP configurado,
los correos se escriben como `.eml` en `datos/salida-correo/`. Cada correo lleva un enlace
personal a una página pública donde el paciente ve su cita y puede cancelarla hasta la hora
de inicio; el hueco queda libre en la agenda de recepción.

Enfoque técnico, sobre el stack de la 001: la unicidad la impone la BD
(`UNIQUE (cita_id)` + «reclamar antes de enviar»); **Nodemailer** es la única dependencia
nueva y cubre SMTP y el modo simulado con el mismo mensaje; el enlace es un token aleatorio de
256 bits del que solo se guarda el hash; la cancelación es una actualización condicional,
como los cambios de estado de la 001. Detalle en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Node.js 22 LTS (igual que la 001)

**Primary Dependencies**: las de la 001 (Next.js 16, React 19, Drizzle ORM, Zod 4,
date-fns 4 + @date-fns/tz, shadcn/ui) + **nodemailer** (nueva, R3); en desarrollo,
**mailparser** para comprobar los `.eml` en tests

**Storage**: PostgreSQL 18 (la de la 001): tablas nuevas `recordatorio` y
`ejecucion_recordatorios`, columna nueva `cita.cancelada_desde_recordatorio`; ficheros `.eml`
en `datos/salida-correo/` en modo simulado

**Testing**: Vitest (unitarias + integración con Testcontainers), Playwright +
@axe-core/playwright (página de cancelación)

**Target Platform**: servidor Node.js 22 con un planificador diario (cron del sistema o del
hosting, `CRON_TZ=Europe/Madrid`); página de cancelación en navegadores actuales de móvil y
portátil; correo legible en clientes habituales

**Project Type**: aplicación web full-stack existente (un solo proyecto) + un comando de línea

**Performance Goals**: una ejecución trata las ~30 citas diarias de una clínica en segundos;
la página de cancelación carga en < 2 s como la agenda de la 001

**Constraints**: como máximo 1 recordatorio por cita, también con ejecuciones simultáneas
(SC-001); abrir un enlace nunca cancela; enlaces no adivinables (SC-004); hora local de la
clínica en correo y página; WCAG 2.2 AA y 360 px (SC-006)

**Scale/Scope**: una clínica por instalación; ~20–35 citas al día; 1 comando, 1 plantilla de
correo, 1 página pública

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Puertas derivadas de `.specify/memory/constitution.md` (v1.0.0). Evaluación previa a la
investigación y repetida tras el diseño (mismo resultado):

- [x] **I. Spec primero**: ✅ spec 002 aprobada (2026-11-07) y registrada en `specs/MAPA.md`
      con propietario único (MarceloMansilla), tras 3 aclaraciones. El cambio de
      comportamiento de la 001 (el paciente puede cancelar) se ha hecho **primero en la 001**
      (FR-018a), por su propietario. El plan no añade comportamiento: el tratamiento de un
      envío interrumpido por caída del proceso (R2) está recogido en la spec (FR-010 y
      FR-005, precisión aprobada por el propietario el 2026-11-07).
- [x] **II. Números**: ✅ sin importes (el correo no muestra precio). Ventana = día natural
      siguiente en la zona IANA de la clínica, convertida a UTC; cubre días de 23 y 25 h
      (tabla en data-model.md); fechas «lunes, 16/11/2026» y «10:00–10:45» con el formateador
      de la 001.
- [x] **III. Solape**: ✅ la feature solo escribe en la agenda para **cancelar** (saca la cita
      de `cita_sin_solape`, nunca crea ni mueve). Pruebas: cancelación simultánea
      paciente × recepción y paciente × paciente (una sola prospera) y alta en el hueco
      liberado sin solape; la restricción de la 001 sigue siendo la garantía.
- [x] **IV. Simplicidad**: ✅ comando + cron del sistema en vez de programador residente; una
      dependencia nueva (Nodemailer) para los dos modos de envío; sin motor de plantillas, sin
      JWT, sin tabla de detalle; el código de la 001 no se modifica (columna con
      `DEFAULT false`). Alternativas descartadas en research.md.
- [x] **V. Datos demo**: ✅ la semilla no cambia. Cifras reproducibles de recordatorios por día
      para la fecha de referencia 2026-11-09 en quickstart.md (p. ej. ejecución del
      09/11/2026: 26 citas, 20 enviados, 6 sin correo; segunda ejecución: 0 enviados); se
      publican en `docs/datos-demo.md` al implementar.
- [x] **VI. Tests**: ✅ cada FR, escenario y SC con test nombrado por su identificador (R10);
      suite verde como condición de integración.
- [x] **VII. Interfaz**: ✅ página de cancelación con los componentes de la 001, mobile-first,
      mensajes en lenguaje llano definidos en el contrato; E2E en móvil y portátil con axe.
      Recepción no necesita nada nuevo: ve la cita cancelada y el hueco libre en su agenda.
- [x] **VIII. Idioma**: ✅ correo, página, salida del comando, mensajes y documentación en
      español de España; trato de usted al paciente.

## Project Structure

### Documentation (this feature)

```text
specs/002-recordatorios-cita/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── comando-recordatorios.md
│   ├── correo-recordatorio.md
│   └── cancelacion-paciente.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

Solo lo que añade o toca la 002 sobre la estructura de la 001:

```text
src/
├── app/
│   └── cancelar/[token]/
│       ├── page.tsx                  # página pública (solo lectura)
│       └── formulario-cancelar.tsx   # botón «Cancelar mi cita» (cliente)
├── acciones/
│   └── cancelar-desde-recordatorio.ts
├── dominio/
│   ├── ventana-recordatorio.ts       # día objetivo y ventana UTC a partir de «ahora» y zona
│   └── resultado-recordatorio.ts     # clasificación de cada cita (enviado, sin correo…)
├── servicios/
│   └── recordatorios.ts              # ejecutar ejecución, reclamar/enviar/marcar, cancelar
├── correo/
│   ├── componer-recordatorio.ts      # asunto, texto y HTML (función pura)
│   ├── transporte.ts                 # SMTP o simulado según SMTP_URL
│   └── token.ts                      # generar token y su hash
└── db/
    ├── esquema.ts                    # + recordatorio, ejecucion_recordatorios, columna en cita
    └── migraciones/                  # + migración de la 002 (generada tras rebasar, R11)

scripts/
└── recordatorios.ts                  # comando `pnpm recordatorios`

tests/
├── unit/          # ventana (incl. cambio de hora), plantilla, token, clasificación
├── integration/   # duplicados y simultaneidad, reintentos, cancelación concurrente, SC-004
└── e2e/           # cancelación en móvil y portátil, axe

datos/salida-correo/                  # modo simulado; en .gitignore
docs/datos-demo.md                    # + sección «Recordatorios»
```

Archivos de la 001 que se tocan (solo añadidos): `src/db/esquema.ts`, `src/dominio/errores.ts`
(código `ENLACE_NO_VALIDO` y mensajes para el paciente), `tests/helpers/fabrica.ts`,
`next.config.ts` (cabeceras de `/cancelar/*`), `package.json` (dependencia y script),
`.env.example`, `.gitignore`, `README.md` y `docs/datos-demo.md`. **No** se tocan
`servicios/citas.ts`, `proxy.ts` ni la semilla.

**Structure Decision**: mismo proyecto Next.js de la 001. Las reglas puras nuevas van en
`src/dominio`, el caso de uso en `src/servicios/recordatorios.ts` (lo usan el comando y la
Server Action), y todo lo relativo al correo en `src/correo` para aislar la única dependencia
nueva.

## Dependencias y orden

1. **La 001 integrada en `main`** y esta rama rebasada sobre ella (aquí aún no hay código).
2. Migración de la 002 generada **después** del rebase (otras features en paralelo también
   añaden migraciones).
3. Coordinación con la feature de portal del paciente: misma regla de cancelación y
   `/cancelar/*` fuera de la protección de `proxy.ts` (R11).

## Complexity Tracking

Sin violaciones de la constitución que justificar.
