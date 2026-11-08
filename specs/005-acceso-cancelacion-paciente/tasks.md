---

description: "Lista de tareas de la feature 005-acceso-cancelacion-paciente"
---

# Tasks: Acceso y cancelación del paciente

**Input**: Design documents from `/specs/005-acceso-cancelacion-paciente/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: OBLIGATORIOS (Constitución, Principio VI). Cada test cita en su nombre el FR, el
escenario (p. ej. `US2 #4`) o el SC que cubre. La feature escribe en la agenda
(«reservada» → «cancelada»): son obligatorias la prueba del hueco liberado, la de cancelación
del paciente simultánea con un alta en el mismo hueco y las ráfagas de cancelaciones
simultáneas (Principio III).

**Organization**: tareas agrupadas por historia de usuario para implementarlas y probarlas de
forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2, US3)
- Rutas relativas a la raíz del repositorio (proyecto único de la 001, ver plan.md)

## Referencias rápidas

- Decisiones: [research.md](research.md) (R0–R11)
- Tabla `enlace_paciente`, estados del enlace y `UPDATE` de cancelación: [data-model.md](data-model.md)
- Acciones, códigos de error y mensajes exactos: [contracts/server-actions.md](contracts/server-actions.md)
- Pantallas de `/p/[token]`, diálogos y menú del panel: [contracts/ui-routes.md](contracts/ui-routes.md)
- Validación manual: [quickstart.md](quickstart.md)
- Reloj de los E2E: `AHORA_E2E = 2026-11-09T12:10:00+01:00` (lunes, `playwright.config.ts`);
  semilla con fecha de referencia **2026-11-09**. En integración el reloj se fija con
  `fijarAhora()` de `src/lib/reloj.ts`.
- Cita de referencia de la spec: María, «Sesión de fisioterapia», lunes 16/11/2026 de 10:00 a
  10:45 (`2026-11-16T09:00Z`); el plazo vence el domingo 15/11/2026 a las 10:00
  (`2026-11-15T09:00Z`).

---

## Phase 1: Setup (prerrequisito de otra spec)

**Purpose**: comprobar que el código ya tiene lo que la 005 lee y escribe de la 001 (research R0)

- [X] T001 (Hecho: código, unitarias e integración de la 001 en verde; su E2E, 001 T074, sigue pendiente) Comprobar que la enmienda S2–S5 de la 001 está en el código, es decir, las tareas T067–T076 de `specs/001-agenda-core/tasks.md`: en `src/db/esquema.ts` existen `clinica.telefono`, el enum `origen_cancelacion` (`recepcion` | `paciente`), `cita.cancelada_por` y la restricción `cita_origen_cancelacion`; `cambiarEstadoCita` en `src/servicios/citas.ts` escribe `cancelada_por = 'recepcion'`; la semilla da a Clínica Eleva el teléfono «911 234 567»; y la suite de la 001 está en verde. Si falta algo, **parar**: es trabajo de la 001 (`/speckit-implement` sobre su enmienda), no de la 005 (Principio I). Anotar aquí el nombre de la última migración de la 001, porque la de la 005 va detrás (T003)

**Checkpoint**: la 001 expone `clinica.telefono` y `cita.cancelada_por`; ya se puede empezar la 005

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tabla de enlaces, reglas puras del enlace, códigos de error, creación del enlace con cada ficha, semilla y ayudantes de pruebas. Todas las historias lo necesitan

**⚠️ CRITICAL**: ninguna historia puede empezar hasta completar esta fase

### Base de datos

- [X] T002 Añadir en `src/db/esquema.ts` la tabla `enlacePaciente` (`enlace_paciente`) según data-model.md: `paciente_id` uuid PK y FK → `paciente` con `ON DELETE CASCADE`; `token` texto único; `generado_en` timestamptz no nulo; `fallos_seguidos` smallint no nulo por defecto 0; `pausa_hasta` timestamptz nulo; `CHECK (fallos_seguidos >= 0)` y `CHECK (token ~ '^[A-Za-z0-9_-]{43}$')`. Exportar los tipos de fila
- [X] T003 Generar con `pnpm db:generate` la migración de la tabla en `src/db/migraciones/` con el número siguiente a la última de la 001 (anotada en T001; si es `0003_…`, será `0004_enlace_paciente.sql`) y actualizar `src/db/migraciones/meta/_journal.json`. Añadirle a mano `CREATE EXTENSION IF NOT EXISTS pgcrypto` y el relleno de las fichas existentes: `INSERT INTO enlace_paciente (paciente_id, token, generado_en) SELECT id, translate(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+/', '-_'), now() FROM paciente` (data-model.md, «Migración») (depende de T002)

### Reglas puras y mensajes

- [X] T004 [P] Crear `src/dominio/enlace.ts` (sin acceso a BD): `FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/` y `tieneFormatoDeToken(token)`; `rutaEnlacePaciente(token)` → `'/p/<token>'`, con un comentario que cite «005, FR-008: único enlace de paciente»; `ultimasCuatroCifras(telefonoNormalizado)`; las constantes `FALLOS_PARA_PAUSA = 5`, `FALLOS_PARA_BLOQUEO = 10` y `PAUSA_MS = 15 · 60 · 1000`; `estadoEnlace({ fallosSeguidos, pausaHasta }, ahora)` → `'bloqueado' | 'en_pausa' | 'vigente'`; y `registrarIntento(estado, acierto, ahora)`, que devuelve los nuevos `fallosSeguidos` y `pausaHasta` y el resultado (`acceso` | `cifras_incorrectas` | `en_pausa` | `bloqueado`) según el orden de research R4
- [X] T005 [P] Escribir `tests/unit/enlace.test.ts`: `FR-002`, con el formato de 43 caracteres base64url y el rechazo de tokens cortados, con espacios o con caracteres `+/=` (edge case «Enlace mal copiado»); `FR-006a`, con la tabla de transiciones (fallos 1–4 → `cifras_incorrectas`; el 5.º → `en_pausa` con `pausaHasta = ahora + 15 min`; cualquier intento con la pausa activa, aunque sea correcto → `en_pausa` sin contar; pasada la pausa, el 6.º–9.º → `cifras_incorrectas`; el 10.º → `bloqueado`; con 3 fallos, un acierto → `acceso` y cuenta a 0 (`US1 #6`)); `ultimasCuatroCifras('612345678') = '5678'`; `rutaEnlacePaciente`
- [X] T006 [P] Ampliar `src/dominio/errores.ts`: añadir a `CodigoError` los códigos `ENLACE_NO_VALIDO`, `CIFRAS_INCORRECTAS`, `ACCESO_EN_PAUSA`, `ENLACE_BLOQUEADO`, `ACCESO_CADUCADO` y `FUERA_DE_PLAZO`, y a `mensajes` sus textos exactos de contracts/server-actions.md, con el nombre y el teléfono de la clínica y la hora interpolados (p. ej. `enlaceNoValido(clinica, telefono)`, `accesoEnPausa(hasta)`). Añadir también `cifrasNoValidas()` («Escribe las 4 últimas cifras de tu teléfono.») para `DATOS_NO_VALIDOS` y `citaDelPacienteNoEncontrada()` («No encontramos esa cita. Actualiza la página.»). Los textos tratan de «tú» al paciente (Principio VIII)

