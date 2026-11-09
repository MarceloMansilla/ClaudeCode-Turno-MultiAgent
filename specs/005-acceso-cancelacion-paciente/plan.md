# Implementation Plan: Acceso y cancelación del paciente

**Branch**: `005-acceso-cancelacion-paciente` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-acceso-cancelacion-paciente/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Cada paciente entra a sus datos con un enlace personal estable `/p/[token]` y las 4 últimas
cifras de su teléfono, sin cuentas. Los intentos fallidos están limitados (pausa a los 5,
bloqueo a los 10) y el acceso caduca a los 30 minutos sin actividad. Puede cancelar sus citas
reservadas hasta 24 horas antes del inicio, y la política se comunica siempre con un único
enunciado. Recepción copia y regenera el enlace desde la agenda.

Enfoque técnico, sobre el stack de la 001 y sin dependencias nuevas:

- una tabla `enlace_paciente` 1:1 con la ficha (token en claro, contadores de intentos);
- una cookie firmada con jose y limitada a `/p`, que el `proxy.ts` renueva;
- la cancelación como el mismo `UPDATE` condicional de la 001, con
  `cancelada_por = 'paciente'` e `inicio > ahora + 24 h`;
- el plazo y el enunciado como funciones puras únicas que reutilizarán la 002 y la 003.

Detalle en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Node.js 22 LTS (el de la 001)

**Primary Dependencies**: las de la 001: Next.js 16.4 (App Router, Server Actions,
`proxy.ts` en Node.js), React 19, Drizzle ORM, Zod 4, jose 6, date-fns 4 + @date-fns/tz,
shadcn/ui. Nuevas: ninguna (`node:crypto` para el token y el SHA-256).

**Storage**: PostgreSQL 18. Tabla nueva `enlace_paciente`. Usa `clinica.telefono` y
`cita.cancelada_por` de la 001 (prerrequisito R0). La migración de datos usa `pgcrypto`.

**Testing**: Vitest (unitarias + integración con Testcontainers), Playwright +
@axe-core/playwright (portátil 1366×768 y móvil 360×800)

**Target Platform**: navegadores actuales en móvil (paciente) y portátil (recepción);
servidor Node.js 22

**Project Type**: aplicación web full-stack (el proyecto único de la 001)

**Performance Goals**: abrir el enlace, escribir las cifras y cancelar en menos de 1 minuto
de tarea en un móvil de 360 px (SC-006); pantallas de `/p/[token]` en menos de 2 s, igual
que la agenda (001 SC-004)

**Constraints**:

- 0 cambios de estado duplicados en ráfagas de cancelación y 0 solapes en cancelación + alta
  simultáneas (SC-003);
- límite de cancelación idéntico al minuto en todos los canales (SC-004);
- ningún dato de paciente sin el token y las 4 cifras (FR-006, FR-007);
- semilla de la 001 sin cambios (FR-019).

**Scale/Scope**: una clínica por instalación con 40 pacientes de demostración. Una ruta
pública con 5 estados de pantalla y 2 diálogos, 3 acciones de paciente y 2 de panel.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Puertas derivadas de `.specify/memory/constitution.md` (v1.0.0). Evaluación previa a la
investigación, repetida tras el diseño con el mismo resultado:

- [x] **I. Spec primero**: ✅
  - Spec registrada en `specs/MAPA.md` con propietario único (MarceloMansilla),
    clarificada (4 preguntas, sin marcadores) y sin conflicto con la 001, cuya enmienda S1
    está aplicada.
  - Aprobada por su propietario el 2026-11-07, antes de `/speckit-tasks`.
  - El plan no añade comportamiento fuera de la spec. La lista provisional «Sus próximas
    citas» (R1) es la superficie mínima para FR-011 y FR-012 y se declara reemplazable por
    la 002. Los textos de los mensajes concretan el contenido que fija la spec.
- [x] **II. Números**: ✅ sin importes. El plazo compara instantes UTC (24 h =
  86.400.000 ms) y se muestra en la zona IANA de la clínica con formato español. Las tres
  filas de FR-010, incluida la del cambio de hora, son tests unitarios (R6). Canarias queda
  cubierta por la zona de la clínica.
