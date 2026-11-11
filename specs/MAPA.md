# Mapa de specs de CitaClara

Registro global de specs, su propietario único (Constitución, Principio I) y las relaciones
entre ellas. Lo mantiene el propietario de la 001 (revisión cruzada, S3).

**Actualizado**: 2026-11-09 (tercera foto, tras integrar S10 en `main` y `main` en
`recordatorio`, `analitica` y `portal`), a partir de la punta de cada rama
(`main`, `portal`, `recordatorio`, `analitica`, `005-acceso-cancelacion-paciente`), del
estado de cada worktree, de la resolución de cada fusión (`git show --remerge-diff`), de una
fusión simulada entre ramas (`git merge-tree`, sin tocar los worktrees) y de
[`000-revision-cruzada-jul2026.md`](000-revision-cruzada-jul2026.md).

## Tabla de specs

| Nº | Nombre | Propietario | Estado | Escribe en la agenda | Consume | La consumen |
|----|--------|-------------|--------|----------------------|---------|-------------|
| [001](001-agenda-core/spec.md) | Núcleo de agenda | MarceloMansilla | Implementada | Sí | — | 002, 003, 004, 005 |
| [002](002-portal-paciente/spec.md) | Portal del paciente | MarceloMansilla | En revisión | Sí (vía 005) | 001, 005 | 003 |
| [003](003-recordatorios-cita/spec.md) | Recordatorios de cita por correo | MarceloMansilla | Implementada | No | 001, 002, 004, 005 | — |
| [004](004-panel-analitica/spec.md) | Panel de analítica de la clínica | MarceloMansilla | Implementada | No | 001 | 003 (y 001, que le remite el indicador) |
| [005](005-acceso-cancelacion-paciente/spec.md) | Acceso y cancelación del paciente | MarceloMansilla | Implementada | Sí (solo cancelar) | 001 | 002, 003 (y 001, que le remite el acceso del paciente) |

**Criterio de estado**

- *Borrador*: la spec está en `Draft` o tiene `[NEEDS CLARIFICATION]` sin resolver.
- *En revisión*: la spec está aprobada o en revisión pero sin código, o se ha cambiado
  después de aprobarse y tiene trabajo pendiente.
- *Implementada*: hay código y pruebas en su rama.

**Qué significa «consume»**: la spec cita requisitos de la otra y no puede redefinirlos.
Para cada spec, los requisitos concretos que cita se detallan en su sección «Dependencias».

**Dónde vive cada spec**: la 001 y la 005 (con S10) están en `main`; la 002 en `portal`, la 003 en `recordatorio` y la 004 en `analitica`. Los
enlaces a la 002, la 003 y la 004 solo funcionan cuando sus ramas se integren.

## Ramas y worktrees

Foto del 2026-11-09, tras integrar S10 en `main` y `main` en las tres ramas de
funcionalidad (`recordatorio`, `analitica` y `portal`):

- `main` (`4360374`) = tres fusiones: `001-agenda-core` (`e2e3f36`), la 005 con la enmienda
  S2–S5 de la 001 hasta `fb49a91` (`2e43548`) y la 005 con S10 y el mapa anterior
  (`e5a58f7`, fusión `4360374`). Está sincronizada con `origin/main`. `develop` sigue en el
  commit inicial (`b75d4c3`).
- **Conflictos de Git a medias: ninguno.** En los cuatro worktrees no hay fusión, rebase ni
  cherry-pick a medias, ni ficheros sin fusionar, ni marcadores `<<<<<<<`/`>>>>>>>`, ni
  cambios sin commit (salvo este mapa en `citaclara`). Las fusiones `e2e3f36`, `2e43548` y
  `4360374` en `main`, `60be32a` y `dab0420` en `recordatorio`, `1d2fc40` en `portal` y
  `b9834c8` en `analitica` no tienen resolución manual. La de `main` en `portal` (`caae20c`)
  solo resolvió `.specify/feature.json`, con el puntero de la 002
  (`specs/002-portal-paciente`). La de `main` en `analitica`
  (`e1e302f`) sí tiene resolución manual, en los seis ficheros previstos (`.specify/feature.json`,
  `docs/datos-demo.md`, `src/proxy.ts`, `tests/e2e/accesibilidad.spec.ts`,
  `tests/e2e/rendimiento.spec.ts`, `tests/unit/formato.test.ts`), y es correcta: conserva lo
  de las dos ramas (rutas `/analitica` y `/p/*` en el `matcher` del proxy, cifras de la 004 y
  enlaces de la 005, pruebas de las dos, `formatearEntero`/`formatearPorcentaje` y
  `formatearLimite`) y deja el puntero de la 004.
