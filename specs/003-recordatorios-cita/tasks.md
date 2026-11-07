---

description: "Lista de tareas de la 003: recordatorios de cita por correo electrónico"
---

# Tasks: Recordatorios de cita por correo electrónico

**Input**: Design documents from `/specs/003-recordatorios-cita/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: obligatorios (Constitución, Principio VI). Cada test lleva en su nombre el FR, escenario
o SC que cubre (p. ej. `FR-003 dos ejecuciones simultáneas generan un solo recordatorio`). La
feature no escribe en la agenda (spec FR-021): se prueba que una ejecución no cambia ninguna
cita.

**Revisión cruzada S2–S5 (2026-11-07)**: se retiran la página y el flujo de cancelación propios
(antigua US2), el token por cita y la columna `cita.cancelada_desde_recordatorio`. Las tareas
se han renumerado; ninguna de las retiradas estaba hecha.

**Organization**: tareas agrupadas por historia de usuario para implementarlas y probarlas de
forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1)
- Rutas relativas a la raíz del repositorio (proyecto único de la 001, ver plan.md)

## Referencias rápidas

- Decisiones: [research.md](research.md) (R1–R11)
- Tablas, estados, selección de citas y ventana: [data-model.md](data-model.md)
- Comando, configuración, salida y códigos: [contracts/comando-recordatorios.md](contracts/comando-recordatorios.md)
- Asunto, cuerpo, enlace personal, enunciado y fichero `.eml`: [contracts/correo-recordatorio.md](contracts/correo-recordatorio.md)
- Cifras de referencia y escenarios manuales: [quickstart.md](quickstart.md)
- Piezas de la 001 que se reutilizan: `ahora()`/`fijarAhora()` en `src/lib/reloj.ts`;
  `fechaLocal`, `sumarDias`, `rangoDelDia`, `horaLocal` en `src/lib/zona.ts`;
  `formatearFecha`, `formatearHora`, `formatearRango` en `src/lib/formato.ts`;
  `obtenerBd`, `enTransaccion` en `src/db/cliente.ts`; ayudas de test en `tests/helpers/`
  (`bd.ts`, `fabrica.ts`).
- Piezas de la 005 que se consumen (sin reimplementarlas): enlace personal vigente de una
  ficha (005 FR-001) y límite de cancelación de una cita para el enunciado (005 FR-009,
  FR-016).
- Semilla de tests y documentación: **2026-11-09**. Ejecución de referencia:
  `CITACLARA_AHORA=2026-11-09T08:00:00+01:00` → citas del martes 10/11/2026: 26 reservadas,
  20 con correo, 6 sin correo.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dejar la rama sobre la 001 y preparar dependencias y configuración

- [ ] T001 Rebasar la rama `recordatorio` sobre `main` con la 001 ya integrada; comprobar que `pnpm install && pnpm test && pnpm typecheck` pasan en verde antes de tocar nada (plan.md, «Dependencias y orden»). Si la 001 aún no está en `main`, detenerse aquí. Antes de implementar, comprobar también que la spec 003 está de nuevo aprobada (sin la pregunta abierta P1) y registrada en `specs/MAPA.md` por el propietario de la 001 (Principio I; flujo de trabajo); si no, detenerse.
- [x] T002 Precisión de la spec (Principio I, decisión del propietario): añadir en `specs/003-recordatorios-cita/spec.md`, junto a FR-010, que un envío interrumpido por caída del proceso (resultado desconocido) no se reintenta y figura como «fallido (interrumpido)» para no duplicar (FR-003), tal como describe research.md R2. *Hecho el 2026-11-07: FR-010 y FR-005 actualizados, aprobado por el propietario.*
- [ ] T003 [P] Añadir dependencias en `package.json`: `nodemailer` (+ `@types/nodemailer` en desarrollo) y `mailparser` (+ `@types/mailparser`) solo en desarrollo; añadir el script `"recordatorios": "tsx scripts/recordatorios.ts"`; instalar con `pnpm install` (versiones exactas, como el resto del proyecto).
- [ ] T004 [P] Añadir a `.env.example` `URL_PUBLICA=http://localhost:3000`, `CORREO_REMITENTE=recordatorios@clinicaeleva.example`, `# SMTP_URL=` (comentada: sin ella, modo simulado) y `# SALIDA_CORREO_DIR=datos/salida-correo`; añadir `datos/salida-correo/` a `.gitignore`.
- [ ] T005 [P] Crear `src/correo/configuracion.ts`: `leerConfiguracionCorreo(env)` valida con Zod `URL_PUBLICA` (obligatoria, `http(s)://`, sin barra final), `CORREO_REMITENTE` (obligatoria, correo válido), `SMTP_URL` (opcional) y `SALIDA_CORREO_DIR` (por defecto `datos/salida-correo`); devuelve `{ modo: 'simulado' | 'smtp', ... }` o un error que nombra la variable que falta (contracts/comando-recordatorios.md, «Configuración»).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: esquema, fábricas de test y piezas de la 005 que necesita el correo

