---

description: "Lista de tareas de la feature 002-portal-paciente"
---

# Tasks: Portal del paciente

**Input**: Design documents from `/specs/002-portal-paciente/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md.
**La 001 implementada e integrada** (todas sus tareas T001–T066 de
[tasks de la 001](../001-agenda-core/tasks.md)), **con 001 FR-018a y FR-022**, y **el acceso
del paciente de la 005** (FR-001–FR-008, FR-019): esta feature amplía su código y usa su
esquema y su semilla.

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
- **Revisión cruzada S2–S4 (2026-11-07)**: las tareas cuyo contenido pertenece a otra spec
  se conservan como rastro, sin borrarlas, con una marca:
  - **⛔ [Dep 001]**: lo implementa la 001 (FR-018a origen de la cancelación, FR-022
    teléfono de la clínica). La 002 no la ejecuta; espera a que la 001 la entregue.
  - **⛔ [Dep 005]**: lo implementa la 005 (acceso del paciente, FR-001–FR-008, FR-019). La
    002 no la ejecuta.
  - **⛔ [Dep 005 FR-006]**: solo existirá si la clarificación pendiente de 005 FR-006
    mantiene la confirmación de 4 cifras; en ese caso, la implementa la 005.
  - **◐ [Parcial]**: la parte indicada sigue siendo de la 002; el resto depende de la spec
    citada.

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

- [ ] T001 ◐ [Parcial] Añadir `CITACLARA_URL_PUBLICA=http://localhost:3000` a `.env.example` y leerla en `src/lib/config.ts` (crear si no existe) con una función `urlPublica()` que falla con un mensaje claro si falta en producción. Si la 005 ya la define para construir el enlace (005 FR-005), se reutiliza la suya y esta tarea queda sin efecto
- [ ] T002 [P] Añadir a `src/components/ui/` los componentes shadcn/ui que falten para el portal (`tabs`, `alert-dialog`, `card`, `sheet`, `badge`) sin tocar los existentes (`input-otp` o el campo de 4 dígitos: ⛔ [Dep 005 FR-006])
- [ ] T003 [P] Añadir a `playwright.config.ts` la variable `CITACLARA_URL_PUBLICA` en `webServer.env` y confirmar que los proyectos `movil` (360×800) y `portatil` (1366×768) se ejecutan también sobre `tests/e2e/portal/**`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: reglas puras de la 002 y ayudantes de prueba sobre el esquema, el acceso y la semilla que aportan la 001 (FR-018a, FR-022) y la 005 (FR-001–FR-008, FR-019)

**⚠️ CRITICAL**: ninguna historia puede empezar hasta completar esta fase **y** disponer de lo marcado ⛔ (entregado por la 001 y la 005)

### Base de datos (data-model.md)

- [ ] T004 ⛔ [Dep 001] [Dep 005] *(Rastro: la 002 ya no amplía el esquema.)* Era: ampliar `src/db/esquema.ts` con `clinica.telefono` (→ 001 FR-022), enum `origen_cancelacion` y `cita.cancelada_por` (→ 001 FR-018a) y la tabla `acceso_paciente` (→ 005)
- [ ] T005 ⛔ [Dep 001] [Dep 005] *(Rastro: la 002 no tiene migración propia.)* Era: la migración de `clinica.telefono`, `cita.cancelada_por` con su `CHECK` y el valor `'recepcion'` para las citas ya canceladas (→ 001 FR-018a, FR-022) y de `acceso_paciente` (→ 005)
- [ ] T006 ◐ [Parcial] Ampliar `tests/helpers/fabrica.ts` con citas canceladas con `cancelada_por` (valores de 001 FR-018a) y con un ayudante que obtenga el enlace vigente de un paciente usando la API de la 005 (depende de 001 FR-018a y de la 005). Que `cambiarEstadoCita` (001) guarde `cancelada_por = 'recepcion'` al cancelar: ⛔ [Dep 001] (FR-018a)
- [ ] T007 ⛔ [Dep 001] *(Rastro.)* Era: `tests/integration/migracion-002.test.ts` (migración del origen de la cancelación, su `CHECK` y `cita_sin_solape` intacta). Lo prueba la 001 con FR-018a

### Reglas puras (dominio)

