# Investigación (Fase 0): Recordatorios de cita por correo electrónico

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-07

Parte del stack ya decidido en la 001 ([research de la 001](../001-agenda-core/research.md)):
Next.js 16 + React 19 + TypeScript, PostgreSQL 18 con Drizzle, Zod 4, date-fns 4 +
@date-fns/tz, `reloj` inyectable (`CITACLARA_AHORA`), Vitest + Testcontainers y Playwright +
axe. Aquí solo se decide lo nuevo. Formato: Decisión / Razón / Alternativas.

---

## R1. Cómo se ejecuta el proceso diario (FR-001, FR-002)

- **Decisión**: un comando de línea, `pnpm recordatorios` (`tsx scripts/recordatorios.ts`),
  que hace una ejecución completa y termina. La programación diaria la hace el planificador
  del sistema o del hosting, en la zona de la clínica:
  `CRON_TZ=Europe/Madrid` · `0 8 * * *` · `pnpm recordatorios`. El mismo comando sirve para
  la ejecución manual (FR-001). La ventana **no depende de la hora de ejecución**: se calcula
  como el día natural siguiente al «ahora» en la zona de la clínica, de
  `mañana 00:00` (incluido) a `pasado mañana 00:00` (excluido), convertido a instantes UTC
  con @date-fns/tz. Así un día de cambio de hora (23 o 25 h) queda cubierto completo.
- **Razón**: lo más simple que cumple FR-001 sin proceso residente. Un programador dentro del
  servidor de Next.js fallaría si hay varias instancias (doble ejecución) o ninguna (servidor
  dormido). El comando reutiliza los servicios y el `reloj` de la 001, así que se prueba
  fijando `CITACLARA_AHORA`.
- **Alternativas**: `node-cron` dentro de Next.js: dependencia extra y frágil con varias
  instancias. `pg_cron`: no puede enviar correo. Ruta HTTP llamada por un cron externo: añade
  una superficie pública con autenticación propia sin necesidad.

## R2. Sin duplicados, también con ejecuciones simultáneas (FR-003, FR-006, FR-010)

- **Decisión**: tabla `recordatorio` con **`UNIQUE (cita_id)`** y patrón **«reclamar antes de
  enviar»**:
  1. Reclamar: `INSERT … (estado = 'enviando') ON CONFLICT (cita_id) DO NOTHING RETURNING id`
     para citas sin recordatorio, o
     `UPDATE recordatorio SET estado = 'enviando' … WHERE cita_id = $1 AND estado = 'fallido'
     RETURNING id` para reintentar un fallido (FR-010). Cada reclamación es su propia
     transacción, confirmada antes de enviar.
  2. Enviar (o escribir el `.eml`).
  3. Marcar `enviado` o `fallido` (con el error).
  Solo quien obtiene la fila en el paso 1 envía; la otra ejecución simultánea recibe 0 filas y
  anota «ya enviado antes». Es entrega **como máximo una vez**, que es lo que exige FR-003.
- **Envío interrumpido** (el proceso muere entre los pasos 2 y 3): la fila queda en
  `enviando` y no se sabe si el correo salió. Para no arriesgar un duplicado (FR-003 prevalece)
  **no se reintenta**: si una ejecución posterior la encuentra en `enviando` con más de
  10 minutos de antigüedad, la anota en el resumen como «fallido» con el detalle
  «envío interrumpido; no se reintenta para no duplicar». Es un caso de caída del proceso, no
  un envío fallido conocido. Recogido en la spec: FR-010 (no se reintenta) y FR-005
  (resultado «fallido (interrumpido)»).
- **Razón**: la unicidad la garantiza la BD de forma atómica, como el solape en la 001; no
  hacen falta bloqueos explícitos ni coordinación entre procesos.
- **Alternativas**: bloqueo consultivo (`pg_advisory_lock`) por ejecución: serializa
  ejecuciones pero no protege contra el reenvío tras una caída; innecesario con la
  restricción única. Enviar y después insertar: entrega «al menos una vez» → posibles
  duplicados.

## R3. Envío de correo y modo simulado (FR-009, FR-010)