**⚠️ CRITICAL**: US1 no empieza hasta terminar esta fase

- [ ] T006 Ampliar `src/db/esquema.ts` según data-model.md: enums `modo_correo` (`simulado`, `smtp`) y `estado_recordatorio` (`enviando`, `enviado`, `fallido`); tabla `recordatorio` (con `UNIQUE (cita_id)`, sin token); tabla `ejecucion_recordatorios` (`resumen jsonb` tipado con la forma de data-model.md). Ningún cambio en `cita` ni en otra definición de la 001 (spec FR-021).
- [ ] T007 Generar la migración con `pnpm db:generate` (después de T001, nunca antes; research R11); comprobar `pnpm db:migrate` sobre una BD con la semilla 2026-11-09 y que la semilla sigue cargando igual.
- [ ] T008 Ampliar `tests/helpers/fabrica.ts` con: paciente sin correo, paciente con correo inválido (insertado sin pasar la validación de la 001) y cita reservada en una fecha/hora dada. Depende de T006.
- [ ] T009 Comprobar que la 005 expone, para usarlos sin reimplementarlos: (a) el enlace personal vigente de una ficha (005 FR-001, FR-008) y los de la semilla (005 FR-019); (b) el límite de cancelación de una cita (005 FR-009) para el enunciado de 005 FR-016. Si falta alguno, detenerse y pedirlo al propietario de la 005; no calcular el plazo ni generar enlaces en la 003 (spec FR-019, FR-020; research R5).

**Checkpoint**: esquema migrado, fábricas listas y piezas de la 005 disponibles; US1 puede empezar.

---

## Phase 3: User Story 1 - El paciente recibe un recordatorio de su cita (Priority: P1) 🎯 MVP

**Goal**: cada día a las 08:00 se genera un recordatorio, como máximo uno por cita, para cada cita reservada de mañana cuyo paciente tenga correo, con el enlace personal y el enunciado de la política; sin SMTP, como `.eml` en `datos/salida-correo/`.

**Independent Test**: con la semilla 2026-11-09 y sin `SMTP_URL`, `CITACLARA_AHORA=2026-11-09T08:00:00+01:00 pnpm recordatorios` deja 20 `.eml` del 10/11/2026 y resume «Enviados: 20 · Sin correo: 6»; repetirlo no crea ninguno más.

### Tests for User Story 1 (MANDATORY - Principle VI) ⚠️

> **NOTE: escribir estos tests PRIMERO y comprobar que FALLAN antes de implementar**

