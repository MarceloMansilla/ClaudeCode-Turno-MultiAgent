# Mapa de specs de CitaClara

Registro global de specs, su propietario único (Constitución, Principio I) y las relaciones
entre ellas. Lo mantiene el propietario de la 001 (revisión cruzada, S3).

**Actualizado**: 2026-11-08, a partir de la punta de cada rama (`001-agenda-core`,
`portal`, `recordatorio`, `analitica`, `005-acceso-cancelacion-paciente`), del estado de
cada worktree y de [`000-revision-cruzada-jul2026.md`](000-revision-cruzada-jul2026.md).

## Tabla de specs

| Nº | Nombre | Propietario | Estado | Escribe en la agenda | Consume | La consumen |
|----|--------|-------------|--------|----------------------|---------|-------------|
| [001](001-agenda-core/spec.md) | Núcleo de agenda | MarceloMansilla | Implementada | Sí | — | 002, 003, 004, 005 |
| [002](002-portal-paciente/spec.md) | Portal del paciente | MarceloMansilla | En revisión | Sí (vía 005) | 001, 005 | 003 |
| [003](003-recordatorios-cita/spec.md) | Recordatorios de cita por correo | MarceloMansilla | En revisión | No | 001, 002, 004, 005 | — |
| [004](004-panel-analitica/spec.md) | Panel de analítica de la clínica | MarceloMansilla | Implementada | No | 001 | 003 (y 001, que le remite el indicador) |
| [005](005-acceso-cancelacion-paciente/spec.md) | Acceso y cancelación del paciente | MarceloMansilla | Implementada | Sí (solo cancelar) | 001 | 002, 003 (y 001, que le remite el acceso del paciente) |

**Criterio de estado**

- *Borrador*: la spec está en `Draft` o tiene `[NEEDS CLARIFICATION]` sin resolver.
- *En revisión*: la spec está aprobada o en revisión pero sin código, o se ha cambiado
  después de aprobarse y tiene trabajo pendiente.
- *Implementada*: hay código y pruebas en su rama.

**Qué significa «consume»**: la spec cita requisitos de la otra y no puede redefinirlos.
Para cada spec, los requisitos concretos que cita se detallan en su sección «Dependencias».

**Dónde vive cada spec**: la 001 y la 005 están en esta rama; la 002 en `portal`, la 003 en
`recordatorio` y la 004 en `analitica`. Los enlaces a la 002, la 003 y la 004 solo funcionan
cuando sus ramas se integren.

## Ramas y worktrees

Foto del 2026-11-08. Todas las ramas están sincronizadas con `origin` (0 por delante, 0 por
detrás). `main` y `develop` siguen en el commit inicial (`b75d4c3`): todavía no se ha
integrado ninguna spec en el tronco.

| Worktree | Rama | Spec | Punta | Commits sobre `main` | Base respecto a la 001 | Cambios sin commit |
|----------|------|------|-------|----------------------|------------------------|--------------------|
| — (sin worktree) | `001-agenda-core` | 001 | `899df8e` | 3 | — | — |
| `citaclara` (principal) | `005-acceso-cancelacion-paciente` | 005 (+ enmienda 001) | `d199bfb` | 6 | Contiene `899df8e` y la enmienda S2–S5 (`e665865`) | Sí, muchos (ver abajo) |
| `citaclara-portal` | `portal` | 002 | `8f140e3` | 7 | Integró `899df8e` (`1d2fc40`); sin la enmienda S2–S5 | No |
| `citaclara-recordatorio` | `recordatorio` | 003 | `0d4a8ee` | 4 | Parte de `454b0f8`: no tiene el código de la 001 ni la enmienda | No |
| `citaclara-analitica` | `analitica` | 004 | `cbf6a02` | 7 | Integró `899df8e` (`b9834c8`); sin la enmienda S2–S5 | Sí, solo documentos de la 004 |

**Trabajo sin commit por worktree**

- **`citaclara` (`005-acceso-cancelacion-paciente`)**:
  - *Enmienda S2–S5 de la 001*: T067–T073, T075 y T076 están hechas (migraciones `0002` y
    `0003`, `cancelada_por`, teléfono de la clínica, semilla y pruebas). Falta T074 (lint,
    typecheck, test y E2E en verde) y T066 (usabilidad, manual).
  - *005*: `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/` y
    `tasks.md` generados. 53 de 58 tareas hechas: US1, US2, US3 y el pulido implementados,
    con lint, typecheck y `pnpm test` en verde (27 ficheros, 322 pruebas). Quedan las
    ejecuciones E2E (T028, T043, T051, T057: las pruebas E2E están escritas pero no se han
    ejecutado) y la prueba manual de SC-005/SC-006 (T058).
  - Este `MAPA.md`, `docs/datos-demo.md` y la `spec.md` de la 005.
- **`citaclara-analitica` (`analitica`)**: retoques de la revisión cruzada en `plan.md`,
  `research.md` (R11 y R12), `data-model.md`, `quickstart.md` y `contracts/ui-analitica.md`
  de la 004: la tasa de no asistencia de FR-006 es la canónica y no se lee nada de
  recordatorios. Su `plan.md` recuerda que la 004 no debe integrarse sin su fila en este
  mapa (ya la tiene).
- **`citaclara-portal` y `citaclara-recordatorio`**: limpios.

**Consecuencias para la integración**

