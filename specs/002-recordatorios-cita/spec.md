# Feature Specification: Recordatorios de cita por correo electrónico

**Feature Branch**: `recordatorio`

**Created**: 2026-11-07

**Status**: Aprobada (2026-11-07, MarceloMansilla)

**Input**: User description: "Recordatorios de cita. El dolor número uno del cliente piloto: la no asistencia. Alcance: un proceso diario genera un recordatorio por email para cada cita reservada de las próximas 24-48 horas, sin duplicar envíos; el email incluye los datos de la cita y una forma de que el paciente cancele si no va a ir (mejor un hueco libre que un no-show). Correo en modo simulado sin SMTP configurado: se escriben ficheros .eml en datos/salida-correo/. Preguntas cerradas para Sara: antelación exacta, qué pasa si el paciente cancela desde el email y con cuánta antelación puede, y si el recordatorio se reenvía cuando la cita se mueve. Fuera de alcance v1: SMS y WhatsApp."

## Clarifications

### Session 2026-11-07

- Q: ¿Con cuánta antelación exacta se envía el recordatorio? → A: La víspera: la ejecución diaria de las 08:00 (hora local de la clínica) recuerda todas las citas reservadas del día natural siguiente.
- Q: ¿Qué pasa si el paciente cancela desde el correo y con cuánta antelación puede? → A: Cancelación directa (la cita pasa a «cancelada» y el hueco se libera al instante), permitida hasta la hora de inicio de la cita, igual que recepción (FR-018 de la 001).
- Q: ¿Se reenvía el recordatorio cuando la cita se mueve? → A: No hay nada adicional en v1: mover es cancelar y crear otra cita (001), y la nueva recibe su propio recordatorio según FR-002; el enlace del correo antiguo muestra que la cita está cancelada. Sin aviso de anulación al paciente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El paciente recibe un recordatorio de su cita (Priority: P1)

Cada día, sin que nadie de recepción tenga que hacer nada, CitaClara envía un correo de
recordatorio a cada paciente con una cita reservada dentro de la ventana de antelación. El
correo contiene los datos de la cita (clínica, profesional, servicio, día y hora) y nunca
llega dos veces para la misma cita.

**Why this priority**: es el remedio directo al principal dolor del cliente piloto, la no
asistencia. Por sí solo, sin cancelación desde el correo, ya reduce olvidos.

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

---

### User Story 2 - El paciente cancela desde el recordatorio (Priority: P2)

El paciente que sabe que no va a ir abre el enlace del correo, ve los datos de su cita y
confirma la cancelación. La cita pasa a «Cancelada» y el hueco queda libre en la agenda de
recepción, que puede ofrecerlo a otro paciente.

**Why this priority**: convierte un futuro «no asistido» en un hueco aprovechable («mejor un
hueco libre que un no-show»). Depende de que exista el recordatorio (US1).

**Independent Test**: generar el recordatorio de una cita reservada, abrir su enlace de
cancelación desde un móvil, confirmar, y comprobar que la cita aparece cancelada y su hueco
libre en la agenda; volver a abrir el enlace y comprobar que informa de que ya está
cancelada.

**Acceptance Scenarios**:

1. **Given** Ana recibió el recordatorio de su cita del lunes 16/11/2026 a las 10:00,
   **When** abre el enlace de cancelación, **Then** ve los datos de su cita y un botón
   «Cancelar mi cita», y la cita NO se cancela solo por abrir el enlace.
2. **Given** Ana está en la página de cancelación dentro del plazo permitido, **When** pulsa
   «Cancelar mi cita», **Then** la cita pasa a «Cancelada», Ana ve «Su cita del lunes,
   16/11/2026 a las 10:00 ha quedado cancelada. Gracias por avisar.» y el hueco de 10:00 a
   10:45 de María aparece libre en la agenda de recepción.
3. **Given** ya ha llegado la hora de inicio de la cita (lunes 16/11/2026, 10:00), aunque
   Ana tuviera la página abierta desde antes, **When** Ana abre el enlace o pulsa cancelar,
   **Then** no se cancela nada y ve «Ya no es posible cancelar esta cita desde aquí. Por
   favor, llame a Clínica Eleva.».
4. **Given** la cita ya fue cancelada (por Ana o por recepción) o ya está completada o no
   asistida, **When** Ana abre el enlace, **Then** ve el estado actual de la cita y ninguna
   acción disponible.
5. **Given** recepción cambia el estado de la cita mientras Ana tiene abierta la página,
   **When** Ana pulsa «Cancelar mi cita», **Then** la acción se rechaza y se le muestra el
   estado actual (misma regla que FR-020 de la 001).
6. **Given** un enlace manipulado o inexistente, **When** se abre, **Then** se muestra
   «Este enlace no es válido.» sin revelar ningún dato de ninguna cita.

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
  ventana; el enlace del recordatorio antiguo muestra que esa cita está cancelada (FR-017).
  Si la nueva cita es para mañana y se crea después de las 08:00, no recibe recordatorio
  (misma regla que cualquier reserva tardía).