### Un enlace por ficha (FR-001, FR-003)

- [X] T007 Crear `src/servicios/enlaces.ts` con `generarToken()` (`randomBytes(32).toString('base64url')` de `node:crypto`) y `crearEnlace(ejecutor, pacienteId, ahora)`, que inserta la fila de `enlace_paciente` dentro de la transacción recibida (research R2, R3) (depende de T002, T004)
- [X] T008 En `src/servicios/pacientes.ts`, hacer que `crearPaciente` llame a `crearEnlace` en la misma transacción que inserta la ficha, para que no exista ninguna ficha sin enlace (FR-001) (depende de T007)

### Datos de demostración (FR-019, Principio V)

- [X] T009 [P] Añadir a `src/semilla/prng.ts` un método `bytes(n)` que devuelva un `Uint8Array` a partir de `u32()`, sin cambiar la secuencia de los métodos que ya existen
- [X] T010 En `src/semilla/generar.ts`, después de generar todo lo demás, crear los 40 enlaces con un flujo propio `crearPrng(SEMILLA_DEMO ^ 0x0e1ace)`: 32 bytes por paciente, en el orden de la lista de pacientes y en base64url, con `generadoEn` = la fecha de alta de los pacientes y `fallosSeguidos = 0`. No debe consumir nada de los flujos `azar` ni `ids` (research R9). Añadir `enlaces` a `DatosSemilla` y en `src/semilla/cargar.ts` insertarlos en `enlace_paciente` dentro de la transacción de carga (depende de T002, T009)
- [X] T011 Ampliar `tests/helpers/fabrica.ts`: `crearEscenario()` crea también el enlace de `ana` y de `luis` con tokens fijos de formato válido, y los devuelve en `Escenario` (`tokenAna`, `tokenLuis`). Añadir el ayudante `fijarIntentos(pacienteId, { fallosSeguidos, pausaHasta })` para preparar enlaces en pausa o bloqueados (depende de T007)
- [X] T012 [P] Ampliar `tests/unit/semilla.test.ts` y crear o ampliar `tests/integration/semilla.test.ts` (`FR-019`): con la fecha 2026-11-09 hay 40 enlaces, uno por paciente, con formato válido y todos distintos; dos generaciones dan los mismos tokens; los identificadores, citas, estados y recuentos son idénticos a los de antes de la 005, comparándolos con los valores de `docs/datos-demo.md` y `resumirSemilla`; la carga deja 40 filas en `enlace_paciente`; y las fichas creadas con `crearPaciente` tienen exactamente un enlace (`FR-001`) (depende de T008, T010)
- [X] T013 Ejecutar `pnpm seed --fecha-referencia 2026-11-09` y añadir a `docs/datos-demo.md` la sección «Enlaces de pacientes»: una tabla con el nombre, la ruta `/p/<token>` y las 4 últimas cifras de los 3 primeros pacientes de la semilla (el primero es **P** del quickstart) y una nota de que el resto de cifras del documento no cambia (depende de T010)

**Checkpoint**: cada ficha, nueva o de la semilla, tiene exactamente un enlace; la suite de la 001 sigue en verde

---

## Phase 3: User Story 1 - Entrar con mi enlace personal (Priority: P1) 🎯 MVP

**Goal**: el paciente abre `/p/[token]`, confirma las 4 últimas cifras de su teléfono y ve sus próximas citas. Un enlace no válido, en pausa o bloqueado no muestra ningún dato de pacientes

**Independent Test**: con la semilla cargada, abrir el enlace de P (`docs/datos-demo.md`), escribir sus 4 cifras y ver solo sus citas; con cifras erróneas o con un enlace inventado, no ver ningún dato (quickstart 1–5)

### Tests for User Story 1 (MANDATORY - Principle VI) ⚠️

- [X] T014 [P] [US1] Escribir `tests/unit/acceso-paciente.test.ts` (`FR-006b`, `US1 #7`), con el reloj fijado con `fijarAhora`: una cookie emitida a las 10:00 es válida a las 10:29 y deja de serlo a las 10:31; renovarla a las 10:20 la deja válida hasta las 10:50; si la huella no coincide con `sha256(token de la URL)`, no es válida; una firma alterada no es válida; la cookie lleva `path=/p`, `httpOnly` y `SameSite=Lax`
- [X] T015 [P] [US1] Escribir `tests/integration/enlaces.test.ts`:
  - `US1 #1` / `FR-006`: el token de Ana con sus cifras abre el acceso, y `proximasCitas` solo devuelve citas de Ana (con citas de Luis en la misma clínica y el mismo día).
  - `US1 #2` / `FR-007`: un token con formato correcto que no existe y un token sin formato dan el mismo `ENLACE_NO_VALIDO`, con un mensaje idéntico y sin ningún nombre de paciente. El token sin formato no hace ninguna consulta (espiar el cliente de BD).
  - `US1 #3` / `FR-003`: el token de Ana es el mismo tras abrirlo varias veces, tras crearle una cita nueva y tras cancelarle una desde recepción.
  - `US1 #4`: con cifras erróneas da `CIFRAS_INCORRECTAS` y no se abre el acceso.
  - `US1 #5`: con 4 fallos, el 5.º da `ACCESO_EN_PAUSA` con `hasta = ahora + 15 min`; dentro de la pausa, el intento correcto da `ACCESO_EN_PAUSA` sin contar; a los 15 min se puede volver a intentar; el 10.º fallo da `ENLACE_BLOQUEADO`; y un enlace bloqueado rechaza también las cifras correctas.
  - `US1 #6`: con 3 fallos, un acierto pone `fallos_seguidos` a 0.
  - `DATOS_NO_VALIDOS` con «12a4» o «123» no cuenta como fallo.
  - Edge case «Recepción cambia el teléfono de la ficha»: tras cambiar el teléfono, valen las 4 cifras nuevas y no las antiguas, y el token no cambia.
