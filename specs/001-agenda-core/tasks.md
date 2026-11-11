---

description: "Lista de tareas de la feature 001-agenda-core"
---

# Tasks: Núcleo de agenda de CitaClara

**Input**: Design documents from `/specs/001-agenda-core/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: OBLIGATORIOS (Constitución, Principio VI). Cada test cita en su nombre el FR, escenario
(p. ej. `US2 #2`) o SC que cubre. La feature escribe en la agenda: las pruebas de solape,
incluidas reservas simultáneas del mismo hueco, son obligatorias (Principio III).

**Organization**: tareas agrupadas por historia de usuario para implementarlas y probarlas de
forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2, US3)
- Rutas relativas a la raíz del repositorio (proyecto único, ver plan.md)

## Referencias rápidas

- Stack y decisiones: [research.md](research.md) (R1–R10)
- Esquema, restricciones y transiciones: [data-model.md](data-model.md)
- Acciones, códigos de error y mensajes: [contracts/server-actions.md](contracts/server-actions.md)
- Rutas y elementos de pantalla: [contracts/ui-routes.md](contracts/ui-routes.md)
- Escenarios de validación: [quickstart.md](quickstart.md)
- Fecha de referencia de la semilla en tests y documentación: **2026-11-09** (lunes);
  reloj fijado con `CITACLARA_AHORA=2026-11-09T12:10:00+01:00` salvo que el test indique otro.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicializar el proyecto y sus herramientas

- [X] T001 Inicializar en la raíz un proyecto Next.js 16 (App Router, carpeta `src/`, TypeScript estricto, pnpm) creando `package.json`, `tsconfig.json`, `next.config.ts` y `src/app/` sin páginas de ejemplo
- [X] T002 Añadir dependencias en `package.json`: `drizzle-orm`, `pg`, `zod`, `date-fns`, `@date-fns/tz`, `jose`, `@node-rs/argon2`, `lucide-react`; de desarrollo: `drizzle-kit`, `tsx`, `vitest`, `@testcontainers/postgresql`, `@playwright/test`, `@axe-core/playwright`, `@types/pg`
- [X] T003 [P] Configurar Tailwind CSS 4 y shadcn/ui (`components.json`, `src/components/ui/` con button, input, label, select, tabs, dialog, alert-dialog, sheet, calendar, popover, command, badge, sonner), fuente Inter con `next/font` y tokens de tema claro/oscuro con contraste AA en `src/app/globals.css`
- [X] T004 [P] Configurar ESLint y Prettier y añadir scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `seed` en `package.json`
- [X] T005 [P] Crear `docker-compose.yml` con servicio `db` (postgres:18, puerto 5432, volumen) y `.env.example` con `DATABASE_URL`, `SESION_SECRETO`, `CLAVE_DEMO=eleva-demo` y `CITACLARA_AHORA` (vacío); añadir `.env` y artefactos de pruebas a `.gitignore`
- [X] T006 [P] Crear `vitest.config.ts` con proyectos `unit` (`tests/unit/**`) e `integration` (`tests/integration/**`, sin paralelismo entre archivos) y `playwright.config.ts` con proyectos `portatil` (1366×768) y `movil` (360×800), `webServer` que arranca la app con `CITACLARA_AHORA`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: base de datos, utilidades de fecha/formato, reglas puras compartidas, acceso con clave y semilla

**⚠️ CRITICAL**: ninguna historia puede empezar hasta completar esta fase

### Base de datos

