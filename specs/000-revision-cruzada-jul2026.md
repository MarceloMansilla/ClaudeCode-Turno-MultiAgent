# Revisión cruzada de specs: 001 · portal · recordatorios · analítica

**Fecha**: 2026-11-07 · **Tipo**: informe de solapamientos (no modifica ninguna spec)
**Alcance**: las cuatro specs leídas desde la punta de su rama con `git show`, sin checkout.

## 0. Qué se ha leído y desde dónde

| Spec | Rama (punta) | Ruta leída | Base de la rama |
|------|--------------|------------|-----------------|
| 001 Núcleo de agenda | `001-agenda-core` @ `899df8e` | `specs/001-agenda-core/spec.md` | — (tronco) |
| Portal del paciente | `portal` @ `1d2fc40` | `specs/002-portal-paciente/spec.md` | `899df8e` (001 implementada) |
| Recordatorios | `recordatorio` @ `598e8df` | `specs/002-recordatorios-cita/spec.md` | `454b0f8` (001 **sin** implementar) |
| Analítica | `analitica` @ `63af298` | `specs/004-panel-analitica/spec.md` | merge de `899df8e` |

Además se han leído, para contrastar escrituras y tablas: la copia de la 001 que lleva cada
rama, `specs/MAPA.md` de cada rama, `data-model.md` del portal y de recordatorios,
`contracts/cancelacion-paciente.md` de recordatorios, `docs/datos-demo.md` y
`src/semilla/generar.ts` del tronco, y el diff de código de `analitica`.

**Diferencias con el encargo** (para que nadie busque lo que no existe):

- No hay rama `main`. `master` y `develop` apuntan al commit inicial (`b75d4c3`) y no
  contienen specs. El tronco de facto es `001-agenda-core`, donde vive la 001 y donde está la
  copia de trabajo principal; este informe se escribe ahí.
- Los nombres reales de rama y carpeta no son los esperados: `portal` →
  `002-portal-paciente`; `recordatorio` → **`002-recordatorios-cita`** (no 003);
  `analitica` → `004-panel-analitica`.

## 1. Resumen

| # | Solapamiento | Specs | Gravedad | Dónde explota | Propietario propuesto |
|---|--------------|-------|----------|---------------|-----------------------|
| S1 | Plazo de cancelación del paciente: 24 h vs hasta la hora de inicio | portal, recordatorios, 001 | **Crítica** | Spec y producción | 001 (política por canal) |
| S2 | Origen de la cancelación: `cancelada_por` (enum) vs `cancelada_desde_recordatorio` (booleano) | portal, recordatorios, 001 | **Crítica** | Código y producción | 001 (Enmienda única) |
| S3 | Numeración «002» duplicada y dos enmiendas distintas a la 001 con el mismo FR-018a | portal, recordatorios, 001 | **Crítica** | Spec y merge | 001 + MAPA |
| S4 | Identidad y acceso del paciente: dos credenciales con reglas de exposición distintas | portal, recordatorios, 001 | Alta | Spec, seguridad | Portal |
| S5 | «Tasa de no asistencia»: tres definiciones para el mismo nombre | 001, analítica, recordatorios | Alta | Spec y producción (renovación) | Analítica |
| S6 | «Ocupación»: la analítica cuenta como ocupado lo que la 001 declara libre | 001, analítica, recordatorios | Alta | Spec y producción | 001 (semántica) + analítica (fórmula) |
| S7 | Transición `reservada → cancelada` implementada tres veces | 001, portal, recordatorios | Alta | Código | 001 |
| S8 | Ficheros y migraciones compartidos (`proxy.ts`, esquema, panel, semilla) | todas | Alta | Merge e integración | 001 (código base) |
| S9 | Teléfono de la clínica: existe para el portal, no existe para recordatorios | portal, recordatorios, 001 | Media | Spec y textos | 001 (Enmienda 1) |
| S10 | Voz y mensajes al paciente: «tú» vs «usted», mismos casos con textos distintos | portal, recordatorios | Media | Producción (UX) | Portal (guía de textos al paciente) |
| S11 | Correo del paciente en la semilla: «todos» en la spec, 75 % en el código | 001, recordatorios | Media | Spec vs datos (Principio V) | 001 |
| S12 | Separador de miles atribuido a la 001, que no lo define | 001, analítica | Baja | Spec | 001 (formato común) |

## 2. Mapa de propiedad propuesto (un concepto, un dueño)