- **Suites tras las últimas fusiones.** `portal` está en verde tras `caae20c` (002 T000:
  lint, typecheck, `pnpm test` con 27 ficheros y 322 pruebas, y `pnpm test:e2e` con 93
  pasadas y 1 omitida por diseño). La última suite en verde de `recordatorio` (003 T027:
  34 ficheros, 373 pruebas) es anterior a `dab0420`, y no consta ninguna ejecución en
  `analitica` después de `e1e302f`. La semilla ampliada de la 005 solo añade enlaces y el
  teléfono de la clínica (`docs/datos-demo.md`: «Los enlaces no cambian ninguna otra cifra»),
  así que las cifras de referencia de la 004 deberían seguir valiendo; lo confirma su suite.
- **Conflictos previstos entre ramas de funcionalidad** (fusión simulada con
  `git merge-tree`): las tres contienen ya `main` entero, y cualquier par
  (`portal`, `recordatorio`, `analitica`) solo choca en `.specify/feature.json`, el puntero
  de Spec Kit de cada rama. Al integrar en `main`, se queda el de la spec que entra.

| Worktree | Rama | Spec | Punta | Sobre `main` (por delante / por detrás) | Base respecto a la 001 | Sin subir a `origin` |
|----------|------|------|-------|-----------------------------------------|------------------------|----------------------|
| — (sin worktree) | `001-agenda-core` | 001 | `899df8e` | 0 / 10 (ya en `main`) | — | 0 |
| `citaclara` (principal) | `005-acceso-cancelacion-paciente` | 005 | commit de este mapa, sobre `e5a58f7` | 0 / 3 (ya en `main`) | `main` | 0 |
| `citaclara-portal` | `portal` | 002 | `167c320` | 8 / 0 | Integró `899df8e` (`1d2fc40`) y después `main` (`caae20c`): 001 enmendada, 005 y S10 | 14 |
| `citaclara-recordatorio` | `recordatorio` | 003 | `1f9b47b` | 9 / 0 | Integró `main` dos veces (`60be32a`, `dab0420`): 001 enmendada, 005 y S10 | 0 |
| `citaclara-analitica` | `analitica` | 004 | `e1e302f` | 6 / 0 | Integró `main` (`e1e302f`): 001 enmendada, 005 y S10 | 12 |

**Trabajo pendiente por worktree**

- **`citaclara` (`005-acceso-cancelacion-paciente`)**: `fa77d42` (S10, trato de usted en
  la 005) ya está en `main`. Tareas abiertas de la 005: T043, T051 y T057 (recorrido
  manual de los escenarios 6–12 del quickstart), T058 (usabilidad con personas reales),
  T059 (interbloqueos `40P01` intermitentes en `solape-concurrencia.test.ts` de la 001,
  CRITICAL) y T060 (citar FR-012/FR-013 en nombres de pruebas). De la 001 solo queda T066
  (usabilidad, manual); T074 ya está en verde (`fb49a91`).
- **`citaclara-portal` (`portal`)**: la 002 está aprobada y alineada con la 005, pero sin
  código. Lleva 1 de 48 tareas: T000 (integrar la 005 y la 001 enmendada) está hecha vía
  `main` (`caae20c`, anotada en `167c320`). La siguiente fase es Setup/Foundational (T011 y
  siguientes). 14 commits sin subir (los 2 anteriores, la fusión, T000 y los 10 de `main`).
