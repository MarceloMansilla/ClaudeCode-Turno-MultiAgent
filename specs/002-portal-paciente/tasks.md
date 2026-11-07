---

description: "Lista de tareas de la feature 002-portal-paciente"
---

# Tasks: Portal del paciente

**Input**: Design documents from `/specs/002-portal-paciente/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md.
**La 001 implementada e integrada** (todas sus tareas T001–T066 de
[tasks de la 001](../001-agenda-core/tasks.md)): esta feature amplía su código, su esquema y su
semilla.

**Tests**: OBLIGATORIOS (Constitución, Principio VI). Cada test cita en su nombre el FR,
escenario (p. ej. `002 US2 #4`) o SC de la 002 que cubre; el prefijo `002` evita confusiones
con los identificadores de la 001. La feature escribe en la agenda (cancelación): las pruebas
de solape tras liberar un hueco, con operaciones simultáneas, son obligatorias (Principio III).

**Organization**: tareas agrupadas por historia de usuario para implementarlas y probarlas de
forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2, US3)
- Rutas relativas a la raíz del repositorio (proyecto único de la 001, ver plan.md)

## Referencias rápidas

- Decisiones: [research.md](research.md) (P1–P10)
- Esquema, reglas de intentos, plazo, clasificación y huecos liberados: [data-model.md](data-model.md)
- Acciones, códigos de error y mensajes: [contracts/server-actions.md](contracts/server-actions.md)
- Rutas y elementos de pantalla: [contracts/ui-routes.md](contracts/ui-routes.md)
- Escenarios de validación: [quickstart.md](quickstart.md)
- Semilla de tests y documentación: **2026-11-09** (lunes); reloj
  `CITACLARA_AHORA=2026-11-09T12:10:00+01:00` salvo que el test indique otro. Teléfono de
  Clínica Eleva: «911 234 567».

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: preparar configuración y ayudantes sobre el proyecto de la 001 (sin dependencias nuevas)

- [ ] T001 Añadir `CITACLARA_URL_PUBLICA=http://localhost:3000` a `.env.example` y leerla en `src/lib/config.ts` (crear si no existe) con una función `urlPublica()` que falla con un mensaje claro si falta en producción
- [ ] T002 [P] Añadir a `src/components/ui/` los componentes shadcn/ui que falten para el portal (`tabs`, `alert-dialog`, `card`, `input-otp` o equivalente con `input` de 4 dígitos, `sheet`, `badge`) sin tocar los existentes
- [ ] T003 [P] Añadir a `playwright.config.ts` la variable `CITACLARA_URL_PUBLICA` en `webServer.env` y confirmar que los proyectos `movil` (360×800) y `portatil` (1366×768) se ejecutan también sobre `tests/e2e/portal/**`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: esquema ampliado (Enmienda 1 de la 001 + tabla de accesos), reglas puras, sesión del portal, acceso con enlace + 4 cifras y semilla ampliada

**⚠️ CRITICAL**: ninguna historia puede empezar hasta completar esta fase

### Base de datos (data-model.md)

- [ ] T004 Ampliar el esquema Drizzle en `src/db/esquema.ts`: columna `clinica.telefono` (texto, obligatorio); enum `origen_cancelacion` (`recepcion`, `paciente`) y columna `cita.cancelada_por` (nula); tabla `acceso_paciente` (`id`, `clinica_id`, `paciente_id`, `token`, `generacion` por defecto 1, `fallos_tanda` y `fallos_acumulados` por defecto 0, `bloqueado_hasta`, `bloqueado` por defecto `false`, `creado_en`, `regenerado_en`) con FKs e índices únicos `(paciente_id)` y `(token)`
- [ ] T005 Generar con drizzle-kit la migración de la 002 en `src/db/migraciones/` y completarla a mano para que, sobre una BD con datos de la 001: añada `clinica.telefono` con valor por defecto `'911 234 567'` y después quite el valor por defecto; ponga `cancelada_por = 'recepcion'` en las citas ya canceladas; y cree el `CHECK ((estado = 'cancelada') = (cancelada_por IS NOT NULL))`. La restricción `cita_sin_solape` no se toca (depende de T004)
- [ ] T006 Ampliar `cambiarEstadoCita` en `src/servicios/citas.ts` (001) para que al cancelar guarde `cancelada_por = 'recepcion'` junto a `estado_cambiado_en`, y ampliar `tests/helpers/fabrica.ts` con `crearAccesoPaciente(paciente, { token? })` y con citas canceladas con `cancelada_por` (depende de T005)
- [ ] T007 Escribir `tests/integration/migracion-002.test.ts`: aplicar las migraciones sobre una BD con datos de la 001 conserva todas las citas, deja las canceladas con `cancelada_por = 'recepcion'`, el CHECK rechaza una cancelada sin origen y una reservada con origen, y `cita_sin_solape` sigue rechazando un solape (Enmienda 1 de la 001, FR-016) (depende de T005, T006)

