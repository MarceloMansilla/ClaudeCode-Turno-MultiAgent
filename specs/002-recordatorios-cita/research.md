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
  600 px, botón «Cancelar mi cita» con contraste AA y texto ≥ 16 px). Fechas con el
  formateador de la 001 («lunes, 16/11/2026», «10:00–10:45»). Trato de usted. Sin imágenes
  ni recursos externos (se ven igual con las imágenes bloqueadas).
- **Razón**: pocas líneas, fáciles de probar con instantáneas; sin motor de plantillas.
- **Alternativas**: React Email / MJML: buenas para catálogos de correos; para uno solo es
  dependencia innecesaria (Principio IV).

## R5. Enlace de cancelación (FR-011, FR-016, SC-004)

- **Decisión**: un **token aleatorio de 32 bytes** (`crypto.randomBytes`) en base64url
  (43 caracteres), uno por recordatorio. En la BD solo se guarda su **SHA-256**
  (`token_hash`, único); el token en claro solo existe en el correo. Se genera de nuevo en
  cada intento de envío (un fallido reintentado lleva un enlace nuevo). URL:
  `${URL_PUBLICA}/cancelar/<token>`. La validez se decide al usarlo: el enlace siempre muestra
  el estado de su cita y solo permite cancelar mientras siga «reservada» y `ahora < inicio`.
- **Razón**: 256 bits hacen inviable adivinar un enlace (SC-004) sin limitar intentos; guardar
  solo el hash evita que una copia de la BD permita cancelar citas.
- **Alternativas**: JWT firmado con `jose`: enlaces más largos, revocación imposible y una
  clave más que custodiar. Usar el `id` de la cita: adivinable.

## R6. Página pública de cancelación (US2, FR-012, FR-014, FR-015)

- **Decisión**: ruta **`/cancelar/[token]`**, fuera del `matcher` de `proxy.ts` (que en la
  001 solo cubre `/`, `/entrar` y `/agenda/*`), sin sesión. La carga (GET) **solo lee**: busca
  el recordatorio por hash y muestra la cita y su estado. La cancelación es una **Server
  Action** (`cancelarDesdeRecordatorio`) disparada por el botón «Cancelar mi cita», así que
  los analizadores de enlaces de los proveedores de correo no pueden cancelar nada. Cabeceras:
  `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`.
  Interfaz con los componentes de la 001 (shadcn/ui), mobile-first desde 360 px.
- **Razón**: separa ver de cancelar (escenario US2 #1) y reutiliza la protección CSRF de las
  Server Actions.
- **Alternativas**: cancelar en el propio GET: lo dispararían los analizadores de enlaces.
  Formulario HTML con ruta POST propia: equivale a la Server Action con más código.

## R7. Cancelación en la base de datos (FR-012, FR-013, FR-015; Principio III)

- **Decisión**: actualización condicional en un **servicio nuevo**
  (`src/servicios/recordatorios.ts`), sin modificar el servicio de citas de la 001:
  `UPDATE cita SET estado = 'cancelada', estado_cambiado_en = $ahora,
  cancelada_desde_recordatorio = true WHERE id = $citaId AND estado = 'reservada'
  AND inicio > $ahora`. Si no afecta a ninguna fila, se relee la cita y se responde con su
  estado (ya cancelada, completada, no asistida) o con «fuera de plazo». Nueva columna
  `cita.cancelada_desde_recordatorio boolean NOT NULL DEFAULT false` (FR-013); el momento es
  `estado_cambiado_en`, que ya existe.
- **Razón**: la misma técnica que la 001 (FR-020): de varias cancelaciones o cambios
  simultáneos solo prospera uno. Cancelar saca la cita de la restricción `cita_sin_solape`,
  así que no puede crear solapes; el hueco liberado se vuelve a reservar con las garantías de
  la 001. Con `DEFAULT false`, el código y la semilla de la 001 no cambian.
- **Alternativas**: columna `cancelada_por` (`recepcion` | `paciente`) obligatoria al
  cancelar: más expresiva, pero obliga a tocar el servicio de citas y la semilla de la 001,
  que se están implementando en paralelo; se descarta por coste de coordinación.

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
    31/10/2027), composición del correo (asunto y campos exactos, texto y HTML), generación y
    hash del token, clasificación de resultados.
  - **Integración (PostgreSQL real con Testcontainers)**: 10 ejecuciones repetidas y
    2 ejecuciones simultáneas sobre la semilla → 0 duplicados (SC-001); fallido reintentado
    con un transporte de prueba que falla; envío interrumpido no reintentado; citas no
    reservadas y fichas sin correo o con correo inválido; cancelación simultánea paciente ×
    recepción y paciente × paciente (solo una prospera); alta en el hueco liberado sin solape
    (Principio III); 100 tokens inventados → ninguno muestra datos (SC-004). Modo simulado:
    el `.eml` se vuelve a leer con el analizador de Nodemailer (`mailparser`, solo en
    desarrollo) y se comprueban cabeceras y cuerpo.
  - **E2E (Playwright, móvil 360×800 y portátil)**: abrir enlace → ver datos → cancelar →
    mensaje de confirmación; enlace fuera de plazo y enlace inválido; axe sin infracciones AA
    (SC-006); la agenda de recepción muestra el hueco libre (SC-003).
  Cada test cita su FR/escenario en el nombre, como en la 001.
- **Alternativas**: servidor SMTP de pruebas (MailHog/Mailpit) en Docker: útil para mirar
  correos a mano, pero el modo simulado ya da los `.eml`; no se añade.

## R11. Trabajo en paralelo con otras features

- **Dependencia de la 001**: esta rama no contiene aún el código de la 001 (se implementa en
  otra copia de trabajo). La implementación de la 002 empieza cuando la 001 esté integrada en
  `main` y se rebase esta rama sobre ella.
- **Migraciones**: Drizzle numera las migraciones y mantiene `meta/_journal.json`; otras
  features en paralelo también añadirán migraciones. La migración de la 002 se genera
  **después** de rebasar sobre `main`, nunca antes, para evitar números y diarios
  conflictivos.
- **`proxy.ts`**: no se modifica (el `matcher` de la 001 ya deja fuera `/cancelar`). Si la
  feature de portal del paciente cambia el `matcher`, debe seguir excluyendo `/cancelar/*`.
- **Portal del paciente**: si define otra forma de cancelar, debe usar la misma regla
  (FR-018/FR-018a de la 001) y, preferiblemente, el mismo servicio de cancelación.

## Asuntos sin resolver

Ninguno. No queda ningún «NEEDS CLARIFICATION».