| Concepto | Propietario | Los demás… |
|----------|-------------|------------|
| Estados de la cita y sus transiciones | 001 | …referencian, no redefinen |
| Política de cancelación por canal (recepción, portal, recordatorio) | 001 | …citan la fila de su canal |
| Origen y momento de una cancelación (esquema y valores) | 001 | …escriben su valor del enum |
| Qué estados «ocupan el hueco» en la agenda | 001 | …no reutilizan esa expresión con otro sentido |
| Teléfono de contacto de la clínica | 001 | …lo leen |
| Formato de importes, recuentos, fechas y horas | 001 | …lo reutilizan sin ampliarlo por su cuenta |
| Contenido de la semilla (incl. qué pacientes tienen correo) | 001 | …piden cambios por enmienda |
| Acceso del paciente: credenciales, alcance, límites de intentos, datos que se exponen | Portal | …recordatorios emite un tipo de credencial definido allí |
| Textos y trato al paciente | Portal | …recordatorios usa su guía |
| Indicadores (no asistencia, ocupación, ingresos) y sus fórmulas | Analítica | …otras specs que midan éxito con ellos citan su FR |
| Recordatorio, ejecución diaria, ventana, envío | Recordatorios | — |

---

## 3. Solapamientos en detalle

### S1. Plazo de cancelación del paciente: 24 horas frente a «hasta la hora de inicio» — CRÍTICA

**Specs**: portal, recordatorios (y 001 como base de la regla de recepción).

**Citas**

- `portal:specs/002-portal-paciente/spec.md`, FR-012:
  > «El paciente DEBE poder cancelar desde el portal solo mientras falten más de 24 horas
  > para el inicio de la cita: el plazo vence exactamente 24 horas antes del inicio y, desde
  > ese instante, ya no se puede cancelar desde el portal.»
- `portal:specs/002-portal-paciente/spec.md`, FR-013:
  > «Recepción mantiene su propia regla de la spec 001 (cancelar hasta la hora de inicio).»
- `recordatorio:specs/002-recordatorios-cita/spec.md`, FR-012:
  > «Plazo: hasta la hora de inicio de la cita, la misma regla que rige para recepción
  > (FR-018 de la 001); la comprobación se hace en el momento de confirmar. Ejemplo: cita a
  > las 10:00 → se puede cancelar a las 09:59; a las 10:00 ya no.»
- `recordatorio:specs/002-recordatorios-cita/spec.md`, Assumptions:
  > «Si la feature de portal del paciente (desarrollada en paralelo) define otra forma de
  > cancelar, ambas DEBEN aplicar el mismo plazo y las mismas reglas.»
- `001-agenda-core:specs/001-agenda-core/spec.md`, FR-018:
  > «"Cancelar" solo DEBE estar disponible antes de la hora de inicio de la cita»
- `recordatorio:specs/001-agenda-core/spec.md` (enmienda que propone esta rama), FR-018a:
  > «el propio paciente puede cancelar una cita reservada desde el enlace de su
  > recordatorio, con la misma regla de plazo que FR-018 (solo antes de la hora de inicio)»

**Por qué chocan**

- *En spec*: recordatorios exige (DEBE) que el portal aplique su mismo plazo; el portal fija
  otro. Las dos no pueden cumplirse a la vez: es una contradicción formal, no un matiz. Las
  dos respuestas proceden de clarificaciones de Sara en la misma sesión, así que el conflicto
  es de decisión de producto, no de redacción.
- *En producción*: el mismo paciente, para la misma cita, puede o no cancelar según el
  enlace que abra. Con la cita del lunes 16/11/2026 a las 10:00 y el reloj el domingo 15/11 a
  las 12:00: el portal dice «Ya no se puede cancelar desde aquí. Llama…»; el correo de
  recordatorio (enviado ese mismo domingo a las 08:00) deja cancelar hasta el lunes a las
  09:59. La regla de 24 h del portal queda anulada en la práctica por el otro canal.
- *Interacción con la ventana de envío*: el recordatorio se envía a las 08:00 de la víspera
  (`recordatorio` FR-002). Si se impusiera la regla de 24 h a los recordatorios, una cita a
  las 10:00 recibiría el correo con solo 2 horas para cancelar, y una a las 09:00 con 1
  hora; la cancelación desde el correo perdería casi todo su valor («mejor un hueco libre
  que un no-show»).
- *Agravante*: el portal (FR-002b) prevé que «Cuando exista la spec de recordatorios, sus
  mensajes podrán incluir[lo]». Si se incluye, un mismo correo llevaría dos vías de
  cancelación con plazos distintos.

**Propuesta**

- **Propietario: 001.** La política de cancelación es una regla de la máquina de estados;
  la 001 debe tener una tabla única «plazo por canal»: recepción (hasta el inicio), paciente
  por cualquier canal (un único valor). Portal y recordatorios citan esa tabla y eliminan sus
  propios plazos.
- **Decisión para Sara** (una sola pregunta cerrada, con este dato delante):
  - A) Paciente hasta la hora de inicio en todos los canales (se mantiene el recordatorio
    tal cual; el portal pierde su regla de 24 h).
  - B) Paciente hasta 24 h antes en todos los canales; entonces el recordatorio DEBE pasar a
    enviarse con más de 24 h de margen (p. ej., 48 h antes, como pedía el encargo original:
    «próximas 24-48 horas»), o su enlace de cancelar no sirve.