### Reglas puras (dominio)

- [ ] T008 [P] Implementar en `src/dominio/plazo.ts` `plazoCancelacion(inicio)` (`inicio − 24 h` como resta de instantes) y `esCancelablePorPaciente(cita, ahora)` (`estado = 'reservada'` y `ahora < plazo`) (FR-012)
- [ ] T009 [P] Implementar en `src/dominio/portal.ts` `clasificarCitas(citas, ahora)` → `{ proximas, historial }` y `etiquetaHistorial(cita, ahora)` según la tabla de clasificación de data-model.md (FR-007, FR-008)
- [ ] T010 [P] Implementar en `src/dominio/intentos.ts` la función pura `registrarIntento(estadoAcceso, acierto, ahora)` que devuelve el nuevo estado de contadores y el resultado (`ok`, `CIFRAS_INCORRECTAS`, `ENLACE_BLOQUEADO_TEMPORAL` con hora de fin, `ENLACE_BLOQUEADO`) según las reglas 2–5 de data-model.md (FR-005)
- [ ] T011 [P] Añadir a `src/dominio/errores.ts` los códigos `ENLACE_NO_VALIDO`, `CIFRAS_INCORRECTAS`, `ENLACE_BLOQUEADO_TEMPORAL`, `ENLACE_BLOQUEADO`, `SESION_PORTAL_CADUCADA`, `FUERA_DE_PLAZO` y `CITA_NO_ENCONTRADA` con los mensajes exactos de `contracts/server-actions.md`, interpolando nombre y teléfono de la clínica y la hora de fin del bloqueo
- [ ] T012 [P] Escribir `tests/unit/plazo.test.ts` (FR-012, tabla de data-model.md): martes 10/11/2026 10:00 → plazo lunes 09/11/2026 10:00, no cancelable con reloj a las 12:10; martes 10/11/2026 12:15 → cancelable a las 12:14:59 y no cancelable a las 12:15:00 en punto; lunes 16/11/2026 10:00 → «domingo, 15/11/2026 a las 10:00»; lunes 30/03/2026 09:00 → «domingo, 29/03/2026 a las 09:00» (semana del cambio de hora); zona `Atlantic/Canary`; citas no reservadas nunca cancelables
- [ ] T013 [P] Escribir `tests/unit/portal.test.ts` (FR-007, FR-008, data-model.md): reservada futura → próximas (orden ascendente); reservada de hoy a las 12:00 con reloj 12:10 → historial «Pasada»; completada → «Realizada»; no asistida → «No asistida»; cancelada futura y pasada → historial «Cancelada»; historial en orden descendente
- [ ] T014 [P] Escribir `tests/unit/intentos.test.ts` (FR-005): 4 fallos → `CIFRAS_INCORRECTAS`; 5.º fallo seguido → bloqueo hasta 12:25 con reloj 12:10 y `fallos_tanda` a 0; intento durante el bloqueo no cuenta; acierto pone ambos contadores a 0; 10.º fallo acumulado (dos tandas de 5) → `ENLACE_BLOQUEADO`; un acierto entre medias reinicia el acumulado

