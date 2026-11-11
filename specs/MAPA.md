# Mapa de specs de CitaClara

Registro global de specs, su propietario único (Constitución, Principio I) y las relaciones
entre ellas. Lo mantiene el propietario de la 001 (revisión cruzada, S3).

**Actualizado**: 2026-11-08 (segunda foto, tras integrar la 001 y la 005 en `main`), a partir
de la punta de cada rama (`main`, `portal`, `recordatorio`, `analitica`,
`005-acceso-cancelacion-paciente`), del estado de cada worktree y de
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

Foto del 2026-11-08, tras integrar la 001 y la 005 en `main`:

- `main` (`2e43548`) = `001-agenda-core` (`e2e3f36`) + la 005 con la enmienda S2–S5 de la
  001 hasta `fb49a91` (`2e43548`), y después la 005 con S10 y este mapa (tercera fusión). Está
  sincronizada con `origin/main`. `develop` sigue en
  el commit inicial (`b75d4c3`).
- **Conflictos de Git: ninguno pendiente.** En los cuatro worktrees no hay fusión, rebase ni
  cherry-pick a medias, ni ficheros sin fusionar, ni marcadores `<<<<<<<`/`>>>>>>>` en los
  ficheros versionados, y todos están sin cambios sin commit. Ninguna de las fusiones
  (`e2e3f36` y `2e43548` en `main`, `60be32a` en `recordatorio`, `1d2fc40` en `portal`,
  `b9834c8` en `analitica`) tiene ficheros con resolución manual (`git show --cc` vacío).
  Después de `60be32a`, la suite de `recordatorio` está en verde (003 T027: 34 ficheros,
  373 pruebas).

| Worktree | Rama | Spec | Punta | Sobre `main` (por delante / por detrás) | Base respecto a la 001 | Sin subir a `origin` |
|----------|------|------|-------|-----------------------------------------|------------------------|----------------------|
| — (sin worktree) | `001-agenda-core` | 001 | `899df8e` | 0 / 7 (ya en `main`) | — | 0 |
| `citaclara` (principal) | `005-acceso-cancelacion-paciente` | 005 | commit de este mapa, sobre `fa77d42` | 0 / 3 (ya en `main`) | `main` | 0 |
| `citaclara-portal` | `portal` | 002 | `33d2323` | 6 / 7 | Integró `899df8e` (`1d2fc40`); sin la enmienda S2–S5 ni la 005 | 2 |
| `citaclara-recordatorio` | `recordatorio` | 003 | `7f52f24` | 6 / 0 | Integró `main` (`60be32a`): 001 enmendada y 005 hasta `fb49a91`, sin S10 | 12 |
| `citaclara-analitica` | `analitica` | 004 | `70dc7d7` | 5 / 7 | Integró `899df8e` (`b9834c8`); sin la enmienda S2–S5 ni la 005 | 1 |

**Trabajo pendiente por worktree**

- **`citaclara` (`005-acceso-cancelacion-paciente`)**: `fa77d42` (S10, trato de usted en
  la 005) ya está en `main`. Tareas abiertas de la 005: T043, T051 y T057 (recorrido
  manual de los escenarios 6–12 del quickstart), T058 (usabilidad con personas reales),
  T059 (interbloqueos `40P01` intermitentes en `solape-concurrencia.test.ts` de la 001,
  CRITICAL) y T060 (citar FR-012/FR-013 en nombres de pruebas). De la 001 solo queda T066
  (usabilidad, manual); T074 ya está en verde (`fb49a91`).
- **`citaclara-portal` (`portal`)**: la 002 está aprobada y alineada con la 005, pero sin
  código (0 de 48 tareas). 2 commits sin subir.
- **`citaclara-recordatorio` (`recordatorio`)**: la 003 está implementada (26 de 28 tareas).
  Quedan T027, escenario 7 del quickstart (necesita la 002), y T028 (usabilidad de SC-002,
  necesita la 002 y la 005). 12 commits sin subir.
- **`citaclara-analitica` (`analitica`)**: la 004 está implementada (38 de 39 tareas); queda
  T039 (usabilidad). 1 commit sin subir (`70dc7d7`, documentos y una prueba E2E).

**Consecuencias para la integración**

- La enmienda S2–S5 de la 001 ya está en `main` junto con la 005.
- `portal` y `analitica` tienen que integrar `main` (7 commits por detrás): reciben la 001
  enmendada (migraciones `0002`–`0004`, `cancelada_por`, teléfono de la clínica) y la 005.
  Al integrar la 004 hay que volver a calcular sus cifras de referencia sobre la semilla
  ampliada.
- `fa77d42` (S10) ya está en `main`, y `recordatorio` debe volver a integrar `main`:
  hoy su correo usa «usted» (003 FR-008) pero incluye el enunciado de la 005 todavía en
  «tú» («Puedes cancelar… llama a…»), porque su copia de `politica-cancelacion.ts` es
  anterior a S10.

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
FR-009, y su FR-018 ya fija el trato de «usted» (S10, `33d2323`). No hay código (0 de 48
tareas).

**003 · Recordatorios de cita por correo.** Es el proceso diario que envía un correo de
recordatorio por cada cita reservada próxima, sin duplicar envíos. Sin SMTP, el correo se
simula con ficheros `.eml`. Cada correo lleva el enlace personal y el enunciado de la
política de cancelación de la 005, y su éxito se mide con la tasa de no asistencia de la 004.
*Estado*: aprobada el 2026-11-08 y alineada con la 005 (`d416833`): P1 resuelta (el envío
sigue siendo a las 08:00 de la víspera y el plazo no se toca) y SC-002 revisado por 005
FR-006. Implementada en `recordatorio` (`7f52f24`, migración `0005`), usando los módulos de
la 005 sin redefinirlos; faltan el escenario 7 y la usabilidad, que necesitan la 002.

**004 · Panel de analítica de la clínica.** Es una página del panel, de solo lectura, con la
ocupación semanal y la tasa de no asistencia por profesional y los ingresos por servicio.
Sirve para que Sara enseñe en las renovaciones lo que CitaClara ahorra a la clínica. Es
propietaria de las fórmulas de los indicadores (p. ej., la tasa de no asistencia, FR-006).
*Estado*: está implementada en `analitica` (`63af298`, más la revisión S3/S5 en `cbf6a02` y
`70dc7d7`) pero no se ha integrado en el tronco. Sus cifras de referencia dependen de que la semilla de
la 001 no cambie.

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
- **S10, trato al paciente.** Decidido el 2026-11-08: «usted» en todos los canales. Aplicado
  en la 005 (`fa77d42`, en `main`), la 002 (FR-018, `33d2323`) y el correo de la 003
  (FR-008). Quedan dos pasos:
  - integrar `main` en `recordatorio`, para que el enunciado del correo
    deje de ir en «tú»;
  - que la 003 retire la petición «005 / 002 — trato del enunciado» de su spec (líneas
    218–219 y 347–351 de `specs/003-recordatorios-cita/spec.md`), porque ya está atendida.
- **Orden de integración recomendado** (S8): enmienda de la 001 → 005 → 002 → 003 → 004.
  Hecho hasta la 005; `recordatorio` ya integró `main`, pero la 003 no debe entrar en `main`
  antes que la 002. Al integrar la 004, hay que volver a calcular sus cifras de referencia
  sobre la semilla ampliada.
