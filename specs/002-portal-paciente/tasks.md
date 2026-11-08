---

description: "Lista de tareas de la feature 002-portal-paciente"
---

# Tasks: Portal del paciente

**Input**: Design documents from `/specs/002-portal-paciente/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md.
**La 001 integrada con su enmienda S2–S5** (FR-018a origen de la cancelación, FR-022
teléfono de la clínica) y **la 005 integrada** (acceso, plazo, enunciado, cancelación, ruta
`/p/[token]`, menú «Enlace del paciente», FR-019). Hoy ambas viven en la rama
`005-acceso-cancelacion-paciente` (ver `specs/MAPA.md`, «Ramas y worktrees»): **ninguna
tarea de esta lista empieza hasta integrarla en `portal`**.

**Tests**: OBLIGATORIOS (Constitución, Principio VI). Cada test cita en su nombre el FR,
escenario (p. ej. `002 US2 #4`) o SC de la 002 que cubre; el prefijo `002` evita confusiones
con la 001 y la 005.

**Regla de código (spec, «Dependencias»)**: el código de la 002 **importa** de la 005, sin
redefinirlas ni copiarlas:

| Qué | De dónde |
|-----|----------|
| `rutaEnlacePaciente` | `src/dominio/enlace.ts` |
| `pacientePuedeCancelar`, `limiteCancelacionPaciente` | `src/dominio/plazo-paciente.ts` |
| `enunciadoPoliticaCancelacion` | `src/dominio/politica-cancelacion.ts` |

Ningún archivo de la 002 escribe el plazo por su cuenta (ni su duración ni fórmulas
equivalentes; la lista de patrones prohibidos está en la prueba de coherencia de la 005):
toda mención sale de `enunciadoPoliticaCancelacion` y
`tests/unit/coherencia-politica.test.ts` (de la 005) DEBE seguir en verde.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2, US3)
- Rutas relativas a la raíz del repositorio (proyecto único de la 001, ver plan.md)
- **⛔ [005] / ⛔ [001]**: tarea retirada; lo entrega esa spec. Se conserva una línea como
  rastro para no reutilizar el ID.

## Referencias rápidas

- Decisiones: [research.md](research.md)
- Clasificación y huecos liberados: [data-model.md](data-model.md)
- Lectura del portal, códigos y mensajes: [contracts/server-actions.md](contracts/server-actions.md)
- Rutas y elementos de pantalla: [contracts/ui-routes.md](contracts/ui-routes.md)
- Escenarios de validación: [quickstart.md](quickstart.md)
- Semilla: **2026-11-09** (lunes); reloj `CITACLARA_AHORA=2026-11-09T12:10:00+01:00` salvo que
  el test indique otro. Teléfono de Clínica Eleva: «911 234 567».

---

## Phase 0: Integración previa

