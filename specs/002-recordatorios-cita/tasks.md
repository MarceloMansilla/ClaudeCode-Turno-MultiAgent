---

description: "Lista de tareas de la 002: recordatorios de cita por correo electrónico"
---

# Tasks: Recordatorios de cita por correo electrónico

**Input**: Design documents from `/specs/002-recordatorios-cita/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: obligatorios (Constitución, Principio VI). Cada test lleva en su nombre el FR, escenario
o SC que cubre (p. ej. `FR-003 dos ejecuciones simultáneas generan un solo recordatorio`). La
feature escribe en la agenda (cancelación): incluye pruebas de concurrencia y de reserva del
hueco liberado (Principio III).

**Organization**: tareas agrupadas por historia de usuario para implementarlas y probarlas de
forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2)
- Rutas relativas a la raíz del repositorio (proyecto único de la 001, ver plan.md)

## Referencias rápidas

- Decisiones: [research.md](research.md) (R1–R11)
- Tablas, estados, selección de citas y ventana: [data-model.md](data-model.md)
- Comando, configuración, salida y códigos: [contracts/comando-recordatorios.md](contracts/comando-recordatorios.md)
- Asunto, cuerpo y fichero `.eml`: [contracts/correo-recordatorio.md](contracts/correo-recordatorio.md)
- Página y acción de cancelación, mensajes: [contracts/cancelacion-paciente.md](contracts/cancelacion-paciente.md)
- Cifras de referencia y escenarios manuales: [quickstart.md](quickstart.md)
- Piezas de la 001 que se reutilizan: `ahora()`/`fijarAhora()` en `src/lib/reloj.ts`;
  `fechaLocal`, `sumarDias`, `rangoDelDia`, `horaLocal` en `src/lib/zona.ts`;
  `formatearFecha`, `formatearHora`, `formatearRango` en `src/lib/formato.ts`;
  `Resultado`, `exito`, `fallo`, `mensajes` en `src/dominio/errores.ts`;
  `obtenerBd`, `enTransaccion` en `src/db/cliente.ts`; ayudas de test en `tests/helpers/`
  (`bd.ts`, `fabrica.ts`) y `tests/e2e/apoyo.ts`.
- Semilla de tests y documentación: **2026-11-09**. Ejecución de referencia:
  `CITACLARA_AHORA=2026-11-09T08:00:00+01:00` → citas del martes 10/11/2026: 26 reservadas,
  20 con correo, 6 sin correo.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dejar la rama sobre la 001 y preparar dependencias y configuración

- [ ] T001 Rebasar la rama `recordatorio` sobre `main` con la 001 ya integrada; comprobar que `pnpm install && pnpm test && pnpm typecheck` pasan en verde antes de tocar nada (plan.md, «Dependencias y orden»). Si la 001 aún no está en `main`, detenerse aquí.
- [x] T002 Precisión de la spec (Principio I, decisión del propietario): añadir en `specs/002-recordatorios-cita/spec.md`, junto a FR-010, que un envío interrumpido por caída del proceso (resultado desconocido) no se reintenta y figura como «fallido (interrumpido)» para no duplicar (FR-003), tal como describe research.md R2. *Hecho el 2026-11-07: FR-010 y FR-005 actualizados, aprobado por el propietario.*
- [ ] T003 [P] Añadir dependencias en `package.json`: `nodemailer` (+ `@types/nodemailer` en desarrollo) y `mailparser` (+ `@types/mailparser`) solo en desarrollo; añadir el script `"recordatorios": "tsx scripts/recordatorios.ts"`; instalar con `pnpm install` (versiones exactas, como el resto del proyecto).
- [ ] T004 [P] Añadir a `.env.example` `URL_PUBLICA=http://localhost:3000`, `CORREO_REMITENTE=recordatorios@clinicaeleva.example`, `# SMTP_URL=` (comentada: sin ella, modo simulado) y `# SALIDA_CORREO_DIR=datos/salida-correo`; añadir `datos/salida-correo/` a `.gitignore`.
- [ ] T005 [P] Crear `src/correo/configuracion.ts`: `leerConfiguracionCorreo(env)` valida con Zod `URL_PUBLICA` (obligatoria, `http(s)://`, sin barra final), `CORREO_REMITENTE` (obligatoria, correo válido), `SMTP_URL` (opcional) y `SALIDA_CORREO_DIR` (por defecto `datos/salida-correo`); devuelve `{ modo: 'simulado' | 'smtp', ... }` o un error que nombra la variable que falta (contracts/comando-recordatorios.md, «Configuración»).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: esquema, token y códigos compartidos por las dos historias

