# Feature Specification: Acceso y cancelación del paciente

**Feature Branch**: `005-acceso-cancelacion-paciente`

**Created**: 2026-11-07

**Status**: Aprobada (2026-11-07, MarceloMansilla)

**Input**: User description: "Acceso y cancelación del paciente (specs/000-revision-cruzada-jul2026.md). Esta spec es la ÚNICA fuente de verdad sobre cómo un paciente accede a sus datos y cancela citas; el portal (002) y los recordatorios (003) la consumen y la referencian, nunca la redefinen. Acceso: cada paciente tiene UN enlace personal estable /p/[token] (token opaco, regenerable por recepción si se compromete). Sin cuentas ni contraseñas. Todo enlace que reciba el paciente (portal, recordatorios, futuros canales) apunta a /p/[token]. Cancelación por el paciente: permitida hasta 24 horas antes del inicio (decisión de Sara sobre C1: «regla única y que se pueda explicar por teléfono»; la propuesta de 2 h queda registrada como posible v2 con lista de espera). Dentro de la ventana: el portal no ofrece cancelar y muestra el teléfono de la clínica. Cancelar libera el hueco (estado 'cancelada' del núcleo). RN de coherencia: cualquier texto que comunique la política de cancelación (portal, emails) debe derivarse de esta spec, no reescribirla. Criterios de aceptación con test: token válido/inválido/regenerado; cancelación a 25 h (procede) y a 23 h (no procede); hueco liberado aceptando nueva cita."

## Alcance y relación con otras specs

Esta spec es la **única fuente de verdad** sobre:

1. Cómo accede un paciente a sus datos (credencial, enlace, validez, regeneración).
2. Cuándo y cómo puede un paciente cancelar una cita (plazo, comportamiento fuera de plazo,
   efecto en la agenda).
3. Cómo se enuncia esa política ante el paciente (enunciado canónico).

Las demás specs la **consumen y citan**, y no pueden redefinirla:

| Spec | Qué toma de la 005 | Qué sigue siendo suyo |
|------|--------------------|-----------------------|
| 001 Núcleo de agenda | La fila «paciente» de su política de cancelación remite aquí | Estados, transiciones, solape, plazo de recepción, origen de la cancelación, teléfono de la clínica |
| 002 Portal del paciente | Acceso (FR-001 a FR-008) y cancelación (FR-009 a FR-015) | Qué datos y pantallas ve el paciente, guía de textos y trato |
| 003 Recordatorios de cita | El enlace que lleva cada correo (FR-008) y el enunciado de la política (FR-016) | Cuándo y a quién se envía, contenido del correo |

Esta spec no tiene pantallas propias para el paciente: las acciones que define (abrir el
enlace, cancelar) se presentan dentro del portal (002). Sí define el comportamiento que
cualquier pantalla de paciente debe respetar.

## Clarifications

### Session 2026-11-07

- Q: ¿Basta con el enlace para acceder, o el paciente debe confirmar además las 4 últimas cifras de su teléfono? → A: Enlace + 4 últimas cifras del teléfono de la ficha, en todos los canales (portal, correos de recordatorio y futuros); sin ambos no se muestra ningún dato y los intentos fallidos están limitados.
- Q: ¿Qué límite de intentos fallidos de las 4 cifras se aplica? → A: 5 fallos seguidos → pausa de 15 min; 10 fallos seguidos → enlace bloqueado hasta que recepción lo regenere; un acierto pone la cuenta a cero.
- Q: ¿Cuánto dura el acceso tras confirmar las 4 cifras? → A: En ese dispositivo, hasta 30 minutos sin actividad; después se vuelven a pedir. Regenerar el enlace lo termina al instante.
- Q: ¿El origen de la cancelación distingue portal y recordatorio? → A: No. Dos valores: `recepcion` y `paciente`; se pide a la 001 que sustituya la propuesta de tres valores de S2.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar con mi enlace personal (Priority: P1)

