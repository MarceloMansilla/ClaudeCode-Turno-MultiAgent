# Feature Specification: Recordatorios de cita por correo electrónico

**Feature Branch**: `recordatorio`

**Created**: 2026-11-07

**Status**: Aprobada (2026-11-08, MarceloMansilla): alineada con la 005 como única fuente de
verdad del acceso y la cancelación del paciente (Principio I); P1 resuelta. Historial: aprobada como 002 (2026-11-07, MarceloMansilla); renumerada a 003 y
adaptada a la revisión cruzada S2–S5 (2026-11-07).

**Input**: User description: "Recordatorios de cita. El dolor número uno del cliente piloto: la no asistencia. Alcance: un proceso diario genera un recordatorio por email para cada cita reservada de las próximas 24-48 horas, sin duplicar envíos; el email incluye los datos de la cita y una forma de que el paciente cancele si no va a ir (mejor un hueco libre que un no-show). Correo en modo simulado sin SMTP configurado: se escriben ficheros .eml en datos/salida-correo/. Preguntas cerradas para Sara: antelación exacta, qué pasa si el paciente cancela desde el email y con cuánta antelación puede, y si el recordatorio se reenvía cuando la cita se mueve. Fuera de alcance v1: SMS y WhatsApp."

## Clarifications

### Session 2026-11-07

- Q: ¿Con cuánta antelación exacta se envía el recordatorio? → A: La víspera: la ejecución diaria de las 08:00 (hora local de la clínica) recuerda todas las citas reservadas del día natural siguiente.
- Q: ¿Qué pasa si el paciente cancela desde el correo y con cuánta antelación puede? → A: *(Retirada en la revisión cruzada S4, 2026-11-07.)* El acceso del paciente y su cancelación los define la 005 (FR-001–FR-018) y los presenta el portal (002); esta spec ya no tiene flujo de cancelación propio ni fija plazo. *(2026-11-08: S1 resuelto; el plazo del paciente es el de 005 FR-009 y esta spec no lo repite.)*
- Q: ¿Se reenvía el recordatorio cuando la cita se mueve? → A: No hay nada adicional en v1: mover es cancelar y crear otra cita (001), y la nueva recibe su propio recordatorio según FR-002; el enlace del correo antiguo muestra que la cita está cancelada. Sin aviso de anulación al paciente. *(S4: el enlace es ahora el enlace personal de la 005; lo que muestra el portal al abrirlo lo define la 002.)*

### Session 2026-11-08

- Q (P1): Con el envío a las 08:00 de la víspera (FR-002) y el plazo de 005 FR-009, al paciente le quedan desde que sale el correo entre 1 h (cita a las 09:00) y 11 h (cita a las 19:00) para cancelar desde el enlace. ¿Se adelanta el envío para dar más margen? → A: **No; se mantiene la víspera.** El correo sirve ante todo para recordar la cita; quien lo lee dentro del plazo puede cancelar desde su enlace y quien lo lee después ve en el propio enunciado (005 FR-016) que debe llamar a la clínica. Adelantar el envío a dos días haría el recordatorio menos eficaz contra el olvido, que es el dolor principal. El plazo no se toca: es de la 005 (005 FR-018). Si el piloto muestra que el margen es insuficiente, se revisará FR-002 (hora o ventana de envío), nunca el plazo.

## Preguntas abiertas

Ninguna. P1 quedó resuelta el 2026-11-08 (ver Clarifications).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El paciente recibe un recordatorio de su cita (Priority: P1)

Cada día, sin que nadie de recepción tenga que hacer nada, CitaClara envía un correo de
recordatorio a cada paciente con una cita reservada dentro de la ventana de antelación. El
correo contiene los datos de la cita (clínica, profesional, servicio, día y hora), el enlace
personal del paciente y el enunciado de la política de cancelación, y nunca llega dos veces
para la misma cita.

**Why this priority**: es el remedio directo al principal dolor del cliente piloto, la no
asistencia. Por sí solo ya reduce olvidos; además lleva al paciente a su portal, donde puede
cancelar con las reglas de la 005.

**Independent Test**: con la semilla cargada y sin servidor de correo configurado, ejecutar
el proceso diario en una fecha concreta y comprobar que en la carpeta de salida aparece
exactamente un correo por cada cita reservada de la ventana cuyo paciente tiene correo, con
los datos correctos; ejecutarlo de nuevo y comprobar que no aparece ninguno más.

**Acceptance Scenarios**:

1. **Given** Ana tiene una cita reservada con María, «Sesión de fisioterapia», el lunes
   16/11/2026 de 10:00 a 10:45, y su ficha tiene correo, **When** se ejecuta el proceso
   diario cuya ventana incluye esa cita, **Then** se genera un único correo para Ana con
   asunto «Recordatorio de su cita en Clínica Eleva: lunes, 16/11/2026, 10:00» y cuerpo con
   profesional (María), servicio (Sesión de fisioterapia), día («lunes, 16/11/2026») y hora
   («10:00–10:45»).
2. **Given** el proceso ya generó el recordatorio de esa cita, **When** se vuelve a ejecutar
   (el mismo día o al día siguiente, de forma programada o manual), **Then** no se genera
   ningún correo nuevo para esa cita.
3. **Given** dos ejecuciones del proceso arrancan a la vez, **When** ambas terminan,
   **Then** cada cita de la ventana tiene exactamente un recordatorio.
4. **Given** una cita de la ventana está cancelada, completada o no asistida, **When** se
   ejecuta el proceso, **Then** no se genera recordatorio para ella.
5. **Given** el paciente de una cita reservada de la ventana no tiene correo en su ficha,
   **When** se ejecuta el proceso, **Then** no se genera correo y la cita figura en el
   resumen de la ejecución como «sin correo».
6. **Given** no hay servidor de correo configurado (modo simulado), **When** se genera un
   recordatorio, **Then** se guarda como fichero de correo `.eml` en
   `datos/salida-correo/`, legible con cualquier cliente de correo, y no se envía nada.
7. **Given** hay servidor de correo configurado y el envío de un recordatorio falla,
   **When** termina la ejecución, **Then** ese recordatorio no cuenta como enviado, figura
   en el resumen como «fallido» y la siguiente ejecución lo reintenta si la cita sigue
   reservada y dentro de la ventana.
8. **Given** el recordatorio de la cita de Ana del escenario 1, **When** se lee el correo,
   **Then** contiene el enlace personal vigente de Ana (`/p/[token]`, 005 FR-001 y FR-008),
   ningún otro enlace a CitaClara, y el enunciado de la política de cancelación de esa cita
   derivado de 005 FR-016, con el límite que fija 005 FR-009 para el lunes 16/11/2026 a las
   10:00 (FR-020).

---

### User Story 2 - El paciente cancela desde el recordatorio — *Retirada (revisión cruzada S4, 2026-11-07)*

Esta spec ya no tiene página ni flujo de cancelación propios. El paciente cancela desde su
portal (002), al que llega con el enlace personal del correo y las 4 últimas cifras de su
teléfono (005 FR-006), con las reglas de acceso y cancelación de la 005 (FR-001–FR-018). Lo
que queda en esta spec es lo que lleva el correo: el enlace personal (FR-019) y el enunciado
de la política (FR-020).

---

### Edge Cases

- **Cita reservada después de la ejecución del día**: una cita para mañana reservada hoy
  después de las 08:00 (o una cita para hoy) no recibe recordatorio, porque ninguna
  ejecución futura la cubre. Se acepta en v1 (quien acaba de reservar recuerda su cita).
  Ejemplo: reservada el lunes 16/11/2026 a las 11:00 para el martes 17/11/2026 a las 09:00
  → sin recordatorio.
- **Ejecución que no llega a producirse** (servidor apagado): la siguiente ejecución solo
  trata su propia ventana; las citas de la ventana perdida no reciben recordatorio. Se
  acepta en v1; el resumen de cada ejecución deja constancia de qué ventana cubrió.
- **Ejecución en fin de semana o festivo**: el proceso se ejecuta todos los días naturales,
  porque las citas del lunes se recuerdan en la ejecución del domingo a las 08:00.
- **Cita cancelada y vuelta a crear a otra hora** (en la 001 una cita no se mueve; se cancela
  y se crea otra): la nueva cita es otra cita y recibe su propio recordatorio si cae en una
  ventana (FR-017). El correo antiguo lleva el enlace personal del paciente; lo que muestra el
  portal de la cita cancelada lo define la 002. Si la nueva cita es para mañana y se crea
  después de las 08:00, no recibe recordatorio (misma regla que cualquier reserva tardía).
- **Cita cancelada entre la generación del recordatorio y la lectura del correo**: el enlace
  personal abre el portal, que muestra el estado actual de la cita (002); esta spec no añade
  nada.
