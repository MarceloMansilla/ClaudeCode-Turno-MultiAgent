# Implementation Plan: Portal del paciente

**Branch**: `portal` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-portal-paciente/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Página personal, pensada para móvil, donde cada paciente de la clínica consulta sus citas
próximas y su historial y cancela las futuras hasta 24 horas antes, sin cuenta ni contraseña:
entra con su enlace personal, cuyo acceso define la 005 (FR-001–FR-008; la posible
confirmación de 4 cifras está pendiente de 005 FR-006). Recepción copia o regenera ese enlace
desde la agenda (comportamiento de la 005, presentación de la 002), ve qué citas canceló el
propio paciente (origen de la 001, FR-018a) y recibe un aviso con los huecos liberados.
Enfoque técnico: **ampliar la aplicación de la 001** (misma app Next.js 16, mismos servicios y
misma base de datos PostgreSQL 18) con la ruta pública `/p/[token]`, **sin dependencias, tablas,
columnas ni migraciones propias**: el esquema que necesita lo aportan la 001 y la 005. La
cancelación es una única sentencia condicional y la garantía anti-solape sigue siendo la
restricción de exclusión de la 001. Detalle en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Node.js 22 LTS (igual que la 001)

**Primary Dependencies**: las de la 001 (Next.js 16, React 19, Tailwind CSS 4, shadcn/ui,
Drizzle ORM, Zod 4, date-fns 4 + @date-fns/tz, jose). Ninguna nueva.

**Storage**: PostgreSQL 18 de la 001; sin migraciones propias. Usa `clinica.telefono`
(001 FR-022), `cita.cancelada_por` (001 FR-018a) y el enlace personal de la 005
([data-model.md](data-model.md))

**Testing**: Vitest (unitarias + integración con Testcontainers), Playwright +
@axe-core/playwright en móvil 360×800 y portátil 1366×768

**Target Platform**: navegadores móviles actuales (Safari iOS, Chrome Android; últimas 2
versiones) para el portal; los de la 001 para el panel

**Project Type**: aplicación web full-stack (el mismo proyecto de la 001)

**Performance Goals**: portal con las citas visibles en < 2 s tras completar el acceso
(mismo objetivo que SC-004 de la 001); próxima cita encontrada en < 10 s y cancelación en
< 30 s de tarea de usuario (SC-001, SC-002)

**Constraints**: 0 accesos a citas ajenas y 0 solapes (SC-004); sin scroll horizontal desde
360 px y WCAG 2.2 AA (SC-006); hora local de la clínica. Los límites del acceso (intentos,
si los hay) son de la 005

**Scale/Scope**: una clínica por instalación; 40 pacientes en la semilla (cientos en una
clínica real); 1 pantalla de portal (más la de cifras si 005 FR-006 la mantiene) y 3
ampliaciones del panel (aviso, etiqueta de cancelación, acciones de enlace)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Puertas derivadas de `.specify/memory/constitution.md` (v1.0.0). Evaluación previa a la
investigación y repetida tras el diseño (mismo resultado):

- [ ] **I. Spec primero**: ⚠️ *pendiente tras la revisión cruzada S2–S4.* Spec con
      propietario único (MarceloMansilla), clarificada (5 preguntas) y aprobada el
      2026-11-07, pero: (a) no figura en el `specs/MAPA.md` del tronco (lo registra el
      propietario de la 001); (b) depende de 001 FR-018a y FR-022, que aún no están en la
      001 de `001-agenda-core` (la «Enmienda 1» de esta rama se ha retirado); (c) depende del
      acceso de la 005, con FR-006 sin clarificar. La implementación no empieza hasta cerrar
      (a)–(c); ver «Dependencias y enmiendas requeridas» en [spec.md](spec.md).
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
- [x] **IV. Simplicidad**: ✅ misma aplicación, ninguna dependencia nueva, ninguna tabla ni
      columna propia (el esquema lo aportan la 001 y la 005), sin tabla de avisos (consulta
      derivada), sin envío de mensajes.
