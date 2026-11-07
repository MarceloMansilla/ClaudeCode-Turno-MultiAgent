# Implementation Plan: Núcleo de agenda de CitaClara

**Branch**: `001-agenda-core` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-agenda-core/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Panel web de recepción para clínicas pequeñas: acceso con clave de clínica, agenda del día por
profesional con huecos ocupados y libres, alta de cita (con alta rápida de paciente) y cambios
de estado, más una semilla determinista de Clínica Eleva. Enfoque técnico: una única
aplicación **Next.js 16 + React 19 + TypeScript** con **Tailwind CSS 4 + shadcn/ui** para una
interfaz profesional y actual, y **PostgreSQL 18**, donde la regla capital (RN1) la garantiza
una **restricción de exclusión** sobre `tstzrange(inicio, fin, '[)')` por profesional, inmune a
reservas simultáneas. Detalle en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Node.js 22 LTS

**Primary Dependencies**: Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4,
shadcn/ui (Radix UI), lucide-react, Drizzle ORM + drizzle-kit, Zod 4, date-fns 4 +
@date-fns/tz, jose, @node-rs/argon2

**Storage**: PostgreSQL 18 (extensión `btree_gist`); Docker Compose en desarrollo

**Testing**: Vitest (unitarias + integración con Testcontainers/PostgreSQL real), Playwright +
@axe-core/playwright (E2E y accesibilidad)

**Target Platform**: navegadores actuales (Chrome, Edge, Safari, Firefox; últimas 2 versiones)
en portátil y móvil; servidor Node.js 22

**Project Type**: aplicación web full-stack (un solo proyecto)

**Performance Goals**: agenda del día visible en < 2 s (SC-004); alta de cita en < 1 min de
tarea de usuario (SC-002)

**Constraints**: 0 solapes bajo concurrencia (SC-001); sin scroll horizontal desde 360 px y
WCAG 2.2 AA (SC-006); hora local de la clínica en toda la interfaz

**Scale/Scope**: 1–N clínicas de 2–5 profesionales; semilla ≈ 40 pacientes y ~10 semanas de
citas; 3 pantallas (entrar, agenda del día, alta de cita)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Puertas derivadas de `.specify/memory/constitution.md` (v1.0.0). Evaluación previa a la
investigación y repetida tras el diseño (mismo resultado):

- [x] **I. Spec primero**: ✅ spec registrada en `specs/MAPA.md` con propietario único
      (MarceloMansilla) y clarificada; el plan no añade comportamiento fuera de la spec.
      ⚠ Condición: el propietario debe marcar la spec como «Aprobada» (spec y MAPA) antes de
      `/speckit-implement`.
- [x] **II. Números**: ✅ importes en céntimos enteros, solo se muestran (sin redondeos);
      instantes en UTC y presentación en la zona IANA de la clínica con formato español
      (R5, R6); cambio de hora fuera del horario; Canarias cubierta por la zona de la clínica.
- [x] **III. Solape**: ✅ la BD impone `cita_sin_solape` (R3); ninguna vía de escritura puede
      saltársela. Pruebas obligatorias: solapes parcial/contenido/contenedor, contigüidad,
      otro profesional, canceladas/no asistidas no bloquean, ráfagas concurrentes de 10 altas
      del mismo hueco y de huecos parcialmente solapados, y seed sin solapes.
- [x] **IV. Simplicidad**: ✅ un solo proyecto; sin API REST, sin tabla de sesiones, sin
      proveedor de auth; cada dependencia justificada en research.md con su alternativa.
- [x] **V. Datos demo**: ✅ semilla con PRNG fijo y fecha de referencia (R8); resumen
      reproducible publicado en `docs/datos-demo.md`.
- [x] **VI. Tests**: ✅ cada FR/escenario con test nombrado por su identificador (R9); suite
      verde como condición de integración.
- [x] **VII. Interfaz**: ✅ shadcn/ui + Radix (accesible), mobile-first, mensajes de error en
      lenguaje de clínica definidos en el contrato; E2E en portátil y móvil con axe.
- [x] **VIII. Idioma**: ✅ interfaz, mensajes, datos y documentación en español de España;
      identificadores de dominio en español.

## Project Structure

### Documentation (this feature)

```text
specs/001-agenda-core/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── server-actions.md
│   └── ui-routes.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── entrar/page.tsx
│   ├── agenda/
│   │   ├── page.tsx                          # redirección a profesional + hoy
│   │   └── [profesionalId]/[fecha]/
│   │       ├── page.tsx                      # agenda del día
│   │       └── nueva/page.tsx                # alta de cita
│   ├── layout.tsx
│   └── globals.css                           # tokens de tema (Tailwind 4)
├── components/
│   ├── ui/                                   # componentes shadcn/ui
│   └── agenda/                               # línea de tiempo, bloque de cita, hueco, formulario de alta
├── dominio/                                  # reglas puras, sin BD
│   ├── solape.ts  horario.ts  estados.ts  telefono.ts  huecos.ts
│   └── errores.ts                            # códigos y mensajes del contrato
├── servicios/                                # casos de uso con transacción
│   ├── citas.ts  pacientes.ts  agenda.ts  acceso.ts
├── acciones/                                 # Server Actions (validan con Zod y llaman a servicios)
├── db/
│   ├── esquema.ts  cliente.ts
│   └── migraciones/                          # incluye SQL de exclusión e índice único
├── lib/
│   ├── reloj.ts  zona.ts  formato.ts  sesion.ts
└── middleware.ts                             # protege /agenda/*

scripts/
└── seed.ts                                   # semilla determinista (R8)

tests/
├── unit/                                     # dominio/*
├── integration/                              # servicios + BD real (incluye concurrencia)
└── e2e/                                      # Playwright (portátil y móvil)

docs/
└── datos-demo.md                             # cifras reproducibles de la semilla
```

**Structure Decision**: proyecto único de Next.js en la raíz. Las reglas de negocio viven en
`src/dominio` (funciones puras, fáciles de probar) y los casos de uso en `src/servicios`; las
Server Actions son una capa fina. Esta separación permite que futuras specs (recordatorios,
analítica, acceso de pacientes) reutilicen servicios sin tocar la interfaz.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