- La enmienda S2–S5 de la 001 vive en la rama de la 005 (`e665865` y el trabajo sin
  commit), no en `001-agenda-core`. Al integrar, la 001 enmendada entra con la 005, o hay
  que llevar antes esos cambios a `001-agenda-core`.
- `portal` y `analitica` tendrán que volver a integrar la 001 cuando incluya la enmienda.
  `recordatorio` todavía no ha integrado ni siquiera el código de la 001.

## Dominio de cada spec

**001 · Núcleo de agenda.** Es la agenda de recepción y la base de todo el sistema: clínica,
profesionales, servicios, fichas de paciente, citas y sus estados (reservada → completada,
cancelada o no asistida). También define las reglas sin solape y sin citas en el pasado, el
plazo de cancelación de recepción (FR-018, que remite a la 005 para el del paciente), el
origen de la cancelación (FR-018a), el teléfono
de la clínica y la semilla determinista de Clínica Eleva. Es la única spec que todas las
demás consumen. *Estado*: el código está implementado en `001-agenda-core` (`899df8e`). La
enmienda de la revisión cruzada S2–S5 (`cancelada_por` y el teléfono de la clínica) ya está
en el código (migraciones 0002 y 0003), pero en la rama de la 005 y sin commit; falta pasar
la suite completa (001 T074). La enmienda S1 (plazo del paciente →
005 FR-009) está aprobada y solo afecta a la spec: no cambia código de la 001.

**002 · Portal del paciente.** Es la página móvil donde el paciente ve sus citas futuras y
pasadas y las cancela. En recepción añade «Cancelada por el paciente», el aviso de huecos
liberados y las acciones del enlace del portal. Tras la revisión cruzada ya no define el
acceso ni el plazo: los toma de la 005 y se queda con las pantallas, los datos visibles y la
guía de textos y trato al paciente. *Estado*: se aprobó, pero tiene cambios de la revisión
S2–S4. 005 FR-006 ya está decidido (enlace + 4 cifras, FR-006a y FR-006b); falta que la 002
retire sus propias definiciones de acceso y plazo y cite la 005. No hay código.

**003 · Recordatorios de cita por correo.** Es el proceso diario que envía un correo de
recordatorio por cada cita reservada próxima, sin duplicar envíos. Sin SMTP, el correo se
simula con ficheros `.eml`. Cada correo lleva el enlace personal y el enunciado de la
política de cancelación de la 005, y su éxito se mide con la tasa de no asistencia de la 004.
*Estado*: se renumeró de 002 a 003 y queda pendiente su pregunta abierta P1 (si el envío de
las 08:00 de la víspera deja margen con el plazo de 24 h). No hay código.

**004 · Panel de analítica de la clínica.** Es una página del panel, de solo lectura, con la
ocupación semanal y la tasa de no asistencia por profesional y los ingresos por servicio.
Sirve para que Sara enseñe en las renovaciones lo que CitaClara ahorra a la clínica. Es
propietaria de las fórmulas de los indicadores (p. ej., la tasa de no asistencia, FR-006).
*Estado*: está implementada en `analitica` (`63af298`, más la revisión S3/S5 en `cbf6a02`)
pero no se ha integrado en el tronco. Sus cifras de referencia dependen de que la semilla de
la 001 no cambie.

**005 · Acceso y cancelación del paciente.** Es la única fuente de verdad sobre cómo un
paciente entra a sus datos: un enlace personal estable `/p/[token]` regenerable por
recepción más las 4 últimas cifras de su teléfono, sin cuentas ni contraseñas, con límite de
intentos y acceso que caduca a los 30 minutos sin actividad. También fija hasta cuándo puede
cancelar (24 h antes del inicio, FR-009) y con qué enunciado se le comunica esa política en
cualquier canal. *Estado*: aprobada el 2026-11-07 por su propietario, sin marcadores
pendientes ni conflictos bloqueantes con la 001. Implementada sin commit en esta rama
(migración `0004`, ruta `/p/[token]`, menú «Enlace del paciente» del panel), con pruebas
unitarias y de integración en verde; faltan sus E2E y la prueba manual (ver «Ramas y
worktrees»).

## Conflictos abiertos entre specs

- ~~**S1, plazo de cancelación del paciente.**~~ Resuelto el 2026-11-07: 001 FR-018 remite
  a 005 FR-009 (24 h antes).
- ~~**005 FR-006, segundo factor.**~~ Resuelto el 2026-11-07: enlace + 4 últimas cifras.
  Queda la consecuencia para la 003: su SC-002 (pulsaciones para cancelar desde el correo)
  debe revisarse porque abrir el enlace pide las 4 cifras.
- **002 y 003 aún redefinen acceso y plazo** en sus ramas; deben retirarlo y citar la 005
  (ver «Dependencias y enmiendas requeridas» de la 005). Al integrarse importan de la 005,
  sin redefinirlos, `rutaEnlacePaciente` (`src/dominio/enlace.ts`), `pacientePuedeCancelar`
  y `limiteCancelacionPaciente` (`src/dominio/plazo-paciente.ts`) y
  `enunciadoPoliticaCancelacion` (`src/dominio/politica-cancelacion.ts`).
  `tests/unit/coherencia-politica.test.ts` falla si algún texto redacta el plazo por su cuenta.
- **Orden de integración recomendado** (S8): enmienda de la 001 → 005 → 002 → 003 → 004.
  Al integrar la 004, hay que volver a calcular sus cifras de referencia sobre la semilla
  ampliada.