Un paciente abre el enlace personal que le dio la clínica (o que le llegó en un correo),
confirma las 4 últimas cifras de su teléfono y accede a sus datos sin crear cuenta ni
recordar contraseña. Un enlace que no es válido no muestra ningún dato y le dice cómo
conseguir uno nuevo.

**Why this priority**: sin acceso no hay portal ni cancelación; es la base de todo lo demás.

**Independent Test**: con la semilla cargada, abrir el enlace vigente de un paciente,
introducir las 4 últimas cifras de su teléfono y comprobar que da acceso a los datos de ese
paciente y solo a ellos; con cifras erróneas, y con un enlace inventado, comprobar que no se
muestra ningún dato.

**Acceptance Scenarios**:

1. **Given** un paciente con enlace personal vigente, **When** lo abre e introduce las 4
   últimas cifras del teléfono de su ficha, **Then** accede a sus datos sin cuenta ni
   contraseña y no ve datos de ningún otro paciente.
2. **Given** un enlace que nunca ha existido (inventado o mal copiado), **When** alguien lo
   abre, **Then** no ve ningún dato de citas ni de pacientes (ni siquiera un nombre) y ve un
   mensaje que dice que el enlace no es válido y cómo pedir uno nuevo: nombre y teléfono de la
   clínica.
3. **Given** un paciente que ya tiene enlace, **When** lo abre varias veces durante semanas,
   reserva nuevas citas o cancela alguna, **Then** su enlace sigue siendo el mismo y sigue
   funcionando.
4. **Given** un enlace vigente, **When** alguien lo abre e introduce cifras que no coinciden
   con las 4 últimas del teléfono de la ficha, **Then** no ve ningún dato de citas ni de
   pacientes (ni siquiera un nombre) y puede volver a intentarlo dentro del límite de
   intentos (FR-006a).
5. **Given** un enlace vigente con 4 fallos seguidos, **When** se introduce una quinta vez
   una cifra errónea, **Then** durante 15 minutos se rechaza cualquier intento (incluso el
   correcto) y se indica a qué hora se puede volver a intentar; **Given** 10 fallos seguidos,
   **When** se abre el enlace, **Then** no se piden las cifras, se indica que el enlace está
   bloqueado y se muestran el nombre y el teléfono de la clínica para pedir uno nuevo.
6. **Given** un enlace con 3 fallos seguidos, **When** se introducen las cifras correctas,
   **Then** se accede y la cuenta de fallos vuelve a cero.
7. **Given** un paciente que entró con sus 4 cifras, **When** vuelve a usar el portal en ese
   dispositivo a los 29 minutos sin actividad, **Then** sigue dentro; **When** lo hace a los
   31 minutos, **Then** se le vuelven a pedir las 4 cifras y no ve ningún dato hasta
   confirmarlas (FR-006b).

---

### User Story 2 - Cancelar mi cita con más de 24 horas de margen (Priority: P1)

El paciente ve una cita reservada que empieza dentro de más de 24 horas y la cancela desde su
enlace. La cita pasa a «Cancelada» y el hueco queda libre para que recepción lo ofrezca a
otro paciente. Si faltan 24 horas o menos, no puede cancelar desde el enlace: ve el teléfono
de la clínica para llamar.

**Why this priority**: es el motivo de dar acceso al paciente: liberar huecos con tiempo
suficiente para volver a llenarlos, con una regla que recepción pueda explicar por teléfono.

**Independent Test**: con el reloj fijado, cancelar una cita a 25 horas de su inicio (se
cancela) y otra a 23 horas (no se ofrece cancelar y se muestra el teléfono); después, crear
desde recepción una cita nueva en el hueco liberado (se registra).

**Acceptance Scenarios** (cita de María, «Sesión de fisioterapia», lunes 16/11/2026 de 10:00 a
10:45, hora de Clínica Eleva):

1. **Given** son las 09:00 del domingo 15/11/2026 (faltan 25 h), **When** el paciente pide
   cancelar y confirma, **Then** la cita pasa a «Cancelada» y el paciente ve la confirmación.