- **Varias citas del mismo paciente en la ventana**: un recordatorio por cita; todos llevan
  el mismo enlace personal (005 FR-001) y cada uno el enunciado con el límite de su propia
  cita (FR-020).
- **Enlace personal regenerado después del envío**: el correo ya enviado lleva el enlace
  anterior, que deja de valer (005 FR-004, FR-007). El recordatorio no se reenvía.
- **Correo leído cuando ya venció el plazo** (p. ej., cita a las 09:00 y correo leído a
  media mañana de la víspera): el correo es el mismo para todos; el enunciado ya indica el
  límite de esa cita y la alternativa de llamar (005 FR-016), y el portal no ofrece cancelar
  (005 FR-011). Esta spec no cambia el texto según la hora de lectura ni envía nada más.
- **Correo reenviado a otra persona o abierto por un analizador de enlaces**: sin las 4
  cifras no se muestra ningún dato (005 FR-006); el correo no añade otra protección.
- **Correo del paciente con formato inválido**: no se genera recordatorio y figura en el
  resumen como «correo no válido».
- **Cambio de hora (último domingo de marzo/octubre)**: la ejecución y la ventana se fijan en
  hora local de la clínica (08:00; día natural siguiente), y el cambio ocurre de madrugada,
  así que no afecta a qué citas se recuerdan. La hora mostrada en el correo es siempre la
  hora local de la cita. Ejemplo: el domingo 28/03/2027 a las 02:00 se adelanta el reloj;
  la ejecución de ese día sigue siendo a las 08:00 (hora de verano) y recuerda la cita del
  lunes 29/03/2027 a las 10:00 con el texto «10:00».

## Requirements *(mandatory)*

### Functional Requirements

**Proceso diario de recordatorios**

- **FR-001**: El sistema DEBE ejecutar automáticamente, una vez al día y todos los días
  naturales, un proceso que genera recordatorios (lo pone en marcha el planificador de la
  instalación; ver Assumptions). DEBE poder lanzarse también manualmente
  (para demostraciones y pruebas) con el mismo resultado.
- **FR-002**: Cada ejecución DEBE generar un recordatorio por cada cita en estado
  «reservada» cuyo inicio caiga dentro de su ventana de antelación y que aún no tenga
  recordatorio generado. Ventana de antelación: la víspera. La ejecución diaria es a las
  08:00, hora local de la clínica, y su ventana es el día natural siguiente completo (de
  00:00 a 23:59 de mañana, hora local). Una ejecución manual usa la misma ventana: el día
  natural siguiente al de la ejecución. *(Confirmada en P1, 2026-11-08.)*
- **FR-003 (sin duplicados)**: Cada cita DEBE recibir como máximo un recordatorio,
  independientemente de cuántas veces o con qué solapamiento se ejecute el proceso, incluidas
  ejecuciones simultáneas.
- **FR-004**: No se DEBE generar recordatorio para citas canceladas, completadas o no
  asistidas, ni para citas cuyo paciente no tenga correo o lo tenga con formato inválido.
- **FR-005**: Cada ejecución DEBE dejar un resumen consultable con: momento de la ejecución,
  ventana cubierta (desde–hasta, en hora local de la clínica) y, por cita de la ventana, el
  resultado: «enviado», «ya enviado antes», «sin correo», «correo no válido», «fallido» o
  «fallido (interrumpido)» (FR-010).
- **FR-006**: El sistema DEBE registrar cada recordatorio generado (cita, destinatario,
  momento de generación y resultado), de modo que se pueda saber si una cita ya fue
  recordada.

**Contenido del correo**

- **FR-007**: El recordatorio DEBE incluir: nombre de la clínica, nombre del paciente,
  profesional, servicio, día de la semana y fecha («lunes, 16/11/2026»), hora de inicio y fin
  («10:00–10:45») en hora local de la clínica, el enlace personal del paciente (FR-019) y el
  enunciado de la política de cancelación de esa cita (FR-020). No incluye precio.
- **FR-008**: El correo DEBE estar en español de España, con trato de usted, sin jerga
  técnica, y DEBE leerse correctamente en un móvil. Asunto: «Recordatorio de su cita en
  [clínica]: [día], [fecha], [hora de inicio]».

**Modo de envío**

- **FR-009**: Si no hay servidor de correo configurado, el sistema DEBE funcionar en modo
  simulado: cada recordatorio se guarda como un fichero de correo estándar (`.eml`) en la
  carpeta `datos/salida-correo/`, con destinatario, asunto y cuerpo idénticos a los que se
  enviarían, y no se envía nada al exterior. En modo simulado el recordatorio cuenta como
  «enviado» a efectos de FR-003.