- **Decisión**: **Nodemailer** como única dependencia nueva, con dos transportes:
  - Si `SMTP_URL` está definida → transporte SMTP (timeout de 30 s por envío).
  - Si no → **modo simulado**: `streamTransport` con `buffer: true` genera el mensaje MIME
    completo (RFC 5322) y se escribe tal cual en `datos/salida-correo/` (configurable con
    `SALIDA_CORREO_DIR`). Nada sale al exterior.
  Ambos modos construyen el mensaje con el **mismo** código y los mismos datos, por lo que el
  `.eml` es idéntico a lo que se enviaría (FR-009). Nombre de fichero determinista:
  `AAAA-MM-DD_HHmm_<citaId>.eml` (fecha y hora local de la cita). La escritura es atómica
  (fichero temporal + renombrado). `datos/salida-correo/` se ignora en git.
- **Razón**: Nodemailer es el estándar de Node para SMTP y su `streamTransport` produce un
  `.eml` válido sin código propio de MIME. Una sola librería cubre los dos modos.
- **Alternativas**: escribir el MIME a mano: propenso a errores de codificación (tildes en
  asunto y cuerpo). API de un proveedor (SES, Resend…): ata a un proveedor y no resuelve el
  modo simulado; SMTP lo admiten todos.

## R4. Contenido y plantilla del correo (FR-007, FR-008)

- **Decisión**: una función pura `componerRecordatorio(datos) → { asunto, texto, html }`, con
  versión de **texto plano** y **HTML** sencillo (una columna, estilos en línea, ancho máximo
  600 px, botón con el enlace personal, contraste AA y texto ≥ 16 px). Fechas con el
  formateador de la 001 («lunes, 16/11/2026», «10:00–10:45»). Trato de usted. Sin imágenes
  ni recursos externos (se ven igual con las imágenes bloqueadas).
- **Razón**: pocas líneas, fáciles de probar con instantáneas; sin motor de plantillas.
- **Alternativas**: React Email / MJML: buenas para catálogos de correos; para uno solo es
  dependencia innecesaria (Principio IV).

## R5. Enlace y enunciado de la política en el correo (FR-019, FR-020; revisión cruzada S4)

- **Decisión**: el correo lleva el **enlace personal** vigente del paciente
  (`${URL_PUBLICA}/p/<token>`, 005 FR-001 y FR-008), leído al componer el correo, y el
  **enunciado** de la política de cancelación derivado de 005 FR-016. La 003 no genera, guarda
  ni valida tokens, y no calcula el plazo: toma de la 005 el enlace y el límite de cada cita.
  Un fallido reintentado lleva el enlace vigente en el momento del reintento.
- **Razón**: 005 FR-008 prohíbe a otras specs definir enlaces o credenciales de paciente, y
  005 FR-017 exige que todo texto sobre el plazo se derive de FR-016. Así el límite que dice el
  correo y el que aplica el portal son el mismo instante (SC-007).
- **Alternativas**: enlace por cita con token propio (diseño anterior, `/cancelar/[token]` con
  `token_hash`): retirado por S4; duplicaba la credencial del paciente con otras reglas de
  exposición. Calcular aquí el límite: retirado; sería un plazo redactado por su cuenta.
- **Cómo se toma de la 005** (2026-11-08): se importan, sin copiarlas ni redefinirlas,
  `rutaEnlacePaciente` (`src/dominio/enlace.ts`), `limiteCancelacionPaciente` y
  `pacientePuedeCancelar` (`src/dominio/plazo-paciente.ts`) y `enunciadoPoliticaCancelacion`
  (`src/dominio/politica-cancelacion.ts`). El enunciado se inserta tal cual (FR-020, FR-022);
  `tests/unit/coherencia-politica.test.ts` vigila que ningún texto del correo redacte el plazo.
  005 FR-006 pide las 4 cifras al abrir el enlace: el correo no cambia; SC-002 pasa a 4
  acciones.

## R6. Página pública de cancelación — *Retirada (S4)*

La 003 no tiene páginas. Lo que ve el paciente al abrir el enlace lo define la 002 con las
reglas de la 005.

## R7. Cancelación en la base de datos — *Retirada (S2)*