- Recomendación: **A**, porque B obliga a rediseñar la ventana de recordatorios y la
  motivación de ambas features es la misma (liberar huecos antes de que se pierdan).

---

### S2. Origen de la cancelación: dos columnas incompatibles sobre `cita` — CRÍTICA

**Specs**: portal, recordatorios, 001.

**Citas**

- `portal:specs/001-agenda-core/spec.md` (Enmienda 1), FR-018a:
  > «Toda cancelación DEBE registrar quién la hizo (recepción, o el paciente desde el portal
  > de la spec 002) y en qué momento.»
- `portal:specs/002-portal-paciente/data-model.md`:
  > «`cancelada_por` | enum `origen_cancelacion` | `recepcion` \| `paciente`; nulo salvo si
  > `estado = 'cancelada'`»
  > «`CHECK ((estado = 'cancelada') = (cancelada_por IS NOT NULL))`.»
  > «Migración: las citas ya canceladas pasan a `cancelada_por = 'recepcion'`.»
- `recordatorio:specs/002-recordatorios-cita/spec.md`, FR-013:
  > «Una cancelación desde el correo DEBE quedar registrada como hecha por el paciente desde
  > el recordatorio, con su momento, para distinguirla de las cancelaciones de recepción.»
- `recordatorio:specs/002-recordatorios-cita/data-model.md`:
  > «`cancelada_desde_recordatorio` | boolean | `NOT NULL DEFAULT false`»
  > «Las cancelaciones de recepción y de la semilla siguen igual (`false`): el código de la
  > 001 no cambia.»
  > ```sql
  > UPDATE cita
  >    SET estado = 'cancelada', estado_cambiado_en = $ahora, cancelada_desde_recordatorio = true
  >  WHERE id = $citaId AND estado = 'reservada' AND inicio > $ahora
  > ```
- `portal:specs/002-portal-paciente/spec.md`, FR-015a y data-model (huecos liberados):
  > «Citas `c` con `cancelada_por = 'paciente'` y `c.inicio > ahora` para las que **no
  > existe** otra cita…»

**Por qué chocan**

- *En código / producción (fallo seguro)*: con las dos migraciones aplicadas, el `UPDATE`
  de recordatorios pone `estado = 'cancelada'` sin rellenar `cancelada_por`, y viola el
  `CHECK` del portal. **Toda cancelación desde un correo fallaría en producción** con error de
  restricción. Los tests de la rama `recordatorio` no lo detectan porque esa rama no tiene la
  migración del portal.
- *Modelo*: el mismo hecho («quién canceló») se guarda en dos columnas con vocabularios que
  no se cubren: el enum no tiene valor para «paciente desde recordatorio» y el booleano no
  distingue portal de recepción.
- *Producto*: el aviso «Huecos liberados por pacientes» (portal FR-015a) filtra por
  `cancelada_por = 'paciente'`, así que **los huecos liberados desde el correo no aparecen**,
  aunque recordatorios promete que recepción «puede ofrecerlo a otro paciente» (US2). Tampoco
  se mostrarían como «Cancelada por el paciente» (portal US3), con lo que Sonia volvería a
  llamar para confirmar: justo lo que el portal quiere evitar.
- *Afirmación incompatible*: recordatorios dice «el código de la 001 no cambia»; el portal sí
  cambia la cancelación de recepción (debe escribir `cancelada_por = 'recepcion'`).

**Propuesta**

- **Propietario: 001**, mediante una única enmienda (ver S3) que defina:
  `cita.cancelada_por` enum `origen_cancelacion` = `recepcion` | `paciente_portal` |
  `paciente_recordatorio`, con el `CHECK` del portal y `estado_cambiado_en` como momento.
- Recordatorios abandona `cancelada_desde_recordatorio` y escribe
  `cancelada_por = 'paciente_recordatorio'`.
- El portal define «Cancelada por el paciente» y «Huecos liberados» sobre
  `cancelada_por IN ('paciente_portal','paciente_recordatorio')` (el portal sigue siendo el
  dueño de esa presentación, como ya dice FR-018a de su enmienda).

---

### S3. Numeración «002» duplicada y dos enmiendas distintas a la 001 — CRÍTICA

**Specs**: portal, recordatorios, 001, `specs/MAPA.md`.

**Citas**

- `portal:specs/MAPA.md`:
  > «| [002-portal-paciente](002-portal-paciente/spec.md) | Portal del paciente | MarceloMansilla | Sí (solo cancelar) | Aprobada |»
- `recordatorio:specs/MAPA.md`:
  > «| [002-recordatorios-cita](002-recordatorios-cita/spec.md) | Recordatorios de cita por correo | MarceloMansilla | Sí (cancelación desde el correo) | Aprobada |»