- [X] T007 Definir el esquema Drizzle en `src/db/esquema.ts` según data-model.md: enums `especialidad` (`fisioterapia`, `nutricion`) y `estado_cita`; tablas `clinica`, `profesional`, `servicio`, `paciente`, `cita` con sus columnas, FKs, checks (`duracion_minutos > 0` y múltiplo de 15, `precio_centimos >= 0`) e índices `cita (clinica_id, profesional_id, inicio)` y `paciente (clinica_id, nombre)`
- [X] T008 Generar la migración inicial con drizzle-kit en `src/db/migraciones/` y añadir la migración SQL propia `src/db/migraciones/0001_restricciones.sql` con `CREATE EXTENSION btree_gist`, `CREATE EXTENSION unaccent`, la restricción `cita_sin_solape` (EXCLUDE gist sobre `profesional_id` y `tstzrange(inicio, fin, '[)')` con `WHERE estado IN ('reservada','completada')`), `cita_fin_posterior` y el índice único `(clinica_id, telefono_normalizado)`
- [X] T009 Crear el cliente de BD con pool y ayudante `enTransaccion()` en `src/db/cliente.ts` y el script de migración `scripts/migrar.ts` (usado por `pnpm db:migrate`)
- [X] T010 Crear ayudantes de pruebas: `tests/helpers/bd.ts` (arranca PostgreSQL 18 con Testcontainers, aplica migraciones, vacía tablas entre tests) y `tests/helpers/fabrica.ts` (crea clínicas, profesionales, servicios, pacientes y citas mínimos de una única clínica)

### Utilidades y reglas puras compartidas