- [X] T016 [P] [US1] Escribir `tests/integration/intentos-concurrencia.test.ts` (`FR-006a`, edge case «Fallos desde varios dispositivos»):
  - 20 intentos erróneos simultáneos sobre el mismo enlace terminan con `fallos_seguidos = 5` exactos: 4 respuestas `CIFRAS_INCORRECTAS` y 16 `ACCESO_EN_PAUSA`.
  - Con el reloj 15 min después, otros 20 simultáneos terminan con `fallos_seguidos = 10` exactos y el enlace bloqueado.
  - 10 intentos correctos simultáneos con 3 fallos previos terminan con la cuenta a 0.
- [X] T017 [P] [US1] (Escrito; sin ejecutar, ver T028.) Escribir `tests/e2e/acceso-paciente.spec.ts` en `portatil` y `movil`, con el enlace de `PACIENTE_1` desde la semilla:
  - `US1 #1`: la pantalla «Confirma que eres tú» muestra el nombre y el teléfono de la clínica, ningún nombre de paciente y el `<title>` «CitaClara · Clínica Eleva»; tras las cifras correctas aparece «Tus próximas citas» solo con citas suyas.
  - `US1 #2`: un enlace inventado de 43 caracteres muestra «Enlace no válido», con el teléfono como enlace `tel:`, y responde con estado 404.
  - `US1 #4`: con cifras erróneas aparece el mensaje bajo el campo y el foco vuelve a él.
  - `US1 #5`: tras 5 fallos aparece «Podrás volver a intentarlo a las 12:25» y el formulario se deshabilita. Con `fallos_seguidos = 10`, preparado con `conBd`, aparece «Enlace bloqueado» sin campo de cifras.
  - `US1 #6`: con 3 fallos previos, las cifras correctas dan acceso.
  - Cabeceras de `/p/*`: `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow` y `Cache-Control: no-store` (research R10).
  - axe sin infracciones en las cuatro pantallas de acceso.
  - `US1 #7` no se prueba en E2E porque el reloj del servidor está fijo; lo cubren T014 y T015.

### Implementation for User Story 1

- [X] T018 [P] [US1] (Hecho en dos ficheros: `src/lib/acceso-paciente.ts`, puro, y `src/lib/sesion-paciente.ts`, con `next/headers`, igual que `token-sesion.ts` y `sesion.ts` de la 001.) Crear `src/lib/acceso-paciente.ts` (research R5): `NOMBRE_COOKIE_PACIENTE = 'citaclara_paciente'` y `DURACION_ACCESO_SEGUNDOS = 30 · 60`; `huella(token)` = SHA-256 en hexadecimal (`node:crypto`); `crearTokenAcceso({ pacienteId, clinicaId, huella })` firmado con jose (HS256, `SESION_SECRETO`); `verificarTokenAcceso(valor, tokenUrl)`, que verifica con `currentDate: ahora()` para respetar el reloj fijado y exige la huella del token de la URL; `abrirAcceso`, `cerrarAcceso` y `accesoDelPaciente(tokenUrl)` sobre `cookies()` de `next/headers` (`httpOnly`, `Secure` en producción, `SameSite=Lax`, `path=/p`, `maxAge` 30 min); y `renovarEnRespuesta(peticion, respuesta)` para el proxy
- [X] T019 [US1] Ampliar `src/servicios/enlaces.ts`:
  - `resolverToken(token)`: si `tieneFormatoDeToken` falla, devuelve `null` sin consultar. Si no, une `enlace_paciente → paciente` y devuelve `{ pacienteId, clinicaId, fallosSeguidos, pausaHasta, telefonoNormalizado }` o `null`.
  - `comprobarCifras(token, cifras)`: en una transacción con `SELECT … FOR UPDATE` sobre la fila del enlace, aplica `registrarIntento` en el orden de research R4 (bloqueado → pausa → comparación con el teléfono actual), guarda los contadores y devuelve el resultado.

  (depende de T007, T004)