- `portal:specs/001-agenda-core/spec.md`:
  > «**FR-018a** *(Enmienda 1)*: Toda cancelación DEBE registrar quién la hizo (recepción, o el
  > paciente desde el portal de la spec 002)…»
- `recordatorio:specs/001-agenda-core/spec.md`:
  > «**FR-018a** *(enmienda 2026-11-07, spec 002)*: Además de recepción, el propio paciente
  > puede cancelar una cita reservada desde el enlace de su recordatorio… El detalle de ese
  > flujo pertenece a la spec 002.»
- Alcance de la 001 en cada rama:
  - `portal`: «Fuera de alcance de la 001: el acceso del paciente (lo cubre la spec 002,
    Enmienda 1), recordatorios, analítica…»
  - `recordatorio`: «Fuera de alcance: cualquier acceso del paciente, recordatorios… (Recordatorios
    y la cancelación por el paciente desde el recordatorio se especifican en la spec 002; ver
    FR-018a.)»

**Por qué chocan**

- *En spec*: «spec 002» designa dos specs distintas según la rama, y la 001 tendría dos
  FR-018a con contenido diferente. Tras el merge, cualquier referencia «FR-018a de la 001» o
  «spec 002» es ambigua.
- *En la 001 fusionada*: la versión de recordatorios mantiene «Fuera de alcance: cualquier
  acceso del paciente» mientras la del portal lo incorpora: la 001 se contradiría a sí misma.
- *En merge*: conflicto textual seguro en `specs/001-agenda-core/spec.md`, `specs/MAPA.md`
  (las tres ramas añaden una fila en la misma línea) y `.specify/feature.json`.
- La 003 no existe: la numeración salta de 002 a 004.

**Propuesta**

- **Propietario: 001** (y MAPA). Renumerar recordatorios como **003-recordatorios-cita**
  (carpeta, MAPA y referencias internas) antes de integrar.
- La 001 recibe **una enmienda por spec solicitante**, numeradas y con FR propios:
  Enmienda 1 (portal) → FR-018a «origen de la cancelación» (con el enum de S2) y teléfono de
  la clínica; Enmienda 2 (003) → FR-018b «cancelación del paciente desde el recordatorio»,
  remitiendo a la tabla de plazos de S1. La sección «Fuera de alcance» se redacta una sola
  vez, ya con ambas.
- MAPA: integrar las tres filas en el tronco en orden 002, 003, 004.

---

### S4. Identidad y acceso del paciente: dos credenciales con reglas distintas — ALTA

**Specs**: portal, recordatorios, 001.

**Citas**

- `001-agenda-core:specs/001-agenda-core/spec.md`, Key Entities:
  > «**Paciente (ficha)**: … pertenece a una clínica. No tiene acceso al sistema.»
- `portal:specs/002-portal-paciente/spec.md`, FR-002 y FR-003:
  > «El acceso DEBE hacerse en dos pasos: (1) el paciente abre su enlace personal, único por
  > ficha e imposible de deducir a partir de otro; (2) confirma las 4 últimas cifras del
  > teléfono de su ficha. Solo con ambos se muestran sus citas.»
  > «Sin haber completado el acceso, el sistema NO DEBE mostrar ningún dato de citas ni de
  > pacientes, ni siquiera el nombre.»
- `portal:specs/002-portal-paciente/spec.md`, FR-005: límite de 5 fallos / 15 min y bloqueo
  tras 10.
- `portal:specs/002-portal-paciente/data-model.md`:
  > «token | texto | 43 caracteres base64url (32 bytes aleatorios); **único**; en claro»
- `recordatorio:specs/002-recordatorios-cita/spec.md`, FR-011 y US2 #1:
  > «Cada recordatorio DEBE contener un enlace personal, no adivinable y exclusivo de esa
  > cita. El enlace solo permite ver los datos de esa cita y cancelarla»
  > «**When** abre el enlace de cancelación, **Then** ve los datos de su cita y un botón
  > «Cancelar mi cita»»
- `recordatorio:specs/002-recordatorios-cita/spec.md`, Assumptions:
  > «La página de cancelación es la única pantalla para pacientes en esta spec; no hay acceso
  > del paciente ni cuentas.»
- `recordatorio:specs/002-recordatorios-cita/data-model.md`:
  > «token_hash | texto | SHA-256 (hex) del token del enlace»

**Por qué chocan**

- *En spec*: hay dos definiciones de «acceso del paciente». Recordatorios afirma que no hay
  acceso del paciente, pero su página pública muestra clínica, profesional, servicio, día y
  hora de una cita **sin segundo factor**, que es exactamente lo que el portal prohíbe sin las
  4 cifras (FR-003). Un correo reenviado o un analizador de enlaces ve datos que el portal
  protege.