- **FR-010**: Si hay servidor de correo configurado, el sistema DEBE enviar el correo. Un
  envío fallido no cuenta como enviado y se reintenta en la siguiente ejecución mientras la
  cita siga reservada y dentro de la ventana. Si un envío se interrumpe a medias (por ejemplo,
  porque el proceso se detiene) y no se puede saber si el correo llegó a salir, ese
  recordatorio **no** se reintenta, para no arriesgar un duplicado (FR-003 prevalece), y figura
  en el resumen de las ejecuciones posteriores como «fallido (interrumpido)».

**Cancelación desde el correo**

- **FR-011 a FR-016**: *Retirados (revisión cruzada S4, 2026-11-07).* Definían un enlace por
  cita, su página y un flujo y plazo de cancelación propios. Los sustituyen la 005 (acceso y
  cancelación del paciente) y la 002 (pantallas), y en esta spec FR-019 a FR-022. Estos
  números no se reutilizan.

**Citas que cambian**

- **FR-017**: El recordatorio pertenece a una cita concreta, no al paciente ni a una hora.
  Como en la 001 una cita no se mueve (se cancela y se crea otra), la cita nueva es una cita
  distinta y recibe su propio recordatorio según FR-002, aunque la cancelada ya tuviera uno.
  No se envía ningún aviso al paciente cuando recepción cancela una cita, haya recibido o no
  recordatorio; el correo antiguo lleva el enlace personal del paciente, y lo que muestra el
  portal de esa cita lo define la 002.
  Ejemplo: cita de Ana del lunes 16/11/2026 a las 10:00, recordada el domingo; el lunes a las
  08:30 recepción la cancela y crea otra para el miércoles 18/11/2026 a las 12:00 → Ana
  recibe el recordatorio de la nueva el martes 17/11/2026 a las 08:00 y ningún correo más.

**Fuera de alcance**

- **FR-018**: En v1 los recordatorios solo se envían por correo electrónico. SMS y WhatsApp
  quedan fuera de alcance.

**Enlace personal y política de cancelación en el correo** *(revisión cruzada S4, 2026-11-07)*

- **FR-019**: Cada recordatorio DEBE llevar el enlace personal vigente del paciente en el
  momento del envío (`/p/[token]`, 005 FR-001 y FR-008), y ningún otro enlace a CitaClara.
  Esta spec no define, genera ni guarda enlaces ni credenciales de paciente; si necesitara
  otro tipo de enlace, lo pediría como enmienda de la 005 (005 FR-008).
- **FR-020**: Cada recordatorio DEBE incluir el enunciado de la política de cancelación del
  paciente para esa cita tal como lo da la 005 («005, FR-016»), con sus tres elementos, sin
  reescribirlo ni adaptarlo. Esta spec no redacta ni calcula ningún plazo: el límite que
  muestra es el que fija 005 FR-009 para esa cita y coincide al minuto con el que se aplica al
  cancelar (005 FR-017). El enunciado ya usa el trato de usted (S10), igual que el correo
  (FR-008).
- **FR-021**: Cancelar se hace en el portal (002) con las reglas de la 005. Esta spec no
  ofrece pantalla ni acción de cancelación y no escribe en la agenda: no cambia el estado de
  ninguna cita ni registra el origen de una cancelación (lo registra la 005 con el campo de
  la 001, FR-018a: `cita.cancelada_por`). El proceso de recordatorios solo lee citas, fichas
  y la clínica.
- **FR-022 (coherencia)**: Ningún texto de esta spec dirigido al paciente (asunto, cuerpo en
  texto y HTML, texto del botón, plantillas y ejemplos de correo, incluidos los `.eml` de
  ejemplo) DEBE mencionar cuándo se puede cancelar fuera del enunciado de FR-020: ni cifras ni
  expresiones propias sobre la antelación (ver los ejemplos prohibidos de 005 FR-017). El resto del
  correo puede invitar a cancelar si no se va a acudir, sin decir hasta cuándo.

### Constitution Requirements *(mandatory)*

- **Owner**: MarceloMansilla (registrado en `specs/MAPA.md`).
- **Writes to the agenda?**: No. El proceso de recordatorios solo lee la agenda (citas
  reservadas de la ventana, fichas y clínica) y escribe únicamente sus propias tablas de
  recordatorios y ejecuciones. La cancelación que el correo facilita la ejecuta la 005 desde
  el portal (002), con el origen `'paciente'` de 001 FR-018a (FR-021).