- [X] T020 [P] [US1] Crear `src/servicios/portal-paciente.ts` con `proximasCitas(clinicaId, pacienteId, ahora)`: citas `reservada` con `inicio ≥ ahora` del paciente, ordenadas por inicio, cada una con `id`, `fecha` («lunes, 16/11/2026»), `hora` («10:00»), servicio y profesional, en la zona de la clínica (contracts/ui-routes.md). Añadir `datosClinica(clinicaId)` (nombre, teléfono y zona) para las pantallas sin acceso
- [X] T021 [P] [US1] Añadir a `src/acciones/esquemas.ts` los esquemas Zod `esquemaToken` (43 caracteres base64url), `esquemaConfirmarCifras` (`{ token, cifras: /^\d{4}$/ }`), `esquemaCancelarMiCita` (`{ token, citaId: uuid }`) y `esquemaPacienteId` (`{ pacienteId: uuid }`)
- [X] T022 [US1] Crear `src/acciones/paciente.ts` (`'use server'`) con `confirmarCifras({ token, cifras })` y `salir({ token })` según contracts/server-actions.md. `pacienteId` y `clinicaId` salen siempre del token y nunca del cliente. Un formato inválido da `DATOS_NO_VALIDOS` sin contar; un acierto llama a `abrirAcceso`. `salir` llama a `cerrarAcceso` y siempre devuelve `ok` (depende de T018, T019, T021, T006)
- [X] T023 [US1] Ampliar `src/proxy.ts`: añadir `'/p/:path*'` al `matcher`; en `/p/*` no exige la sesión del panel ni redirige a `/entrar`, renueva `citaclara_paciente` con `renovarEnRespuesta` si es válida y su huella coincide con el token de la URL, y añade a la respuesta `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow` y `Cache-Control: no-store` (research R5, R10). El comportamiento de `/agenda` y `/entrar` no cambia (depende de T018)
- [X] T024 [P] [US1] Crear `src/components/paciente/pantalla-enlace-no-valido.tsx` y `src/components/paciente/pantalla-enlace-bloqueado.tsx`: la marca de la clínica, el mensaje de `ENLACE_NO_VALIDO` o `ENLACE_BLOQUEADO` y el teléfono como enlace `tel:`, mobile-first desde 360 px. Reciben solo el nombre y el teléfono de la clínica (FR-007)
- [X] T025 [P] [US1] Crear `src/components/paciente/formulario-cifras.tsx` (`'use client'`): el título «Confirma que eres tú», el texto «Escribe las 4 últimas cifras de tu teléfono» y un campo con etiqueta visible, `inputmode="numeric"`, `autocomplete="one-time-code"` y `maxLength=4`; el botón «Entrar» de al menos 44 px; los errores bajo el campo con `aria-live="polite"` y el foco devuelto al campo; el estado «en pausa» deshabilitado con el mensaje de `ACCESO_EN_PAUSA`. Llama a `confirmarCifras` y, si va bien, a `router.refresh()`
- [X] T026 [P] [US1] Crear `src/components/paciente/proximas-citas.tsx` (lista provisional de research R1, que la 002 sustituirá): «Tus próximas citas» con «lunes, 16/11/2026 · 10:00», servicio y profesional por cita; sin citas, «No tienes citas próximas.» y el teléfono de la clínica; y el botón «Salir». En esta historia todavía no ofrece cancelar
- [X] T027 [US1] Crear `src/app/p/[token]/page.tsx` (dinámica) y `src/app/p/[token]/not-found.tsx`. La página resuelve el token y decide el estado como en data-model.md, «Estados del enlace»: no válido → `notFound()`, que renderiza `pantalla-enlace-no-valido` con la única clínica de la instalación; bloqueado; en pausa; vigente sin acceso; acceso abierto → `proximasCitas`. `generateMetadata` da siempre el título «CitaClara · <clínica>», nunca el nombre del paciente. En Next.js 16, `params` es una promesa: consultar `node_modules/next/dist/docs/` antes de escribirla (AGENTS.md) (depende de T019, T020, T022, T024–T026)
- [X] T028 [US1] (Hecho 2026-11-08: `pnpm test` 322/322 y E2E de US1 en verde; escenarios 1–5 recorridos en Chrome contra `pnpm dev`. El 1 destapó que «Confirma que eres tú» no mostraba el teléfono de la clínica (FR-006): añadido en `src/app/p/[token]/page.tsx`, con aserción en `tests/e2e/acceso-paciente.spec.ts` y fila actualizada en `contracts/ui-routes.md`.) Ejecutar `pnpm test` y `pnpm test:e2e --grep "US1"` en verde y recorrer los escenarios 1–5 de `specs/005-acceso-cancelacion-paciente/quickstart.md`

**Checkpoint**: US1 funciona y se prueba sola. Es el MVP: el paciente entra a sus datos con su enlace y sus 4 cifras

---

## Phase 4: User Story 2 - Cancelar mi cita con más de 24 horas de margen (Priority: P1)

**Goal**: el paciente cancela una cita reservada si `ahora < inicio − 24 h`. Fuera de plazo no se le ofrece y ve el enunciado de FR-016 con el teléfono. El hueco queda libre al instante

**Independent Test**: con el reloj fijado, cancelar una cita a 25 h (procede) y ver otra a 23 h (sin «Cancelar» y con el enunciado); después, dar de alta desde recepción una cita en el hueco liberado (quickstart 8–11)

### Tests for User Story 2 (MANDATORY - Principle VI) ⚠️

- [X] T029 [P] [US2] Escribir `tests/unit/plazo-paciente.test.ts` (`FR-009`, `FR-010`) con las tres filas de FR-010:
  - Lunes 16/11/2026 10:00: el límite es el domingo 15/11 10:00; procede a las 09:00 y a las 09:59:59 y no a las 10:00:00 ni a las 11:00 (`US2 #1`, `#2`, `#4`).
  - Martes 17/11/2026 19:15: procede a las 19:14 del lunes y no a las 19:15.
  - Lunes 26/10/2026 09:00: el límite es el domingo 25/10 09:00 en hora local (`2026-10-25T08:00Z`), tras el cambio de hora.
  - `pacientePuedeCancelar` es falso para `completada`, `cancelada` y `no_asistida` aunque falten días.
  - `PLAZO_CANCELACION_PACIENTE_MS === 86_400_000`.
- [X] T030 [P] [US2] Escribir `tests/unit/politica-cancelacion.test.ts` (`FR-016`, `FR-017`, `SC-004`):
  - Para la cita de referencia, el texto es exactamente «Puedes cancelar esta cita desde tu enlace antes del domingo, 15/11/2026 a las 10:00. Después, llama a Clínica Eleva al 911 234 567.».
  - El texto contiene «antes del» y no «hasta el».
  - Para las tres filas de FR-010, la fecha y la hora del texto son las de `limiteCancelacionPaciente(inicio)` formateado en la zona de la clínica.
  - Una clínica en `Atlantic/Canary` muestra su hora local.
- [X] T031 [P] [US2] Escribir `tests/integration/cancelacion-paciente.test.ts`, con la cita de referencia de Ana creada con `insertarCita` y el acceso de Ana abierto:
  - `US2 #1`: a las 09:00 del 15/11, `cancelarCita` con origen `paciente` la deja `cancelada`, con `cancelada_por = 'paciente'` y `estado_cambiado_en` = ahora (`FR-013`).
  - `US2 #2`: a las 11:00, `proximasCitas` marca la cita como no cancelable y con el enunciado.
  - `US2 #3`: a las 11:00, la petición da `FUERA_DE_PLAZO` con `detalle.enunciado`, y la cita sigue `reservada`.
  - `US2 #4`: a las 09:59:59 procede; a las 10:00:00 da `FUERA_DE_PLAZO`.
  - `US2 #5`: tras cancelar, `crearCita` de recepción con María el 16/11 a las 10:00 para Luis se registra.
  - `US2 #6`: a las 11:00, `cambiarEstadoCita(…, 'cancelar')` desde recepción la cancela con `cancelada_por = 'recepcion'` (`FR-015`).
  - `FR-006`: cancelar una cita de Luis con el acceso de Ana da `NO_ENCONTRADO` y no cambia nada.
  - `FR-014`: si recepción la completó o canceló antes, da `ESTADO_CAMBIADO` con el estado actual.
  - Edge case «Cita reservada con menos de 24 h de antelación»: nunca es cancelable.
  - Edge case «Varias citas»: dos citas de Ana, a 25 h y a 23 h, se evalúan cada una por su inicio.
  - Regresión de la 001: recepción sigue recibiendo `CANCELACION_TARDIA` con la cita ya empezada.