- *Seguridad*: dos políticas opuestas para el mismo tipo de secreto (token en claro en el
  portal, hash SHA-256 en recordatorios); límite de intentos en uno y no en el otro; enlace que
  no caduca en ambos, pero el de recordatorios sigue mostrando datos indefinidamente
  («El enlace deja de permitir cancelar cuando vence el plazo», no de mostrar).
- *Código*: dos rutas públicas (`/p/[token]` y `/cancelar/[token]`), dos tablas de
  credenciales y dos verificaciones distintas.

**Propuesta**

- **Propietario: portal** («Acceso de paciente»). El portal define dos tipos de credencial:
  (a) enlace personal + 4 cifras (acceso completo, ya especificado) y (b) **enlace de cita**
  de alcance reducido para recordatorios: una sola cita, solo cancelar, con la lista exacta
  de datos que puede mostrar sin segundo factor, caducidad (p. ej., al pasar la hora de
  inicio) y almacenamiento (decidir hash o en claro una vez, para ambos).
- Recordatorios deja de definir la credencial y se limita a pedir «un enlace de cita (tipo b
  del portal)» por recordatorio. Su SC-002 (2 pulsaciones) se mantiene si (b) no pide las 4
  cifras; si Sara prefiere pedirlas, se decide aquí, una vez.
- La 001 corrige su Key Entity para remitir al portal como único dueño del acceso del
  paciente.

---

### S5. «Tasa de no asistencia»: un nombre, tres definiciones — ALTA

**Specs**: 001, analítica, recordatorios.

**Citas**

- `001-agenda-core:specs/001-agenda-core/spec.md`, FR-023 y SC-005:
  > «con citas en estados finales (en torno al 10 % no asistidas y al 8 % canceladas, ±1
  > punto, el resto completadas)»
  > «sus porcentajes de no asistencia y cancelación quedan en 10 % ± 1 y 8 % ± 1.»
- `001-agenda-core:docs/datos-demo.md`:
  > «1425 citas: 1168 completadas, 114 canceladas (8,0 %), 143 no asistidas (10,0 %)»
- `analitica:specs/004-panel-analitica/spec.md`, FR-006 y US1 #5:
  > «calculada como **no asistidas ÷ (completadas + no asistidas)**: … Las canceladas y las
  > que siguen reservadas no entran ni en el numerador ni en el denominador.»
  > «clínica **10,9 %** (143 de 1.311)»
- `recordatorio:specs/002-recordatorios-cita/spec.md`, SC-005:
  > «En el piloto, la tasa de no asistencia de las citas con recordatorio baja al menos un
  > 30 % respecto a las 8 semanas anteriores a la puesta en marcha (medido con los estados
  > registrados por recepción).»

**Por qué chocan**

- *Mismos datos, dos cifras*: sobre la semilla, la 001 llama «no asistencia» a 143 ÷ 1.425 =
  **10,0 %**; la analítica, a 143 ÷ 1.311 = **10,9 %**. En la reunión de renovación, la cifra
  del panel no coincide con la de la documentación de la semilla.
- *Recordatorios no define la suya*: SC-005 no dice qué fórmula usa ni cómo se identifica
  «citas con recordatorio». La analítica no puede medirlo: su periodo y sus agregados no
  distinguen citas con/sin recordatorio, y es la única feature con indicadores.
- *Efecto del propio recordatorio sobre la fórmula*: cada no-show que el recordatorio
  convierte en cancelación sale del denominador en la fórmula de la analítica pero no en la
  de la 001. El objetivo del 30 % (de 10,0 % a 7,0 %, o de 10,9 % a 7,6 %) puede cumplirse
  con una fórmula y no con la otra.

**Propuesta**

- **Propietario: analítica** (FR-006) para la fórmula de «tasa de no asistencia».
- La 001 sustituye en FR-023/SC-005 «no asistencia» por «proporción de no asistidas sobre el
  total de citas de la historia», que es lo que realmente fija la semilla (o adopta la
  fórmula de la analítica y recalibra la semilla, lo que cambiaría `docs/datos-demo.md` y
  las cifras de referencia de la 004).
- Recordatorios reescribe SC-005 citando «tasa de no asistencia (004, FR-006)» y define la
  población «citas con recordatorio enviado (`recordatorio.estado = 'enviado'`)». Si se quiere
  verlo en el panel, es una petición nueva a la analítica, no algo que recordatorios
  calcule por su cuenta.

---

### S6. «Ocupación»: la analítica cuenta como ocupado lo que la 001 declara libre — ALTA

**Specs**: 001, analítica (y recordatorios por su efecto).

**Citas**

- `001-agenda-core:specs/001-agenda-core/spec.md`, FR-006 y FR-011:
  > «Un tramo está ocupado si lo cubre una cita reservada o completada; las citas canceladas
  > y no asistidas se muestran pero no ocupan el hueco.»
  > «…se solape con el de otra cita reservada o completada del mismo profesional.»