### Sesión y acceso del portal (FR-001–FR-006, research P2–P4)

- [ ] T015 [P] Implementar en `src/lib/sesionPortal.ts` la cookie `citaclara_portal` firmada con jose (HS256, mismo secreto que `src/lib/sesion.ts`, `aud: "portal"`, `httpOnly`, `Secure` en producción, `SameSite=Lax`, `Path=/p`, caducidad 30 min) con `crearSesionPortal({ clinicaId, pacienteId, accesoId, generacion })`, `renovarSesionPortal()` y `leerSesionPortal()`; y asegurar que `src/lib/sesion.ts` rechaza tokens con `aud: "portal"`
- [ ] T016 Implementar en `src/servicios/accesoPaciente.ts`: `obtenerOCrearAcceso(clinicaId, pacienteId)` (`INSERT … ON CONFLICT (paciente_id) DO NOTHING` y relectura; token de 32 bytes con `crypto.getRandomValues` en base64url), `regenerarAcceso(clinicaId, pacienteId)` (sentencia de data-model.md), `verificarCifras(token, cifras)` en `enTransaccion()` con `SELECT … FOR UPDATE` aplicando `registrarIntento` (regla 1 → `ENLACE_NO_VALIDO`), y `validarSesionPortal(sesion)` que comprueba que el acceso existe y que `generacion` coincide (si no, `SESION_PORTAL_CADUCADA`) (depende de T004, T010, T011)
- [ ] T017 Implementar las Server Actions `entrarPortal({ token, cifras })` (Zod: exactamente 4 dígitos → si no, `DATOS_NO_VALIDOS` sin contar fallo) y `salirPortal()` en `src/acciones/portal.ts` (depende de T015, T016)
- [ ] T018 Ampliar `src/proxy.ts` para que en `/p/*` renueve la cookie del portal si es válida (caducidad deslizante de 30 min) y no aplique la protección de `/agenda/*`, y que `/agenda/*` siga ignorando la cookie del portal (depende de T015)
- [ ] T019 Crear `src/app/p/[token]/layout.tsx` (layout móvil: cabecera con nombre de la clínica y enlace `tel:` «Llamar a la clínica» con su teléfono; FR-009) y la pantalla de cifras `src/components/portal/formulario-cifras.tsx` (texto «Para ver tus citas, escribe las 4 últimas cifras de tu teléfono.», campo de 4 dígitos con `inputmode="numeric"` y `autocomplete="off"`, botón «Ver mis citas», errores del contrato junto al campo y campo desactivado si está bloqueado) (depende de T017)
- [ ] T020 Escribir `tests/integration/acceso-paciente.test.ts`: token inexistente → `ENLACE_NO_VALIDO`; cifras correctas → sesión; incorrectas → `CIFRAS_INCORRECTAS`; «12a4» o «123» → `DATOS_NO_VALIDOS` sin contar fallo (FR-002); reglas de bloqueo de FR-005 contra la BD; **10 verificaciones incorrectas en paralelo** sobre el mismo enlace → contadores exactos y bloqueo temporal aplicado una sola vez (research P3); `obtenerOCrearAcceso` simultáneo desde dos puestos → un solo acceso; la cookie de recepción no sirve en el portal ni la del portal en `/agenda` (research P4) (depende de T016, T017)

### Datos de demostración (research P8, Principio V)

- [ ] T021 Ampliar `src/semilla/generar.ts` (001) para que la clínica tenga `telefono: '911 234 567'`, las canceladas de la historia lleven `cancelada_por: 'recepcion'` y, **después** de generar todas las citas, se cree un `acceso_paciente` por cada paciente en orden de creación tomando del PRNG 16 bytes para el `id` y 32 para el `token` (base64url), con `generacion = 1` y contadores a 0; sin alterar el orden ni el número de llamadas al PRNG anteriores (depende de T004)
- [ ] T022 Ampliar `scripts/seed.ts` para insertar los accesos y añadir al resumen el teléfono de la clínica y los **Paciente A** y **Paciente B** elegidos con la regla de research P8 (nombre, teléfono, 4 cifras y URL `{CITACLARA_URL_PUBLICA}/p/{token}`; si no hay Paciente B, indicarlo) (depende de T021, T001)
- [ ] T023 Ampliar `tests/integration/semilla.test.ts`: con 2026-11-09, todos los identificadores, citas y cifras de la 001 son idénticos a los de antes de la ampliación (comparar con una instantánea generada desde la semilla de la 001); dos generaciones dan los mismos 40 tokens; tokens únicos de 43 caracteres base64url; teléfono «911 234 567»; canceladas con `cancelada_por = 'recepcion'`; la regla de selección de Paciente A y B es determinista (depende de T021, T022)