- [ ] T008 [P] Implementar en `src/dominio/plazo.ts` `plazoCancelacion(inicio)` (`inicio − 24 h` como resta de instantes) y `esCancelablePorPaciente(cita, ahora)` (`estado = 'reservada'` y `ahora < plazo`) (FR-012)
- [ ] T009 [P] Implementar en `src/dominio/portal.ts` `clasificarCitas(citas, ahora)` → `{ proximas, historial }` y `etiquetaHistorial(cita, ahora)` según la tabla de clasificación de data-model.md (FR-007, FR-008)
- [ ] T010 [P] ⛔ [Dep 005 FR-006] *(Rastro.)* Era: `src/dominio/intentos.ts` con `registrarIntento(estadoAcceso, acierto, ahora)` (fallos, bloqueo temporal y definitivo). Propuesta trasladada a «Dependencias y enmiendas requeridas» de spec.md
- [ ] T011 [P] Añadir a `src/dominio/errores.ts` los códigos `FUERA_DE_PLAZO` y `CITA_NO_ENCONTRADA`, y el texto del portal para `ENLACE_NO_VALIDO` (respuesta única de 005 FR-007), con los mensajes exactos de `contracts/server-actions.md`, interpolando nombre y teléfono de la clínica. `CIFRAS_INCORRECTAS`, `ENLACE_BLOQUEADO_TEMPORAL`, `ENLACE_BLOQUEADO` y `SESION_PORTAL_CADUCADA`: ⛔ [Dep 005 FR-006]
- [ ] T012 [P] Escribir `tests/unit/plazo.test.ts` (FR-012, tabla de data-model.md): martes 10/11/2026 10:00 → plazo lunes 09/11/2026 10:00, no cancelable con reloj a las 12:10; martes 10/11/2026 12:15 → cancelable a las 12:14:59 y no cancelable a las 12:15:00 en punto; lunes 16/11/2026 10:00 → «domingo, 15/11/2026 a las 10:00»; lunes 30/03/2026 09:00 → «domingo, 29/03/2026 a las 09:00» (semana del cambio de hora); zona `Atlantic/Canary`; citas no reservadas nunca cancelables
- [ ] T013 [P] Escribir `tests/unit/portal.test.ts` (FR-007, FR-008, data-model.md): reservada futura → próximas (orden ascendente); reservada de hoy a las 12:00 con reloj 12:10 → historial «Pasada»; completada → «Realizada»; no asistida → «No asistida»; cancelada futura y pasada → historial «Cancelada»; historial en orden descendente
- [ ] T014 [P] ⛔ [Dep 005 FR-006] *(Rastro.)* Era: `tests/unit/intentos.test.ts` (reglas de fallos y bloqueos del antiguo FR-005)

### Sesión y acceso del portal (de la 005: FR-001–FR-008)

- [ ] T015 [P] ⛔ [Dep 005 FR-006] *(Rastro.)* Era: cookie `citaclara_portal` en `src/lib/sesionPortal.ts` (jose, `aud: "portal"`, `Path=/p`, 30 min). Solo hace falta si la 005 exige sesión; aportación técnica en research P4
- [ ] T016 ⛔ [Dep 005] *(Rastro.)* Era: `src/servicios/accesoPaciente.ts` (`obtenerOCrearAcceso`, `regenerarAcceso`, `verificarCifras`, `validarSesionPortal`). Obtener, regenerar y resolver el enlace: 005 FR-001–FR-005; verificar cifras y sesión: [Dep 005 FR-006]
- [ ] T017 ⛔ [Dep 005 FR-006] *(Rastro.)* Era: Server Actions `entrarPortal({ token, cifras })` y `salirPortal()` en `src/acciones/portal.ts`
- [ ] T018 ◐ [Parcial] Ampliar `src/proxy.ts` para que `/p/*` quede fuera de la protección de `/agenda/*` (propio de la 002: la ruta del portal es pública, 005 FR-001). Renovar una cookie del portal y que `/agenda/*` la ignore: ⛔ [Dep 005 FR-006]
- [ ] T019 ◐ [Parcial] Crear `src/app/p/[token]/layout.tsx` (layout móvil: cabecera con nombre de la clínica y enlace `tel:` «Llamar a la clínica» con su teléfono; FR-009, teléfono de 001 FR-022). La pantalla de cifras `src/components/portal/formulario-cifras.tsx` (textos en `contracts/ui-routes.md`): ⛔ [Dep 005 FR-006]
- [ ] T020 ⛔ [Dep 005] *(Rastro.)* Era: `tests/integration/acceso-paciente.test.ts` (enlace inexistente, cifras, bloqueos bajo concurrencia, creación simultánea del enlace, separación de cookies). Las pruebas del acceso son de la 005 (su SC-001 y SC-002); las de cifras e intentos, [Dep 005 FR-006]