- [x] **V. Datos demo**: ✅ la 002 no amplía la semilla (research P8): el teléfono y el
      origen de las cancelaciones los aporta la 001 y los enlaces reproducibles, la 005
      (FR-019); pacientes de ejemplo elegidos con una regla fija y publicados en
      `docs/datos-demo.md`.
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

Sobre la estructura de la 001; solo se listan archivos nuevos (＋) o ampliados (～). Tras la
revisión cruzada S2–S4, los marcados con **[001]** o **[005]** los aporta esa spec; la 002 los
usa y no los implementa (se conservan como rastro de lo que necesita):

```text
src/
├── app/
│   ├── p/[token]/
│   │   ├── layout.tsx                    ＋ layout móvil del portal (cabecera clínica + tel:)
│   │   └── page.tsx                      ＋ portal; enlace no válido y, si 005 FR-006 lo exige, cifras [005]
│   └── agenda/…                          ～ etiqueta «Cancelada por el paciente», acciones de enlace
├── components/
│   ├── portal/                           ＋ tarjeta de cita, diálogo de cancelación, pestañas
│   │                                        (formulario de cifras: [005], si 005 FR-006 lo exige)
│   └── agenda/                           ～ aviso de huecos liberados, menú de enlace del portal
├── dominio/
│   ├── plazo.ts                          ＋ plazo de 24 h y «cancelable»
│   ├── portal.ts                         ＋ clasificación próximas/historial y etiquetas
│   ├── intentos.ts                       [005] reglas de fallos y bloqueos, si 005 FR-006 las exige
│   └── errores.ts                        ～ códigos nuevos del contrato
├── servicios/
│   ├── accesoPaciente.ts                 [005] obtener, regenerar y resolver el enlace
│   ├── portal.ts                         ＋ lectura del portal
│   ├── citas.ts                          ～ cancelación del paciente; origen [001] (FR-018a)
│   └── huecosLiberados.ts                ＋ consulta derivada (FR-015a)
├── acciones/                             ～ cancelarCitaPaciente; entrarPortal, salirPortal,
│                                            obtenerEnlacePortal, regenerarEnlacePortal: [005]
├── db/
│   ├── esquema.ts                        [001] clinica.telefono, cita.cancelada_por · [005] enlace personal
│   └── migraciones/                      [001] [005] (la 002 no tiene migración propia)
├── lib/
│   └── sesionPortal.ts                   [005] cookie del portal, si 005 FR-006 exige sesión
└── proxy.ts                              ～ `/p/*` fuera de la protección de `/agenda/*`; sesión: [005]

scripts/seed.ts                           ～ Paciente A/B en el resumen · teléfono [001] · enlaces [005]

tests/
├── unit/                                 ＋ plazo, portal
├── integration/                          ＋ cancelación condicional, aislamiento de la lectura, concurrencia, huecos
└── e2e/                                  ＋ portal (móvil y portátil) y ampliaciones del panel

docs/
├── datos-demo.md                         ～ Paciente A/B y sus enlaces (de la 005)
└── usabilidad-002.md                     ＋ resultados de SC-001/SC-002
```

**Structure Decision**: mismo proyecto Next.js de la 001. Las reglas nuevas de la 002 (plazo,
clasificación) son funciones puras en `src/dominio`; la cancelación del paciente reutiliza el
servicio de citas de la 001 con el origen de 001 FR-018a, de modo que solo hay una forma de
cancelar. El portal tiene ruta y layout propios y no comparte protección con el panel; cómo se
autoriza cada petición del portal (enlace solo o enlace + sesión) lo decide la 005.

**Coordinación con el trabajo en paralelo**: esta rama toca archivos de la 001
(`servicios/citas.ts`, `servicios/agenda.ts`, `proxy.ts`, agenda, cabecera). Las ramas
`analitica`, `recordatorio` y `005-acceso-cancelacion-paciente` probablemente también; los
cambios aquí son aditivos para reducir conflictos, y la implementación de la 002 empieza
cuando la 001 (con FR-018a y FR-022) y el acceso de la 005 estén integrados.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