- **Amounts and dates**:
  - Sin importes: el correo no muestra precio.
  - Fechas y horas con convenciones españolas y en hora local de la clínica: «lunes,
    16/11/2026», «10:00–10:45». Clínica Eleva: Europe/Madrid.
  - Ejemplo: la ejecución del domingo
    15/11/2026 a las 08:00 cubre las citas del lunes 16/11/2026 (de 00:00 a 23:59) y recuerda
    la de Ana de 10:00–10:45; la del martes 17/11/2026 a las 09:00 se recuerda el lunes
    16/11/2026 a las 08:00. La ejecución del viernes cubre las del sábado (ninguna: la clínica
    cierra) y las del lunes las recuerda la ejecución del domingo.
  - El límite de cancelación que aparece en el correo forma parte del enunciado de la 005:
    su formato lo fija 005 FR-016 y su valor 005 FR-009 (ejemplos en 005 FR-010). Esta spec no
    los repite.
  - Cambio de hora: ver Edge Cases (ejemplo del 28–29/03/2027).
- **Demo data**: esta feature no cambia la semilla de la 001 (40 pacientes, de los que
  aproximadamente 3 de cada 4 tienen correo; 2 semanas de citas reservadas futuras). Necesita
  los enlaces personales que la 005 añade a la semilla (005 FR-019). El plan DEBE documentar,
  para la fecha de referencia usada en ejemplos y tests, cuántos recordatorios genera la
  primera ejecución, cuántas citas quedan «sin correo» y cuántos genera la segunda (0). El
  caso «correo no válido» se prueba con fichas creadas por los propios tests.

### Key Entities *(include if feature involves data)*

- **Recordatorio**: aviso por correo de una cita concreta. Cita a la que pertenece (como
  máximo uno por cita), destinatario, momento de generación, modo (simulado o real) y
  resultado (enviado o fallido).
- **Ejecución del proceso de recordatorios**: momento, ventana cubierta y resumen de
  resultados por cita.
- **Enlace personal** *(de la 005)*: se lee el vigente de la ficha al componer el correo; esta
  spec no lo crea, no lo guarda ni lo regenera.
- **Cita** *(de la 001)*: solo se lee (estado, inicio, fin, paciente, profesional,
  servicio). Esta spec no le añade nada.
- **Clínica** *(de la 001)*: se leen su nombre, su zona horaria y su teléfono de contacto
  (este último, para el enunciado de 005 FR-016; ver Dependencias).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sobre los datos de demostración, el 100 % de las citas reservadas de la
  ventana cuyo paciente tiene correo reciben exactamente 1 recordatorio, y 10 ejecuciones
  repetidas más 2 ejecuciones simultáneas generan 0 duplicados.
- **SC-002** *(revisado 2026-11-08 por 005 FR-006)*: Un paciente que nunca ha usado
  CitaClara, con una cita dentro del plazo de la 005, pasa del correo a tener la cita
  cancelada en el portal, en un móvil de 360 px, en menos de 1 minuto y con 4 acciones como
  máximo: (1) pulsar el enlace del correo; (2) introducir las 4 últimas cifras de su teléfono
  (005 FR-006); (3) pedir cancelar la cita; (4) confirmar (005 FR-012). Si la 002 añade
  pantallas intermedias (p. ej., elegir la cita entre varias), sus pulsaciones no cuentan
  contra este objetivo pero sí contra el tiempo. La 003 solo controla la acción 1: el enlace
  es lo más visible del correo y se pulsa sin desplazarse en 360 px.