### Datos de demostración (research P8, Principio V)

- [ ] T021 ⛔ [Dep 001] [Dep 005] *(Rastro: la 002 no amplía la semilla.)* Era: en `src/semilla/generar.ts`, `telefono: '911 234 567'` y `cancelada_por: 'recepcion'` en la historia (→ 001 FR-022, FR-018a) y un enlace por paciente al final de la secuencia del PRNG (→ 005 FR-019; aportación en research P8)
- [ ] T022 ◐ [Parcial] Ampliar `scripts/seed.ts` para añadir al resumen los **Paciente A** y **Paciente B** elegidos con la regla de research P8 (nombre, teléfono y URL de su enlace personal de la 005; si no hay Paciente B, indicarlo). Insertar los enlaces: ⛔ [Dep 005] (FR-019); teléfono de la clínica en el resumen: ⛔ [Dep 001] (FR-022); 4 cifras en el resumen: ⛔ [Dep 005 FR-006] (depende de la 005 y de T001)
- [ ] T023 ◐ [Parcial] Ampliar `tests/integration/semilla.test.ts`: la regla de selección de Paciente A y B es determinista con 2026-11-09 (propio de la 002). Identidad de la semilla de la 001, teléfono y `cancelada_por` en la historia: ⛔ [Dep 001]; 40 enlaces reproducibles: ⛔ [Dep 005] (FR-019) (depende de T022)

**Checkpoint**: base lista; con el acceso de la 005 entregado, un paciente abre `/p/[token]` (aún sin ver citas)

---

## Phase 3: User Story 1 - Consultar mis citas desde el móvil (Priority: P1) 🎯 MVP

**Goal**: el paciente ve sus próximas citas y su historial; recepción le da el enlace y puede sustituirlo.

**Independent Test**: con la semilla, entrar en el portal del Paciente A con su enlace (y sus cifras, si 005 FR-006 las exige) y comprobar que las citas coinciden exactamente con las suyas en la semilla y que no aparece ninguna de otro paciente.

### Tests for User Story 1 (MANDATORY - Principle VI) ⚠️

> **NOTE: escribir estos tests PRIMERO y comprobar que FALLAN antes de implementar**