- [ ] T010 [P] [US1] Test unitario `tests/unit/ventana-recordatorio.test.ts` (FR-002): con zona `Europe/Madrid`, cada fila de la tabla «Ventana: ejemplos» de data-model.md (09/11/2026 → 24 h; 27/03/2027 → 23 h; 30/10/2027 → 25 h, con `ventana_desde`/`ventana_hasta` exactos en UTC); la ventana no depende de la hora de ejecución (a las 00:05 y a las 23:55 del lunes 09/11/2026 → martes 10/11/2026); una clínica en `Atlantic/Canary` usa su propia medianoche.
- [ ] T011 [P] [US1] Test unitario `tests/unit/componer-recordatorio.test.ts` (FR-007, FR-008, FR-019, FR-020, SC-006): con la cita de Ana (lunes 16/11/2026 10:00–10:45, María, Sesión de fisioterapia), un enlace personal y un límite de cancelación dados como entrada, el asunto es exactamente «Recordatorio de su cita en Clínica Eleva: lunes, 16/11/2026, 10:00»; el texto plano coincide con contracts/correo-recordatorio.md (saludo con nombre de pila, día, hora, profesional, servicio, enlace `<URL_PUBLICA>/p/<token>` y enunciado con el límite recibido, formateado «antes del domingo, 15/11/2026 a las 10:00»); el único enlace a CitaClara es el personal; el HTML contiene el botón y la URL en texto, `max-width:600px`, ningún ancho fijo mayor de 360 px, ninguna imagen ni recurso externo; el enunciado incluye el nombre y el teléfono de la clínica (005 FR-016; teléfono pendiente de S9); ni texto ni HTML contienen precio ni el teléfono o el correo del paciente.
- [ ] T012 [P] [US1] Test unitario `tests/unit/resultado-recordatorio.test.ts` (FR-004, FR-005, data-model «Selección de citas»): clasificación de cada caso (sin correo → `sin_correo`; correo inválido → `correo_no_valido`; recordatorio `enviado` → `ya_enviado_antes`; `enviando` de ≤ 10 min → `ya_enviado_antes`; `enviando` de > 10 min → `fallido` con `interrumpido: true`, que el resumen y la salida muestran como «fallido (interrumpido)» (FR-005, FR-010); sin recordatorio o `fallido` → «a enviar») y totales del resumen.
- [ ] T013 [P] [US1] Test de integración `tests/integration/recordatorios-ejecucion.test.ts` con la semilla 2026-11-09, modo simulado en una carpeta temporal y `ahora = 2026-11-09T08:00:00+01:00`: US1 #1 (20 recordatorios del 10/11/2026 con datos correctos); US1 #8 y FR-019 (cada correo lleva el enlace personal vigente de su paciente según la 005 y ningún otro enlace); FR-020 y SC-007 (el límite del enunciado de cada correo coincide al minuto con el de la 005 para esa cita); FR-021 (las filas de `cita` son idénticas antes y después de la ejecución); US1 #5 y FR-004 (6 «sin correo», ninguno para ellas; ficha con correo inválido → «correo no válido»); US1 #4 (citas canceladas/completadas/no asistidas del día no se recuerdan); US1 #2 (segunda ejecución: 0 enviados, 20 «ya enviado antes»); FR-005/FR-006 (fila en `ejecucion_recordatorios` con `fecha_objetivo = 2026-11-10`, ventana y totales; un `recordatorio` por cita con destinatario, modo y momentos); edge case fin de semana (`ahora = 2026-11-13T08:00+01:00` → 0 citas); FR-017 (cancelar una cita ya recordada y crear otra para el miércoles 11/11/2026 → la ejecución del 10/11/2026 recuerda la nueva). Si las cifras 26/20/6 no coinciden con la semilla integrada, corregir quickstart.md y docs (T025), no el test a ciegas.
- [ ] T014 [P] [US1] Test de integración `tests/integration/recordatorios-concurrencia.test.ts` (FR-003, SC-001, US1 #3): 10 ejecuciones seguidas y después 2 ejecuciones lanzadas a la vez (`Promise.all`) sobre la misma BD recién sembrada → exactamente 20 filas `recordatorio`, 20 ficheros `.eml` y la suma de «enviado» de todas las ejecuciones es 20.
- [ ] T015 [P] [US1] Test de integración `tests/integration/recordatorios-envio.test.ts`: FR-009 y US1 #6 (sin `SMTP_URL`, cada `.eml` se llama `AAAA-MM-DD_HHmm_<citaId>.eml`, se vuelve a leer con `mailparser` y su From, To, Subject, Message-ID y cuerpo coinciden con contracts/correo-recordatorio.md; no se abre ninguna conexión SMTP); FR-010 y US1 #7 (transporte de prueba que falla → recordatorio `fallido` y resumen con `fallido: 1` (el código de salida 2 lo prueba T016); la siguiente ejecución del mismo día lo reintenta con el enlace personal vigente en ese momento y queda `enviado`; si la cita se cancela antes, no se reintenta); R2 (fila `enviando` de hace 15 min → no se reenvía y sale como «fallido (interrumpido)»).
- [ ] T016 [P] [US1] Test de integración `tests/integration/comando-recordatorios.test.ts` (FR-001, FR-005, FR-010, contracts/comando-recordatorios.md): lanza `scripts/recordatorios.ts` como proceso hijo, igual que `pnpm recordatorios`, con `CITACLARA_AHORA=2026-11-09T08:00:00+01:00` sobre la BD de Testcontainers. Casos: (a) sin `URL_PUBLICA` → código 1, mensaje en español que nombra la variable, ningún `.eml` y ninguna fila nueva en `ejecucion_recordatorios`; (b) semilla 2026-11-09 en modo simulado → código 0 y salida con la cabecera «Citas del martes, 10/11/2026», una línea por cita (hora + profesional + resultado) y la línea de totales del contrato; la salida no contiene ningún nombre ni correo de paciente de la semilla; (c) `SMTP_URL` apuntando a un puerto local cerrado → código 2 y totales con «Fallidos» > 0; (d) una fila `recordatorio` en `enviando` de hace 15 min → su línea dice «fallido (interrumpido)», cuenta en «Fallidos» y el código es 2. Debe fallar hasta T022.

### Implementation for User Story 1

- [ ] T017 [P] [US1] Crear `src/dominio/ventana-recordatorio.ts`: `calcularVentana(ahora: Date, zona: string) → { fechaObjetivo: 'AAAA-MM-DD'; desde: Date; hasta: Date }` = día natural siguiente a `fechaLocal(ahora, zona)` usando `sumarDias` y `rangoDelDia` de `src/lib/zona.ts` (R1). Debe pasar T010.
- [ ] T018 [P] [US1] Crear `src/dominio/resultado-recordatorio.ts`: tipos `ResultadoCita` y `ResumenEjecucion` (forma de data-model.md), `clasificarCita({ email, recordatorio, ahora })` y `totalizar(resultados)`; validación del correo con `z.email()` (R9). Debe pasar T012.
- [ ] T019 [P] [US1] Crear `src/correo/componer-recordatorio.ts`: función pura `componerRecordatorio({ clinica, paciente, profesional, servicio, inicio, fin, zona, enlacePersonal, limiteCancelacion }) → { asunto, texto, html }` con los formateadores de `src/lib/formato.ts`, el enunciado de contracts/correo-recordatorio.md (derivado de 005 FR-016, sin calcular el plazo: `limiteCancelacion` llega de la 005) y el HTML del contrato (una columna, estilos en línea, botón con contraste AA, ≥ 16 px y ≥ 44 px de alto) (R4, R5). Debe pasar T011.
- [ ] T020 [US1] Crear `src/correo/transporte.ts`: `crearTransporte(config)` → SMTP de Nodemailer (timeout 30 s) si hay `SMTP_URL`, o `streamTransport` con `buffer: true` en modo simulado; `enviarRecordatorio(transporte, mensaje, { citaId, inicioLocal })` construye el mismo mensaje en ambos modos (From con el nombre de la clínica, Message-ID `<recordatorio-<citaId>@<dominio de URL_PUBLICA>>`, Date = `ahora()`), y en simulado escribe el `.eml` de forma atómica (temporal + renombrado, sobrescribiendo el de esa cita) y devuelve la ruta relativa; interfaz inyectable para el transporte de prueba que falla de T015 (R3). Depende de T005.
- [ ] T021 [US1] Crear `src/servicios/recordatorios.ts` con `ejecutarRecordatorios({ ahora, config, transporte }) → ResumenEjecucion`: lee la clínica y su zona; `calcularVentana`; selecciona citas `reservada` en `[desde, hasta)` con paciente, profesional y servicio, en orden de inicio; para cada una aplica `clasificarCita`; las «a enviar» se reclaman en su propia transacción (`INSERT … ON CONFLICT (cita_id) DO NOTHING RETURNING` o `UPDATE … SET estado='enviando' WHERE cita_id=$1 AND estado='fallido' RETURNING`, con `intentos + 1`), se componen con el enlace personal vigente y el límite de cancelación que da la 005 (T009), se envían y se marcan `enviado` (con `enviado_en` y `fichero`) o `fallido` (con `ultimo_error`); sin fila reclamada → `ya_enviado_antes`; al final guarda la fila de `ejecucion_recordatorios` con el resumen (R2, R8, data-model.md). No escribe en `cita` (FR-021). Depende de T006, T009, T017–T020. Debe pasar T013–T015.
- [ ] T022 [US1] Crear `scripts/recordatorios.ts` (comando `pnpm recordatorios`): fija el reloj con `CITACLARA_AHORA` si existe, lee la configuración (error → mensaje en español nombrando la variable y código 1), ejecuta `ejecutarRecordatorios`, imprime el resumen con el formato de contracts/comando-recordatorios.md (hora + profesional + resultado por cita, incluido «fallido (interrumpido)», sin nombres ni correos de pacientes) y sale con 0 (sin fallidos), 2 (algún fallido, también interrumpido) o 1 (error general); cierra la BD con `cerrarBd()`. Depende de T021. Debe pasar T016.
- [ ] T023 [US1] Añadir al `README.md` la sección «Recordatorios diarios»: qué hace el comando, variables de entorno, modo simulado (`datos/salida-correo/`) y la línea de planificación `CRON_TZ=Europe/Madrid` · `0 8 * * *` · `pnpm recordatorios` con el significado de los códigos de salida (FR-001, R1). Incluye «Comprobar la planificación» para quien despliega: tras instalar la entrada del planificador, al día siguiente debe existir una fila en `ejecucion_recordatorios` con `iniciada_en` hacia las 08:00 hora local, y la salida del comando queda en el registro del planificador; si falta la fila, la ejecución automática no está activa.

**Checkpoint**: US1 completa y demostrable sola con los escenarios 1–6 de quickstart.md.

---

## Phase 4: User Story 2 - *Retirada (revisión cruzada S4, 2026-11-07)*

La cancelación del paciente la definen la 005 y la 002 (spec, US2 retirada). No hay tareas en
la 003. El recorrido correo → portal se comprueba en Polish (T027, escenario 7; T028).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: cifras demo, idioma, trazabilidad y validación final

- [ ] T024 [P] Revisar textos del correo (texto y HTML) y la salida del comando: español de España, trato de usted al paciente, sin jerga técnica, fechas «lunes, 16/11/2026» y horas «10:00–10:45»; el enunciado de la política se deriva de 005 FR-016 y no contiene ningún plazo redactado por su cuenta (Principios II, VII, VIII; FR-020, SC-007).
- [ ] T025 Añadir a `docs/datos-demo.md` la sección «Recordatorios» con la tabla por día de quickstart.md («Cifras de referencia»), recalculada con la semilla integrada (2026-11-09); si alguna cifra difiere, corregir también `specs/003-recordatorios-cita/quickstart.md` y la constante del test T013 (Principio V).
- [ ] T026 [P] Comprobar la trazabilidad (Principio VI): cada FR-001–FR-010, FR-017 y FR-019–FR-021 y cada escenario US1 #1–#8 aparece en el nombre de al menos un test (`grep -rE "FR-0|US1 #" tests/`); SC-001, SC-006 y SC-007 cubiertos por tests automáticos; SC-002 y SC-005 documentados como verificación manual y medición del piloto en quickstart.md. Anotar en este archivo cualquier hueco y cubrirlo.
- [ ] T027 Ejecutar `pnpm lint && pnpm typecheck && pnpm test` con todo en verde y recorrer a mano los escenarios 1–6 de `specs/003-recordatorios-cita/quickstart.md` en modo simulado; el 7, cuando la 002 y la 005 estén disponibles.
- [ ] T028 Prueba de usabilidad de SC-002 (2 personas sin experiencia, con una cita dentro del plazo de la 005, pasan del `.eml` en el móvil a la cita cancelada en el portal en < 1 min; se anotan los pasos, incluidas las 4 cifras si 005 FR-006 las pide) y registro del resultado junto a la entrega. Requiere la 002 y la 005.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 primero y bloqueante (sin la 001 no hay código sobre el que construir); T003–T005 en paralelo tras T001.
- **Foundational (Phase 2)**: depende de Setup. T006 → T007; T008 depende de T006; T009 depende de la 005 (externa). Bloquea US1.
- **US1 (Phase 3)**: tras la Fase 2. T019 y T021 necesitan T009 (enlace y límite de la 005).
- **Polish (Phase 5)**: tras US1. T025 antes de T027. T027 (escenario 7) y T028 necesitan la 002 y la 005.
- **Pregunta abierta P1** (spec): decidirla antes de activar el planificador del piloto; puede cambiar T010, T017 y las cifras de T025.

### User Story Dependencies

- **US1 (P1)**: solo Fase 2. Es el MVP y la única historia de la 003.

### Within Each User Story

- Tests primero y en rojo; cada test cita el FR/escenario/SC que cubre.
- Dominio puro (ventana, clasificación, composición) → transporte → servicio → comando.

### Parallel Opportunities

- Fase 1: T003, T004, T005.
- Fase 2: T008 en paralelo con T007; T009 (comprobación de la 005) en cualquier momento.
- US1: tests T010–T016 en paralelo; después T017, T018 y T019 en paralelo; T020 → T021 → T022; T023 en cualquier momento.

---

## Parallel Example: User Story 1

```bash
# Tests de US1 a la vez:
Task: "T010 Test unitario de la ventana en tests/unit/ventana-recordatorio.test.ts"
Task: "T011 Test unitario del correo en tests/unit/componer-recordatorio.test.ts"
Task: "T012 Test unitario de la clasificación en tests/unit/resultado-recordatorio.test.ts"
Task: "T013 Test de integración de la ejecución en tests/integration/recordatorios-ejecucion.test.ts"
Task: "T014 Test de concurrencia en tests/integration/recordatorios-concurrencia.test.ts"
Task: "T015 Test de envío y reintentos en tests/integration/recordatorios-envio.test.ts"
Task: "T016 Test del comando en tests/integration/comando-recordatorios.test.ts"

# Piezas puras de US1 a la vez:
Task: "T017 Ventana en src/dominio/ventana-recordatorio.ts"
Task: "T018 Clasificación en src/dominio/resultado-recordatorio.ts"
Task: "T019 Composición del correo en src/correo/componer-recordatorio.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fase 1 (T001 bloqueante: la 001 integrada).
2. Fase 2 (T009: piezas de la 005 disponibles).
3. US1 → validar con quickstart escenarios 1–6.
4. **Antes de activar el planificador del piloto**: la 002 y la 005 en producción (el enlace del correo debe llevar a un portal que funcione) y la pregunta abierta P1 decidida.

### Incremental Delivery

1. Setup + Foundational → esquema y piezas de la 005.
2. US1 → recordatorios en modo simulado → demo con los `.eml`.
3. Polish → cifras en `docs/datos-demo.md`, trazabilidad y usabilidad (con la 002 y la 005) → activar el planificador del piloto.

---

## Notes

- [P] = archivos distintos y sin dependencias pendientes.
- Archivos de la 001 que se tocan (solo añadidos): `src/db/esquema.ts` (tablas propias), `tests/helpers/fabrica.ts`, `package.json`, `.env.example`, `.gitignore`, `README.md`, `docs/datos-demo.md`. No se tocan `src/servicios/citas.ts`, `src/dominio/errores.ts`, `next.config.ts`, `src/proxy.ts` ni la semilla.
- La migración se genera después de rebasar (T007) para no chocar con las de otras features en paralelo.
- Commit tras cada tarea o grupo lógico; no desactivar ningún test para integrar (Principio VI).