- [X] T032 [P] [US2] Escribir `tests/integration/cancelacion-concurrencia.test.ts` (`SC-003`, Principio III):
  - 100 ráfagas de dos `cancelarCita` simultáneas del paciente sobre la misma cita: en cada ráfaga, exactamente 1 cambio de estado, y la otra recibe `ESTADO_CAMBIADO`.
  - 100 ráfagas de paciente + recepción (`cambiarEstadoCita`): exactamente 1 cambio y un único `cancelada_por`.
  - 50 repeticiones de una cancelación del paciente simultánea con un `crearCita` de recepción en el mismo hueco: 0 pares de citas activas solapadas al final de cada repetición; el alta o se registra o recibe `SOLAPE` / `HUECO_OCUPADO_A_LA_VEZ`.
- [X] T033 [P] [US2] (Escrito; sin ejecutar, ver T043.) Escribir `tests/e2e/cancelacion-paciente.spec.ts` en `portatil` y `movil`. Con `AHORA_E2E` (lunes 09/11 12:10), vaciar con `vaciarDia` y crear con `conBd` dos citas de `PACIENTE_1` con María: el martes 10/11 a las 10:00 (faltan 21 h 50 min) y el miércoles 11/11 a las 10:00 (faltan 45 h 50 min).
  - `US2 #1`: en la del miércoles, «Cancelar cita» abre el diálogo con servicio, profesional, día y hora y el foco en «No, mantener cita»; «Sí, cancelar mi cita» muestra «Tu cita del miércoles, 11/11/2026 a las 10:00 está cancelada.» y la cita deja de ofrecer «Cancelar».
  - `US2 #2`: la del martes no tiene botón y muestra «… antes del lunes, 09/11/2026 a las 10:00. Después, llama a Clínica Eleva al 911 234 567.».
  - `US2 #3`: con el diálogo abierto, se pasa la cita del miércoles a fuera de plazo moviendo su inicio con `conBd`; al confirmar aparece el mensaje de `FUERA_DE_PLAZO` y la cita sigue reservada.
  - `US2 #6`: recepción cancela la del martes desde el panel.
  - `SC-006`: en `movil`, abrir el enlace, escribir las cifras y cancelar tarda menos de 60 s.
  - axe sin infracciones en el diálogo.

### Implementation for User Story 2

- [X] T034 [P] [US2] Crear `src/dominio/plazo-paciente.ts` (research R6), con un comentario que cite «005, FR-009 y FR-018: único sitio donde vive el plazo»: `PLAZO_CANCELACION_PACIENTE_MS = 24 * 60 * 60 * 1000`, `limiteCancelacionPaciente(inicio)` = `inicio − PLAZO` e `inicioMinimoCancelacionPaciente(ahora)` = `ahora + PLAZO` para el `UPDATE`; y `pacientePuedeCancelar({ estado, inicio }, ahora)` ⇔ `estado = 'reservada' ∧ ahora < límite`
- [X] T035 [P] [US2] Añadir a `src/lib/formato.ts` `formatearLimite(instante, zona)` → «domingo, 15/11/2026 a las 10:00», con `fechaLocal` de `src/lib/zona.ts`, `formatearFecha` y `formatearHora`, y su caso en `tests/unit/formato.test.ts`
- [X] T036 [US2] Crear `src/dominio/politica-cancelacion.ts` (research R8), con un comentario que cite «005, FR-016: único texto de la política; la 002 y la 003 lo importan»: `enunciadoPoliticaCancelacion({ inicio, zonaHoraria, clinicaNombre, clinicaTelefono })` → «Puedes cancelar esta cita desde tu enlace antes del <formatearLimite(limiteCancelacionPaciente(inicio))>. Después, llama a <clínica> al <teléfono>.». Usar el formato de teléfono «911 234 567» que use la 001 (depende de T034, T035)
- [X] T037 [US2] En `src/servicios/citas.ts`, extraer la operación única `cancelarCita(ejecutor, { clinicaId, citaId, origen, ahora, pacienteId?, inicioMinimo })` (research R7, data-model.md). Hace el `UPDATE … SET estado = 'cancelada', estado_cambiado_en = $ahora, cancelada_por = $origen WHERE id AND clinica_id [AND paciente_id] AND estado = 'reservada' AND inicio > $inicioMinimo RETURNING …`. Con 0 filas, relee la cita y devuelve el motivo: `no_encontrada` (no existe o no es de ese paciente), `estado_cambiado` (con el estado actual) o `fuera_de_plazo`. Rehacer `cambiarEstadoCita(…, 'cancelar')` sobre ella con `origen = 'recepcion'` e `inicioMinimo = ahora`, de modo que `fuera_de_plazo` dé `CANCELACION_TARDIA` y se mantengan sus respuestas actuales. Completar y no asistida no cambian. La suite de la 001 sigue en verde (depende de T001, T034)
- [X] T038 [US2] Ampliar `proximasCitas` en `src/servicios/portal-paciente.ts`: cada cita lleva `puedeCancelar` (`pacientePuedeCancelar` con `ahora()`) y `enunciado` (`enunciadoPoliticaCancelacion`) (depende de T036)
- [X] T039 [US2] Añadir `cancelarMiCita({ token, citaId })` a `src/acciones/paciente.ts` en el orden de contracts/server-actions.md: token vigente (o `ENLACE_NO_VALIDO`) → `accesoDelPaciente(token)` (o `ACCESO_CADUCADO`) → `cancelarCita` con `origen = 'paciente'`, el `pacienteId` del acceso e `inicioMinimo = inicioMinimoCancelacionPaciente(ahora())`. Motivos: `no_encontrada` → `NO_ENCONTRADO`, `estado_cambiado` → `ESTADO_CAMBIADO`, `fuera_de_plazo` → `FUERA_DE_PLAZO` con `detalle: { enunciado }`. Si va bien, devuelve `{ citaId, fecha, hora }` y el mensaje «Tu cita del … a las … está cancelada.» (depende de T037, T022)
- [X] T040 [P] [US2] Crear `src/components/paciente/politica-cancelacion.tsx`, que pinta el enunciado con el teléfono como enlace `tel:`. Solo recibe el texto de `enunciadoPoliticaCancelacion` y no redacta nada propio (FR-017)
- [X] T041 [P] [US2] Crear `src/components/paciente/dialogo-cancelar-cita.tsx` (`'use client'`, `AlertDialog` de `src/components/ui/alert-dialog.tsx`): el título «¿Cancelar tu cita?»; el cuerpo «<servicio> con <profesional>, el <fecha> a las <hora>. El hueco quedará libre para otro paciente.»; y los botones «No, mantener cita» (foco inicial) y «Sí, cancelar mi cita». Escape cierra sin cancelar. Al confirmar llama a `cancelarMiCita`. Si va bien, muestra el aviso y hace `router.refresh()`; con `FUERA_DE_PLAZO` o `ESTADO_CAMBIADO`, muestra el aviso con el mensaje y refresca; con `ACCESO_CADUCADO` o `ENLACE_NO_VALIDO`, solo refresca, y la página muestra la pantalla que toque (contracts/ui-routes.md)
- [X] T042 [US2] Ampliar `src/components/paciente/proximas-citas.tsx`: si `puedeCancelar`, el botón «Cancelar cita», que abre `dialogo-cancelar-cita`, y debajo `politica-cancelacion`; si no, solo `politica-cancelacion` (FR-011) (depende de T038, T040, T041)
- [ ] T043 [US2] Ejecutar `pnpm test` y `pnpm test:e2e --grep "US2|SC-006"` en verde y recorrer los escenarios 8–11 de `specs/005-acceso-cancelacion-paciente/quickstart.md`