**⚠️ CRITICAL**: ninguna historia empieza hasta terminar esta fase

- [ ] T006 Ampliar `src/db/esquema.ts` según data-model.md: enums `modo_correo` (`simulado`, `smtp`) y `estado_recordatorio` (`enviando`, `enviado`, `fallido`); tabla `recordatorio` (con `UNIQUE (cita_id)` y `UNIQUE (token_hash)`); tabla `ejecucion_recordatorios` (`resumen jsonb` tipado con la forma de data-model.md); columna `cita.cancelada_desde_recordatorio boolean NOT NULL DEFAULT false`. No modificar ninguna otra definición de la 001.
- [ ] T007 Generar la migración con `pnpm db:generate` (después de T001, nunca antes; research R11) y añadir a mano en ese mismo fichero de `src/db/migraciones/` la restricción `cita_cancelada_desde_recordatorio_coherente CHECK (NOT cancelada_desde_recordatorio OR estado = 'cancelada')`; comprobar `pnpm db:migrate` sobre una BD con la semilla 2026-11-09 y que la semilla sigue cargando igual.
- [ ] T008 [P] Test unitario `tests/unit/token-recordatorio.test.ts`: el token tiene 43 caracteres base64url; dos tokens nunca coinciden en 10.000 generaciones; `hashToken` es SHA-256 hex determinista; `esFormatoToken` rechaza longitudes y caracteres no válidos (FR-011, R5).
- [ ] T009 [P] Crear `src/correo/token.ts`: `generarToken() → { token, hash }` con `crypto.randomBytes(32)` en base64url, `hashToken(token)` (SHA-256 hex) y `esFormatoToken(texto)` (R5). Debe pasar T008.
- [ ] T010 [P] Ampliar `src/dominio/errores.ts`: nuevo código `ENLACE_NO_VALIDO` y mensajes para el paciente (trato de usted) `enlaceNoValido` («Este enlace no es válido.»), `cancelacionTardiaPaciente(clinica)` («Ya no es posible cancelar esta cita desde aquí. Por favor, llame a <clínica>.»), `citaYaCancelada` («Esta cita ya está cancelada.»), `citaYaTuvoLugar` («Esta cita ya ha tenido lugar.») y `cancelacionConfirmada(fecha, hora)` («Su cita del <fecha> a las <hora> ha quedado cancelada. Gracias por avisar.») (contracts/cancelacion-paciente.md). Sin cambiar los mensajes existentes.
- [ ] T011 Ampliar `tests/helpers/fabrica.ts` con: paciente sin correo, paciente con correo inválido (insertado sin pasar la validación de la 001), cita reservada en una fecha/hora dada, y `crearRecordatorioEnviado(citaId) → { token }` que inserta un recordatorio `enviado` con el hash de un token conocido (permite probar US2 sin ejecutar US1). Depende de T006 y T009.

**Checkpoint**: esquema migrado, token y mensajes listos; US1 y US2 pueden empezar en paralelo.

---

## Phase 3: User Story 1 - El paciente recibe un recordatorio de su cita (Priority: P1) 🎯 MVP

**Goal**: cada día a las 08:00 se genera un recordatorio, como máximo uno por cita, para cada cita reservada de mañana cuyo paciente tenga correo; sin SMTP, como `.eml` en `datos/salida-correo/`.

**Independent Test**: con la semilla 2026-11-09 y sin `SMTP_URL`, `CITACLARA_AHORA=2026-11-09T08:00:00+01:00 pnpm recordatorios` deja 20 `.eml` del 10/11/2026 y resume «Enviados: 20 · Sin correo: 6»; repetirlo no crea ninguno más.

### Tests for User Story 1 (MANDATORY - Principle VI) ⚠️

> **NOTE: escribir estos tests PRIMERO y comprobar que FALLAN antes de implementar**