- **SC-003**: *Retirado (S4).* Que el hueco liberado aparezca libre lo cubre la 005 (US2 #5).
- **SC-004**: *Retirado (S4).* La resistencia a enlaces inventados la cubre la 005 (FR-002,
  FR-007, US1 #2).
- **SC-005** *(S5)*: En el piloto, la tasa de no asistencia (004, FR-006) de las citas con
  recordatorio en estado `'enviado'` baja al menos un 30 % respecto a las 8 semanas
  anteriores a la puesta en marcha. Población: citas cuyo recordatorio quedó «enviado»
  (FR-006). Esta spec no define fórmula propia.
- **SC-006**: El correo se lee sin desplazamiento horizontal desde 360 px de ancho y su
  enlace cumple el contraste mínimo AA.
- **SC-007**: En la revisión de textos previa a la entrega, el límite de cancelación de cada
  correo de prueba coincide al minuto con el que aplica la 005 (005 SC-004): 0
  discrepancias.

## Assumptions

- Destinatario: el correo de la ficha del paciente (opcional en la 001). Los pacientes sin
  correo no reciben recordatorio.
- Una sola clínica por instalación (como en la 001); el remitente muestra el nombre de la
  clínica. El enunciado de 005 FR-016 incluye el teléfono de la clínica, que define la 001
  enmendada (FR-022, S9); esta rama aún no la tiene integrada.
- Esta spec no tiene pantallas para pacientes. El acceso del paciente y su cancelación los
  define la 005; las pantallas, la 002 (portal). El correo solo lleva el enlace personal y el
  enunciado de la política.
- La hora de ejecución diaria es las 08:00, hora local de la clínica (FR-002), antes de la
  apertura de las 09:00; así recepción dispone de toda la jornada para reasignar los huecos
  que liberen los pacientes. Su relación con el plazo de la 005 se decidió en P1
  (Clarifications, 2026-11-08): se mantiene.
- No hay reintentos dentro de la misma ejecución ni seguimiento de lectura o rebotes del
  correo.
- La ejecución automática diaria (FR-001) la pone en marcha el planificador de la
  instalación (el del sistema o el del hosting), que se configura al desplegar, como el resto
  de la instalación. El sistema aporta el comando, las instrucciones para planificarlo y el
  registro de cada ejecución, con el que se comprueba que la ejecución diaria ha tenido lugar.
- Fuera de alcance v1: SMS, WhatsApp, cancelar sin pasar por el portal, reprogramar desde el
  correo, confirmar asistencia, recordatorios múltiples por cita, avisos de anulación o de
  cambio de cita y personalización del texto por la clínica.

## Dependencias

Esta spec no escribe en la agenda ni define el acceso ni el plazo del paciente. Consume lo
siguiente, sin reescribir sus reglas (Principio I):

| Spec | Qué consume la 003 | Dónde lo usa |
|------|--------------------|--------------|
| **001 Núcleo de agenda** | Estados de la cita y su inicio, fin, paciente, profesional y servicio; fichas (nombre, correo); clínica (nombre, zona horaria, teléfono, FR-022); semilla de Clínica Eleva. No escribe `cita.cancelada_por` (FR-018a). | FR-002, FR-004, FR-007, FR-021 |
| **002 Portal del paciente** | La pantalla a la que lleva el enlace y lo que muestra de cada cita (también de una cita cancelada); la guía de textos y trato al paciente (S10). | US2 (retirada), FR-017, FR-020, SC-002 |
| **004 Panel de analítica** | La fórmula de la tasa de no asistencia (FR-006). La 003 no define fórmula propia. | SC-005 |
| **005 Acceso y cancelación del paciente** | Enlace personal `/p/[token]` (FR-001, FR-008) y sus enlaces en la semilla (FR-019); acceso con enlace + 4 cifras (FR-006); plazo (FR-009) y límite de cada cita; enunciado canónico (FR-016) y regla de coherencia (FR-017). | FR-019, FR-020, FR-022, SC-002, SC-007 |

**Regla para el código**: la 003 no redefine ni copia `rutaEnlacePaciente`
(`src/dominio/enlace.ts`), `pacientePuedeCancelar` y `limiteCancelacionPaciente`
(`src/dominio/plazo-paciente.ts`) ni `enunciadoPoliticaCancelacion`
(`src/dominio/politica-cancelacion.ts`); importa de la 005 las que usa (hoy
`rutaEnlacePaciente` y `enunciadoPoliticaCancelacion`, que ya aplica el límite). El cuerpo del correo
queda cubierto por `tests/unit/coherencia-politica.test.ts`: toda mención al plazo sale de
`enunciadoPoliticaCancelacion` (FR-020, FR-022).

**Peticiones a otros propietarios** (esta spec no las aplica):

- **004 — segmentación opcional.** Si se quiere ver en el panel la tasa de no asistencia de
  las citas con recordatorio enviado (SC-005), es una enmienda de la 004.
- **MAPA** (propietario de la 001): actualizar la ficha de la 003 («P1 resuelta: se mantiene
  la víspera») y marcar resuelto, para la 003, el conflicto «002 y 003 aún redefinen acceso y
  plazo» y la consecuencia de 005 FR-006 sobre SC-002.