**Checkpoint**: US1 y US2 funcionan. El paciente entra y cancela con 24 h de margen, y el hueco queda libre

---

## Phase 5: User Story 3 - Regenerar un enlace comprometido (Priority: P2)

**Goal**: desde la agenda, recepción copia el enlace vigente de un paciente o genera uno nuevo con confirmación. El anterior deja de valer al instante, también para los accesos abiertos

**Independent Test**: regenerar el enlace de un paciente de la semilla y comprobar que el anterior da «Enlace no válido», que el nuevo pide las cifras y deja entrar, y que sus citas no cambian (quickstart 6–7)

### Tests for User Story 3 (MANDATORY - Principle VI) ⚠️

- [X] T044 [P] [US3] Escribir `tests/integration/regenerar-enlace.test.ts`:
  - `US3 #1` / `FR-004`: `regenerarEnlace` devuelve un token B ≠ A con formato válido, y sigue habiendo una sola fila para Ana.
  - `US3 #2` / `SC-002`: tras regenerar, `resolverToken(A)` es `null` y `confirmarCifras` con A da exactamente la misma respuesta que con un token inventado.
  - `US3 #3`: B con las cifras de Ana abre el acceso, y las filas de `cita` de Ana son idénticas antes y después.
  - `US3 #5`: con A bloqueado (`fallos_seguidos = 10`), B empieza con 0 fallos y sin pausa.
  - `US3 #4`: con un acceso abierto con A, tras regenerar, `cancelarMiCita` con A da `ENLACE_NO_VALIDO` y la cita sigue `reservada`; con B en la URL y la cookie antigua da `ACCESO_CADUCADO` porque la huella no coincide (`FR-006b`).
  - `FR-005`: `obtenerEnlace` devuelve `/p/<token vigente>` y la fecha de generación.
  - Las acciones del panel sin sesión dan `SESION_CADUCADA`, y con un `pacienteId` inexistente, `NO_ENCONTRADO`.
- [X] T045 [P] [US3] (Escrito; sin ejecutar, ver T051.) Escribir `tests/e2e/enlace-panel.spec.ts` en `portatil` y `movil`, con la sesión del panel abierta (`entrar`) y una cita de `PACIENTE_1` en la agenda:
  - `US3 #1` / `FR-005`: «Enlace del paciente» → «Copiar enlace» deja en el portapapeles la URL completa (permiso `clipboard-read`) y muestra «Enlace de <nombre> copiado».
  - «Generar enlace nuevo» abre el diálogo con el título y el cuerpo de contracts/ui-routes.md; «Cancelar» no cambia nada; «Generar enlace nuevo» muestra «Enlace nuevo generado» con el botón «Copiar».
  - `US3 #2`: el enlace antiguo da «Enlace no válido».
  - `US3 #3`: el nuevo pide las cifras y deja entrar con las mismas citas.
  - `US3 #5`: con el enlace bloqueado antes, el nuevo deja entrar.
  - `US3 #4`: con la pestaña del paciente abierta, regenerar y luego «Cancelar cita» → «Sí» lleva a «Enlace no válido» y la cita sigue reservada (depende también de US2).
  - axe sin infracciones en el menú y en el diálogo.

### Implementation for User Story 3

- [X] T046 [US3] Ampliar `src/servicios/enlaces.ts`:
  - `obtenerEnlace(clinicaId, pacienteId)` → `{ ruta, generadoEn }`, con `generadoEn` como «lunes, 09/11/2026 08:00» en la zona de la clínica.
  - `regenerarEnlace(clinicaId, pacienteId, ahora)`: comprueba que la ficha es de esa clínica y hace `UPDATE enlace_paciente SET token = generarToken(), generado_en = ahora, fallos_seguidos = 0, pausa_hasta = NULL WHERE paciente_id = $id`, sin tocar citas ni la ficha (data-model.md, «Regenerar»).
  - Ficha inexistente o de otra clínica → `NO_ENCONTRADO`.

  (depende de T019)