- `analitica:specs/004-panel-analitica/spec.md`, FR-008:
  > «**Minutos ocupados = duración de las citas completadas, no asistidas y reservadas** …
  > Es decir, todo hueco que estuvo bloqueado en la agenda hasta su hora; las canceladas no
  > ocupan porque liberaron el hueco (spec 001, FR-006).»

**Por qué chocan**

- *En spec*: la analítica justifica su fórmula citando FR-006 de la 001, pero FR-006 dice lo
  contrario para las no asistidas: no ocupan. «Ocupado» significa dos cosas según la spec.
- *En cifras*: con la fórmula de la 001 (sin no asistidas), la ocupación de la semilla sería
  María 63,9 % (16.875 ÷ 26.400), Jorge 62,0 %, Lucía 61,8 %, clínica 62,6 % (49.560 ÷ 79.200),
  frente al 71,6 % / 71,2 % / 68,4 % / 70,4 % que fija la 004. Ocho puntos de diferencia en
  el indicador que se enseña en la renovación.
- *Efecto perverso con recordatorios*: un no-show que el recordatorio convierte en
  cancelación **baja** la ocupación de la 004 (deja de contar), salvo que recepción vuelva a
  llenar el hueco. La feature que reduce no-shows empeora la cifra del panel.
- Nota: la elección de la 004 viene de una clarificación con Sara (opción A); no se
  cuestiona la decisión, sino que use la palabra y la referencia de la 001 con otro sentido.

**Propuesta**

- **Propietario de la semántica «ocupa el hueco»: 001** (disponibilidad para reservar).
- **Propietario de la fórmula del indicador: analítica**, que debe (a) quitar la cita a
  FR-006 como justificación, (b) nombrar el indicador de forma que no se confunda con el
  hueco de la agenda (p. ej., «tiempo reservado») o pasar a «ocupación efectiva»
  (completadas + reservadas pasadas), y (c) confirmar con Sara cuál enseñar, sabiendo el
  efecto con recordatorios. Recomendación: mostrar la ocupación efectiva, alineada con la
  001; la pérdida por no-shows ya se ve en su propio bloque.

---

### S7. La transición `reservada → cancelada` implementada tres veces — ALTA

**Specs**: 001, portal, recordatorios.

**Citas**

- `001-agenda-core:specs/001-agenda-core/spec.md`, FR-017 y FR-020:
  > «Los únicos cambios de estado permitidos son desde "reservada" a "completada",
  > "cancelada" o "no asistida".»
  > «Si el estado de una cita cambió desde que se mostró, el sistema DEBE rechazar la acción y
  > mostrar el estado actual.»
- `portal:specs/002-portal-paciente/spec.md`, FR-014:
  > «La cancelación desde el portal DEBE producir el mismo cambio de estado que la de
  > recepción … y respetar FR-017 y FR-020 de la 001»
- `recordatorio:specs/002-recordatorios-cita/spec.md`, FR-015:
  > «Si el estado de la cita cambió desde que se mostró la página, la cancelación DEBE
  > rechazarse mostrando el estado actual. Cancelaciones simultáneas de la misma cita:
  > exactamente una prospera.»
- `recordatorio:specs/002-recordatorios-cita/contracts/cancelacion-paciente.md`:
  > «`CANCELACION_TARDIA` y `ESTADO_CAMBIADO` reutilizan los códigos de la 001 con mensajes
  > propios para el paciente.»

**Por qué chocan**

- *En código*: las tres specs escriben el mismo estado sobre la misma tabla con la misma
  garantía de concurrencia, pero cada plan la implementa por su lado (recordatorios con su
  propio `UPDATE … WHERE estado = 'reservada' AND inicio > $ahora`). Tres sitios que tienen que
  coincidir en plazo (S1), origen (S2) y comprobación de concurrencia; basta que uno diverja
  para romper FR-020.
- *Pruebas de concurrencia cruzadas*: el portal prueba «paciente + recepción»;
  recordatorios prueba «correo + recepción»; nadie prueba «portal + correo» sobre la misma
  cita.

**Propuesta**

- **Propietario: 001.** Una única operación de dominio
  `cancelarCita(citaId, origen, ahora)` en la 001 que aplica plazo según el canal (S1),
  escribe `cancelada_por` (S2) y garantiza FR-020. Portal y recordatorios solo la invocan y
  traducen los códigos a sus textos (S10).
- Añadir a la batería de la 001 la prueba de concurrencia de los tres orígenes a la vez.

---

### S8. Ficheros, migraciones y pantallas compartidos — ALTA (integración)

**Specs/ramas**: todas.

**Evidencia**