- **Cita cancelada entre la generación del recordatorio y la lectura del correo**: el enlace
  muestra «Esta cita ya está cancelada».
- **Varias citas del mismo paciente en la ventana**: un recordatorio por cita, cada uno con
  su propio enlace de cancelación (que solo cancela esa cita).
- **Correo del paciente con formato inválido**: no se genera recordatorio y figura en el
  resumen como «correo no válido».
- **Analizadores de enlaces de los proveedores de correo** que abren automáticamente los
  enlaces: nunca cancelan nada, porque abrir el enlace no cancela; hace falta pulsar el
  botón de confirmación.
- **Cambio de hora (último domingo de marzo/octubre)**: la ejecución y la ventana se fijan en
  hora local de la clínica (08:00; día natural siguiente), y el cambio ocurre de madrugada,
  así que no afecta a qué citas se recuerdan. La hora mostrada en el correo es siempre la
  hora local de la cita. Ejemplo: el domingo 28/03/2027 a las 02:00 se adelanta el reloj;
  la ejecución de ese día sigue siendo a las 08:00 (hora de verano) y recuerda la cita del
  lunes 29/03/2027 a las 10:00 con el texto «10:00».
- **Cancelación simultánea** del paciente y de recepción, o del paciente desde dos
  dispositivos: solo una prospera; la otra ve el estado actual.

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
  natural siguiente al de la ejecución.
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
  («10:00–10:45») en hora local de la clínica, y el enlace para cancelar. No incluye precio.
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

- **FR-011**: Cada recordatorio DEBE contener un enlace personal, no adivinable y exclusivo
  de esa cita. El enlace solo permite ver los datos de esa cita y cancelarla; no da acceso a
  ningún otro dato ni a otras citas del paciente o de la clínica.
- **FR-012**: Abrir el enlace NO DEBE cancelar la cita: muestra los datos de la cita y pide
  confirmación explícita («Cancelar mi cita»). Al confirmar dentro del plazo, la cita pasa de
  «reservada» a «cancelada» y su hueco queda libre al instante (FR-006 de la 001), sin
  intervención de recepción. Plazo: hasta la hora de inicio de la cita, la misma regla que
  rige para recepción (FR-018 de la 001); la comprobación se hace en el momento de
  confirmar. Ejemplo: cita a las 10:00 → se puede cancelar a las 09:59; a las 10:00 ya no.
- **FR-013**: Una cancelación desde el correo DEBE quedar registrada como hecha por el
  paciente desde el recordatorio, con su momento, para distinguirla de las cancelaciones de
  recepción.
- **FR-014**: Fuera de plazo, o si la cita ya no está reservada, la página DEBE mostrar el
  estado actual de la cita y no ofrecer ninguna acción; fuera de plazo, además, indica que
  llame a la clínica.
- **FR-015**: Si el estado de la cita cambió desde que se mostró la página, la cancelación
  DEBE rechazarse mostrando el estado actual. Cancelaciones simultáneas de la misma cita:
  exactamente una prospera.
- **FR-016**: Un enlace inválido DEBE mostrar «Este enlace no es válido.» sin revelar datos.
  El enlace deja de permitir cancelar cuando vence el plazo de FR-012.

**Citas que cambian**

- **FR-017**: El recordatorio pertenece a una cita concreta, no al paciente ni a una hora.
  Como en la 001 una cita no se mueve (se cancela y se crea otra), la cita nueva es una cita
  distinta y recibe su propio recordatorio según FR-002, aunque la cancelada ya tuviera uno.
  No se envía ningún aviso al paciente cuando recepción cancela una cita, haya recibido o no
  recordatorio; el enlace del correo antiguo muestra que la cita está cancelada (FR-014).
  Ejemplo: cita de Ana del lunes 16/11/2026 a las 10:00, recordada el domingo; el lunes a las
  08:30 recepción la cancela y crea otra para el miércoles 18/11/2026 a las 12:00 → Ana
  recibe el recordatorio de la nueva el martes 17/11/2026 a las 08:00 y ningún correo más.

**Fuera de alcance**

- **FR-018**: En v1 los recordatorios solo se envían por correo electrónico. SMS y WhatsApp
  quedan fuera de alcance.

### Constitution Requirements *(mandatory)*

- **Owner**: MarceloMansilla (registrado en `specs/MAPA.md`).
- **Writes to the agenda?**: Sí — la cancelación desde el correo cambia una cita de
  «reservada» a «cancelada» y libera su hueco. No crea ni mueve citas, por lo que no puede
  generar solapes por sí misma, pero las pruebas DEBEN cubrir: cancelación desde el correo
  simultánea con un cambio de estado de recepción (solo uno prospera), y alta de una cita
  nueva en el hueco recién liberado sin solape con la cancelada. El proceso de recordatorios
  solo lee la agenda.