- [X] T047 [US3] Crear `src/acciones/enlaces.ts` (`'use server'`) con `obtenerEnlacePaciente({ pacienteId })` y `regenerarEnlacePaciente({ pacienteId })`: `exigirSesion` / `clinicaDeSesion` de `src/lib/sesion.ts`, validación con `esquemaPacienteId` y la respuesta de contracts/server-actions.md (depende de T046, T021)
- [X] T048 [P] [US3] En `src/servicios/agenda.ts`, añadir `id` al objeto `paciente` de `CitaVista` y rellenarlo en `obtenerAgendaDia`, sin cambiar el resto de la vista
- [X] T049 [US3] Crear `src/components/agenda/enlace-paciente.tsx` (`'use client'`) según contracts/ui-routes.md, «Panel»:
  - El botón secundario «Enlace del paciente» abre un `DropdownMenu` (`src/components/ui/dropdown-menu.tsx`).
  - «Copiar enlace» llama a `obtenerEnlacePaciente`, forma la URL con `window.location.origin`, la copia con `navigator.clipboard` y muestra el aviso «Enlace de <nombre> copiado». Si no hay portapapeles, muestra un campo de solo lectura seleccionado con «Cópialo y envíaselo al paciente».
  - «Generar enlace nuevo» abre un `AlertDialog` con «¿Generar un enlace nuevo para <nombre>?», el cuerpo del contrato y los botones «Cancelar» y «Generar enlace nuevo». Al terminar muestra el aviso «Enlace nuevo generado» con la acción «Copiar».

  (depende de T047)
- [X] T050 [US3] (Montado en `renderAcciones` de `src/app/agenda/[profesionalId]/[fecha]/page.tsx`, el patrón con el que la 001 da acciones a `BloqueCita`; `bloque-cita.tsx` no cambia.) Montar `enlace-paciente` en `src/components/agenda/bloque-cita.tsx` para las citas en cualquier estado, junto a las acciones de la 001 y con su mismo patrón visual, sin desplazamiento horizontal a 360 px (depende de T048, T049)
- [ ] T051 [US3] Ejecutar `pnpm test` y `pnpm test:e2e --grep "US3"` en verde y recorrer los escenarios 6–7 de `specs/005-acceso-cancelacion-paciente/quickstart.md`

**Checkpoint**: las tres historias funcionan. Un enlace comprometido se puede anular desde el panel

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: accesibilidad, rendimiento, coherencia de la política entre canales y validación final

- [X] T052 [P] (Escrito; sin ejecutar, ver T057.) Ampliar `tests/e2e/accesibilidad.spec.ts` (Principio VII) en `portatil` y `movil`:
  - axe sin infracciones AA en las cinco pantallas de `/p/[token]` (no válido, bloqueado, cifras, en pausa, próximas citas), en el diálogo «Cancelar cita» y en el diálogo «Generar enlace nuevo».
  - Sin desplazamiento horizontal a 360 px y objetivos táctiles de al menos 44×44 px.
  - Recorrido completo con teclado: cifras → Entrar → Cancelar cita → Escape.
- [X] T053 [P] (Escrito; sin ejecutar, ver T057.) Ampliar `tests/e2e/rendimiento.spec.ts`: `/p/[token]` con el acceso abierto se muestra completa en menos de 2 s (plan, Performance Goals)
- [X] T054 [P] Escribir `tests/unit/coherencia-politica.test.ts` (`FR-017`, `FR-018`, `SC-004`). Recorre `src/` y falla si fuera de `src/dominio/plazo-paciente.ts` y `src/dominio/politica-cancelacion.ts` aparece un plazo del paciente redactado por su cuenta: `24 horas`, `24 h`, `86400000`, «hasta el día anterior», «con un día de antelación» o «hasta la hora de la cita»
- [X] T055 Revisar todos los textos nuevos en `src/components/paciente/`, `src/components/agenda/enlace-paciente.tsx`, `src/app/p/` y `src/dominio/errores.ts` (Principios VII y VIII):
  - español de España y trato de «tú» al paciente;
  - cada error dice qué pasa y qué hacer;
  - ningún nombre de paciente antes de entrar.