- **`citaclara-recordatorio` (`recordatorio`)**: la 003 está implementada (26 de 28 tareas)
  y ya tiene S10 (`dab0420`) y retirada la petición de trato (`1f9b47b`). Quedan T027
  (repetir la suite tras `dab0420`; escenario 7, que necesita la 002) y T028 (usabilidad de
  SC-002, necesita la 002). Todo subido a `origin`.
- **`citaclara-analitica` (`analitica`)**: la 004 está implementada (38 de 39 tareas); queda
  T039 (usabilidad). Ya integró `main` (`e1e302f`); falta pasar la suite (lint, typecheck,
  `pnpm test`, E2E) para confirmar la fusión y las cifras de referencia. 12 commits sin
  subir (`70dc7d7`, `e1e302f` y los 10 de `main`).

**Consecuencias para la integración**

- La enmienda S2–S5 de la 001, la 005 y S10 ya están en `main` y en las tres ramas de
  funcionalidad. Ninguna va por detrás de `main`.
- Al integrar cada rama en `main`, el único conflicto previsto es `.specify/feature.json`.
  Antes de eso, `recordatorio` y `analitica` tienen que pasar la suite, y las tres ramas
  tienen commits sin subir a `origin` salvo `recordatorio`.

## Dominio de cada spec

**001 · Núcleo de agenda.** Es la agenda de recepción y la base de todo el sistema: clínica,
profesionales, servicios, fichas de paciente, citas y sus estados (reservada → completada,
cancelada o no asistida). También define las reglas sin solape y sin citas en el pasado, el
plazo de cancelación de recepción (FR-018, que remite a la 005 para el del paciente), el
origen de la cancelación (FR-018a), el teléfono
de la clínica y la semilla determinista de Clínica Eleva. Es la única spec que todas las
demás consumen. *Estado*: implementada e integrada en `main`, con la enmienda de la revisión
cruzada S2–S5 (`cancelada_por` y el teléfono de la clínica, migraciones 0002 y 0003) y la
suite completa en verde (001 T074, `fb49a91`). La enmienda S1 (plazo del paciente → 005
FR-009) solo afecta a la spec. Queda la prueba de usabilidad (T066) y el fallo intermitente
de concurrencia que recoge 005 T059.

**002 · Portal del paciente.** Es la página móvil donde el paciente ve sus citas futuras y
pasadas y las cancela. En recepción añade «Cancelada por el paciente», el aviso de huecos
liberados y las acciones del enlace del portal. Tras la revisión cruzada ya no define el
acceso ni el plazo: los toma de la 005 y se queda con las pantallas, los datos visibles y la
guía de textos y trato al paciente. *Estado*: aprobada y alineada con la 005: la enmienda
«fuente única 005» (`7fae08e`) retiró sus definiciones de acceso y plazo y cita 005 FR-006 y
FR-009, y su FR-018 ya fija el trato de «usted» (S10, `33d2323`). Ya tiene `main` integrado
(`caae20c`, T000), con la suite en verde, pero todavía no tiene código propio (1 de 48 tareas).

**003 · Recordatorios de cita por correo.** Es el proceso diario que envía un correo de
recordatorio por cada cita reservada próxima, sin duplicar envíos. Sin SMTP, el correo se
simula con ficheros `.eml`. Cada correo lleva el enlace personal y el enunciado de la
política de cancelación de la 005, y su éxito se mide con la tasa de no asistencia de la 004.
*Estado*: aprobada el 2026-11-08 y alineada con la 005 (`d416833`): P1 resuelta (el envío
sigue siendo a las 08:00 de la víspera y el plazo no se toca) y SC-002 revisado por 005
FR-006. Implementada en `recordatorio` (`7f52f24`, migración `0005`), usando los módulos de
la 005 sin redefinirlos, y con S10 integrado (`dab0420`, `1f9b47b`): el enunciado del correo
ya va en «usted». Faltan el escenario 7 y la usabilidad, que necesitan la 002.