- **Amounts and dates**:
  - Sin importes: el correo no muestra precio.
  - Fechas y horas con convenciones españolas y en hora local de la clínica: «lunes,
    16/11/2026», «10:00–10:45». Clínica Eleva: Europe/Madrid.
  - Ejemplo: la ejecución del domingo
    15/11/2026 a las 08:00 cubre las citas del lunes 16/11/2026 (de 00:00 a 23:59) y recuerda
    la de Ana de 10:00–10:45; la del martes 17/11/2026 a las 09:00 se recuerda el lunes
    16/11/2026 a las 08:00. La ejecución del viernes cubre las del sábado (ninguna: la clínica
    cierra) y las del lunes las recuerda la ejecución del domingo.
  - Cambio de hora: ver Edge Cases (ejemplo del 28–29/03/2027).
- **Demo data**: esta feature no cambia la semilla de la 001 (40 pacientes, de los que
  aproximadamente 3 de cada 4 tienen correo; 2 semanas de citas reservadas futuras). El plan
  DEBE documentar, para la fecha de referencia usada en ejemplos y tests, cuántos
  recordatorios genera la primera ejecución, cuántas citas quedan «sin correo» y cuántos
  genera la segunda (0). El caso «correo no válido» se prueba con fichas creadas por los
  propios tests.

### Key Entities *(include if feature involves data)*

- **Recordatorio**: aviso por correo de una cita concreta. Cita a la que pertenece (como
  máximo uno por cita), destinatario, momento de generación, modo (simulado o real) y
  resultado (enviado o fallido).
- **Enlace de cancelación**: credencial personal y no adivinable ligada a una única cita;
  permite ver esa cita y cancelarla dentro del plazo.
- **Ejecución del proceso de recordatorios**: momento, ventana cubierta y resumen de
  resultados por cita.
- **Cita** (de la 001): se añade a su historia el origen de una cancelación (recepción o
  paciente desde el recordatorio) y su momento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sobre los datos de demostración, el 100 % de las citas reservadas de la
  ventana cuyo paciente tiene correo reciben exactamente 1 recordatorio, y 10 ejecuciones
  repetidas más 2 ejecuciones simultáneas generan 0 duplicados.
- **SC-002**: Un paciente que nunca ha usado CitaClara cancela su cita desde el correo, en
  un móvil, en menos de 1 minuto y con no más de 2 pulsaciones (abrir el enlace y
  confirmar).
- **SC-003**: Tras la cancelación del paciente, el hueco aparece libre en la agenda de
  recepción en cuanto esta se consulta o actualiza.
- **SC-004**: En 100 intentos automatizados con enlaces inventados o manipulados, ninguno
  muestra datos de una cita ni cancela nada.
- **SC-005**: En el piloto, la tasa de no asistencia de las citas con recordatorio baja al
  menos un 30 % respecto a las 8 semanas anteriores a la puesta en marcha (medido con los
  estados registrados por recepción).
- **SC-006**: El correo y la página de cancelación se leen sin desplazamiento horizontal
  desde 360 px de ancho y la página cumple el contraste mínimo AA.

## Assumptions

- Destinatario: el correo de la ficha del paciente (opcional en la 001). Los pacientes sin
  correo no reciben recordatorio.
- Una sola clínica por instalación (como en la 001); el remitente muestra el nombre de la
  clínica. La 001 no guarda teléfono ni dirección de la clínica, así que el correo y la
  página de cancelación dicen «llame a la clínica» sin número; añadir esos datos sería un
  cambio de la 001.
- La página de cancelación es la única pantalla para pacientes en esta spec; no hay acceso
  del paciente ni cuentas. Si la feature de portal del paciente (desarrollada en paralelo)
  define otra forma de cancelar, ambas DEBEN aplicar el mismo plazo y las mismas reglas.
- La hora de ejecución diaria es las 08:00, hora local de la clínica (FR-002), antes de la
  apertura de las 09:00; así recepción dispone de toda la jornada para reasignar los huecos
  que liberen los pacientes.
- No hay reintentos dentro de la misma ejecución ni seguimiento de lectura o rebotes del
  correo.
- La cancelación por el paciente amplía la regla de estados de la 001. Ya está recogida en la
  001 como FR-018a (enmienda del 2026-11-07, hecha por su propietario, que es el mismo): el
  paciente puede cancelar desde el enlace del recordatorio con el mismo plazo, confirmándolo
  él mismo, y queda registrado.
- La ejecución automática diaria (FR-001) la pone en marcha el planificador de la
  instalación (el del sistema o el del hosting), que se configura al desplegar, como el resto
  de la instalación. El sistema aporta el comando, las instrucciones para planificarlo y el
  registro de cada ejecución, con el que se comprueba que la ejecución diaria ha tenido lugar.
- Fuera de alcance v1: SMS, WhatsApp, reprogramar desde el correo, confirmar asistencia,
  recordatorios múltiples por cita, avisos de anulación o de cambio de cita y
  personalización del texto por la clínica.