- [ ] T000 Integrar en `portal` la rama `005-acceso-cancelacion-paciente` (que trae la 001 enmendada) cuando su propietario la haya cerrado; resolver conflictos de forma aditiva y dejar `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde **sin cambios de la 002**, incluido `tests/unit/coherencia-politica.test.ts`

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 ⛔ [005] Retirada: la URL pública del enlace la construye la 005 (`rutaEnlacePaciente`, 005 FR-005)
- [ ] T002 [P] Añadir a `src/components/ui/` los componentes shadcn/ui que falten para el portal (`card`) sin tocar los que ya aporta la 005 (`tabs`, `alert-dialog`, `sheet`, `badge`)
- [ ] T003 [P] Confirmar en `playwright.config.ts` que los proyectos `movil` (360×800) y `portatil` (1366×768) se ejecutan también sobre `tests/e2e/portal/**`; reutilizar el ayudante de E2E de la 005 que abre el enlace y confirma las 4 cifras

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: depende de T000

- [ ] T004 ⛔ [001] [005] Retirada: esquema (`clinica.telefono`, `cita.cancelada_por`, `enlace_paciente`)
- [ ] T005 ⛔ [001] [005] Retirada: migraciones (la 002 no tiene migración propia)
- [ ] T006 [P] Ampliar `tests/helpers/fabrica.ts` con citas canceladas con `cancelada_por` `paciente` y `recepcion` (valores de 001 FR-018a), reutilizando los ayudantes de la 005 para el enlace
- [ ] T007 ⛔ [001] Retirada: prueba de la migración del origen
- [ ] T008 ⛔ [005] Retirada: el plazo es `pacientePuedeCancelar` / `limiteCancelacionPaciente` de `src/dominio/plazo-paciente.ts` (005 FR-009). No crear `src/dominio/plazo.ts`
- [ ] T009 [P] Implementar en `src/dominio/portal.ts` `clasificarCitas(citas, ahora)` → `{ proximas, historial }` y `etiquetaHistorial(cita, ahora)` según la tabla de clasificación de data-model.md (FR-007, FR-008). No decide si una cita es cancelable
- [ ] T010 ⛔ [005] Retirada: intentos de las 4 cifras (005 FR-006a, `src/dominio/enlace.ts`)
- [ ] T011 [P] Revisar `src/dominio/errores.ts` tras T000: la 002 no añade códigos de acceso ni de plazo (son de la 005); solo, si hace falta, `CITA_NO_ENCONTRADA` con el texto de `contracts/server-actions.md`
- [ ] T012 ⛔ [005] Retirada: pruebas del plazo (005 `tests/unit/plazo-paciente.test.ts` y su FR-010)
- [ ] T013 [P] Escribir `tests/unit/portal.test.ts` (FR-007, FR-008, data-model.md): reservada futura → próximas (orden ascendente); reservada de hoy a las 12:00 con reloj 12:10 → historial «Pasada»; completada → «Realizada»; no asistida → «No asistida»; cancelada futura y pasada → historial «Cancelada»; historial en orden descendente
- [ ] T014–T017 ⛔ [005] Retiradas: intentos, cookie de acceso, servicio de acceso, acciones de entrar/salir (005 FR-006, FR-006a, FR-006b)
- [ ] T018 ⛔ [005] Retirada: `/p/*` fuera de la protección de `/agenda/*` (`src/proxy.ts`, ya en la 005)
- [ ] T019 ⛔ [005] Retirada: layout del portal y pantalla de cifras (`src/app/p/layout.tsx`, `src/components/paciente/`). La 002 solo revisa sus textos en T048
- [ ] T020 ⛔ [005] Retirada: pruebas de acceso (005 SC-001, SC-002)
- [ ] T021 ⛔ [001] [005] Retirada: teléfono, origen y enlaces en la semilla (001 FR-022, FR-018a; 005 FR-019)
- [ ] T022 Ampliar el resumen de `scripts/seed.ts` con **Paciente A** y **Paciente B** elegidos con la regla de research P8 (nombre, teléfono, 4 últimas cifras y ruta de su enlace con `rutaEnlacePaciente`; si no hay Paciente B, indicarlo)
- [ ] T023 Ampliar `tests/integration/semilla.test.ts`: la selección de Paciente A y B es determinista con 2026-11-09 (depende de T022)

**Checkpoint**: con la 005 integrada, un paciente entra en `/p/[token]` y ve la lista provisional de la 005

---

## Phase 3: User Story 1 - Consultar mis citas desde el móvil (Priority: P1) 🎯 MVP

**Goal**: tras entrar (005 FR-006), el paciente ve sus próximas citas y su historial.

**Independent Test**: entrar con el enlace y las 4 cifras del Paciente A y comprobar que las citas coinciden exactamente con las suyas en la semilla y que no aparece ninguna de otro paciente.

### Tests for User Story 1 (MANDATORY - Principle VI) ⚠️

- [ ] T024 [P] [US1] Escribir `tests/integration/portal-lectura.test.ts` para la lectura ampliada del portal: próximas e historial del paciente del acceso con fecha, hora, servicio, profesional y etiqueta (002 US1 #1, #2; FR-007, FR-008); ninguna cita de otro paciente aunque comparta profesional y día (FR-010, SC-004); sin precio ni datos de la agenda (FR-010); clínica con nombre y teléfono (FR-009); paciente sin citas futuras → próximas vacías (002 US1 #3); cada próxima trae `puedeCancelar` y `enunciado` **calculados con las funciones de la 005** (se comprueba comparando con `pacientePuedeCancelar` y `enunciadoPoliticaCancelacion`, no con fechas escritas en el test)
- [ ] T025 ⛔ [005] Retirada: enlace estable, regeneración y acceso caducado (005 US1, US3)
- [ ] T026 [P] [US1] Escribir `tests/e2e/portal/consulta.spec.ts` (semilla 2026-11-09, `movil` y `portatil`): escenarios de consulta de quickstart.md (próximas e historial del Paciente A; Paciente B con «No tienes próximas citas» y teléfono; sin acceso completado no se ve ninguna pantalla del portal, 002 US1 #4; acceso terminado con el portal abierto, 002 US1 #5)

### Implementation for User Story 1

- [ ] T027 [US1] Ampliar `src/servicios/portal-paciente.ts` (de la 005) para que, con el acceso abierto, devuelva también el historial: usar `clasificarCitas` (T009); mantener `puedeCancelar` = `pacientePuedeCancelar(...)` y `enunciado` = `enunciadoPoliticaCancelacion(...)` tal como los calcula la 005, sin recalcularlos ni formatear el límite aparte (depende de T009)
- [ ] T028 [P] [US1] Crear `src/components/portal/tarjeta-cita.tsx` (fecha «lunes, 16/11/2026», hora «10:00–10:45», servicio y profesional; en historial, etiqueta con texto + icono, nunca solo color) y `src/components/portal/lista-vacia.tsx` («No tienes próximas citas. Para pedir una, llama a Clínica Eleva al 911 234 567.» con enlace `tel:`; «Todavía no tienes citas anteriores.»)
- [ ] T029 [US1] Crear `src/components/portal/vista-portal.tsx` con pestañas «Próximas citas» (por defecto) e «Historial» y el botón «Salir» de la 005, y sustituir en `src/app/p/[token]/page.tsx` la lista provisional `ProximasCitas` de la 005 por `VistaPortal` en el caso `dentro`; el resto de casos (no válido, bloqueado, pausa, cifras) se quedan como los entrega la 005. Retirar `proximas-citas.tsx` si nadie más lo usa (depende de T027, T028)
- [ ] T030–T031 ⛔ [005] Retiradas: acciones y menú de enlace del panel (005 FR-004, FR-005; `src/components/agenda/enlace-paciente.tsx`)

**Checkpoint**: el paciente consulta sus citas desde el móvil

---

## Phase 4: User Story 2 - Cancelar una cita futura sin llamar (Priority: P1)

**Goal**: el portal presenta la cancelación de la 005 dentro de sus tarjetas.

**Independent Test**: cancelar desde el portal una cita del Paciente A que la 005 permite cancelar y comprobar «Cancelada» en el portal y en la agenda con el hueco libre; ver una que la 005 ya no permite y comprobar que no hay botón y sí el enunciado.

### Tests for User Story 2 (MANDATORY - Principle VI) ⚠️

- [ ] T032 ⛔ [005] Retirada: reglas de la cancelación (plazo, estado cambiado, cita ajena, enlace regenerado) → 005 `tests/integration/cancelacion-paciente.test.ts`
- [ ] T033 ⛔ [005] Retirada: concurrencia y solape → 005 `tests/integration/cancelacion-concurrencia.test.ts` (005 SC-003)
- [ ] T034 [P] [US2] Escribir `tests/e2e/portal/cancelar.spec.ts` (`movil` y `portatil`): cita cancelable → botón «Cancelar cita» + enunciado; «No, mantenerla» sin cambios; confirmar → «Tu cita del lunes, 16/11/2026 a las 10:00 está cancelada.» y pasa al Historial; en la agenda de recepción, «Cancelada por el paciente» y hueco libre y reservable (002 US2 #1–#3, #7); cita no cancelable → sin botón y con el enunciado (002 US2 #4). **El texto esperado del enunciado se obtiene llamando a `enunciadoPoliticaCancelacion` en el test**, nunca escrito a mano; el foco del diálogo empieza en «No, mantenerla»

### Implementation for User Story 2

- [ ] T035–T036 ⛔ [005] Retiradas: servicio y Server Action de cancelación del paciente (005 FR-009–FR-014; `src/acciones/paciente.ts`)
- [ ] T037 [P] [US2] Ajustar `src/components/paciente/dialogo-cancelar-cita.tsx` (de la 005) solo en presentación, según FR-011 y la guía FR-018: botones «Sí, cancelar» / «No, mantenerla» con foco inicial en este, y mensaje tras cancelar «Tu cita del [día], [dd/mm/aaaa] a las [hh:mm] está cancelada.»; ante un rechazo, cerrar el diálogo, refrescar la lista y mostrar lo que devuelve la 005 (FR-014). Si el cambio afecta a la 005, pedirlo a su propietario en vez de editar
- [ ] T038 [US2] Ampliar `src/components/portal/tarjeta-cita.tsx` para las próximas: si `puedeCancelar`, botón «Cancelar cita» que abre el diálogo de la 005; **siempre**, `<PoliticaCancelacion enunciado={cita.enunciado} …/>` de la 005 debajo, sin ningún otro texto sobre el plazo (FR-011, FR-018a) (depende de T029, T037)

**Checkpoint**: US1 y US2 funcionan; el paciente consulta y cancela sin llamar

---

## Phase 5: User Story 3 - Recepción se entera de los huecos que liberan los pacientes (Priority: P2)

### Tests for User Story 3 (MANDATORY - Principle VI) ⚠️

- [ ] T039 [P] [US3] Escribir `tests/integration/huecos-liberados.test.ts` para `obtenerHuecosLiberados` (FR-015a, data-model.md): cancelación con origen `paciente` futura y libre → aparece; origen `recepcion` → no aparece (002 US3 #2); hueco reocupado total o parcialmente por una cita reservada o completada → desaparece (002 US3 #4); hueco cuyo inicio ya llegó → desaparece; dos cancelaciones de paciente del mismo tramo → una sola entrada (la más reciente); orden por inicio; solo datos de la clínica de la sesión
- [ ] T040 [P] [US3] Ampliar `tests/integration/agenda.test.ts` (001): la vista de la cita expone `canceladaPor` (`paciente` con `canceladaEn` «09/11/2026 12:10», o `recepcion`) (002 US3 #1, #2; 001 FR-018a)
- [ ] T041 [P] [US3] Escribir `tests/e2e/agenda/huecos-liberados.spec.ts` (`movil` y `portatil`): escenarios de recepción de quickstart.md (etiqueta «Cancelada por el paciente»; «Huecos liberados por pacientes (1)» con «María · lunes, 16/11/2026 · 10:00–10:45»; reservar el hueco lo quita y el aviso desaparece)

### Implementation for User Story 3

- [ ] T042 [US3] Mostrar en `src/components/agenda/bloque-cita.tsx` (001) la etiqueta «Cancelada por el paciente» con «el 09/11/2026 a las 12:10» (texto + icono) cuando `cancelada_por = 'paciente'`; las de `recepcion` siguen como «Cancelada». Si la 001 enmendada ya expone el origen en `obtenerAgendaDia`, usarlo; si no, ampliarlo de forma aditiva
- [ ] T043 [US3] Implementar en `src/servicios/huecosLiberados.ts` `obtenerHuecosLiberados(clinicaId)` con la consulta derivada de data-model.md (`cancelada_por = 'paciente'`; `NOT EXISTS` con solape sobre citas `reservada`/`completada` del mismo profesional; `inicio > ahora()`; agrupación por profesional/inicio/fin con la cancelación más reciente) y `enlaceAgenda` a `/agenda/{profesionalId}/{fecha}`
- [ ] T044 [US3] Crear `src/components/agenda/aviso-huecos-liberados.tsx` (botón «Huecos liberados por pacientes (N)» solo si N > 0; `Sheet` lateral en portátil y pantalla completa en móvil con la lista y enlaces a la agenda) e integrarlo en `src/components/cabecera.tsx` (001) (depende de T043)

**Checkpoint**: las tres historias funcionan de forma independiente

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T045 [P] Ejecutar `pnpm seed --fecha-referencia 2026-11-09` y añadir a `docs/datos-demo.md` los Paciente A y B (nombre, ruta de su enlace, 4 últimas cifras, citas próximas y de historial con sus estados) y cómo reproducirlos (Principio V)
- [ ] T046 [P] Escribir `tests/e2e/portal/accesibilidad.spec.ts`: axe sin infracciones AA en el portal (ambas pestañas), las pantallas de acceso de la 005 tal como las presenta el portal, el diálogo de cancelación y el aviso de huecos liberados, en `movil` y `portatil`; sin desplazamiento horizontal a 360 px; objetivos táctiles ≥ 44×44 px; navegación con teclado (SC-006, FR-017)
- [ ] T047 [P] Escribir `tests/e2e/portal/rendimiento.spec.ts`: tras completar el acceso del Paciente A, sus citas se muestran completas en < 2 s
- [ ] T048 Revisar todos los textos visibles que ve el paciente (`src/components/portal/`, `src/components/paciente/`, `src/app/p/`) y los nuevos de `src/components/agenda/` con la guía FR-018 (español de España, «tú», sin jerga, cada error dice qué pasa y qué hacer). Los cambios en archivos de la 005 se piden a su propietario. Comprobar que **ningún** texto nuevo redacta el plazo (FR-018a)
- [ ] T049 [P] Actualizar `README.md` con el portal del paciente (Próximas citas, Historial, aviso de huecos liberados) enlazando a `specs/002-portal-paciente/quickstart.md` y, para el acceso, a la 005
- [ ] T050 Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` (incluido `tests/unit/coherencia-politica.test.ts`) y `pnpm test:e2e` en verde (suite completa de la 001, la 005 y la 002) y recorrer a mano los escenarios de `specs/002-portal-paciente/quickstart.md`
- [ ] T051 Realizar la prueba de usabilidad previa a la entrega (SC-001, SC-002) con 2 personas nuevas en móvil, si es posible en la misma sesión que 005 SC-005/SC-006, y registrar tiempos en `docs/usabilidad-002.md` (tarea manual)
- [ ] T052 Crear `docs/llamadas-eleva.md` con la plantilla de recuento de llamadas de consulta y cancelación para Sonia y el objetivo de −50 % (SC-003)

---

## Dependencies & Execution Order

- **T000 (integrar la 005 con la 001 enmendada)**: bloquea todo lo demás
- **Setup → Foundational → US1 → US2**: US2 amplía la tarjeta (T028) y la página (T029) de US1
- **US3**: tras Foundational; independiente de US1/US2 (sus tests crean cancelaciones con la fábrica)
- **Polish**: tras las historias que se entreguen

### Archivos compartidos

La 002 modifica archivos de la 001 (`bloque-cita.tsx`, `cabecera.tsx`, `agenda.ts` si hace
falta, `scripts/seed.ts` solo el resumen) y de la 005 (`src/app/p/[token]/page.tsx`,
`src/servicios/portal-paciente.ts`, sustituir `proximas-citas.tsx`). Los cambios en archivos
de la 005 se limitan a lo que la 005 previó para la 002 (su research R1: «la 002 la
sustituye por sus pantallas»); cualquier otro cambio en ellos se pide a su propietario.
Nunca se tocan `src/dominio/enlace.ts`, `plazo-paciente.ts` ni `politica-cancelacion.ts`.

### Parallel Opportunities

- Setup: T002 y T003
- Foundational: T006, T009, T011 y T013 en paralelo
- US1: T024, T026 y T028
- US2: T034 y T037
- US3: T039–T041
- Polish: T045–T047 y T049

---

## Implementation Strategy

1. T000 → Setup → Foundational
2. US1 → **PARAR Y VALIDAR**: el Paciente A ve sus próximas citas e historial en el móvil
3. + US2 → cancelación dentro de las tarjetas, con el enunciado de la 005
4. + US3 → recepción aprovecha los huecos liberados
5. Polish → accesibilidad, rendimiento, textos, usabilidad y medición de llamadas