**004 · Panel de analítica de la clínica.** Es una página del panel, de solo lectura, con la
ocupación semanal y la tasa de no asistencia por profesional y los ingresos por servicio.
Sirve para que Sara enseñe en las renovaciones lo que CitaClara ahorra a la clínica. Es
propietaria de las fórmulas de los indicadores (p. ej., la tasa de no asistencia, FR-006).
*Estado*: está implementada en `analitica` (`63af298`, más la revisión S3/S5 en `cbf6a02` y
`70dc7d7`) y tiene `main` integrado (`e1e302f`), pero no ha entrado en el tronco. Sus cifras de
referencia dependen de que la semilla de la 001 no cambie; la ampliación de la 005 no las
toca, pero falta confirmarlo con la suite.

**005 · Acceso y cancelación del paciente.** Es la única fuente de verdad sobre cómo un
paciente entra a sus datos: un enlace personal estable `/p/[token]` regenerable por
recepción más las 4 últimas cifras de su teléfono, sin cuentas ni contraseñas, con límite de
intentos y acceso que caduca a los 30 minutos sin actividad. También fija hasta cuándo puede
cancelar (24 h antes del inicio, FR-009) y con qué enunciado se le comunica esa política en
cualquier canal. *Estado*: aprobada el 2026-11-07 e integrada en `main` (migración `0004`,
ruta `/p/[token]`, menú «Enlace del paciente» del panel), con lint, typecheck, `pnpm test` y
E2E en verde. El trato de «usted» (S10, `fa77d42`) también está en `main`.
Faltan el recorrido manual 6–12, la usabilidad y T059–T060 (ver «Ramas y worktrees»).

## Conflictos abiertos entre specs

- ~~**S1, plazo de cancelación del paciente.**~~ Resuelto el 2026-11-07: 001 FR-018 remite
  a 005 FR-009 (24 h antes).
- ~~**005 FR-006, segundo factor.**~~ Resuelto el 2026-11-07: enlace + 4 últimas cifras.
  La 003 revisó su SC-002 el 2026-11-08 (4 acciones: enlace, 4 cifras, pedir cancelar y
  confirmar).
- ~~**002 y 003 redefinían acceso y plazo.**~~ Resuelto el 2026-11-08: la 002 (`7fae08e`) y
  la 003 (`d416833`) citan la 005 y no los redefinen. La 003 ya importa de la 005, sin
  redefinirlos, `rutaEnlacePaciente` (`src/dominio/enlace.ts`), `limiteCancelacionPaciente`
  (`src/dominio/plazo-paciente.ts`) y `enunciadoPoliticaCancelacion`
  (`src/dominio/politica-cancelacion.ts`); la 002 deberá hacer lo mismo al implementarse.
  `tests/unit/coherencia-politica.test.ts` falla si algún texto redacta el plazo por su cuenta.
- ~~**003 P1, margen del envío de la víspera.**~~ Resuelto el 2026-11-08: se mantiene el
  envío a las 08:00 de la víspera; el plazo es de la 005 y no se toca.
- ~~**S10, trato al paciente.**~~ Resuelto el 2026-11-08: «usted» en todos los canales.
  Aplicado en la 005 (`fa77d42`, en `main`), la 002 (FR-018, `33d2323`) y la 003: correo
  (FR-008), enunciado de la 005 al integrar `main` (`dab0420`) y petición «005 / 002 — trato
  del enunciado» retirada de su spec (`1f9b47b`). La 002 ya tiene el código de S10 (`caae20c`)
  y deberá usarlo al implementarse.
- **Orden de integración recomendado** (S8): enmienda de la 001 → 005 → 002 → 003 → 004.
  Hecho hasta la 005 (con S10), y las tres ramas de funcionalidad ya tienen `main`.
  Siguiente paso: implementar la 002 en `portal` y, cuando esté, integrarla en `main`; la
  003 no debe entrar antes. `recordatorio` y `analitica` solo tienen pendiente pasar la suite.