- [ ] T024 [P] [US1] Escribir `tests/integration/portal-lectura.test.ts` para `obtenerPortal`: próximas y historial del paciente del enlace con fecha, hora, servicio, profesional y etiqueta (002 US1 #1, #2; FR-007, FR-008); **ninguna cita de otro paciente** aunque comparta profesional y día (FR-004, SC-004); sin precio, teléfono del paciente ni datos de la agenda en el objeto devuelto (FR-010); `clinica.nombre` y `clinica.telefono` presentes (FR-009); paciente sin citas futuras → `proximas` vacío (002 US1 #3)
- [ ] T025 [P] [US1] ⛔ [Dep 005] *(Rastro.)* Era: `tests/integration/enlace-portal.test.ts` (enlace estable, regeneración, enlace anterior no válido, sesión caducada). Lo prueba la 005 (FR-003–FR-005, su US3); la parte de sesión, [Dep 005 FR-006]
- [ ] T026 [P] [US1] ◐ [Parcial] Escribir `tests/e2e/portal/consulta.spec.ts` (semilla 2026-11-09, proyectos `movil` y `portatil`): escenarios 3, 4, 11, 12 y 14 de quickstart.md (próximas e historial del Paciente A; Paciente B con «No tienes próximas citas…» y teléfono; regenerar enlace con el portal abierto → texto de US1 #5; «Copiar enlace del portal»). Escenarios 1, 2 y 13 (cifras y bloqueo) y «Salir»: ⛔ [Dep 005 FR-006]

### Implementation for User Story 1

- [ ] T027 [US1] Implementar en `src/servicios/portal.ts` `obtenerPortal(acceso)`: recibe la ficha y clínica del enlace vigente resueltas por la 005, lee solo las citas con ese `clinica_id` y `paciente_id`, usa `clasificarCitas`, `formato.ts` y `zona.ts` y devuelve `Portal`/`CitaPortal` del contrato (de momento con `cancelable` y `plazo` calculados con `esCancelablePorPaciente`/`plazoCancelacion`) (depende de T009, T008 y del acceso de la 005)
- [ ] T028 [P] [US1] Crear `src/components/portal/tarjeta-cita.tsx` (fecha «lunes, 16/11/2026», hora «10:00–10:45», servicio y profesional; en historial, etiqueta con texto + icono, nunca solo color) y `src/components/portal/lista-vacia.tsx` («No tienes próximas citas. Para pedir una, llama a Clínica Eleva al 911 234 567.» con enlace `tel:`; «Todavía no tienes citas anteriores.»)
- [ ] T029 [US1] Crear `src/components/portal/vista-portal.tsx` con pestañas «Próximas citas» (por defecto) e «Historial», y `src/app/p/[token]/page.tsx`, que muestra el texto de `ENLACE_NO_VALIDO` si el enlace no es válido (005 FR-007) y el portal si lo es, más `loading.tsx` («Cargando tus citas…») (depende de T027, T028, T019). Pantalla de cifras sin sesión válida y botón «Salir»: ⛔ [Dep 005 FR-006]
- [ ] T030 [US1] ⛔ [Dep 005] *(Rastro.)* Era: Server Actions `obtenerEnlacePortal({ pacienteId })` y `regenerarEnlacePortal({ pacienteId })` en `src/acciones/enlacePortal.ts`. Comportamiento de 005 FR-004 y FR-005; la 002 solo las invoca desde T031
- [ ] T031 [US1] Crear `src/components/agenda/menu-enlace-portal.tsx` (presentación propia de la 002, FR-002a y FR-002b; usa las acciones de la 005): «Copiar enlace del portal» (copia con `navigator.clipboard`; aviso «Enlace copiado. Envíaselo al paciente por WhatsApp o correo.»; si falla, muestra la URL seleccionable) y «Generar nuevo enlace del portal» (`AlertDialog` «Se creará un enlace nuevo para [nombre del paciente] y el anterior dejará de funcionar. ¿Continuar?», después muestra el enlace nuevo con «Copiar»); integrarlo en `src/components/agenda/acciones-cita.tsx` para citas en cualquier estado (depende de las acciones de enlace de la 005)

**Checkpoint**: el paciente consulta sus citas desde el móvil y recepción gestiona su enlace: ya descarga las llamadas de «¿cuándo era mi cita?»

---

## Phase 4: User Story 2 - Cancelar una cita futura sin llamar (Priority: P1)

**Goal**: el paciente cancela una cita propia hasta 24 h antes, con confirmación; queda cancelada en la agenda al instante.

**Independent Test**: cancelar desde el portal una cita del Paciente A dentro de plazo y comprobar «Cancelada» en el portal y en la agenda con el hueco libre; intentar una fuera de plazo y comprobar el rechazo.

### Tests for User Story 2 (MANDATORY - Principle VI) ⚠️

- [ ] T032 [P] [US2] Escribir `tests/integration/cancelar-paciente.test.ts` (requiere 001 FR-018a): dentro de plazo → `cancelada`, `cancelada_por = 'paciente'`, `estado_cambiado_en` = ahora (002 US2 #1, FR-014; origen: 001 FR-018a); `FUERA_DE_PLAZO` cuando el plazo vence entre mostrar y confirmar (reloj 12:14:59 vs 12:15:00 para una cita del martes 10/11/2026 a las 12:15; 002 US2 #4); `CITA_NO_ENCONTRADA` para la cita de otro paciente, sin cambiarla (FR-004); `ESTADO_CAMBIADO` con estado actual si recepción la canceló antes (002 US2 #5, FR-014); cita completada o no asistida → `ESTADO_CAMBIADO`; enlace regenerado → `ENLACE_NO_VALIDO` sin cambiar la cita (005 US3 #4; con sesión, `SESION_PORTAL_CADUCADA` [Dep 005 FR-006]); cada rechazo comprueba el texto exacto del contrato
- [ ] T033 [P] [US2] Escribir `tests/integration/solape-cancelacion.test.ts` (Principio III, research P6, SC-004): cancelación del paciente en paralelo con 10 `crearCita` de recepción sobre el mismo hueco → si la cancelación se confirma, exactamente 1 reserva; si no, 0; en ningún caso dos citas `reservada`/`completada` solapadas en la BD; 100 repeticiones deterministas → 0 pares solapados; doble cancelación simultánea paciente + paciente (dos pestañas con el mismo enlace) y paciente + recepción → exactamente un cambio efectivo, el otro recibe `ESTADO_CAMBIADO`; el `cancelada_por` final corresponde a quien ganó; tras cancelar, el tramo se puede reservar (002 US2 #6)
- [ ] T034 [P] [US2] Escribir `tests/e2e/portal/cancelar.spec.ts` (proyectos `movil` y `portatil`): escenarios 5, 6, 7 y 10 de quickstart.md (cancelar → «No, mantenerla» sin cambios; confirmar → «Tu cita del … está cancelada.» y pasa al Historial; en la agenda de recepción la cita figura cancelada y el hueco libre y reservable; cita fuera de plazo sin botón y con «Ya no se puede cancelar desde aquí. Llama a Clínica Eleva al 911 234 567.»); el foco del diálogo empieza en «No, mantenerla»

### Implementation for User Story 2

- [ ] T035 [US2] Implementar en `src/servicios/citas.ts` `cancelarCitaPaciente(acceso, citaId)` con la sentencia condicional única de research P5 (`clinica_id`, `paciente_id`, `estado = 'reservada'` y `ahora() < inicio − 24 h` en el `WHERE`; `cancelada_por = 'paciente'`, valor de 001 FR-018a) y, si no actualiza ninguna fila, relectura para devolver `CITA_NO_ENCONTRADA`, `ESTADO_CAMBIADO` (con estado actual) o `FUERA_DE_PLAZO` en ese orden de comprobación (depende de T008, de 001 FR-018a y del acceso de la 005)
- [ ] T036 [US2] Añadir la Server Action `cancelarCitaPaciente({ citaId })` en `src/acciones/portal.ts` (Zod, autorizada con el enlace vigente de la ruta según la 005 —y la sesión, si 005 FR-006 la exige—, `revalidatePath` de `/p/[token]` y de la agenda del profesional y día afectados) (depende de T035)
- [ ] T037 [P] [US2] Crear `src/components/portal/dialogo-cancelar.tsx`: `AlertDialog` «¿Cancelar tu cita?» con fecha, hora, servicio y profesional, botones «Sí, cancelar cita» y «No, mantenerla» (foco inicial en este), estado de envío y aviso de éxito o del mensaje del contrato ante rechazo
- [ ] T038 [US2] Ampliar `src/components/portal/tarjeta-cita.tsx` para las próximas: si `cancelable`, «Puedes cancelarla hasta el domingo, 15/11/2026 a las 10:00» y botón «Cancelar cita» que abre `dialogo-cancelar.tsx`; si no, «Ya no se puede cancelar desde aquí. Llama a Clínica Eleva al 911 234 567.» con enlace `tel:` (FR-012, FR-013) (depende de T036, T037)

**Checkpoint**: US1 y US2 funcionan; el paciente consulta y cancela sin llamar, y ningún flujo permite un solape

---

## Phase 5: User Story 3 - Recepción se entera de los huecos que liberan los pacientes (Priority: P2)

**Goal**: la agenda distingue las cancelaciones del paciente y un aviso en el panel reúne los huecos liberados que siguen libres.

**Independent Test**: cancelar una cita desde el portal y otra desde recepción; en la agenda se distingue quién canceló cada una y solo la primera aparece en el aviso hasta que recepción vuelve a ocupar ese hueco.

### Tests for User Story 3 (MANDATORY - Principle VI) ⚠️

- [ ] T039 [P] [US3] Escribir `tests/integration/huecos-liberados.test.ts` para `obtenerHuecosLiberados` (FR-015a, data-model.md; requiere 001 FR-018a): cancelación de paciente futura y libre → aparece; cancelación de recepción → no aparece (002 US3 #2); hueco reocupado total o parcialmente por una cita reservada o completada → desaparece (002 US3 #4); hueco cuyo inicio ya llegó → desaparece; dos cancelaciones de paciente del mismo tramo → una sola entrada (la más reciente); orden por inicio; solo datos de la clínica de la sesión
- [ ] T040 [P] [US3] Ampliar `tests/integration/agenda.test.ts` (001; requiere 001 FR-018a): `CitaVista.canceladaPor` es `paciente` con `canceladaEn` «09/11/2026 12:10» para cancelaciones desde el portal y `recepcion` sin fecha para las de recepción (002 US3 #1, #2)
- [ ] T041 [P] [US3] Escribir `tests/e2e/agenda/huecos-liberados.spec.ts` (proyectos `movil` y `portatil`): escenarios 7–9 de quickstart.md (etiqueta «Cancelada por el paciente» y «el 09/11/2026 a las 12:10»; botón «Huecos liberados por pacientes (1)» con «María · lunes, 16/11/2026 · 10:00–10:45 · cancelada el 09/11/2026 a las 12:10» si la cita cancelada es esa, o el hueco equivalente del Paciente A; reservar el hueco lo quita y el botón desaparece; sin huecos pendientes el botón no se muestra)

### Implementation for User Story 3

- [ ] T042 [US3] Ampliar `obtenerAgendaDia` en `src/servicios/agenda.ts` (001) para incluir `canceladaPor` (columna de 001 FR-018a) y `canceladaEn` en `CitaVista`, y mostrar en `src/components/agenda/bloque-cita.tsx` la etiqueta «Cancelada por el paciente» con «el 09/11/2026 a las 12:10» (texto + icono) cuando corresponda; las de recepción siguen como «Cancelada»
- [ ] T043 [US3] Implementar en `src/servicios/huecosLiberados.ts` `obtenerHuecosLiberados(clinicaId)` con la consulta derivada de data-model.md (`NOT EXISTS` con solape sobre citas `reservada`/`completada` del mismo profesional, `inicio > ahora()`, agrupación por profesional/inicio/fin quedándose con la cancelación más reciente) y `enlaceAgenda` a `/agenda/{profesionalId}/{fecha}`
- [ ] T044 [US3] Crear `src/components/agenda/aviso-huecos-liberados.tsx` (botón «Huecos liberados por pacientes (N)» solo si N > 0; `Sheet` lateral en portátil y pantalla completa en móvil con la lista y enlaces a la agenda) e integrarlo en `src/components/cabecera.tsx` (001), cargando los datos en cada página del panel (depende de T043)

**Checkpoint**: las tres historias funcionan de forma independiente

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: calidad transversal, datos citables y validación final

- [ ] T045 [P] Ejecutar `pnpm seed --fecha-referencia 2026-11-09` y añadir a `docs/datos-demo.md` los Paciente A y B (nombre, URL de su enlace de la 005, 4 cifras solo si 005 FR-006 las exige, citas próximas y de historial con sus estados) y cómo reproducirlos; sustituir en `specs/002-portal-paciente/quickstart.md` y en los tests e2e las referencias genéricas a «A» y «B» por esos datos cuando aporten claridad (Principio V)
- [ ] T046 [P] Escribir `tests/e2e/portal/accesibilidad.spec.ts`: axe sin infracciones AA en el portal (ambas pestañas), la pantalla de enlace no válido, la pantalla de cifras si existe [Dep 005 FR-006], el diálogo de cancelación y el aviso de huecos liberados, en `movil` y `portatil`; sin desplazamiento horizontal a 360 px; objetivos táctiles ≥ 44×44 px; navegación completa con teclado (SC-006, FR-017)
- [ ] T047 [P] Escribir `tests/e2e/portal/rendimiento.spec.ts`: tras completar el acceso del Paciente A, sus citas se muestran completas en < 2 s (plan, Performance Goals)
- [ ] T048 Revisar todos los textos visibles nuevos en `src/components/portal/`, `src/app/p/`, `src/components/agenda/` y `src/dominio/errores.ts`: español de España, trato de «tú» en el portal, sin jerga técnica, cada error dice qué pasa y qué hacer, y ninguna pantalla del portal muestra datos sin acceso válido (005 FR-006, FR-007; FR-018, Principios VII y VIII)
- [ ] T049 [P] Actualizar `README.md` con el portal del paciente (ruta `/p/[token]`, variable `CITACLARA_URL_PUBLICA`, cómo obtener el enlace de un paciente desde la agenda) enlazando a `specs/002-portal-paciente/quickstart.md`
- [ ] T050 Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm test:e2e` en verde (suite completa de la 001 y la 002) y recorrer a mano los 15 escenarios de `specs/002-portal-paciente/quickstart.md`
- [ ] T051 Realizar la prueba de usabilidad previa a la entrega (SC-001, SC-002) descrita en `specs/002-portal-paciente/quickstart.md` con 2 personas nuevas en móvil y registrar tiempos y observaciones en `docs/usabilidad-002.md` (tarea manual, requiere personas reales)
- [ ] T052 Crear `docs/llamadas-eleva.md` con la plantilla de recuento de llamadas de consulta y cancelación para Sonia (semana anterior a activar el portal y cuarta semana después) y el objetivo de −50 % (SC-003; la medición en sí es posterior a la entrega)

---

## Dependencies & Execution Order

### Phase Dependencies

- **001 integrada**: requisito previo de todo (código, esquema, semilla y tests de la 001),
  **incluidos 001 FR-018a (origen de la cancelación) y FR-022 (teléfono de la clínica)**, que
  hoy no están en la 001 de `001-agenda-core`
- **005 integrada** (acceso del paciente, FR-001–FR-008, FR-019): requisito previo de US1, US2
  y de las acciones de enlace del panel. Con 005 FR-006 sin clarificar, las tareas
  ⛔ [Dep 005 FR-006] no se pueden cerrar ni descartar
- **Setup (Phase 1)**: sin dependencias dentro de la 002
- **Foundational (Phase 2)**: depende de Setup y BLOQUEA todas las historias
- **US1, US2, US3 (Phases 3–5)**: dependen de Foundational
- **Polish (Phase 6)**: depende de las historias que se entreguen

### User Story Dependencies

- **US1 (P1)**: tras Foundational; sin dependencias de otras historias
- **US2 (P1)**: tras Foundational; sus tests de integración usan `tests/helpers/fabrica.ts` y el acceso de la 005 sin depender de US1, pero la interfaz (T038) amplía `tarjeta-cita.tsx` de US1 (T028) y vive en la página de T029: en la práctica, US2 después de US1
- **US3 (P2)**: tras Foundational; sus tests crean cancelaciones de paciente directamente con la fábrica, sin depender de US2; T042 y T044 tocan archivos de la 001 (`agenda.ts`, `bloque-cita.tsx`, `cabecera.tsx`)

### Within Each User Story

- Tests primero, y deben fallar antes de implementar; cada test cita la regla o el criterio de la 002 que cubre
- Dominio puro → servicios → Server Actions → componentes → páginas
- `src/servicios/citas.ts` se toca en T035 (US2); `src/acciones/portal.ts` en T036; `src/components/agenda/acciones-cita.tsx` (001) en T031

### Archivos compartidos con la 001 y con ramas en paralelo

Esta feature modifica archivos de la 001: `src/servicios/citas.ts`, `src/servicios/agenda.ts`,
`scripts/seed.ts` (solo el resumen de Paciente A/B), `src/proxy.ts`,
`src/components/agenda/acciones-cita.tsx`, `bloque-cita.tsx` y `src/components/cabecera.tsx`.
Ya no toca `src/db/esquema.ts`, las migraciones ni `src/semilla/generar.ts`: eso lo entregan
la 001 (FR-018a, FR-022) y la 005. Las ramas `analitica`, `recordatorio` y
`005-acceso-cancelacion-paciente` pueden tocar los mismos archivos: integrar la 001 y la 005
primero y mantener los cambios aditivos.

### Parallel Opportunities

- Setup: T002 y T003
- Foundational: T008, T009, T011, T012 y T013 en paralelo; T006, T018, T019, T022 y T023 cuando la 001 y la 005 estén integradas (las tareas ⛔ no se ejecutan en la 002)
- US1: T024 y T026 (tests) y T028
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

1. 001 (con FR-018a y FR-022) y 005 integradas → Phase 1 Setup → Phase 2 Foundational (reglas puras, ayudantes de prueba, rutas públicas del portal)
2. Phase 3 US1 → **PARAR Y VALIDAR**: el Paciente A ve sus citas en el móvil y recepción le copia el enlace (quickstart 1, 3, 4, 11, 12 y 14; 2 y 13 solo si 005 FR-006 mantiene las cifras)
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