- [ ] T012 [P] [US1] Test unitario `tests/unit/ventana-recordatorio.test.ts` (FR-002): con zona `Europe/Madrid`, cada fila de la tabla «Ventana: ejemplos» de data-model.md (09/11/2026 → 24 h; 27/03/2027 → 23 h; 30/10/2027 → 25 h, con `ventana_desde`/`ventana_hasta` exactos en UTC); la ventana no depende de la hora de ejecución (a las 00:05 y a las 23:55 del lunes 09/11/2026 → martes 10/11/2026); una clínica en `Atlantic/Canary` usa su propia medianoche.
- [ ] T013 [P] [US1] Test unitario `tests/unit/componer-recordatorio.test.ts` (FR-007, FR-008, SC-006): con la cita de Ana (lunes 16/11/2026 10:00–10:45, María, Sesión de fisioterapia) el asunto es exactamente «Recordatorio de su cita en Clínica Eleva: lunes, 16/11/2026, 10:00»; el texto plano coincide con el de contracts/correo-recordatorio.md (saludo con nombre de pila, día, hora, profesional, servicio, enlace `<URL_PUBLICA>/cancelar/<token>`); el HTML contiene el botón «Cancelar mi cita» y la URL en texto, `max-width:600px`, ningún ancho fijo mayor de 360 px, ninguna imagen ni recurso externo; ni texto ni HTML contienen precio, teléfono ni el correo del paciente.
- [ ] T014 [P] [US1] Test unitario `tests/unit/resultado-recordatorio.test.ts` (FR-004, FR-005, data-model «Selección de citas»): clasificación de cada caso (sin correo → `sin_correo`; correo inválido → `correo_no_valido`; recordatorio `enviado` → `ya_enviado_antes`; `enviando` de ≤ 10 min → `ya_enviado_antes`; `enviando` de > 10 min → `fallido` con `interrumpido: true`, que el resumen y la salida muestran como «fallido (interrumpido)» (FR-005, FR-010); sin recordatorio o `fallido` → «a enviar») y totales del resumen.
- [ ] T015 [P] [US1] Test de integración `tests/integration/recordatorios-ejecucion.test.ts` con la semilla 2026-11-09, modo simulado en una carpeta temporal y `ahora = 2026-11-09T08:00:00+01:00`: US1 #1 (20 recordatorios del 10/11/2026 con datos correctos); US1 #5 y FR-004 (6 «sin correo», ninguno para ellas; ficha con correo inválido → «correo no válido»); US1 #4 (citas canceladas/completadas/no asistidas del día no se recuerdan); US1 #2 (segunda ejecución: 0 enviados, 20 «ya enviado antes»); FR-005/FR-006 (fila en `ejecucion_recordatorios` con `fecha_objetivo = 2026-11-10`, ventana y totales; un `recordatorio` por cita con destinatario, modo y momentos); edge case fin de semana (`ahora = 2026-11-13T08:00+01:00` → 0 citas); FR-017 (cancelar una cita ya recordada y crear otra para el miércoles 11/11/2026 → la ejecución del 10/11/2026 recuerda la nueva). Si las cifras 26/20/6 no coinciden con la semilla integrada, corregir quickstart.md y docs (T035), no el test a ciegas.
- [ ] T016 [P] [US1] Test de integración `tests/integration/recordatorios-concurrencia.test.ts` (FR-003, SC-001, US1 #3): 10 ejecuciones seguidas y después 2 ejecuciones lanzadas a la vez (`Promise.all`) sobre la misma BD recién sembrada → exactamente 20 filas `recordatorio`, 20 ficheros `.eml` y la suma de «enviado» de todas las ejecuciones es 20.
- [ ] T017 [P] [US1] Test de integración `tests/integration/recordatorios-envio.test.ts`: FR-009 y US1 #6 (sin `SMTP_URL`, cada `.eml` se llama `AAAA-MM-DD_HHmm_<citaId>.eml`, se vuelve a leer con `mailparser` y su From, To, Subject, Message-ID y cuerpo coinciden con contracts/correo-recordatorio.md; no se abre ninguna conexión SMTP); FR-010 y US1 #7 (transporte de prueba que falla → recordatorio `fallido` y resumen con `fallido: 1` (el código de salida 2 lo prueba T018); la siguiente ejecución del mismo día lo reintenta con un token nuevo y queda `enviado`; si la cita se cancela antes, no se reintenta); R2 (fila `enviando` de hace 15 min → no se reenvía y sale como «fallido (interrumpido)»).
- [ ] T018 [P] [US1] Test de integración `tests/integration/comando-recordatorios.test.ts` (FR-001, FR-005, FR-010, contracts/comando-recordatorios.md): lanza `scripts/recordatorios.ts` como proceso hijo, igual que `pnpm recordatorios`, con `CITACLARA_AHORA=2026-11-09T08:00:00+01:00` sobre la BD de Testcontainers. Casos: (a) sin `URL_PUBLICA` → código 1, mensaje en español que nombra la variable, ningún `.eml` y ninguna fila nueva en `ejecucion_recordatorios`; (b) semilla 2026-11-09 en modo simulado → código 0 y salida con la cabecera «Citas del martes, 10/11/2026», una línea por cita (hora + profesional + resultado) y la línea de totales del contrato; la salida no contiene ningún nombre ni correo de paciente de la semilla; (c) `SMTP_URL` apuntando a un puerto local cerrado → código 2 y totales con «Fallidos» > 0; (d) una fila `recordatorio` en `enviando` de hace 15 min → su línea dice «fallido (interrumpido)», cuenta en «Fallidos» y el código es 2. Debe fallar hasta T024.

### Implementation for User Story 1

- [ ] T019 [P] [US1] Crear `src/dominio/ventana-recordatorio.ts`: `calcularVentana(ahora: Date, zona: string) → { fechaObjetivo: 'AAAA-MM-DD'; desde: Date; hasta: Date }` = día natural siguiente a `fechaLocal(ahora, zona)` usando `sumarDias` y `rangoDelDia` de `src/lib/zona.ts` (R1). Debe pasar T012.
- [ ] T020 [P] [US1] Crear `src/dominio/resultado-recordatorio.ts`: tipos `ResultadoCita` y `ResumenEjecucion` (forma de data-model.md), `clasificarCita({ email, recordatorio, ahora })` y `totalizar(resultados)`; validación del correo con `z.email()` (R9). Debe pasar T014.
- [ ] T021 [P] [US1] Crear `src/correo/componer-recordatorio.ts`: función pura `componerRecordatorio({ clinica, paciente, profesional, servicio, inicio, fin, zona, enlace }) → { asunto, texto, html }` con los formateadores de `src/lib/formato.ts` y el HTML de contracts/correo-recordatorio.md (una columna, estilos en línea, botón con contraste AA, ≥ 16 px y ≥ 44 px de alto) (R4). Debe pasar T013.
- [ ] T022 [US1] Crear `src/correo/transporte.ts`: `crearTransporte(config)` → SMTP de Nodemailer (timeout 30 s) si hay `SMTP_URL`, o `streamTransport` con `buffer: true` en modo simulado; `enviarRecordatorio(transporte, mensaje, { citaId, inicioLocal })` construye el mismo mensaje en ambos modos (From con el nombre de la clínica, Message-ID `<recordatorio-<citaId>@<dominio de URL_PUBLICA>>`, Date = `ahora()`), y en simulado escribe el `.eml` de forma atómica (temporal + renombrado, sobrescribiendo el de esa cita) y devuelve la ruta relativa; interfaz inyectable para el transporte de prueba que falla de T017 (R3). Depende de T005.
- [ ] T023 [US1] Crear `src/servicios/recordatorios.ts` con `ejecutarRecordatorios({ ahora, config, transporte }) → ResumenEjecucion`: lee la clínica y su zona; `calcularVentana`; selecciona citas `reservada` en `[desde, hasta)` con paciente, profesional y servicio, en orden de inicio; para cada una aplica `clasificarCita`; las «a enviar» se reclaman en su propia transacción (`INSERT … ON CONFLICT (cita_id) DO NOTHING RETURNING` o `UPDATE … SET estado='enviando' WHERE cita_id=$1 AND estado='fallido' RETURNING`, con token nuevo e `intentos + 1`), se componen, se envían y se marcan `enviado` (con `enviado_en` y `fichero`) o `fallido` (con `ultimo_error`); sin fila reclamada → `ya_enviado_antes`; al final guarda la fila de `ejecucion_recordatorios` con el resumen (R2, R8, data-model.md). Depende de T006, T009, T019–T022. Debe pasar T015–T017.
- [ ] T024 [US1] Crear `scripts/recordatorios.ts` (comando `pnpm recordatorios`): fija el reloj con `CITACLARA_AHORA` si existe, lee la configuración (error → mensaje en español nombrando la variable y código 1), ejecuta `ejecutarRecordatorios`, imprime el resumen con el formato de contracts/comando-recordatorios.md (hora + profesional + resultado por cita, incluido «fallido (interrumpido)», sin nombres ni correos de pacientes) y sale con 0 (sin fallidos), 2 (algún fallido, también interrumpido) o 1 (error general); cierra la BD con `cerrarBd()`. Depende de T023. Debe pasar T018.
- [ ] T025 [US1] Añadir al `README.md` la sección «Recordatorios diarios»: qué hace el comando, variables de entorno, modo simulado (`datos/salida-correo/`) y la línea de planificación `CRON_TZ=Europe/Madrid` · `0 8 * * *` · `pnpm recordatorios` con el significado de los códigos de salida (FR-001, R1). Incluye «Comprobar la planificación» para quien despliega: tras instalar la entrada del planificador, al día siguiente debe existir una fila en `ejecucion_recordatorios` con `iniciada_en` hacia las 08:00 hora local, y la salida del comando queda en el registro del planificador; si falta la fila, la ejecución automática no está activa.

**Checkpoint**: US1 completa y demostrable sola con el escenario 1–5 de quickstart.md.

---

## Phase 4: User Story 2 - El paciente cancela desde el recordatorio (Priority: P2)

**Goal**: desde el enlace del correo, el paciente ve su cita y la cancela (solo al confirmar) hasta la hora de inicio; el hueco queda libre en la agenda de recepción.

**Independent Test**: con un recordatorio creado por la fábrica (T011) o por US1, abrir `/cancelar/<token>` en 360 px: se ve la cita y sigue reservada; pulsar «Cancelar mi cita» → mensaje de confirmación, cita «Cancelada» y hueco libre en `/agenda`; reabrir el enlace → «Esta cita ya está cancelada.».

### Tests for User Story 2 (MANDATORY - Principle VI) ⚠️

- [ ] T026 [P] [US2] Test de integración `tests/integration/cancelacion-recordatorio.test.ts` sobre el servicio: US2 #1 (consultar por token no cambia nada); US2 #2 y FR-012/FR-013 (cancelar con `ahora < inicio` → `cancelada`, `cancelada_desde_recordatorio = true`, `estado_cambiado_en = ahora`); US2 #3 (`ahora = inicio` exacto y posterior → `CANCELACION_TARDIA`, la cita sigue reservada; 1 minuto antes → se cancela); US2 #4 y FR-014 (cita ya cancelada, completada o no asistida → estado actual, sin cambios); US2 #5 y FR-015 (cancelación del paciente simultánea con `cambiarEstadoCita` de recepción y dos cancelaciones simultáneas del paciente, ambas con `Promise.all` repetido 20 veces → exactamente una prospera; la otra recibe `ESTADO_CAMBIADO` o el estado actual); Principio III (tras cancelar, `crearCita` de la 001 en el mismo hueco y en un hueco parcialmente solapado con la cancelada se registra sin solape, y dos altas simultáneas en el hueco liberado dejan exactamente una cita); CHECK de coherencia (no se puede marcar `cancelada_desde_recordatorio` en una cita no cancelada).
- [ ] T027 [P] [US2] Test de integración `tests/integration/enlace-cancelacion-seguridad.test.ts` (FR-011, FR-016, US2 #6, SC-004): 100 tokens inventados con formato válido y 20 con formato inválido → todos `ENLACE_NO_VALIDO`, ninguna respuesta contiene datos de citas y ninguna cita cambia; un token solo da acceso a su cita (con dos recordatorios del mismo paciente, cada enlace muestra y cancela solo la suya); la respuesta de consulta nunca incluye teléfono ni correo del paciente.
- [ ] T028 [P] [US2] Test E2E `tests/e2e/cancelacion.spec.ts` en móvil 360×800 y portátil 1366×768: US2 #1 (abrir el enlace muestra clínica, día, hora, profesional, servicio y el botón, y la cita sigue reservada en `/agenda`); US2 #2 + SC-003 (pulsar → mensaje «Su cita del … ha quedado cancelada. Gracias por avisar.»; en `/agenda` de ese profesional y día la cita aparece «Cancelada» y el hueco libre); US2 #4 (reabrir → «Esta cita ya está cancelada.», sin botón); US2 #3 (reloj tras el inicio → mensaje de fuera de plazo); US2 #6 (`/cancelar/abc` → «Este enlace no es válido.»); SC-006 (axe sin infracciones AA y sin desplazamiento horizontal en 360 px); cabeceras `Cache-Control: no-store`, `Referrer-Policy: no-referrer` y `X-Robots-Tag: noindex`; `/cancelar/*` accesible sin sesión.

### Implementation for User Story 2

- [ ] T029 [US2] Añadir a `src/servicios/recordatorios.ts`: `consultarCitaPorToken(token, ahora) → { estadoPagina: 'CANCELABLE' | 'YA_CANCELADA' | 'FINALIZADA' | 'FUERA_DE_PLAZO' | 'ENLACE_NO_VALIDO'; cita?: CitaPaciente }` (busca por `hashToken`, valida antes el formato con `esFormatoToken`, devuelve solo los campos de `CitaPaciente`) y `cancelarDesdeRecordatorio(token, ahora) → Resultado<CitaPaciente>` con la actualización condicional de data-model.md y, si afecta a 0 filas, relectura para responder `CANCELACION_TARDIA` o `ESTADO_CAMBIADO` con el estado actual (R7, contracts/cancelacion-paciente.md). Mismo archivo que T023: hacerlo después. Debe pasar T026 y T027.
- [ ] T030 [US2] Crear `src/acciones/cancelar-desde-recordatorio.ts`: Server Action `cancelarDesdeRecordatorio({ token })` validada con Zod, sin sesión, que llama al servicio con `ahora()` y devuelve el `Resultado` con los mensajes de T010. Depende de T029.
- [ ] T031 [US2] Crear `src/app/cancelar/[token]/page.tsx` (Server Component, solo lectura): llama a `consultarCitaPorToken` y pinta cada estado de la tabla de contracts/cancelacion-paciente.md con los componentes de shadcn/ui de la 001 (tarjeta con los datos de la cita, mobile-first desde 360 px); `metadata` con `robots: { index: false, follow: false }`; `export const dynamic = 'force-dynamic'`. Depende de T029.
- [ ] T032 [US2] Crear `src/app/cancelar/[token]/formulario-cancelar.tsx` (Client Component): botón «Cancelar mi cita» que invoca la acción de T030 con estado de envío (deshabilitado mientras se procesa) y sustituye la tarjeta por el mensaje de confirmación o por el mensaje de error con el estado actual; sin diálogo adicional (la página ya es la confirmación: abrir + pulsar = 2 pulsaciones, SC-002). Depende de T030.
- [ ] T033 [US2] Añadir en `next.config.ts` cabeceras para `/cancelar/:path*`: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex` (R6); verificar que el `matcher` de `src/proxy.ts` no incluye `/cancelar` y no modificarlo.

**Checkpoint**: US1 y US2 funcionan; quickstart escenarios 6–11 en verde.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: cifras demo, idioma, trazabilidad y validación final

- [ ] T034 [P] Revisar textos del correo (texto y HTML), la página de cancelación y la salida del comando: español de España, trato de usted al paciente, sin jerga técnica, fechas «lunes, 16/11/2026» y horas «10:00–10:45» (Principios II, VII, VIII).
- [ ] T035 Añadir a `docs/datos-demo.md` la sección «Recordatorios» con la tabla por día de quickstart.md («Cifras de referencia»), recalculada con la semilla integrada (2026-11-09); si alguna cifra difiere, corregir también `specs/002-recordatorios-cita/quickstart.md` y la constante del test T015 (Principio V).
- [ ] T036 [P] Comprobar la trazabilidad (Principio VI): cada FR-001–FR-017 y cada escenario US1 #1–#7 y US2 #1–#6 aparece en el nombre de al menos un test (`grep -rE "FR-0|US[12] #" tests/`); SC-001, SC-003, SC-004 y SC-006 cubiertos por tests automáticos; SC-002 y SC-005 documentados como verificación manual y medición del piloto en quickstart.md. Anotar en este archivo cualquier hueco y cubrirlo.
- [ ] T037 Ejecutar `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` con todo en verde y recorrer a mano los escenarios 1–11 de `specs/002-recordatorios-cita/quickstart.md` en modo simulado.
- [ ] T038 Prueba de usabilidad de SC-002 (2 personas sin experiencia cancelan desde un `.eml` en el móvil en < 1 min y ≤ 2 pulsaciones) y registro del resultado junto a la entrega.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 primero y bloqueante (sin la 001 no hay código sobre el que construir); T002 antes de implementar US1 (afecta a T014/T017/T020/T023); T003–T005 en paralelo tras T001.
- **Foundational (Phase 2)**: depende de Setup. T006 → T007; T008 → T009; T010 libre; T011 depende de T006 y T009. Bloquea las historias.
- **US1 (Phase 3)** y **US2 (Phase 4)**: ambas empiezan tras la Fase 2. US2 no necesita US1 para probarse (usa `crearRecordatorioEnviado` de T011), pero T029 escribe en el mismo archivo que T023: si se trabaja en paralelo, T029 va después de T023 o en un archivo propio que se fusione al final.
- **Polish (Phase 5)**: tras las dos historias. T035 antes de T037.

### User Story Dependencies

- **US1 (P1)**: solo Fase 2. Es el MVP.
- **US2 (P2)**: solo Fase 2 para probarse; en producción los enlaces los crea US1.

### Within Each User Story

- Tests primero y en rojo; cada test cita el FR/escenario/SC que cubre.
- Dominio puro (ventana, clasificación, composición) → transporte → servicio → comando / acción → página.

### Parallel Opportunities

- Fase 1: T003, T004, T005.
- Fase 2: T008 + T010 en paralelo con T006/T007.
- US1: tests T012–T018 en paralelo; después T019, T020 y T021 en paralelo; T022 → T023 → T024; T025 en cualquier momento.
- US2: tests T026–T028 en paralelo; T031 y T033 en paralelo tras T029.
- Con dos personas: una hace US1 y otra US2 tras la Fase 2 (coordinando `src/servicios/recordatorios.ts`).

---

## Parallel Example: User Story 1

```bash
# Tests de US1 a la vez:
Task: "T012 Test unitario de la ventana en tests/unit/ventana-recordatorio.test.ts"
Task: "T013 Test unitario del correo en tests/unit/componer-recordatorio.test.ts"
Task: "T014 Test unitario de la clasificación en tests/unit/resultado-recordatorio.test.ts"
Task: "T015 Test de integración de la ejecución en tests/integration/recordatorios-ejecucion.test.ts"
Task: "T016 Test de concurrencia en tests/integration/recordatorios-concurrencia.test.ts"
Task: "T017 Test de envío y reintentos en tests/integration/recordatorios-envio.test.ts"
Task: "T018 Test del comando en tests/integration/comando-recordatorios.test.ts"

# Piezas puras de US1 a la vez:
Task: "T019 Ventana en src/dominio/ventana-recordatorio.ts"
Task: "T020 Clasificación en src/dominio/resultado-recordatorio.ts"
Task: "T021 Composición del correo en src/correo/componer-recordatorio.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T026 Test de cancelación y concurrencia en tests/integration/cancelacion-recordatorio.test.ts"
Task: "T027 Test de seguridad del enlace en tests/integration/enlace-cancelacion-seguridad.test.ts"
Task: "T028 Test E2E en tests/e2e/cancelacion.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fase 1 (T001 bloqueante: la 001 integrada).
2. Fase 2.
3. US1 → validar con quickstart escenarios 1–5: ya reduce olvidos aunque el paciente aún no pueda cancelar desde el correo.
4. **Antes de entregar el MVP**: el correo incluye el enlace de cancelación (FR-007); si US2 no está lista, no se activa el planificador en el piloto hasta tenerla, para no enviar enlaces que no funcionan.

### Incremental Delivery

1. Setup + Foundational → esquema y token.
2. US1 → recordatorios en modo simulado → demo con los `.eml`.
3. US2 → cancelación desde el enlace → demo completa (quickstart 6–11).
4. Polish → cifras en `docs/datos-demo.md`, trazabilidad y usabilidad → activar el planificador del piloto.

---

## Notes

- [P] = archivos distintos y sin dependencias pendientes.
- Archivos de la 001 que se tocan (solo añadidos): `src/db/esquema.ts`, `src/dominio/errores.ts`, `tests/helpers/fabrica.ts`, `next.config.ts`, `package.json`, `.env.example`, `.gitignore`, `README.md`, `docs/datos-demo.md`. No se tocan `src/servicios/citas.ts`, `src/proxy.ts` ni la semilla.
- La migración se genera después de rebasar (T007) para no chocar con las de otras features en paralelo.
- Commit tras cada tarea o grupo lógico; no desactivar ningún test para integrar (Principio VI).