2. **Given** son las 11:00 del domingo 15/11/2026 (faltan 23 h), **When** el paciente ve la
   cita, **Then** no se le ofrece cancelar y ve el enunciado de la política con el teléfono de
   la clínica.
3. **Given** son las 11:00 del domingo 15/11/2026, **When** llega una petición de cancelación
   del paciente sobre esa cita (por ejemplo, con la pantalla abierta desde antes), **Then** se
   rechaza, la cita sigue «Reservada» y el paciente ve el teléfono de la clínica.
4. **Given** son las 09:59:59 del domingo 15/11/2026, **When** el paciente confirma la
   cancelación, **Then** se cancela; **Given** son las 10:00:00 del domingo 15/11/2026,
   **When** confirma, **Then** se rechaza (el plazo vence exactamente 24 h antes del inicio).
5. **Given** el paciente ha cancelado la cita del escenario 1, **When** recepción da de alta
   una «Sesión de fisioterapia» con María el lunes 16/11/2026 a las 10:00 para otro paciente,
   **Then** la cita se registra (el hueco quedó libre).
6. **Given** son las 11:00 del domingo 15/11/2026 y el paciente llama a la clínica, **When**
   recepción cancela la cita desde el panel, **Then** se cancela (recepción mantiene su propio
   plazo, 001 FR-018, fila «Recepción»).

---

### User Story 3 - Regenerar un enlace comprometido (Priority: P2)

Si un paciente pierde el control de su enlace (lo reenvió por error, cambió de móvil, sospecha
que otra persona lo tiene), recepción genera uno nuevo. El anterior deja de funcionar al
instante y el paciente recibe el nuevo.

**Why this priority**: es la única defensa ante un enlace filtrado en un acceso sin
contraseñas; sin ella, un enlace comprometido lo sería para siempre. No impide usar el
producto, por eso va después de entrar y cancelar.

**Independent Test**: regenerar el enlace de un paciente de la semilla y comprobar que el
anterior ya no da acceso y el nuevo sí, y que las citas del paciente no cambian.

**Acceptance Scenarios**:

1. **Given** un paciente con enlace vigente A, **When** recepción genera un enlace nuevo (con
   confirmación), **Then** existe un enlace B distinto de A y recepción puede copiarlo para
   entregárselo.
2. **Given** se ha generado B, **When** alguien abre A, **Then** ve el mismo mensaje que con un
   enlace que nunca existió y ningún dato.
3. **Given** se ha generado B, **When** el paciente abre B y confirma sus 4 cifras, **Then**
   accede a sus datos con todas sus citas intactas.
5. **Given** el enlace A está bloqueado por 10 fallos seguidos (FR-006a), **When** recepción
   genera B, **Then** B empieza sin fallos y el paciente puede entrar con sus 4 cifras.
4. **Given** el paciente tenía su portal abierto con A, **When** recepción genera B y el
   paciente intenta cancelar desde la pantalla abierta, **Then** la acción se rechaza como
   enlace no válido y la cita no cambia.

---

### Edge Cases