- `src/proxy.ts`: lo cambian las tres ramas.
  - `analitica` (ya implementado): añade `'/analitica', '/analitica/:path*'` al `matcher`.
  - `portal:specs/002-portal-paciente/plan.md`: «`proxy.ts` ～ renovación deslizante en /p/*».
  - `recordatorio:specs/002-recordatorios-cita/plan.md`: «`/cancelar/*` fuera de la protección
    de `proxy.ts`».
- Esquema y migraciones: portal y recordatorios añaden migración a `cita`
  (S2) y tablas nuevas; ambos planes dicen generarla «tras rebasar». Recordatorios, en
  `data-model.md`: «generada tras rebasar sobre `main`», rama que no existe.
- Panel de recepción: la analítica cambia `src/components/cabecera.tsx` y
  `src/app/agenda/layout.tsx` (navegación «Analítica»); el portal añade a la misma agenda el
  aviso de huecos liberados y las acciones «Copiar enlace del portal» / «Generar nuevo
  enlace» (portal, Dependencias).
- Semilla: el portal la amplía (`clinica.telefono`, un `acceso_paciente` por paciente,
  `cancelada_por = 'recepcion'` en la historia); la analítica exige que no cambie
  («esta spec depende de que esa semilla no cambie (o de actualizar sus cifras)»).
- Base desfasada: `recordatorio` parte de `454b0f8`, anterior a la implementación de la 001;
  su plan describe un código de la 001 que no ha visto.

**Por qué chocan**: conflictos de merge seguros en `proxy.ts`, el diario de migraciones
(`meta/_journal.json`) y la cabecera del panel; riesgo de que la ampliación de la semilla del
portal altere identificadores o cifras que la analítica fija al céntimo (Principio V).

**Propuesta**

- **Propietario del código base: 001.** Orden de integración recomendado sobre el tronco:
  1. Enmiendas 1 y 2 de la 001 (S2, S3, S9) y operación `cancelarCita` (S7).
  2. Portal (migración del enum + acceso del paciente), regenerando migración sobre el tronco.
  3. Recordatorios renumerado a 003, **rebasado sobre el tronco con el portal**, migración
     regenerada y usando el enum y la credencial del portal.
  4. Analítica (solo lectura): re-ejecutar sus tablas de referencia con la semilla ya
     ampliada; los identificadores y cifras deben salir idénticos (el portal genera los
     accesos «después» de las citas, así que debería ser así: verificarlo, no suponerlo).
- `proxy.ts`: una sola tabla de rutas (panel protegidas / públicas de paciente) en la 001, a
  la que cada feature añade su línea.

---

### S9. Teléfono de la clínica — MEDIA

**Citas**

- `portal:specs/001-agenda-core/spec.md` (Enmienda 1), FR-022:
  > «"Clínica Eleva", con teléfono de contacto "911 234 567" *(Enmienda 1)*»
- `recordatorio:specs/002-recordatorios-cita/spec.md`, Assumptions:
  > «La 001 no guarda teléfono ni dirección de la clínica, así que el correo y la página de
  > cancelación dicen "llame a la clínica" sin número; añadir esos datos sería un cambio de la
  > 001.»

**Por qué chocan**: tras el merge el teléfono existe, pero recordatorios queda especificado
sin él. Fuera de plazo, el portal dice «Llama a Clínica Eleva al 911 234 567» y el correo
«Por favor, llame a Clínica Eleva.» sin número.

**Propuesta**: **propietario 001** (Enmienda 1). Recordatorios elimina la suposición y
muestra el teléfono en correo y página de cancelación.

---

### S10. Voz y mensajes al paciente — MEDIA

**Citas**

- `portal:specs/002-portal-paciente/spec.md`, FR-018: «Se trata al paciente de "tú".»
- `recordatorio:specs/002-recordatorios-cita/spec.md`, FR-008: «El correo DEBE estar en
  español de España, con trato de usted»
- Mismo caso, textos distintos:
  - Fuera de plazo — portal: «Ya no se puede cancelar desde aquí. Llama a Clínica Eleva al
    911 234 567.» · recordatorios: «Ya no es posible cancelar esta cita desde aquí. Por
    favor, llame a Clínica Eleva.»
  - Enlace no válido — portal: «Este enlace ya no es válido. Pide uno nuevo a Clínica Eleva
    en el 911 234 567.» · recordatorios: «Este enlace no es válido.»
  - Confirmación — portal: «Tu cita del lunes, 16/11/2026 a las 10:00 está cancelada.» ·
    recordatorios: «Su cita del lunes, 16/11/2026 a las 10:00 ha quedado cancelada. Gracias
    por avisar.»
- `recordatorio:…/contracts/cancelacion-paciente.md`: `FINALIZADA` para «cita `completada` o
  `no_asistida`» → «Esta cita ya ha tenido lugar.», mientras la 001 (FR-019) define «No
  asistida» como que «el paciente no se presentó».

**Por qué chocan**: el mismo paciente recibe «usted» en el correo y «tú» en el portal para la
misma cita; un no-show se le comunica como cita que «ha tenido lugar». Es un problema de
producción (Principio VII/VIII), no de código.

**Propuesta**: **propietario: portal** como dueño de la comunicación con el paciente (o la
constitución, si se prefiere regla global). Fijar un trato único y un catálogo de mensajes al
paciente que recordatorios reutilice; para `no_asistida`, usar la etiqueta del portal («No
asistida»).

**Decisión (2026-11-08)**: trato de **usted** con el paciente en todos los canales (portal,
correos y canales futuros). La 005 ya lo aplica en sus textos y en `enunciadoPoliticaCancelacion`
(005, FR-016). Pendiente: la 002 cambia FR-018 a «usted» y la 003 retira la nota de trato en su
spec y en `contracts/correo-recordatorio.md`.

---

### S11. Correo del paciente en la semilla — MEDIA

**Citas**

- `001-agenda-core:specs/001-agenda-core/spec.md`, FR-022:
  > «40 pacientes con nombres, teléfonos (todos distintos) y correos españoles ficticios.»
- `001-agenda-core:src/semilla/generar.ts`: `const conCorreo = azar.probabilidad(0.75);`
- `recordatorio:specs/002-recordatorios-cita/spec.md`, Demo data:
  > «40 pacientes, de los que aproximadamente 3 de cada 4 tienen correo»

**Por qué chocan**: recordatorios se apoya en un dato (75 % con correo) que la spec de la 001
no dice; la spec sugiere que todos lo tienen. Si alguien «corrige» la semilla para cumplir la
spec, cambian los recuentos «sin correo» de recordatorios. Es una desviación spec ↔ código de
la 001 (Principio I) que otra feature ya consume.

**Propuesta**: **propietario 001**: precisar en FR-022 cuántos pacientes tienen correo (cifra
exacta, documentada en `docs/datos-demo.md`). Recordatorios cita esa cifra en lugar de
«aproximadamente».

---

### S12. Separador de miles atribuido a la 001 — BAJA

**Citas**

- `analitica:specs/004-panel-analitica/spec.md`, Clarifications:
  > «Siempre "." a partir de 1.000 ("5.540,00 €", "1.311"), igual que el formato de importes
  > de la agenda (spec 001).»
- `001-agenda-core:specs/001-agenda-core/spec.md`, Amounts and dates: solo fija «Importes en
  euros con céntimos, formato español: "40,00 €"…»; no hay ningún importe ≥ 1.000 ni regla de
  miles. `docs/datos-demo.md` escribe «1705», «1425», «1168» sin separador.

**Por qué choca**: la 004 atribuye a la 001 una regla que la 001 no tiene, y la implementa en
el `src/lib/formato.ts` compartido (`formatearEntero`). La documentación de la 001 ya usa
otro criterio para recuentos.

**Propuesta**: **propietario 001** (formato común). Incorporar la regla de miles a «Amounts
and dates» de la 001 y alinear `docs/datos-demo.md`; la 004 la cita en vez de definirla.

---

## 4. Decisiones que necesitan a Sara

1. **S1**: plazo único de cancelación del paciente (A: hasta el inicio, recomendado; B: 24 h y
   recordatorios con más de 24 h de antelación).
2. **S4**: si el enlace de cita del recordatorio pide o no las 4 cifras.
3. **S5/S6**: qué «no asistencia» y qué «ocupación» se enseñan en la renovación, sabiendo el
   efecto de los recordatorios sobre ambas.
4. **S10**: tú o usted con el paciente. **Decidido (2026-11-08): usted.**

Todo lo demás es de propietario técnico y se resuelve con las enmiendas a la 001 y el orden
de integración de S8.

## 5. Cómo se ha obtenido

```bash
git branch --show-current             # 001-agenda-core (no existe main)
git worktree list
git branch --format='%(refname:short)'
git ls-tree -r --name-only <rama> specs/ | grep spec.md
git show 001-agenda-core:specs/001-agenda-core/spec.md
git show portal:specs/002-portal-paciente/spec.md
git show recordatorio:specs/002-recordatorios-cita/spec.md
git show analitica:specs/004-panel-analitica/spec.md
git diff 001-agenda-core <rama> -- specs/001-agenda-core/spec.md   # enmiendas a la 001
git show <rama>:specs/MAPA.md
git show portal:specs/002-portal-paciente/data-model.md
git show recordatorio:specs/002-recordatorios-cita/data-model.md
git show recordatorio:specs/002-recordatorios-cita/contracts/cancelacion-paciente.md
git diff 001-agenda-core analitica -- src/proxy.ts src/lib/formato.ts …
```

Ninguna spec se ha modificado y no se ha cambiado de rama ni entrado en ningún worktree.