La 003 no escribe en la agenda: no hay `UPDATE` de `cita` ni columna
`cancelada_desde_recordatorio`. La cancelación del paciente la ejecuta la 005 y su origen se
registra en el campo de la 001 (FR-018a, `cita.cancelada_por`). La afirmación anterior «el
código de la 001 no cambia» queda retirada: no es una garantía de esta spec.

## R8. Resumen de cada ejecución (FR-005)

- **Decisión**: tabla `ejecucion_recordatorios` (momento, ventana, modo y un `resumen jsonb`
  con los totales y el resultado por cita). El comando imprime ese mismo resumen en español
  por la salida estándar. Código de salida: `0` sin fallidos, `2` con algún fallido, `1` error
  general (la BD no responde, configuración inválida), para que el planificador pueda avisar.
- **Razón**: «consultable» sin pantalla nueva (la spec no la pide): queda en la BD y en el
  registro del planificador.
- **Alternativas**: tabla de detalle por cita: más normalizada, sin consumidor que la
  necesite hoy. Solo salida estándar: se pierde si el planificador no guarda registros.

## R9. Validez del correo (FR-004)

- **Decisión**: el correo de la ficha se valida en el momento de la ejecución con
  `z.email()` de Zod; si no pasa, el resultado es «correo no válido» y no se reclama
  recordatorio (la cita podrá recordarse si se corrige la ficha antes de otra ejecución de la
  misma ventana).
- **Razón**: la 001 ya valida el correo al crear la ficha; esta comprobación cubre datos
  antiguos o importados.

## R10. Pruebas (Principio VI)

- **Decisión**:
  - **Unitarias**: cálculo de la ventana (incluidos los días de cambio de hora, 28/03/2027 y
    31/10/2027), composición del correo (asunto y campos exactos, texto y HTML, enlace personal
    y enunciado de la política con el límite que da la 005), clasificación de resultados.
  - **Integración (PostgreSQL real con Testcontainers)**: 10 ejecuciones repetidas y
    2 ejecuciones simultáneas sobre la semilla → 0 duplicados (SC-001); fallido reintentado
    con un transporte de prueba que falla; envío interrumpido no reintentado; citas no
    reservadas y fichas sin correo o con correo inválido; cada correo lleva el enlace personal
    vigente de su paciente y ningún otro enlace (FR-019); el límite del enunciado coincide al
    minuto con el de la 005 (SC-007); una ejecución no cambia ninguna fila de `cita` (FR-021).
    Modo simulado: el `.eml` se vuelve a leer con el analizador de Nodemailer (`mailparser`,
    solo en desarrollo) y se comprueban cabeceras y cuerpo.
  - **E2E**: ninguno propio (la 003 no tiene pantallas). El recorrido correo → portal →
    cancelar es de la 005 y la 002; SC-002 se verifica a mano (quickstart).
  Cada test cita su FR/escenario en el nombre, como en la 001.
- **Alternativas**: servidor SMTP de pruebas (MailHog/Mailpit) en Docker: útil para mirar
  correos a mano, pero el modo simulado ya da los `.eml`; no se añade.

## R11. Trabajo en paralelo con otras features

- **Dependencia de la 001**: esta rama no contiene aún el código de la 001 (se implementa en
  otra copia de trabajo). La implementación de la 003 empieza cuando la 001 esté integrada en
  `main` y se rebase esta rama sobre ella.
- **Migraciones**: Drizzle numera las migraciones y mantiene `meta/_journal.json`; otras
  features en paralelo también añadirán migraciones. La migración de la 003 se genera
  **después** de rebasar sobre `main`, nunca antes, para evitar números y diarios
  conflictivos.
- **005 (acceso y cancelación) y 002 (portal)**: la 003 necesita de la 005 el enlace personal
  vigente de cada ficha (y los enlaces de la semilla, 005 FR-019) y el límite de cancelación
  de cada cita. La implementación de FR-019/FR-020 empieza cuando la 005 los exponga. La 003 no
  añade rutas ni toca `proxy.ts`.

## Asuntos sin resolver

- ~~Pregunta abierta P1~~: resuelta el 2026-11-08; se mantiene el envío de la víspera a las
  08:00 (R1 sin cambios).
- ~~Cómo expone la 005 el enlace vigente y el límite de cancelación (R5)~~: resuelto en R5;
  falta integrar la 005 en esta rama.