- **Frontera exacta de 24 h**: con `ahora = inicio − 24 h` ya no se puede cancelar; un segundo
  antes, sí (US2 #4).
- **Pantalla abierta desde dentro de plazo**: se mostró «Cancelar» a 24 h 00 min 30 s y el
  paciente confirma a 23 h 59 min: se rechaza; el plazo se comprueba al confirmar, no al
  mostrar.
- **Cita reservada con menos de 24 h de antelación** (p. ej., el domingo para el lunes por la
  mañana): el paciente nunca puede cancelarla desde el enlace; ve el teléfono desde el primer
  momento.
- **Varias citas del mismo paciente**: cada una se evalúa con su propio inicio; unas pueden
  ser cancelables y otras no a la vez.
- **Citas que no están «reservadas»** (completadas, canceladas, no asistidas): nunca se ofrece
  cancelarlas.
- **Recepción cambia el estado mientras el paciente mira**: la cancelación del paciente se
  rechaza y se muestra el estado actual (001 FR-020).
- **Dos cancelaciones a la vez** (dos dispositivos del paciente, o paciente y recepción):
  exactamente una cambia el estado; la otra ve que la cita ya está cancelada.
- **Cancelación del paciente y alta de recepción en el mismo hueco a la vez**: nunca quedan
  dos citas activas solapadas; o el alta se rechaza (la cancelación aún no se había
  producido) o se registra tras ella (001 FR-011, FR-012).
- **Enlace regenerado con la pantalla abierta**: cualquier acción posterior con el enlace
  anterior se rechaza como enlace no válido (US3 #4).
- **Enlace mal copiado** (cortado, con espacios o mayúsculas cambiadas): es un enlace no
  válido; el sistema no intenta adivinar el correcto.
- **Correo antiguo con un enlace ya regenerado**: mismo mensaje que cualquier enlace no
  válido.
- **Recepción cambia el teléfono de la ficha**: desde ese momento se piden las 4 últimas
  cifras del teléfono nuevo; el enlace no cambia.
- **Correo reenviado o enlace abierto por un analizador de enlaces**: sin las 4 cifras no se
  muestra ningún dato (FR-006).
- **Fallos desde varios dispositivos**: cuentan todos para el mismo enlace; el 5.º fallo
  pausa y el 10.º bloquea el enlace en todos los dispositivos a la vez (FR-006a).
- **Intento correcto durante la pausa de 15 minutos**: se rechaza igual, sin comprobarlo, y
  no cuenta como fallo.
- **Acceso caducado con la pantalla abierta**: el paciente confirma una cancelación tras más
  de 30 minutos sin actividad; no se cancela nada, se le piden las 4 cifras y, tras
  confirmarlas, tiene que volver a pedir la cancelación; el plazo se comprueba en ese nuevo
  momento (FR-006b, FR-009).
- **Cambio de hora** (último domingo de marzo y de octubre, de madrugada): la clínica solo
  tiene citas de lunes a viernes de 09:00 a 20:00, así que el vencimiento del plazo (24 h
  antes) cae siempre entre 09:00 y 20:00 de un día de diario o de domingo, después del cambio.
  Por eso 24 horas reales coinciden siempre con «la misma hora del día anterior» (ver
  ejemplos de FR-010).

## Requirements *(mandatory)*

### Functional Requirements

**Acceso del paciente**

- **FR-001**: Cada ficha de paciente DEBE tener exactamente un enlace personal vigente, de la
  forma `/p/[token]`. El paciente accede sin cuenta, sin usuario y sin contraseña, con ese
  enlace y las 4 últimas cifras de su teléfono (FR-006).
- **FR-002**: El token DEBE ser opaco: no contiene ni permite deducir el nombre, el teléfono,
  la clínica ni ningún otro dato del paciente, ni el enlace de otro paciente; adivinar un
  enlace válido DEBE ser impracticable.
- **FR-003**: El enlace DEBE ser estable: no caduca por tiempo ni cambia al usarlo, al reservar
  ni al cancelar citas. Solo cambia cuando recepción lo regenera (FR-004).
- **FR-004**: Recepción DEBE poder generar un enlace nuevo para una ficha desde el panel, con
  un paso de confirmación. En el mismo instante el enlace anterior deja de valer para
  siempre y el nuevo pasa a ser el único vigente. Regenerar no cambia ninguna cita ni ningún
  dato de la ficha.
- **FR-005**: Recepción DEBE poder obtener (copiar) el enlace vigente de una ficha para
  entregárselo al paciente.
- **FR-006**: Abrir un enlace vigente DEBE dar acceso a los datos de ese paciente y solo de
  ese paciente en su clínica; ninguna petición hecha con un enlace puede leer ni modificar
  citas de otra ficha. El acceso DEBE hacerse en dos pasos, igual en todos los canales
  (portal, correos de recordatorio y canales futuros): (1) abrir el enlace vigente; (2)
  confirmar las 4 últimas cifras del teléfono que figura en ese momento en la ficha. Hasta
  completar ambos pasos NO DEBE mostrarse ningún dato de citas ni de pacientes (ni siquiera
  un nombre) ni aceptarse ninguna acción; solo el nombre y el teléfono de la clínica. Los
  intentos fallidos de las 4 cifras están limitados por enlace (FR-006a). Qué datos se
  muestran tras entrar lo define la 002.
- **FR-006a (RN intentos)**: Los fallos de las 4 cifras se cuentan por enlace, de forma
  consecutiva (da igual desde qué dispositivo), y un acierto pone la cuenta a cero:
  - Al 5.º fallo seguido, durante 15 minutos se rechaza cualquier intento sin comprobarlo
    (incluso el correcto), indicando la hora a partir de la cual se puede volver a probar.
  - Al 10.º fallo seguido, el enlace queda bloqueado: ya no pide las cifras, indica que el
    enlace está bloqueado y muestra el nombre y el teléfono de la clínica. Solo se
    desbloquea regenerándolo (FR-004); el enlace nuevo empieza sin fallos.
  - Un enlace bloqueado no muestra ningún dato de pacientes ni de citas (FR-006).
- **FR-006b (RN duración del acceso)**: Tras confirmar las 4 cifras, el acceso vale solo en
  ese dispositivo y termina tras 30 minutos sin actividad; cada petición del paciente con el
  acceso abierto reinicia los 30 minutos. Terminado, se vuelven a pedir las 4 cifras antes de
  mostrar datos o aceptar acciones. Regenerar el enlace (FR-004) termina al instante todos
  los accesos abiertos con el anterior. No hay opción de «recordar este dispositivo».
- **FR-007**: Un enlace no válido (inventado, mal copiado o regenerado) NO DEBE mostrar ningún
  dato de citas ni de pacientes, ni siquiera un nombre. Todos los enlaces no válidos reciben
  la misma respuesta, de modo que no se puede distinguir un enlace regenerado de uno que
  nunca existió. La respuesta indica que el enlace no es válido y cómo pedir uno nuevo
  (nombre y teléfono de la clínica, que no son datos de pacientes).
- **FR-008**: Todo enlace que CitaClara entregue o envíe a un paciente por cualquier canal
  (portal, correos de recordatorio y canales futuros) DEBE ser su enlace personal de FR-001.
  Ninguna otra spec puede definir otro tipo de enlace o credencial de paciente (por cita, de
  un solo uso, etc.); si lo necesita, lo pide como enmienda de esta spec.

**Cancelación por el paciente**

- **FR-009 (RN plazo)**: El paciente DEBE poder cancelar una cita propia en estado «reservada»
  solo si `ahora < inicio − 24 h`. El plazo vence exactamente 24 horas antes del inicio: con
  `ahora ≥ inicio − 24 h` se rechaza. Se comprueba con el reloj del servidor en el momento de
  procesar la cancelación (al confirmar), no al mostrar la pantalla ni al enviar un correo, y
  compara instantes reales en la hora local de la clínica.
- **FR-010**: Ejemplos de referencia del plazo (Clínica Eleva, Europe/Madrid):

  | Cita | Vence el plazo | Último instante para cancelar | Ejemplos de prueba |
  |------|----------------|-------------------------------|--------------------|
  | lunes, 16/11/2026, 10:00 | domingo, 15/11/2026, 10:00 | domingo, 15/11/2026, 09:59:59 | A las 09:00 del domingo (faltan 25 h): procede. A las 11:00 del domingo (faltan 23 h): no procede. |
  | martes, 17/11/2026, 19:15 | lunes, 16/11/2026, 19:15 | lunes, 16/11/2026, 19:14:59 | A las 19:14 del lunes: procede. A las 19:15 del lunes: no procede. |
  | lunes, 26/10/2026, 09:00 (tras el cambio de hora del domingo 25/10) | domingo, 25/10/2026, 09:00 | domingo, 25/10/2026, 08:59:59 | 24 horas reales = la misma hora del día anterior, porque el cambio fue a las 03:00 del domingo. |

- **FR-011**: Fuera de plazo, o si la cita no está «reservada», NO DEBE ofrecerse al paciente
  la opción de cancelar. Para una cita «reservada» fuera de plazo se DEBE mostrar el
  enunciado de la política (FR-016) con el teléfono de la clínica. Toda petición de
  cancelación que llegue fuera de plazo se rechaza sin cambiar nada y muestra lo mismo.
- **FR-012**: Antes de cancelar, el paciente DEBE confirmar en un paso que repite día, hora,
  servicio y profesional de la cita. Sin confirmación no se cancela nada.
- **FR-013**: La cancelación del paciente DEBE ser la transición «reservada» → «cancelada» de
  la 001 (FR-017): definitiva e idéntica en efecto a la de recepción. El hueco queda libre de
  inmediato y admite una cita nueva (001 FR-006, FR-011). La cancelación queda registrada
  con origen «paciente» y su momento, con el registro de origen que define la 001. El
  origen es uno solo para todos los canales del paciente: el sistema no distingue si llegó
  desde el portal o desde un correo, porque el enlace es el mismo (FR-008), y los enlaces no
  llevan ninguna marca de canal.
- **FR-014**: Si el estado de la cita cambió desde que se mostró, la cancelación DEBE
  rechazarse mostrando el estado actual (001 FR-020). Ante cancelaciones simultáneas de la
  misma cita, exactamente una cambia el estado.
- **FR-015**: Esta spec no cambia el plazo de recepción: recepción puede cancelar hasta la
  hora de inicio (001 FR-018, fila «Recepción»), y es la vía para el paciente fuera de plazo.

**Coherencia de la política (RN de coherencia)**

- **FR-016**: Enunciado canónico de la política de cancelación del paciente. Contiene siempre
  estos tres elementos y ningún otro plazo:
  1. La regla: se puede cancelar desde el enlace personal hasta 24 horas antes del inicio de
     la cita.
  2. El límite concreto de esa cita, expresado como «antes del [día de la semana],
     [dd/mm/aaaa] a las [hh:mm]», donde la hora es el vencimiento de FR-009 (p. ej., para la
     cita del lunes 16/11/2026 a las 10:00: «antes del domingo, 15/11/2026 a las 10:00»). Se
     usa «antes del», nunca «hasta el», para que no quede duda de si el minuto límite está
     permitido.
  3. La alternativa fuera de plazo: llamar a la clínica, con su nombre y teléfono.

  Ejemplo de referencia (Clínica Eleva, con el teléfono de la semilla que fija la 001):
  «Puede cancelar esta cita desde su enlace antes del domingo, 15/11/2026 a las 10:00.
  Después, llame a Clínica Eleva al 911 234 567.» El trato es de usted (revisión cruzada S10, 2026-11-08);
  el estilo lo fija la guía de textos al paciente de la 002; el contenido, esta spec.
- **FR-017**: Todo texto dirigido al paciente que mencione cuándo puede cancelar (portal,
  correos de recordatorio, canales futuros) DEBE derivarse de FR-016 y citar «005, FR-016».
  NO DEBE contener un plazo redactado por su cuenta (p. ej., «hasta el día anterior», «con un
  día de antelación», «hasta la hora de la cita»). Para una misma cita, el límite que muestra
  cualquier canal y el que se aplica al cancelar DEBEN ser el mismo instante.
- **FR-018**: El valor del plazo (24 horas) solo se fija en FR-009. Cambiarlo (p. ej., la
  propuesta de 2 horas con lista de espera, registrada para una v2) es una enmienda de esta
  spec y cambia a la vez la regla aplicada y todos los textos de FR-017.

**Datos de demostración**

- **FR-019**: La semilla DEBE generar un enlace personal vigente para cada uno de los 40
  pacientes, de forma determinista (misma fecha de referencia, mismos enlaces), sin alterar
  ninguna cita, ficha ni identificador que ya genere la 001.

### Constitution Requirements *(mandatory)*

- **Owner**: MarceloMansilla (registrado en `specs/MAPA.md`).
- **Writes to the agenda?**: Sí — un único flujo: cancelación por el paciente («reservada» →
  «cancelada»). No crea, mueve ni amplía citas, así que no puede provocar un solape por sí
  misma, pero libera huecos. Pruebas obligatorias: hueco liberado que admite una cita nueva
  (US2 #5); cancelación del paciente simultánea con un alta de recepción en el mismo hueco
  (nunca dos citas activas solapadas); cancelaciones simultáneas de la misma cita (paciente +
  paciente, paciente + recepción: exactamente una prospera).
- **Amounts and dates**:
  - Sin importes: esta spec no muestra ni calcula precios.
  - Fechas y horas en convención española y reloj de 24 h, en la hora local de la clínica:
    «lunes, 16/11/2026», «10:00». Ejemplos completos del plazo en FR-010.
  - El plazo compara instantes reales (24 h = 1.440 minutos). Con el horario de la 001 (lunes
    a viernes, 09:00–20:00) y el cambio de hora de madrugada en domingo, el vencimiento
    coincide siempre con la misma hora del día anterior (FR-010, tercera fila). Una clínica
    en Canarias aplica el plazo en su hora local.
- **Demo data**: añade 40 enlaces personales (uno por paciente) a la semilla de la 001
  (FR-019). No cambia citas, estados ni cifras de la semilla, de modo que los recuentos de
  `docs/datos-demo.md` y las cifras de referencia de la analítica (004) no varían.

### Key Entities *(include if feature involves data)*

- **Enlace personal (acceso del paciente)**: credencial opaca que da acceso a los datos de una
  ficha de paciente, junto con las 4 últimas cifras del teléfono de esa ficha (FR-006).
  Pertenece a exactamente una ficha y a su clínica; cada ficha tiene exactamente un enlace
  vigente; se sabe cuándo se generó, cuántos fallos seguidos de las 4 cifras lleva, hasta
  cuándo está en pausa y si está bloqueado (FR-006a). Al regenerarse, el anterior deja de
  existir como credencial válida.
- **Acceso abierto**: lo que obtiene un dispositivo al confirmar las 4 cifras de un enlace
  vigente. Pertenece a ese enlace; caduca a los 30 minutos sin actividad y termina al
  regenerar el enlace (FR-006b).
- **Política de cancelación del paciente**: el plazo (24 h antes del inicio, FR-009) y su
  enunciado canónico (FR-016). Única para todos los canales del paciente.
- **Cita** *(de la 001)*: esta spec solo lee su inicio y su estado y aplica la transición
  «reservada» → «cancelada».
- **Clínica** *(de la 001)*: esta spec lee su nombre, su zona horaria y su teléfono de
  contacto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los criterios de aceptación pedidos tienen test automatizado y pasan al 100 %:
  enlace válido, no válido y regenerado (US1 #1–#2, US3 #2–#3); 4 cifras erróneas, pausa tras 5 fallos, bloqueo tras 10 y
  puesta a cero tras un acierto (US1 #4–#6, US3 #5); caducidad del acceso a los 30 minutos
  sin actividad (US1 #7); cancelación a 25 h (procede)
  y a 23 h (no procede) (US2 #1–#3); frontera exacta de 24 h (US2 #4); hueco liberado que
  admite una cita nueva (US2 #5).
- **SC-002**: Tras regenerar un enlace, el 100 % de los intentos con el enlace anterior se
  rechazan desde ese instante, sin mostrar ningún dato.
- **SC-003**: En 100 ráfagas de cancelaciones simultáneas sobre la misma cita (paciente +
  paciente y paciente + recepción) se produce exactamente 1 cambio de estado por ráfaga, y en
  pruebas de cancelación + alta simultánea en el mismo hueco se registran 0 solapes.
- **SC-004**: Para cualquier cita, el límite de cancelación mostrado en el portal, el de
  cualquier correo y el aplicado al confirmar coinciden al minuto: 0 discrepancias en la
  revisión de textos previa a la entrega.
- **SC-005**: Recepción puede explicar la política por teléfono con el enunciado canónico en
  una sola frase, sin excepciones ni casos especiales (verificado en la misma prueba manual
  de la 001 con 2 personas que no conocen CitaClara: ambas la repiten correctamente tras
  leerla una vez).
- **SC-006**: Un paciente sin ayuda abre su enlace y cancela una cita dentro de plazo en menos
  de 1 minuto desde un móvil de 360 px de ancho.

## Assumptions

- La regla de 24 h es decisión de producto de Sara sobre C1 («regla única y que se pueda
  explicar por teléfono»). La propuesta de cancelar hasta 2 horas antes queda registrada como
  posible v2, ligada a una lista de espera; no forma parte de esta spec.
- Una sola clínica por instalación (001 FR-001): por eso un enlace no válido puede mostrar el
  nombre y el teléfono de la clínica sin revelar nada de ningún paciente.
- El token es suficientemente largo y aleatorio para que no se pueda adivinar; por eso no se
  limitan los intentos de abrir enlaces. Las 4 cifras (10.000 combinaciones) sí se pueden
  adivinar por fuerza bruta, por eso sus intentos fallidos se limitan por enlace (FR-006a):
  como mucho 10 intentos por enlace antes del bloqueo, un 0,1 % de probabilidad de acertar.
- Las 4 cifras no son una contraseña: el paciente no las elige ni tiene que recordarlas,
  porque son las de su propio teléfono.
- La entrega del enlace al paciente en la v1 la hace recepción a mano (FR-005); los correos
  de recordatorio (003) lo incluyen cuando existan. CitaClara no envía SMS.
- El paciente no puede reservar ni mover citas; solo ver (002) y cancelar (esta spec).
- Recepción sigue pudiendo cancelar dentro de las 24 horas (FR-015); el plazo del paciente no
  restringe al panel.

## Dependencias y enmiendas requeridas

Esta spec no se puede aprobar mientras otras specs digan lo contrario (Principio I). Cambios
que se piden a sus propietarios:

- **001 Núcleo de agenda — resuelta (aprobada por su propietario el 2026-11-07).** La 001
  tenía una enmienda S1 que fijaba el plazo del paciente en «hasta la hora de inicio»
  (opción A), en contra de esta spec. Ya aplicado en la 001: (a) FR-018 tiene una única fila
  «Paciente» que remite a «005, FR-009»; (b) la clarificación S1 registra la decisión de
  Sara sobre C1 (24 h); (c) Key Entities remite a la 005 para el acceso del paciente; (d)
  «Fuera de alcance» remite a la 005.
- **001 — origen de la cancelación (S2) y teléfono de la clínica (S9) — resuelta.** Esta
  spec los usa y no los define. La 001 (FR-018a) ya define exactamente dos valores de
  origen, `recepcion` y `paciente` (FR-013), y el teléfono de la clínica (FR-022).
  Consecuencia para la 002: «Cancelada por el paciente» y «Huecos liberados» filtran por
  `paciente`.
- **002 Portal del paciente.** Eliminar sus propias definiciones de acceso (FR-001 a FR-005,
  la entidad «Acceso de paciente») y de plazo (FR-012, FR-013 y el supuesto de 24 h) y citar
  la 005. Mantiene pantallas, datos visibles y la guía de textos.
- **003 Recordatorios de cita** (hoy `002-recordatorios-cita`; renumerar según S3). Eliminar
  el enlace por cita (`/cancelar/[token]`, almacenamiento propio del token) y su plazo
  (FR-012); cada correo lleva el enlace personal (FR-008) y el enunciado de FR-016. Abrirlo
  pide las 4 cifras (FR-006), así que su objetivo de pulsaciones para cancelar debe
  revisarse. Riesgo a
  decidir en la 003: con el envío actual a las 08:00 de la víspera, al paciente le quedan
  entre 1 h (cita a las 09:00) y 11 h (cita a las 19:00) para cancelar desde el correo; si
  se quiere más margen, la 003 debe adelantar el envío.
- **MAPA.** Registrar la 005 con su propietario antes de empezar el plan.