- [X] T056 Actualizar `specs/MAPA.md`: la fila de la 005 pasa a «Implementada» y su párrafo de estado lo refleja; recordar en «Conflictos abiertos» que la 002 y la 003 deben importar `enunciadoPoliticaCancelacion`, `pacientePuedeCancelar` y `rutaEnlacePaciente` en vez de redefinirlos
- [ ] T057 (Parcial, 2026-11-08: lint, typecheck y `pnpm test` en verde, 27 ficheros y 322 pruebas; `pnpm test:e2e` en verde tras corregir tres pruebas frágiles o desfasadas (`acceso-paciente.spec.ts` US1 #5, `estados.spec.ts` quickstart 13 y `accesibilidad.spec.ts` diálogo «Generar enlace nuevo»), 1 omitida a propósito (SC-006 solo en móvil). Recorridos a mano los escenarios 1–5; faltan 6–12.) Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm test:e2e` en verde y recorrer a mano los 12 escenarios de `specs/005-acceso-cancelacion-paciente/quickstart.md`
- [ ] T058 Realizar la prueba manual previa a la entrega (SC-005 y SC-006), junto con la de la 001, y registrar tiempos y observaciones en `docs/usabilidad-005.md`. Hacen falta 2 personas que no conozcan CitaClara: repiten el enunciado de la política tras leerlo una vez y, en un móvil de 360 px, abren su enlace y cancelan una cita en plazo en menos de 1 minuto (tarea manual, requiere personas reales)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 depende de la enmienda S2–S5 de la 001 (sus T067–T076). Sin ella no empieza nada
- **Foundational (Phase 2)**: depende de Setup y BLOQUEA todas las historias
- **US1 (Phase 3)**: depende solo de Foundational
- **US2 (Phase 4)**: sus reglas puras (T034–T036), la operación `cancelarCita` (T037) y sus tests de integración dependen solo de Foundational. La acción y la interfaz (T038–T042) y su E2E necesitan el acceso de US1 (T018, T020, T022, T026, T027)
- **US3 (Phase 5)**: el servicio, las acciones y el menú del panel (T046–T050) dependen solo de Foundational y de `resolverToken` (T019). Los escenarios `US3 #3` y `US3 #4` de T044 y T045 necesitan `confirmarCifras` (US1) y `cancelarMiCita` (US2)
- **Polish (Phase 6)**: depende de las historias que se entreguen

### Within Each User Story

- Tests primero; deben fallar antes de implementar, y cada uno cita la regla o el criterio que cubre
- Dominio puro → servicios → Server Actions → componentes → página
- Ficheros que tocan varias historias: `src/servicios/enlaces.ts` (T007 → T019 → T046), `src/acciones/paciente.ts` (T022 → T039), `src/servicios/portal-paciente.ts` (T020 → T038) y `src/components/paciente/proximas-citas.tsx` (T026 → T042). Hacerlos en ese orden o coordinarlos
- `src/servicios/citas.ts` es de la 001: T037 lo amplía sin cambiar el comportamiento de recepción, y la suite de la 001 tiene que seguir en verde

### Parallel Opportunities

- Foundational: T004, T005, T006 y T009 en paralelo tras T002; T012 en paralelo con T011
- US1: T014–T017 (tests) a la vez; después T018, T020, T021 y T024–T026 a la vez
- US2: T029–T033 (tests) a la vez; T034, T035, T040 y T041 a la vez
- US3: T044 y T045 a la vez; T048 en paralelo con T046–T047
- Entre historias: tras Foundational, T034–T037 (US2) y T046–T048 (US3) pueden avanzar a la vez que US1
- Polish: T052–T054

---

## Parallel Example: User Story 1

```bash
# Tests de la US1 a la vez:
Task: "tests/unit/acceso-paciente.test.ts"
Task: "tests/integration/enlaces.test.ts"
Task: "tests/integration/intentos-concurrencia.test.ts"
Task: "tests/e2e/acceso-paciente.spec.ts"

# Piezas independientes a la vez:
Task: "src/lib/acceso-paciente.ts"
Task: "src/servicios/portal-paciente.ts"
Task: "src/acciones/esquemas.ts"
Task: "src/components/paciente/pantalla-enlace-no-valido.tsx + pantalla-enlace-bloqueado.tsx"
Task: "src/components/paciente/formulario-cifras.tsx"
Task: "src/components/paciente/proximas-citas.tsx"
```

## Parallel Example: User Story 2

```bash
# Tests de la US2 a la vez:
Task: "tests/unit/plazo-paciente.test.ts"
Task: "tests/unit/politica-cancelacion.test.ts"
Task: "tests/integration/cancelacion-paciente.test.ts"
Task: "tests/integration/cancelacion-concurrencia.test.ts"
Task: "tests/e2e/cancelacion-paciente.spec.ts"

# Reglas puras y componentes a la vez:
Task: "src/dominio/plazo-paciente.ts"
Task: "src/lib/formato.ts (formatearLimite)"
Task: "src/components/paciente/politica-cancelacion.tsx"
Task: "src/components/paciente/dialogo-cancelar-cita.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: confirmar que la enmienda de la 001 está en el código
2. Phase 2 Foundational: tabla, enlace por ficha, semilla y ayudantes
3. Phase 3 US1 → **PARAR Y VALIDAR**: el paciente entra con su enlace y sus 4 cifras (quickstart 1–5)
4. Demo: el enlace de P de `docs/datos-demo.md` muestra solo sus citas

### Incremental Delivery

1. Setup + Foundational → cada ficha tiene su enlace
2. + US1 → acceso seguro del paciente (MVP)
3. + US2 → cancelación con 24 h de margen y hueco liberado (el motivo de dar acceso)
4. + US3 → defensa ante un enlace filtrado desde el panel
5. Polish → accesibilidad, rendimiento, coherencia entre canales y validación final

### Parallel Team Strategy

Tras Foundational: A con US1; B con las reglas puras y `cancelarCita` de US2 (T029–T037, la
parte de mayor riesgo, con la batería de concurrencia) y, en cuanto US1 tenga la página, con
su interfaz; C con el servicio y el menú del panel de US3 (T044–T050).

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- Ningún test se desactiva para integrar (Principio VI); si una regla cambia, primero la spec
- La spec figura como «Aprobada» en `spec.md` (2026-11-07) y en `specs/MAPA.md` (Principio I)
- Lo que la 002 y la 003 tienen que cambiar (citar la 005 en vez de redefinir acceso y plazo) son enmiendas en sus specs y ramas, de sus propietarios: no son tareas de la 005
- Desviaciones menores respecto al árbol de plan.md: el número de la migración depende de las de la 001 (T003); la regeneración tiene su propio fichero de integración (`regenerar-enlace.test.ts`) para que US3 se pruebe sin tocar el de US1; y `US1 #7` (30 min) se prueba en unitarias e integración, no en E2E, porque el reloj del servidor E2E está fijo
- Commit tras cada tarea o grupo lógico

## Phase 7: Convergence

- [ ] T059 CRITICAL: Dejar `pnpm test` en verde de forma estable. Hoy falla de forma intermitente en `tests/integration/solape-concurrencia.test.ts` (de la 001): 2 ejecuciones completas dieron 2 y 1 pruebas en rojo («ráfaga sobre huecos parcialmente solapados» y «SC-001 — 100 ráfagas»), con interbloqueos `40P01`; aislado pasó 6 de 6 veces. Hipótesis: en las ráfagas, `crearCita` agota sus 3 reintentos de `enTransaccionConReintento` y lanza el `40P01`; `Promise.all` rechaza y deja consultas en curso, que interbloquean el `TRUNCATE … CASCADE` de `vaciarTablas` (que ya arrastra `enlace_paciente`) en el `beforeEach` siguiente. Comprobar si el cambio de la 005 (la tabla nueva en el `TRUNCATE` y los enlaces de `crearEscenario`) lo provoca o lo agrava. Si la causa está en `crearCita` o en sus reintentos, es trabajo de la 001 (Principio I) y va antes de integrar la 005. No desactivar ni relajar la prueba; también es requisito de T057 según Constitution VI (contradicts)
- [ ] T060 Citar `FR-013` en el nombre de la prueba `US2 #1` de `tests/integration/cancelacion-paciente.test.ts`, que ya comprueba `cancelada_por = 'paciente'` y `estado_cambiado_en` (lo pedía T031). Citar también `FR-012` en `tests/e2e/cancelacion-paciente.spec.ts` (`quickstart 8 — US2 #1` y «Escape o "No, mantener cita" cierran sin cancelar»): hoy ningún test referencia la FR-012 de la 005, solo la de la 001, según Constitution VI (partial)
