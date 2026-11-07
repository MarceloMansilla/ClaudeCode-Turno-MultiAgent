# Implementation Plan: Portal del paciente

**Branch**: `portal` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-portal-paciente/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Página personal, pensada para móvil, donde cada paciente de la clínica consulta sus citas
próximas y su historial y cancela las futuras hasta 24 horas antes, sin cuenta ni contraseña:
entra con su enlace personal y las 4 últimas cifras de su teléfono. Recepción copia o
regenera ese enlace desde la agenda, ve qué citas canceló el propio paciente y recibe un
aviso con los huecos liberados. Enfoque técnico: **ampliar la aplicación de la 001** (misma
app Next.js 16, mismos servicios y misma base de datos PostgreSQL 18) con una ruta pública
`/p/[token]`, una tabla `acceso_paciente` y dos columnas nuevas, **sin dependencias nuevas**.
La cancelación es una única sentencia condicional y la garantía anti-solape sigue siendo la
restricción de exclusión de la 001. Detalle en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Node.js 22 LTS (igual que la 001)

**Primary Dependencies**: las de la 001 (Next.js 16, React 19, Tailwind CSS 4, shadcn/ui,
Drizzle ORM, Zod 4, date-fns 4 + @date-fns/tz, jose). Ninguna nueva.

**Storage**: PostgreSQL 18 de la 001; migraciones nuevas: `clinica.telefono`,
`cita.cancelada_por` (+ CHECK) y tabla `acceso_paciente` ([data-model.md](data-model.md))

**Testing**: Vitest (unitarias + integración con Testcontainers), Playwright +
@axe-core/playwright en móvil 360×800 y portátil 1366×768

**Target Platform**: navegadores móviles actuales (Safari iOS, Chrome Android; últimas 2
versiones) para el portal; los de la 001 para el panel

**Project Type**: aplicación web full-stack (el mismo proyecto de la 001)

**Performance Goals**: portal con las citas visibles en < 2 s tras confirmar las cifras
(mismo objetivo que SC-004 de la 001); próxima cita encontrada en < 10 s y cancelación en
< 30 s de tarea de usuario (SC-001, SC-002)

**Constraints**: 0 accesos a citas ajenas y 0 solapes (SC-004); límite de intentos exacto
bajo concurrencia (FR-005); sin scroll horizontal desde 360 px y WCAG 2.2 AA (SC-006); hora
local de la clínica

**Scale/Scope**: una clínica por instalación; 40 pacientes en la semilla (cientos en una
clínica real); 2 pantallas de portal (cifras y portal) y 3 ampliaciones del panel (aviso,
etiqueta de cancelación, acciones de enlace)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Puertas derivadas de `.specify/memory/constitution.md` (v1.0.0). Evaluación previa a la
investigación y repetida tras el diseño (mismo resultado):

- [x] **I. Spec primero**: ✅ spec registrada en `specs/MAPA.md` con propietario único
      (MarceloMansilla), clarificada (5 preguntas) y aprobada el 2026-11-07. Lo que cambia
      de la 001 (acceso del paciente, teléfono de la clínica, origen de la cancelación) se ha
      integrado primero en la 001 como **Enmienda 1**, aprobada por su propietario. Las
      decisiones del plan que no estaban escritas en la spec (sesión de 30 min, límites de
      intentos) ya figuran en ella (Assumptions, FR-005).