- [x] **III. Solape**: ✅ la 005 solo escribe `reservada → cancelada`, que libera tramos y no
  los ocupa, mediante la operación única `cancelarCita` (R7). `cita_sin_solape` sigue siendo
  la garantía. Pruebas obligatorias:
  - hueco liberado que admite una cita nueva (US2 #5);
  - cancelación del paciente simultánea con un alta en el mismo hueco (0 solapes);
  - 100 ráfagas paciente + paciente y paciente + recepción (exactamente 1 cambio).
- [x] **IV. Simplicidad**: ✅
  - sin dependencias nuevas y sin tabla de sesiones;
  - una sola tabla, 1:1, sin historial;
  - el token en claro evita regenerar para copiar;
  - el estado «bloqueado» es derivado y no una columna;
  - la cancelación reutiliza la de la 001.

  Alternativas descartadas en research.md.
- [x] **V. Datos demo**: ✅ 40 enlaces deterministas con un flujo PRNG propio que no altera
  identificadores, citas ni cifras (R9). `docs/datos-demo.md` añade la tabla de enlaces de
  demostración. Las cifras de la 004 no cambian.
- [x] **VI. Tests**: ✅ cada FR y escenario con un test nombrado por su identificador (R11),
  incluidos SC-001 a SC-004. Suite en verde como condición de integración.
- [x] **VII. Interfaz**: ✅
  - mobile-first desde 360 px;
  - campo de cifras con `inputmode="numeric"`;
  - diálogos Radix accesibles;
  - mensajes que dicen qué pasa y qué hacer, con el teléfono como enlace `tel:`;
  - el menú del panel sigue el patrón de acciones de la 001;
  - axe en todas las pantallas nuevas.
- [x] **VIII. Idioma**: ✅ textos, datos y documentación en español de España; trato de «usted»
  al paciente (revisión cruzada S10).

**Prerrequisito de otra spec (no es una desviación)**: la enmienda S2–S5 de la 001 tiene que
estar en el código antes de las tareas de la 005: `clinica.telefono`, `cita.cancelada_por` y
la semilla con el teléfono de la clínica (research R0). Es trabajo de la 001
(`/speckit-converge` sobre la 001).

## Project Structure

### Documentation (this feature)

```text
specs/005-acceso-cancelacion-paciente/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── server-actions.md
│   └── ui-routes.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

Ficheros nuevos (N) y ficheros de la 001 que se amplían (A):

```text
src/
├── app/
│   └── p/[token]/
│       ├── page.tsx                          # N: decide el estado y elige la pantalla (ui-routes.md)
│       └── not-found.tsx                     # N: «Enlace no válido»
├── components/
│   ├── paciente/                             # N: reutilizables por la 002
│   │   ├── pantalla-enlace-no-valido.tsx
│   │   ├── pantalla-enlace-bloqueado.tsx
│   │   ├── formulario-cifras.tsx             # incluye el estado «en pausa»
│   │   ├── politica-cancelacion.tsx          # pinta el enunciado de FR-016
│   │   ├── dialogo-cancelar-cita.tsx         # FR-012
│   │   └── proximas-citas.tsx                # lista provisional (R1)
│   └── agenda/
│       ├── enlace-paciente.tsx               # N: menú «Copiar enlace» / «Generar enlace nuevo»
│       └── bloque-cita.tsx                   # A: monta el menú
├── dominio/
│   ├── plazo-paciente.ts                     # N: PLAZO_CANCELACION_PACIENTE_MS, límite y pacientePuedeCancelar
│   ├── politica-cancelacion.ts               # N: enunciado canónico (FR-016)
│   ├── enlace.ts                             # N: formato del token, ruta, últimas 4 cifras, transiciones de intentos
│   └── errores.ts                            # A: códigos y mensajes nuevos (contracts/server-actions.md)
├── servicios/
│   ├── enlaces.ts                            # N: crear, obtener, regenerar, resolver el token y comprobar las cifras
│   ├── portal-paciente.ts                    # N: próximas citas del paciente (lectura)
│   ├── citas.ts                              # A: operación única cancelarCita(origen, inicioMinimo, pacienteId?) (R7)
│   ├── pacientes.ts                          # A: crearPaciente crea también su enlace en la misma transacción
│   └── agenda.ts                             # A: CitaVista incluye pacienteId
├── acciones/
│   ├── paciente.ts                           # N: confirmarCifras, cancelarMiCita, salir
│   ├── enlaces.ts                            # N: obtenerEnlacePaciente, regenerarEnlacePaciente
│   └── esquemas.ts                           # A: esquemas Zod nuevos
├── lib/
│   ├── acceso-paciente.ts                    # N: cookie citaclara_paciente (crear, verificar, renovar, huella)
│   └── formato.ts                            # A: «antes del domingo, 15/11/2026 a las 10:00» si no existe
├── db/
│   ├── esquema.ts                            # A: tabla enlacePaciente
│   └── migraciones/0003_enlace_paciente.sql  # N: tabla, CHECK y enlaces de las fichas existentes (número tras la de la 001)
├── semilla/
│   ├── generar.ts                            # A: 40 enlaces con un flujo PRNG propio (R9)
│   └── cargar.ts                             # A: inserta enlace_paciente
└── proxy.ts                                  # A: matcher '/p/:path*', renovación de la cookie y cabeceras (R5, R10)

tests/
├── unit/
│   ├── plazo-paciente.test.ts                # FR-009, FR-010 (tres filas, cambio de hora)
│   ├── politica-cancelacion.test.ts          # FR-016 texto exacto, FR-017
│   └── enlace.test.ts                        # FR-002 formato, FR-006a transiciones
├── integration/
│   ├── enlaces.test.ts                       # FR-001–FR-008, FR-006a/b, US3, regeneración
│   ├── intentos-concurrencia.test.ts         # ráfagas de intentos desde varios dispositivos
│   ├── cancelacion-paciente.test.ts          # US2 #1–#6, FR-011–FR-015
│   ├── cancelacion-concurrencia.test.ts      # SC-003 y cancelación + alta (Principio III)
│   └── semilla.test.ts                       # A: 40 enlaces deterministas; resto idéntico (FR-019)
├── helpers/fabrica.ts                        # A: crea enlaces para las fichas de prueba
└── e2e/
    ├── acceso-paciente.spec.ts               # US1 #1–#7
    ├── cancelacion-paciente.spec.ts          # US2 #1–#3, #6; SC-006
    └── enlace-panel.spec.ts                  # US3 #1–#5

docs/
└── datos-demo.md                             # A: sección «Enlaces de pacientes»
```

**Structure Decision**: el proyecto único de la 001, con la misma separación: reglas puras en
`src/dominio`, casos de uso con transacción en `src/servicios`, Server Actions finas en
`src/acciones`. Lo reutilizable por la 002 y la 003 vive en `src/dominio` (plazo, enunciado y
ruta del enlace) y en `src/components/paciente`, para que esas specs **citen** la 005 en vez
de reimplementarla (FR-008, FR-017). La transición de cancelación sigue en
`src/servicios/citas.ts`, de la 001, como operación única (S7).

## Complexity Tracking

Sin violaciones de la constitución que justificar.