- [X] T011 [P] Implementar `ahora()` en `src/lib/reloj.ts`, que devuelve `CITACLARA_AHORA` si está definido y si no la hora real, con `fijarAhora()` para tests
- [X] T012 [P] Implementar en `src/lib/zona.ts` la conversión fecha local `AAAA-MM-DD` + `HH:mm` en la zona IANA de la clínica ↔ instante UTC, el día local de un instante y el rango [00:00, 24:00) de un día local, con `@date-fns/tz`
- [X] T013 [P] Implementar en `src/lib/formato.ts` `formatearFecha` («lunes, 16/11/2026»), `formatearHora` (24 h), `formatearRango` («10:00–10:45», con guion largo) y `formatearPrecio` (céntimos → «40,00 €» con `Intl.NumberFormat('es-ES')`)
- [X] T014 [P] Definir en `src/dominio/errores.ts` el tipo `Resultado<T>`, la enumeración `CodigoError` y las funciones que construyen los mensajes del contrato (`contracts/server-actions.md`), con nombres, horas y estados interpolados
- [X] T015 [P] Implementar en `src/dominio/horario.ts` las funciones puras `esLaborable(fecha, clinica)`, `esMultiploDe15(hora)` y `cabeEnHorario(inicioLocal, duracion, clinica)` (09:00–20:00, lunes a viernes; FR-014)
- [X] T016 [P] Implementar en `src/dominio/estados.ts` las funciones puras `accionesDisponibles(cita, ahora)` y `validarTransicion(cita, accion, ahora)` según FR-017–FR-019 (cancelar solo si ahora < inicio; completar y no asistida solo si ahora ≥ inicio; estados finales sin acciones)
- [X] T017 [P] Escribir tests unitarios en `tests/unit/zona.test.ts` y `tests/unit/formato.test.ts`: ejemplos del Principio II (09:30 + 45′ → 10:15), días de cambio de hora 29/03/2026 y 25/10/2026 sin efecto entre 09:00 y 20:00, zona `Atlantic/Canary` una hora menos que `Europe/Madrid`, formatos «lunes, 16/11/2026», «10:00–10:45» y «40,00 €», «50,00 €», «35,00 €», «45,00 €»
- [X] T018 [P] Escribir tests unitarios en `tests/unit/horario.test.ts` (FR-014: duración de servicio no múltiplo de 15 rechazada, 19:00 + 60′ válida, 19:15 + 60′ y 19:30 + 60′ fuera de horario, 08:45 fuera, sábado y domingo no laborables, 10:10 no múltiplo de 15) y `tests/unit/estados.test.ts` (FR-017–FR-019, US3 #4 y #5)

### Catálogo y acceso con clave (FR-001–FR-004)

- [X] T019 [P] Implementar en `src/lib/sesion.ts` la creación y verificación de la cookie de sesión firmada con jose (HS256, `httpOnly`, `Secure` en producción, `SameSite=Lax`, 12 h, con `clinicaId`) y `obtenerClinicaDeSesion()`, que devuelve `SESION_CADUCADA` si falta o ha caducado
- [X] T020 Implementar en `src/servicios/acceso.ts` `verificarClave(clave)` con Argon2id contra `clinica.clave_hash` y las Server Actions `entrar` y `salir` en `src/acciones/acceso.ts` (depende de T019)
- [X] T021 Implementar en `src/proxy.ts` (convención de Next.js 16; si la versión instalada aún usa `middleware.ts`, usar ese nombre) la protección de `/agenda/*`, que redirige a `/entrar?motivo=sesion` sin sesión válida, y de `/entrar`, que redirige a `/agenda` con sesión válida (depende de T019)
- [X] T022 [P] Implementar en `src/servicios/catalogo.ts` `listarProfesionales`, `obtenerProfesional` y `listarServiciosDeEspecialidad`, siempre filtrados por el `clinicaId` de la sesión (FR-004)
- [X] T023 Crear el layout raíz `src/app/layout.tsx` (`lang="es"`, Inter, `Toaster`), la cabecera `src/components/cabecera.tsx` (nombre de la clínica y botón «Cerrar sesión») y la pantalla `src/app/entrar/page.tsx` con `src/components/acceso/formulario-clave.tsx` (campo con etiqueta, error «La clave no es correcta. Revísala e inténtalo de nuevo.» y aviso de sesión terminada)
- [X] T024 Escribir `tests/integration/acceso.test.ts`: clave correcta e incorrecta contra la única clínica de la instalación (FR-001, FR-002), sesión caducada a las 12 h y servicios que exigen `clinicaId` de una sesión válida (FR-004)
- [X] T025 Escribir `tests/e2e/acceso.spec.ts`: US1 #1 (sin sesión, redirige a `/entrar` sin datos), US1 #2 (clave incorrecta), FR-003 (cerrar sesión vuelve a pedir la clave) y sesión caducada con el aviso «Tu sesión ha terminado…»

### Datos de demostración deterministas (FR-021–FR-024)

- [X] T026 [P] Implementar el PRNG mulberry32 con semilla fija `20261107` en `src/semilla/prng.ts` y las listas de nombres, apellidos y prefijos móviles españoles ficticios en `src/semilla/catalogo.ts` (sin faker)
- [X] T027 Implementar en `src/semilla/generar.ts` el generador puro `generarSemilla(fechaReferencia)`: Clínica Eleva (`Europe/Madrid`, 09:00–20:00, L–V, hash de `CLAVE_DEMO`); María y Jorge (fisioterapia) y Lucía (nutrición); los 4 servicios con duración y precio en céntimos; 40 pacientes con teléfonos distintos; citas en huecos de 15 min sin solapes y solo con servicios de la especialidad del profesional; historia = 40 días laborables anteriores a la fecha de referencia con exactamente `round(0,10·N)` no asistidas y `round(0,08·N)` canceladas elegidas barajando con el PRNG, el resto completadas; futuro = fecha de referencia + 9 días laborables siguientes, todo reservado; todos los `uuid` se derivan del PRNG en orden fijo (FR-021, research R8) (depende de T026, T012, T015)
- [X] T028 Implementar `scripts/seed.ts` (`pnpm seed --fecha-referencia AAAA-MM-DD`, por defecto hoy): vacía los datos, inserta `generarSemilla()` en una sola transacción respetando las restricciones de la BD e imprime un resumen con el total de citas por estado y profesional (depende de T027, T009)
- [X] T029 Escribir `tests/integration/semilla.test.ts`: dos generaciones con la fecha 2026-11-09 son idénticas, identificadores incluidos y excluyendo solo `clave_hash`, y la clave demo verifica contra ambos hashes (FR-021, SC-005), no asistidas = 10 % ± 1 y canceladas = 8 % ± 1 de la historia, la inserción en la BD real no viola `cita_sin_solape`, todas las citas cumplen horario y granularidad (FR-024), especialidades coherentes (FR-023), 40 pacientes con teléfono normalizado único, historia solo en estados finales y futuro solo reservado

**Checkpoint**: base lista; las historias pueden empezar en paralelo

---

## Phase 3: User Story 1 - Consultar la agenda del día de un profesional (Priority: P1) 🎯 MVP

**Goal**: recepción entra con la clave y ve, por profesional y día, las citas y los huecos libres.

**Independent Test**: con `pnpm seed --fecha-referencia 2026-11-09`, entrar, elegir a María y un día de la historia y comprobar que citas y huecos coinciden con la semilla.

### Tests for User Story 1 (MANDATORY - Principle VI) ⚠️

> **NOTE: escribir estos tests PRIMERO y comprobar que FALLAN antes de implementar**

- [X] T030 [P] [US1] Escribir `tests/unit/huecos.test.ts`: ejemplo de data-model.md (citas 10:00–10:45 y 12:00–13:00 → libres 09:00–10:00, 10:45–12:00, 13:00–20:00), canceladas y no asistidas no ocupan (FR-006, US1 #5), día sin citas → 09:00–20:00, día no laborable → sin huecos, `reservable` falso para tramos pasados
- [X] T031 [P] [US1] Escribir `tests/integration/agenda.test.ts` para `obtenerAgendaDia`: orden cronológico con todos los estados (FR-005), huecos libres (FR-006), `accionesDisponibles` correctas, etiqueta de fecha en español, día local correcto con citas a las 09:00 y 19:45
- [X] T032 [P] [US1] Escribir `tests/e2e/agenda.spec.ts` (semilla 2026-11-09): US1 #3 (tras entrar, hoy y primer profesional), US1 #4 (cambio a Jorge, «Siguiente ›», selector de fecha), US1 #5 (cancelada atenuada y su hueco libre), día no laborable con «La clínica no abre este día.»

### Implementation for User Story 1

- [X] T033 [P] [US1] Implementar en `src/dominio/huecos.ts` `calcularHuecosLibres(citasDelDia, horarioDelDia, ahora)`, que resta del horario la unión de los intervalos `reservada`/`completada` y marca `reservable` solo para tramos futuros
- [X] T034 [US1] Implementar en `src/servicios/agenda.ts` `obtenerAgendaDia({ profesionalId, fecha })`, que devuelve `AgendaDia` y `CitaVista` según el contrato usando `zona.ts`, `formato.ts`, `huecos.ts` y `estados.ts` (depende de T033, T022)
- [X] T035 [US1] Crear `src/app/agenda/page.tsx`, que redirige a `/agenda/{primerProfesional}/{hoy local}` (orden por `profesional.orden`)
- [X] T036 [P] [US1] Crear `src/components/agenda/selector-profesional.tsx` (pestañas en portátil, desplegable en móvil, con nombre y especialidad) y `src/components/agenda/navegacion-dia.tsx` («‹ Anterior», «Hoy», «Siguiente ›», selector de fecha y etiqueta «lunes, 16/11/2026»)
- [X] T037 [P] [US1] Crear `src/components/agenda/linea-tiempo.tsx` (09:00–20:00, línea de «ahora» si es hoy), `src/components/agenda/bloque-cita.tsx` (hora, paciente, servicio y estado con color, icono y texto; canceladas y no asistidas atenuadas) y `src/components/agenda/bloque-hueco.tsx` (borde discontinuo y botón «Reservar» enlazado a `nueva?hora=HH:mm` si es reservable)
- [X] T038 [US1] Crear `src/app/agenda/[profesionalId]/[fecha]/page.tsx` combinando cabecera, selector, navegación y línea de tiempo, más `loading.tsx` («Cargando la agenda…») y `not-found.tsx` («No encontramos esa agenda» con enlace a hoy) en la misma carpeta (depende de T034, T036, T037)

**Checkpoint**: la US1 funciona y se demuestra sola con la semilla

---

## Phase 4: User Story 2 - Dar de alta una cita sin solapes (Priority: P1)

**Goal**: registrar citas, con alta rápida de paciente, sin solapes ni citas en el pasado, también con reservas simultáneas.

**Independent Test**: crear una cita en un hueco libre futuro; intentar un solape, una cita en el pasado y dos altas simultáneas del mismo hueco; solo la válida (y una de las simultáneas) queda registrada.

### Tests for User Story 2 (MANDATORY - Principle VI) ⚠️

- [X] T039 [P] [US2] Escribir `tests/unit/solape.test.ts` para `seSolapan`: solape parcial por el inicio y por el final, contenida, contenedora, idéntica, contigua antes y después (no solapan)
- [X] T040 [P] [US2] Escribir `tests/unit/telefono.test.ts` (FR-016b): «612 345 678», «612-345-678», «+34 612345678» y «0034612345678» → `612345678`; rechaza menos o más de 9 cifras, primeras cifras distintas de 6, 7, 8 o 9 («512 345 678») y prefijos extranjeros («+44 7700 900123») (FR-016c)
- [X] T041 [P] [US2] Escribir `tests/integration/crear-cita.test.ts`: US2 #1 (fin calculado 10:00–10:45, estado reservada; FR-009, FR-010), US2 #2 (`SOLAPE` citando 10:00–10:45), US2 #3 (contigua permitida), US2 #4 (cancelada no bloquea), US2 #5 (otro profesional permitido), US2 #6 (`EN_EL_PASADO`, hoy 12:00 con ahora 12:10, comprobado al guardar), US2 #8 (`FUERA_DE_HORARIO`), sábado y domingo rechazados con `FUERA_DE_HORARIO`, `HORA_NO_VALIDA`, `SERVICIO_INCOMPATIBLE` (FR-009a), US2 #9 (paciente nuevo + cita) y que si la cita falla no queda ficha creada; cada rechazo comprueba además el texto exacto del mensaje del contrato (FR-015)
- [X] T042 [P] [US2] Escribir `tests/integration/solape-concurrencia.test.ts` (Principio III, FR-012, SC-001): ráfaga de 10 `crearCita` en paralelo sobre el mismo hueco → exactamente 1 registrada y 9 rechazos `SOLAPE`/`HUECO_OCUPADO_A_LA_VEZ`; ráfaga sobre huecos parcialmente solapados → sin solapes; 100 ráfagas aleatorias deterministas (1.000 intentos) → 0 pares solapados en la BD; un `INSERT` SQL directo que salte el servicio también es rechazado; una no asistida o completada en el mismo tramo se comporta según FR-011
- [X] T043 [P] [US2] Escribir `tests/integration/pacientes.test.ts`: búsqueda por nombre sin distinguir mayúsculas ni tildes («maria» encuentra «María») y por teléfono en cualquier formato (FR-016), máximo 10 resultados, `crearPaciente` válido (FR-016a), teléfono extranjero rechazado con «Revisa el teléfono: debe ser un número español de 9 cifras.» (FR-016c), `TELEFONO_DUPLICADO` con otro formato y con el nombre de la ficha existente, 2 altas simultáneas con el mismo teléfono → 1 ficha (FR-016b)
- [X] T044 [P] [US2] Escribir `tests/e2e/alta-cita.spec.ts`: escenarios 5–11 de quickstart.md (alta desde hueco, solape, contigua, pasado, fuera de horario, teléfono duplicado con «Usar esta ficha», solo servicios de Fisioterapia para María) y escenario 14 (dos contextos de navegador reservan el mismo hueco a la vez → uno ve «Este hueco se acaba de ocupar…»)

### Implementation for User Story 2

- [X] T045 [P] [US2] Implementar en `src/dominio/solape.ts` `seSolapan(a, b)` con intervalos semiabiertos (`a.inicio < b.fin && b.inicio < a.fin`)
- [X] T046 [P] [US2] Implementar en `src/dominio/telefono.ts` `normalizarTelefono` y `validarTelefono`
- [X] T047 [P] [US2] Definir en `src/acciones/esquemas.ts` los esquemas Zod de `crearCita`, `crearPaciente` y `buscarPacientes` (fecha `AAAA-MM-DD`, hora `HH:mm`, paciente existente o nuevo, nombre de 2–120 caracteres, correo opcional), con mensajes en español
- [X] T048 [US2] Implementar en `src/servicios/pacientes.ts` `buscarPacientes` (ILIKE con `unaccent` sobre el nombre o coincidencia por `telefono_normalizado`, máximo 10) y `crearPaciente`, que traduce la violación del índice único (23505) a `TELEFONO_DUPLICADO` con `{ pacienteId, nombre }` y acepta una transacción externa (depende de T046)
- [X] T049 [US2] Implementar en `src/servicios/citas.ts` `crearCita` dentro de `enTransaccion()` con el orden de validación del contrato (datos → servicio compatible → granularidad → horario → pasado según `ahora()` → paciente nuevo → inserción); comprobar antes el conflicto para devolver `SOLAPE` con la cita con la que choca, y traducir el error 23P01 de `cita_sin_solape` a `HUECO_OCUPADO_A_LA_VEZ` (depende de T045, T048)
- [X] T050 [US2] Implementar las Server Actions `buscarPacientes` y `crearPaciente` en `src/acciones/pacientes.ts` y `crearCita` en `src/acciones/citas.ts`: validan con T047, obtienen `clinicaId` de la sesión, llaman a los servicios y hacen `revalidatePath` de la agenda afectada
- [X] T051 [P] [US2] Crear `src/components/agenda/selector-paciente.tsx`: buscador por nombre o teléfono, opción «Paciente nuevo» (nombre, teléfono, correo opcional) y, ante `TELEFONO_DUPLICADO`, el aviso con botón «Usar esta ficha»
- [X] T052 [US2] Crear `src/components/agenda/formulario-cita.tsx`: servicios de la especialidad («Sesión de fisioterapia · 45 min · 40,00 €»), fecha, hora en pasos de 15 min dentro del horario, «Termina a las HH:mm», selector de paciente, botón «Reservar cita» y errores del contrato junto al campo o en un aviso destacado (depende de T051)
- [X] T053 [US2] Crear `src/app/agenda/[profesionalId]/[fecha]/nueva/page.tsx`: panel lateral (`Sheet`) en portátil y pantalla completa en móvil, prerrellenado con profesional, fecha y `?hora=`; tras reservar vuelve a la agenda con aviso «Cita reservada» (depende de T052, T050)

**Checkpoint**: US1 y US2 funcionan; ninguna vía permite un solape

---

## Phase 5: User Story 3 - Registrar el desenlace de una cita (Priority: P2)

**Goal**: marcar citas reservadas como completadas, canceladas o no asistidas desde la agenda.

**Independent Test**: sobre citas reservadas de la semilla, aplicar cada acción y comprobar el nuevo estado, que solo cancelar libera el hueco y que las transiciones no permitidas no aparecen.

### Tests for User Story 3 (MANDATORY - Principle VI) ⚠️

- [X] T054 [P] [US3] Escribir `tests/integration/estados.test.ts`: US3 #1 (cancelar antes del inicio libera el hueco y se puede volver a reservar ese tramo), US3 #2 y #3 (completar y no asistida desde la hora de inicio), `CANCELACION_TARDIA` (FR-018), `TRANSICION_NO_PERMITIDA` antes del inicio (FR-019), estados finales sin salida (FR-017), dos cambios simultáneos sobre la misma cita → uno prospera y el otro recibe `ESTADO_CAMBIADO` con el estado actual (FR-020); cada rechazo comprueba el texto exacto del mensaje (FR-015)
- [X] T055 [P] [US3] Escribir `tests/e2e/estados.spec.ts`: escenarios 12 y 13 de quickstart.md (diálogo «¿Cancelar la cita de … (10:00–10:45)?», estado «Cancelada» y hueco libre; cita de hoy anterior a las 12:10 con «Completar» y «No asistió» y sin «Cancelar»)

### Implementation for User Story 3

- [X] T056 [US3] Implementar `cambiarEstadoCita({ citaId, accion })` en `src/servicios/citas.ts`: validar con `validarTransicion` y `ahora()`, y hacer `UPDATE … SET estado, estado_cambiado_en WHERE id = $1 AND clinica_id = $2 AND estado = 'reservada'`; si no se actualiza ninguna fila, devolver `ESTADO_CAMBIADO` con el estado actual
- [X] T057 [US3] Añadir la Server Action `cambiarEstadoCita` en `src/acciones/citas.ts` (Zod, sesión y `revalidatePath`) (depende de T056)
- [X] T058 [P] [US3] Crear `src/components/agenda/acciones-cita.tsx`: botones según `accionesDisponibles` («Completar», «No asistió», «Cancelar cita»), `AlertDialog` de confirmación para cancelar y aviso con el mensaje del contrato ante rechazo
- [X] T059 [US3] Integrar `acciones-cita.tsx` en `src/components/agenda/bloque-cita.tsx` (menú en móvil, botones visibles en portátil) (depende de T058)

**Checkpoint**: las tres historias funcionan de forma independiente

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: calidad transversal, datos citables y validación final

- [X] T060 [P] Ejecutar `pnpm seed --fecha-referencia 2026-11-09` y documentar en `docs/datos-demo.md` el resumen exacto (citas por estado y profesional, porcentajes) y cómo reproducirlo, y copiar las mismas cifras al apartado «Datos de demostración» de `specs/001-agenda-core/quickstart.md` (Principio V)
- [X] T061 [P] Escribir `tests/e2e/accesibilidad.spec.ts`: axe sin infracciones AA en `/entrar`, la agenda del día y el alta de cita en `portatil` y `movil`; sin desplazamiento horizontal a 360 px; objetivos táctiles ≥ 44×44 px; navegación completa con teclado (SC-006, Principio VII)
- [X] T062 [P] Escribir `tests/e2e/rendimiento.spec.ts`: la agenda del día de María con la semilla se muestra completa en < 2 s tras cambiar de profesional o de día (SC-004)
- [X] T063 Revisar todos los textos visibles en `src/components/`, `src/app/` y `src/dominio/errores.ts`: español de España, sin jerga técnica y con cada error explicando qué pasa y qué hacer (Principios VII y VIII)
- [X] T064 [P] Crear `README.md` con descripción, requisitos, puesta en marcha (enlazando a `specs/001-agenda-core/quickstart.md`) y la deuda consciente de la autenticación simplificada (research.md R7)
- [X] T065 Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm test:e2e` en verde y recorrer a mano los 16 escenarios de `specs/001-agenda-core/quickstart.md`
- [ ] T066 Realizar la prueba de usabilidad previa a la entrega (SC-002, SC-003) descrita en `specs/001-agenda-core/quickstart.md` con 2 personas nuevas en portátil y móvil, y registrar tiempos y observaciones en `docs/usabilidad-001.md` (tarea manual, requiere personas reales)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias
- **Foundational (Phase 2)**: depende de Setup y BLOQUEA todas las historias
- **US1, US2, US3 (Phases 3–5)**: dependen solo de Foundational; pueden ir en paralelo
- **Polish (Phase 6)**: depende de las historias que se entreguen

### User Story Dependencies

- **US1 (P1)**: tras Foundational; sin dependencias de otras historias
- **US2 (P1)**: tras Foundational; su pantalla se abre desde el botón «Reservar» de US1, pero la ruta `/agenda/[profesionalId]/[fecha]/nueva` y los tests de integración funcionan solos
- **US3 (P2)**: tras Foundational; sus tests de integración usan citas creadas con `tests/helpers/fabrica.ts`, sin depender de US2; la integración visual (T059) toca `bloque-cita.tsx` de US1, así que T059 va después de T037

### Within Each User Story

- Tests primero, y deben fallar antes de implementar; cada test cita la regla o el criterio que cubre
- Dominio puro → servicios → Server Actions → componentes → páginas
- `src/servicios/citas.ts` y `src/acciones/citas.ts` se tocan en US2 (T049, T050) y US3 (T056, T057): en paralelo, coordinar o hacer US3 después de US2

### Parallel Opportunities

- Setup: T003–T006
- Foundational: T011–T018 en paralelo tras T007–T010; T019, T022 y T026 en paralelo
- US1: T030–T032 (tests), T033, T036 y T037
- US2: T039–T044 (tests), T045–T047 y T051
- US3: T054, T055 y T058
- Polish: T060–T062 y T064

---

## Parallel Example: User Story 2

```bash
# Tests de la US2 a la vez:
Task: "tests/unit/solape.test.ts"
Task: "tests/unit/telefono.test.ts"
Task: "tests/integration/crear-cita.test.ts"
Task: "tests/integration/solape-concurrencia.test.ts"
Task: "tests/integration/pacientes.test.ts"
Task: "tests/e2e/alta-cita.spec.ts"

# Reglas puras y esquemas a la vez:
Task: "src/dominio/solape.ts"
Task: "src/dominio/telefono.ts"
Task: "src/acciones/esquemas.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational (incluye acceso y semilla)
2. Phase 3 US1 → **PARAR Y VALIDAR**: agenda del día con la semilla (quickstart 1–4)
3. Demo: CitaClara muestra la agenda real de Clínica Eleva

### Incremental Delivery

1. Setup + Foundational → base lista
2. + US1 → agenda visible (MVP de consulta)
3. + US2 → reservas sin solapes (MVP operativo: es la regla capital)
4. + US3 → agenda fiel a la realidad
5. Polish → accesibilidad, rendimiento, datos citados y validación final

### Parallel Team Strategy

Tras Foundational: agente/persona A con US1, B con US2 (la de mayor riesgo, con la batería de
solapes), C con US3 (coordinando con B los archivos `citas.ts`).

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- Ningún test se desactiva para integrar (Principio VI); si una regla cambia, primero la spec
- La spec debe figurar como «Aprobada» en `spec.md` y `specs/MAPA.md` antes de `/speckit-implement` (Principio I)
- Commit tras cada tarea o grupo lógico

---

## Enmienda revisión cruzada (S2)

**Purpose**: implementar FR-018a (origen de la cancelación) de la Enmienda revisión cruzada
S2–S5 (2026-11-07). Código, migraciones y pruebas hechos; T074 en verde el 2026-11-08.

### Tests (MANDATORY - Principle VI) ⚠️

- [X] T067 [P] [S2] Escribir `tests/integration/origen-cancelacion.test.ts` (FR-018a): cancelar desde recepción deja `cancelada_por = 'recepcion'` y `estado_cambiado_en` con el momento de la cancelación; completar y no asistida dejan `cancelada_por` nulo; un `UPDATE` SQL directo a `cancelada` sin origen, o con origen en una cita no cancelada, es rechazado por `cita_origen_cancelacion`; un valor fuera de `recepcion` | `paciente` es rechazado por el enum
- [X] T068 [P] [S2] Ampliar `tests/integration/estados.test.ts`: `cambiarEstadoCita` no acepta el origen como entrada (siempre escribe `recepcion`) y, en dos cancelaciones simultáneas, la que prospera deja un único origen y la otra recibe `ESTADO_CAMBIADO` (FR-020)
- [X] T069 [P] [S2] Ampliar `tests/integration/semilla.test.ts` y `tests/unit/semilla.test.ts`: las 114 canceladas de la semilla (fecha 2026-11-09) tienen `cancelada_por = 'recepcion'`, ninguna otra cita tiene origen, y las cifras de `docs/datos-demo.md` no cambian (Principio V)
- [X] T070 [S2] Escribir una prueba de migración: sobre una BD con citas canceladas creadas con el esquema anterior, aplicar la migración deja todas con `cancelada_por = 'recepcion'` y la restricción activa

### Implementation

- [X] T071 [S2] Añadir en `src/db/esquema.ts` el enum `origen_cancelacion` (`recepcion`, `paciente`), la columna `cita.cancelada_por` y la restricción `cita_origen_cancelacion`, y generar la migración `src/db/migraciones/0002_origen_cancelacion.sql` con el relleno previo `UPDATE cita SET cancelada_por = 'recepcion' WHERE estado = 'cancelada'` antes del `CHECK` (data-model.md)
- [X] T072 [S2] En `src/servicios/citas.ts`, `cambiarEstadoCita` con `accion: 'cancelar'` escribe `cancelada_por = 'recepcion'` en el mismo `UPDATE … WHERE estado = 'reservada'` (contracts/server-actions.md) (depende de T071)
- [X] T073 [S2] En `src/semilla/generar.ts` y `src/semilla/cargar.ts`, generar las citas canceladas con `cancelada_por = 'recepcion'` sin alterar identificadores ni recuentos (FR-021, FR-024) (depende de T071)
- [X] T074 [S2] Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm test:e2e` en verde (depende de T067–T073)

---

## Enmienda revisión cruzada (S3)

**Purpose**: teléfono de contacto de la clínica (FR-022, Key Entities), que lee la spec 005.
Hecho (migración `0003_telefono_clinica.sql`).

- [X] T075 [P] [S3] Ampliar `tests/integration/semilla.test.ts`: Clínica Eleva tiene teléfono «911 234 567»
- [X] T076 [S3] Añadir `clinica.telefono` (obligatorio) en `src/db/esquema.ts` con su migración y rellenarlo en la semilla con «911 234 567» (data-model.md) (depende de T075)