- [x] **II. Números**: ✅ sin importes (el portal no muestra precios, FR-010). Plazo de 24 h
      como resta de instantes, mostrado en hora local con formato español; tabla de
      ejemplos con límite exacto y semana del cambio de hora en
      [data-model.md](data-model.md#plazo-de-cancelación-fr-012); Canarias cubierta por la
      zona de la clínica.
- [x] **III. Solape**: ✅ la 002 solo cancela; la restricción `cita_sin_solape` de la 001 no
      cambia y sigue siendo la única garantía (research P6). Pruebas obligatorias:
      cancelación de paciente + ráfaga de 10 reservas del mismo hueco, doble cancelación
      simultánea (paciente/paciente y paciente/recepción), cancelación en el último segundo
      del plazo.
- [x] **IV. Simplicidad**: ✅ misma aplicación, ninguna dependencia nueva, sin tabla de
      sesiones ni de avisos (consulta derivada), sin envío de mensajes. La única tabla nueva
      (`acceso_paciente`) es imprescindible para el enlace revocable y el límite de intentos.
- [x] **V. Datos demo**: ✅ la semilla se amplía al final de su secuencia (research P8): no
      cambia ningún identificador ni cifra de la 001; enlaces reproducibles; pacientes de
      ejemplo elegidos con una regla fija y publicados en `docs/datos-demo.md`.
- [x] **VI. Tests**: ✅ cada FR y escenario de la 002 con test nombrado por su identificador
      (research P10); suite completa de la 001 + 002 en verde como condición de integración.
- [x] **VII. Interfaz**: ✅ portal mobile-first con shadcn/ui, textos del contrato en
      lenguaje de paciente y de «tú», enlaces `tel:`; E2E con axe en móvil y portátil.
- [x] **VIII. Idioma**: ✅ interfaz, mensajes, documentación e identificadores de dominio en
      español de España.

## Project Structure

### Documentation (this feature)

```text
specs/002-portal-paciente/
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

Sobre la estructura de la 001; solo se listan archivos nuevos (＋) o ampliados (～):

```text
src/
├── app/
│   ├── p/[token]/
│   │   ├── layout.tsx                    ＋ layout móvil del portal (cabecera clínica + tel:)
│   │   └── page.tsx                      ＋ pantalla de cifras o portal según sesión
│   └── agenda/…                          ～ etiqueta «Cancelada por el paciente», acciones de enlace
├── components/
│   ├── portal/                           ＋ formulario de cifras, tarjeta de cita, diálogo de cancelación, pestañas
│   └── agenda/                           ～ aviso de huecos liberados, menú de enlace del portal
├── dominio/
│   ├── plazo.ts                          ＋ plazo de 24 h y «cancelable»
│   ├── portal.ts                         ＋ clasificación próximas/historial y etiquetas
│   ├── intentos.ts                       ＋ reglas de fallos y bloqueos
│   └── errores.ts                        ～ códigos nuevos del contrato
├── servicios/
│   ├── accesoPaciente.ts                 ＋ obtener/crear, regenerar, verificar cifras
│   ├── portal.ts                         ＋ lectura del portal
│   ├── citas.ts                          ～ cancelación con origen (recepción/paciente)
│   └── huecosLiberados.ts                ＋ consulta derivada (FR-015a)
├── acciones/                             ～ entrarPortal, salirPortal, cancelarCitaPaciente,
│                                            obtenerEnlacePortal, regenerarEnlacePortal
├── db/
│   ├── esquema.ts                        ～ clinica.telefono, cita.cancelada_por, acceso_paciente
│   └── migraciones/                      ＋ migración de la 002 (columnas, CHECK, tabla, índices)
├── lib/
│   └── sesionPortal.ts                   ＋ cookie del portal (jose, aud "portal", 30 min)
└── proxy.ts                              ～ renovación deslizante en /p/*

scripts/seed.ts                           ～ teléfono de la clínica, accesos, Paciente A/B en el resumen

tests/
├── unit/                                 ＋ plazo, portal, intentos
├── integration/                          ＋ cancelación condicional, aislamiento, concurrencia, enlace, huecos
└── e2e/                                  ＋ portal (móvil y portátil) y ampliaciones del panel

docs/
├── datos-demo.md                         ～ Paciente A/B, enlaces y cifras
└── usabilidad-002.md                     ＋ resultados de SC-001/SC-002
```

**Structure Decision**: mismo proyecto Next.js de la 001. Las reglas nuevas (plazo,
clasificación, intentos) son funciones puras en `src/dominio`; la cancelación del paciente
reutiliza el servicio de citas de la 001 con un parámetro de origen, de modo que solo hay
una forma de cancelar. El portal tiene ruta, layout y cookie propios para que no comparta
sesión ni protección con el panel.

**Coordinación con el trabajo en paralelo**: esta rama toca archivos de la 001
(`servicios/citas.ts`, `db/esquema.ts`, `scripts/seed.ts`, `proxy.ts`, agenda). Las ramas
`analitica` y `recordatorio` probablemente también; los cambios aquí son aditivos para
reducir conflictos, y la implementación de la 002 empieza cuando la 001 esté integrada.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