**Checkpoint**: base lista; un paciente puede entrar en `/p/[token]` con sus 4 cifras (aún sin ver citas)

---

## Phase 3: User Story 1 - Consultar mis citas desde el móvil (Priority: P1) 🎯 MVP

**Goal**: el paciente ve sus próximas citas y su historial; recepción le da el enlace y puede sustituirlo.

**Independent Test**: con la semilla, entrar en el portal del Paciente A con su enlace y sus cifras y comprobar que las citas coinciden exactamente con las suyas en la semilla y que no aparece ninguna de otro paciente.

### Tests for User Story 1 (MANDATORY - Principle VI) ⚠️

> **NOTE: escribir estos tests PRIMERO y comprobar que FALLAN antes de implementar**

- [ ] T024 [P] [US1] Escribir `tests/integration/portal-lectura.test.ts` para `obtenerPortal`: próximas y historial del paciente de la sesión con fecha, hora, servicio, profesional y etiqueta (002 US1 #1, #2; FR-007, FR-008); **ninguna cita de otro paciente** aunque comparta profesional y día (FR-004, SC-004); sin precio, teléfono del paciente ni datos de la agenda en el objeto devuelto (FR-010); `clinica.nombre` y `clinica.telefono` presentes (FR-009); paciente sin citas futuras → `proximas` vacío (002 US1 #3)
- [ ] T025 [P] [US1] Escribir `tests/integration/enlace-portal.test.ts`: `obtenerEnlacePortal` devuelve `{CITACLARA_URL_PUBLICA}/p/{token}` y es estable entre llamadas (FR-002b); `regenerarEnlacePortal` cambia el token, el anterior da `ENLACE_NO_VALIDO`, una sesión abierta con la generación anterior da `SESION_PORTAL_CADUCADA` y se reinician contadores y bloqueos (FR-002a, 002 US1 #5, #6); ambas exigen sesión de recepción
- [ ] T026 [P] [US1] Escribir `tests/e2e/portal/consulta.spec.ts` (semilla 2026-11-09, proyectos `movil` y `portatil`): escenarios 1–4 y 11–14 de quickstart.md (pantalla de cifras sin datos; cifras incorrectas; próximas e historial del Paciente A; Paciente B con «No tienes próximas citas…» y teléfono; regenerar enlace con el portal abierto; bloqueo tras 5 fallos; «Copiar enlace del portal») y «Salir» vuelve a pedir las cifras (FR-006)

### Implementation for User Story 1

- [ ] T027 [US1] Implementar en `src/servicios/portal.ts` `obtenerPortal(sesion)`: valida con `validarSesionPortal`, lee solo las citas con `clinica_id` y `paciente_id` de la sesión, usa `clasificarCitas`, `formato.ts` y `zona.ts` y devuelve `Portal`/`CitaPortal` del contrato (de momento con `cancelable` y `plazo` calculados con `esCancelablePorPaciente`/`plazoCancelacion`) (depende de T009, T008, T016)
- [ ] T028 [P] [US1] Crear `src/components/portal/tarjeta-cita.tsx` (fecha «lunes, 16/11/2026», hora «10:00–10:45», servicio y profesional; en historial, etiqueta con texto + icono, nunca solo color) y `src/components/portal/lista-vacia.tsx` («No tienes próximas citas. Para pedir una, llama a Clínica Eleva al 911 234 567.» con enlace `tel:`; «Todavía no tienes citas anteriores.»)
- [ ] T029 [US1] Crear `src/components/portal/vista-portal.tsx` con pestañas «Próximas citas» (por defecto) e «Historial» y botón «Salir», y `src/app/p/[token]/page.tsx`, que muestra el mensaje de `ENLACE_NO_VALIDO` si el token no es vigente, la pantalla de cifras si no hay sesión válida para ese token (o es de otra generación) y el portal si la hay, más `loading.tsx` («Cargando tus citas…») (depende de T027, T028, T019)
- [ ] T030 [US1] Implementar las Server Actions `obtenerEnlacePortal({ pacienteId })` y `regenerarEnlacePortal({ pacienteId })` en `src/acciones/enlacePortal.ts` (sesión de recepción, `clinicaId` de la sesión) usando `obtenerOCrearAcceso`/`regenerarAcceso` y `urlPublica()` (depende de T016, T001)
- [ ] T031 [US1] Crear `src/components/agenda/menu-enlace-portal.tsx`: «Copiar enlace del portal» (copia con `navigator.clipboard`; aviso «Enlace copiado. Envíaselo al paciente por WhatsApp o correo.»; si falla, muestra la URL seleccionable) y «Generar nuevo enlace del portal» (`AlertDialog` «Se creará un enlace nuevo para [nombre del paciente] y el anterior dejará de funcionar. ¿Continuar?», después muestra el enlace nuevo con «Copiar»); integrarlo en `src/components/agenda/acciones-cita.tsx` para citas en cualquier estado (depende de T030)

**Checkpoint**: el paciente consulta sus citas desde el móvil y recepción gestiona su enlace: ya descarga las llamadas de «¿cuándo era mi cita?»

---

## Phase 4: User Story 2 - Cancelar una cita futura sin llamar (Priority: P1)

**Goal**: el paciente cancela una cita propia hasta 24 h antes, con confirmación; queda cancelada en la agenda al instante.

**Independent Test**: cancelar desde el portal una cita del Paciente A dentro de plazo y comprobar «Cancelada» en el portal y en la agenda con el hueco libre; intentar una fuera de plazo y comprobar el rechazo.

### Tests for User Story 2 (MANDATORY - Principle VI) ⚠️

- [ ] T032 [P] [US2] Escribir `tests/integration/cancelar-paciente.test.ts`: dentro de plazo → `cancelada`, `cancelada_por = 'paciente'`, `estado_cambiado_en` = ahora (002 US2 #1, FR-014, FR-016); `FUERA_DE_PLAZO` cuando el plazo vence entre mostrar y confirmar (reloj 12:14:59 vs 12:15:00 para una cita del martes 10/11/2026 a las 12:15; 002 US2 #4); `CITA_NO_ENCONTRADA` para la cita de otro paciente, sin cambiarla (FR-004); `ESTADO_CAMBIADO` con estado actual si recepción la canceló antes (002 US2 #5, FR-014); cita completada o no asistida → `ESTADO_CAMBIADO`; sesión de generación antigua → `SESION_PORTAL_CADUCADA`; cada rechazo comprueba el texto exacto del contrato
- [ ] T033 [P] [US2] Escribir `tests/integration/solape-cancelacion.test.ts` (Principio III, research P6, SC-004): cancelación del paciente en paralelo con 10 `crearCita` de recepción sobre el mismo hueco → si la cancelación se confirma, exactamente 1 reserva; si no, 0; en ningún caso dos citas `reservada`/`completada` solapadas en la BD; 100 repeticiones deterministas → 0 pares solapados; doble cancelación simultánea paciente + paciente (dos sesiones) y paciente + recepción → exactamente un cambio efectivo, el otro recibe `ESTADO_CAMBIADO`; el `cancelada_por` final corresponde a quien ganó; tras cancelar, el tramo se puede reservar (002 US2 #6)
- [ ] T034 [P] [US2] Escribir `tests/e2e/portal/cancelar.spec.ts` (proyectos `movil` y `portatil`): escenarios 5, 6, 7 y 10 de quickstart.md (cancelar → «No, mantenerla» sin cambios; confirmar → «Tu cita del … está cancelada.» y pasa al Historial; en la agenda de recepción la cita figura cancelada y el hueco libre y reservable; cita fuera de plazo sin botón y con «Ya no se puede cancelar desde aquí. Llama a Clínica Eleva al 911 234 567.»); el foco del diálogo empieza en «No, mantenerla»

### Implementation for User Story 2

- [ ] T035 [US2] Implementar en `src/servicios/citas.ts` `cancelarCitaPaciente(sesion, citaId)` con la sentencia condicional única de research P5 (`clinica_id`, `paciente_id`, `estado = 'reservada'` y `ahora() < inicio − 24 h` en el `WHERE`; `cancelada_por = 'paciente'`) y, si no actualiza ninguna fila, relectura para devolver `CITA_NO_ENCONTRADA`, `ESTADO_CAMBIADO` (con estado actual) o `FUERA_DE_PLAZO` en ese orden de comprobación (depende de T008, T016)
- [ ] T036 [US2] Añadir la Server Action `cancelarCitaPaciente({ citaId })` en `src/acciones/portal.ts` (Zod, sesión del portal, `revalidatePath` de `/p/[token]` y de la agenda del profesional y día afectados) (depende de T035)
- [ ] T037 [P] [US2] Crear `src/components/portal/dialogo-cancelar.tsx`: `AlertDialog` «¿Cancelar tu cita?» con fecha, hora, servicio y profesional, botones «Sí, cancelar cita» y «No, mantenerla» (foco inicial en este), estado de envío y aviso de éxito o del mensaje del contrato ante rechazo
- [ ] T038 [US2] Ampliar `src/components/portal/tarjeta-cita.tsx` para las próximas: si `cancelable`, «Puedes cancelarla hasta el domingo, 15/11/2026 a las 10:00» y botón «Cancelar cita» que abre `dialogo-cancelar.tsx`; si no, «Ya no se puede cancelar desde aquí. Llama a Clínica Eleva al 911 234 567.» con enlace `tel:` (FR-012, FR-013) (depende de T036, T037)

**Checkpoint**: US1 y US2 funcionan; el paciente consulta y cancela sin llamar, y ningún flujo permite un solape

---

## Phase 5: User Story 3 - Recepción se entera de los huecos que liberan los pacientes (Priority: P2)

**Goal**: la agenda distingue las cancelaciones del paciente y un aviso en el panel reúne los huecos liberados que siguen libres.

**Independent Test**: cancelar una cita desde el portal y otra desde recepción; en la agenda se distingue quién canceló cada una y solo la primera aparece en el aviso hasta que recepción vuelve a ocupar ese hueco.

### Tests for User Story 3 (MANDATORY - Principle VI) ⚠️

- [ ] T039 [P] [US3] Escribir `tests/integration/huecos-liberados.test.ts` para `obtenerHuecosLiberados` (FR-015a, data-model.md): cancelación de paciente futura y libre → aparece; cancelación de recepción → no aparece (002 US3 #2); hueco reocupado total o parcialmente por una cita reservada o completada → desaparece (002 US3 #4); hueco cuyo inicio ya llegó → desaparece; dos cancelaciones de paciente del mismo tramo → una sola entrada (la más reciente); orden por inicio; solo datos de la clínica de la sesión
- [ ] T040 [P] [US3] Ampliar `tests/integration/agenda.test.ts` (001): `CitaVista.canceladaPor` es `paciente` con `canceladaEn` «09/11/2026 12:10» para cancelaciones desde el portal y `recepcion` sin fecha para las de recepción (002 US3 #1, #2)
- [ ] T041 [P] [US3] Escribir `tests/e2e/agenda/huecos-liberados.spec.ts` (proyectos `movil` y `portatil`): escenarios 7–9 de quickstart.md (etiqueta «Cancelada por el paciente» y «el 09/11/2026 a las 12:10»; botón «Huecos liberados por pacientes (1)» con «María · lunes, 16/11/2026 · 10:00–10:45 · cancelada el 09/11/2026 a las 12:10» si la cita cancelada es esa, o el hueco equivalente del Paciente A; reservar el hueco lo quita y el botón desaparece; sin huecos pendientes el botón no se muestra)

### Implementation for User Story 3

- [ ] T042 [US3] Ampliar `obtenerAgendaDia` en `src/servicios/agenda.ts` (001) para incluir `canceladaPor` y `canceladaEn` en `CitaVista`, y mostrar en `src/components/agenda/bloque-cita.tsx` la etiqueta «Cancelada por el paciente» con «el 09/11/2026 a las 12:10» (texto + icono) cuando corresponda; las de recepción siguen como «Cancelada»
- [ ] T043 [US3] Implementar en `src/servicios/huecosLiberados.ts` `obtenerHuecosLiberados(clinicaId)` con la consulta derivada de data-model.md (`NOT EXISTS` con solape sobre citas `reservada`/`completada` del mismo profesional, `inicio > ahora()`, agrupación por profesional/inicio/fin quedándose con la cancelación más reciente) y `enlaceAgenda` a `/agenda/{profesionalId}/{fecha}`
- [ ] T044 [US3] Crear `src/components/agenda/aviso-huecos-liberados.tsx` (botón «Huecos liberados por pacientes (N)» solo si N > 0; `Sheet` lateral en portátil y pantalla completa en móvil con la lista y enlaces a la agenda) e integrarlo en `src/components/cabecera.tsx` (001), cargando los datos en cada página del panel (depende de T043)

**Checkpoint**: las tres historias funcionan de forma independiente

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: calidad transversal, datos citables y validación final

- [ ] T045 [P] Ejecutar `pnpm seed --fecha-referencia 2026-11-09` y añadir a `docs/datos-demo.md` el teléfono de la clínica, los Paciente A y B (nombre, 4 cifras, URL, citas próximas y de historial con sus estados) y cómo reproducirlos; sustituir en `specs/002-portal-paciente/quickstart.md` y en los tests e2e las referencias genéricas a «A» y «B» por esos datos cuando aporten claridad (Principio V)
- [ ] T046 [P] Escribir `tests/e2e/portal/accesibilidad.spec.ts`: axe sin infracciones AA en la pantalla de cifras, el portal (ambas pestañas), el diálogo de cancelación y el aviso de huecos liberados, en `movil` y `portatil`; sin desplazamiento horizontal a 360 px; objetivos táctiles ≥ 44×44 px; navegación completa con teclado (SC-006, FR-017)
- [ ] T047 [P] Escribir `tests/e2e/portal/rendimiento.spec.ts`: tras confirmar las cifras del Paciente A, sus citas se muestran completas en < 2 s (plan, Performance Goals)
- [ ] T048 Revisar todos los textos visibles nuevos en `src/components/portal/`, `src/app/p/`, `src/components/agenda/` y `src/dominio/errores.ts`: español de España, trato de «tú» en el portal, sin jerga técnica, cada error dice qué pasa y qué hacer, y ninguna pantalla del portal muestra datos antes de confirmar las cifras (FR-003, FR-018, Principios VII y VIII)
- [ ] T049 [P] Actualizar `README.md` con el portal del paciente (ruta `/p/[token]`, variable `CITACLARA_URL_PUBLICA`, cómo obtener el enlace de un paciente desde la agenda) enlazando a `specs/002-portal-paciente/quickstart.md`
- [ ] T050 Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm test:e2e` en verde (suite completa de la 001 y la 002) y recorrer a mano los 15 escenarios de `specs/002-portal-paciente/quickstart.md`
- [ ] T051 Realizar la prueba de usabilidad previa a la entrega (SC-001, SC-002) descrita en `specs/002-portal-paciente/quickstart.md` con 2 personas nuevas en móvil y registrar tiempos y observaciones en `docs/usabilidad-002.md` (tarea manual, requiere personas reales)
- [ ] T052 Crear `docs/llamadas-eleva.md` con la plantilla de recuento de llamadas de consulta y cancelación para Sonia (semana anterior a activar el portal y cuarta semana después) y el objetivo de −50 % (SC-003; la medición en sí es posterior a la entrega)

---

## Dependencies & Execution Order

### Phase Dependencies

- **001 integrada**: requisito previo de todo (código, esquema, semilla y tests de la 001)
- **Setup (Phase 1)**: sin dependencias dentro de la 002
- **Foundational (Phase 2)**: depende de Setup y BLOQUEA todas las historias
- **US1, US2, US3 (Phases 3–5)**: dependen de Foundational
- **Polish (Phase 6)**: depende de las historias que se entreguen

### User Story Dependencies

- **US1 (P1)**: tras Foundational; sin dependencias de otras historias
- **US2 (P1)**: tras Foundational; sus tests de integración usan `tests/helpers/fabrica.ts` y la sesión del portal sin depender de US1, pero la interfaz (T038) amplía `tarjeta-cita.tsx` de US1 (T028) y vive en la página de T029: en la práctica, US2 después de US1
- **US3 (P2)**: tras Foundational; sus tests crean cancelaciones de paciente directamente con la fábrica, sin depender de US2; T042 y T044 tocan archivos de la 001 (`agenda.ts`, `bloque-cita.tsx`, `cabecera.tsx`)

### Within Each User Story

- Tests primero, y deben fallar antes de implementar; cada test cita la regla o el criterio de la 002 que cubre
- Dominio puro → servicios → Server Actions → componentes → páginas
- `src/servicios/citas.ts` se toca en T006 (Foundational) y T035 (US2); `src/acciones/portal.ts` en T017 y T036; `src/components/agenda/acciones-cita.tsx` (001) en T031

### Archivos compartidos con la 001 y con ramas en paralelo

Esta feature modifica archivos de la 001: `src/db/esquema.ts`, `src/servicios/citas.ts`,
`src/servicios/agenda.ts`, `src/semilla/generar.ts`, `scripts/seed.ts`, `src/proxy.ts`,
`src/components/agenda/acciones-cita.tsx`, `bloque-cita.tsx` y `src/components/cabecera.tsx`.
Las ramas `analitica` y `recordatorio` pueden tocar los mismos: integrar la 001 primero,
mantener los cambios aditivos y resolver conflictos de migraciones renumerándolas al
integrar.

### Parallel Opportunities

- Setup: T002 y T003
- Foundational: T008–T015 en paralelo tras T004–T006; T021 en paralelo con T015–T019
- US1: T024–T026 (tests) y T028
- US2: T032–T034 (tests) y T037
- US3: T039–T041 (tests)
- Polish: T045–T047 y T049

---

## Parallel Example: User Story 2

```bash
# Tests de la US2 a la vez:
Task: "tests/integration/cancelar-paciente.test.ts"
Task: "tests/integration/solape-cancelacion.test.ts"
Task: "tests/e2e/portal/cancelar.spec.ts"

# Componente del diálogo mientras se hace el servicio:
Task: "src/components/portal/dialogo-cancelar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational (esquema, acceso con enlace + cifras, semilla)
2. Phase 3 US1 → **PARAR Y VALIDAR**: el Paciente A ve sus citas en el móvil y recepción le copia el enlace (quickstart 1–4, 11–14)
3. Demo: Sonia envía el enlace a un paciente y deja de atender llamadas de «¿cuándo era mi cita?»

### Incremental Delivery

1. Setup + Foundational → base lista
2. + US1 → consulta desde el móvil (MVP)
3. + US2 → cancelación sin llamar (la otra mitad de las llamadas; contiene las pruebas de solape)
4. + US3 → recepción aprovecha los huecos liberados
5. Polish → accesibilidad, rendimiento, datos citados, usabilidad y medición de llamadas

### Parallel Team Strategy

Tras Foundational: A con US1 y después US2 (comparten `tarjeta-cita.tsx`); B con US3 (toca
el panel de la 001). Los tests de US2 (T032, T033) pueden escribirse en paralelo con US1.
