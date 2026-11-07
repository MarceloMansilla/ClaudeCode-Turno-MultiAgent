# Feature Specification: Núcleo de agenda de CitaClara

**Feature Branch**: `001-agenda-core`

**Created**: 2026-11-07

**Status**: Aprobada (2026-11-07, MarceloMansilla)

**Input**: User description: "Núcleo de agenda de CitaClara. Contexto: clínicas pequeñas (2-5 profesionales); la recepción gestiona la agenda; los pacientes, de momento, solo existen como fichas. Alcance de la 001: entidades (clínica con clave de panel, profesionales, servicios, pacientes, citas); cita = profesional + servicio + paciente con inicio y fin = inicio + duración; estados reservada → completada | cancelada | no_asistida; RN1 sin solapes (también con reservas simultáneas); RN2 sin citas en el pasado; interfaz de recepción con agenda del día por profesional, alta de cita y acciones de estado; acceso con clave de clínica; semilla determinista de Clínica Eleva; fuera de alcance: acceso del paciente, recordatorios, analítica, pagos online."

## Clarifications

### Session 2026-11-07

- Q: ¿Puede recepción crear fichas de paciente en la 001? → A: Sí, alta rápida dentro del formulario de alta de cita (nombre y teléfono obligatorios, correo opcional); sin edición ni listado de pacientes.
- Q: ¿Cuál es el horario de la clínica? → A: Lunes a viernes de 09:00 a 20:00, sin pausa, igual para todos los profesionales.
- Q: ¿Hasta cuándo se puede cancelar una cita? → A: Solo antes de su hora de inicio; después solo cabe «Completada» o «No asistida».
- Q: ¿Cómo se evitan fichas de paciente duplicadas? → A: El teléfono es único por clínica; crear una ficha con un teléfono ya registrado se rechaza.
- Q: ¿Qué servicios puede atender cada profesional? → A: Cada servicio pertenece a una especialidad y solo se reserva con profesionales de esa especialidad.
- Q: ¿Cómo identifica la clave a la clínica al entrar? → A: Una sola clínica por instalación en la 001; la clave se comprueba contra esa clínica. El soporte multiclínica va en una spec propia.
- Q: ¿Qué teléfonos se aceptan? → A: Solo españoles: 9 cifras que empiezan por 6, 7, 8 o 9, con o sin prefijo +34.
- Q: ¿Qué significa «datos idénticos» en la semilla? → A: Mismo contenido y mismos identificadores; solo puede variar el hash de la clave (la misma clave sigue funcionando).
- Q: ¿La duración de los servicios debe ser múltiplo de 15 minutos? → A: Sí (15, 30, 45, 60…).
- Q: ¿Cómo se verifican SC-002 y SC-003? → A: Prueba manual previa a la entrega: 2 personas que nunca han usado CitaClara realizan ambas tareas en portátil y móvil, cronometradas.
- Q: ¿Hasta cuándo puede cancelar el paciente, desde el portal o desde el enlace del recordatorio? (S1 de la revisión cruzada) → A: Hasta la hora de inicio de la cita en todos los canales, igual que recepción (opción A); el portal deja su regla de 24 horas y el recordatorio no cambia. El plazo de cada canal se fija solo en FR-018 de la 001; las demás specs lo citan.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar la agenda del día de un profesional (Priority: P1)

La recepcionista entra en el panel con la clave de la clínica, elige un profesional y un día,
y ve de un vistazo qué huecos de su horario están ocupados (con paciente, servicio, hora y
estado de cada cita) y cuáles están libres.

**Why this priority**: es la pantalla en la que recepción vive todo el día; sin ella no hay
producto. Con la semilla cargada ya aporta valor demostrable por sí sola.

**Independent Test**: con la semilla cargada, entrar con la clave, elegir a María y un día
laborable de la historia, y comprobar que las citas mostradas y los huecos libres coinciden
exactamente con los datos de demostración.

**Acceptance Scenarios**:

1. **Given** la recepcionista no ha entrado, **When** abre el panel, **Then** se le pide la
   clave de la clínica y no ve ningún dato de la agenda.
2. **Given** introduce una clave incorrecta, **When** intenta entrar, **Then** ve el mensaje
   «La clave no es correcta. Revísala e inténtalo de nuevo.» y sigue sin acceso.
3. **Given** ha entrado con la clave correcta, **When** abre la agenda, **Then** ve por
   defecto el día de hoy del primer profesional, con sus citas en orden cronológico y los
   huecos libres de su horario claramente diferenciados.
4. **Given** está viendo la agenda de María, **When** cambia a Jorge o a otro día (anterior,
   siguiente o elegido en un calendario), **Then** la agenda se actualiza al profesional y
   día elegidos.
5. **Given** un día con una cita cancelada, **When** se muestra la agenda, **Then** la cita
   cancelada aparece identificada como tal y su hueco se muestra como libre.

---

### User Story 2 - Dar de alta una cita sin solapes (Priority: P1)

La recepcionista elige un hueco libre (o introduce día y hora), selecciona servicio y paciente,
y registra la cita. El sistema calcula el fin a partir de la duración del servicio y rechaza
cualquier cita que solape otra del mismo profesional o que empiece en el pasado.

**Why this priority**: es la única escritura en la agenda de esta spec y contiene la regla
capital del producto (Principio III).

**Independent Test**: crear una cita en un hueco libre futuro y comprobar que aparece en la
agenda; intentar crear otra que solape, otra en el pasado y dos simultáneas sobre el mismo
hueco, y comprobar que solo la válida (y solo una de las simultáneas) queda registrada.

**Acceptance Scenarios**:

1. **Given** María tiene libre el lunes 16/11/2026 de 10:00 a 12:00, **When** se da de alta
   una «Sesión de fisioterapia» (45 min) a las 10:00 para un paciente, **Then** queda una
   cita reservada de 10:00 a 10:45 y la agenda la muestra ocupando ese hueco.
2. **Given** María tiene una cita reservada de 10:00 a 10:45, **When** se intenta crear una
   «Primera visita de fisioterapia» (60 min) a las 10:30, **Then** se rechaza con un mensaje
   que indica que María ya tiene una cita de 10:00 a 10:45 y no se registra nada.
3. **Given** María tiene una cita reservada de 10:00 a 10:45, **When** se crea otra a las
   10:45, **Then** se registra (citas contiguas no se solapan).
4. **Given** María tiene una cita cancelada de 10:00 a 10:45, **When** se crea otra a las
   10:00, **Then** se registra.
5. **Given** Jorge tiene una cita de 10:00 a 10:45, **When** se crea una cita para María a
   las 10:00, **Then** se registra (el solape solo afecta al mismo profesional).
6. **Given** son las 12:10 de hoy, **When** se intenta crear una cita hoy a las 12:00 o
   cualquier día anterior, **Then** se rechaza con el mensaje «No se pueden crear citas en
   el pasado.».
7. **Given** el hueco de 10:00 de María está libre, **When** dos recepcionistas registran a
   la vez una cita en ese hueco, **Then** exactamente una queda registrada y la otra recibe
   un rechazo claro indicando que el hueco acaba de ocuparse.
8. **Given** el horario termina a las 20:00, **When** se intenta crear una cita de 60 min a
   las 19:30, **Then** se rechaza indicando que la cita terminaría fuera del horario.
9. **Given** el paciente no tiene ficha, **When** recepción introduce su nombre y teléfono en
   el alta de cita y la guarda, **Then** se crea la ficha y la cita queda reservada a su
   nombre.

---

### User Story 3 - Registrar el desenlace de una cita (Priority: P2)

La recepcionista marca cada cita reservada como completada, cancelada o no asistida desde la
propia agenda del día.

**Why this priority**: mantiene la agenda fiel a la realidad y libera huecos cancelados, pero
la agenda ya es útil sin ello.

**Independent Test**: sobre citas reservadas de la semilla, aplicar cada acción y comprobar
el nuevo estado, que el hueco se libera solo al cancelar y que las transiciones no permitidas
no están disponibles.

**Acceptance Scenarios**:

1. **Given** una cita reservada que aún no ha empezado, **When** se cancela (con
   confirmación), **Then** pasa a «Cancelada» y su hueco aparece libre.
2. **Given** una cita reservada cuya hora de inicio ya ha llegado, **When** se marca como
   completada, **Then** pasa a «Completada».
3. **Given** una cita reservada cuya hora de inicio ya ha llegado, **When** se marca como no
   asistida, **Then** pasa a «No asistida».
4. **Given** una cita reservada que aún no ha empezado, **When** se consultan sus acciones,
   **Then** solo está disponible «Cancelar» (no se puede completar ni marcar no asistida algo
   que no ha ocurrido).
5. **Given** una cita completada, cancelada o no asistida, **When** se consultan sus
   acciones, **Then** no hay ninguna acción de cambio de estado disponible.

---

### Edge Cases

- Solape parcial al inicio, al final, contenido dentro y que contiene a otra cita: todos se
  rechazan. Contigüidad exacta (fin de una = inicio de otra) se permite.
- Reservas simultáneas del mismo hueco (o de huecos que se solapan parcialmente) desde dos o
  más puestos: solo una prospera; el resto recibe rechazo claro.
- Cita creada para hoy a una hora que ya ha pasado mientras el formulario estaba abierto: se
  rechaza al guardar (la comprobación de pasado se hace en el momento de registrar).
- Cita que empezaría dentro del horario pero terminaría fuera: se rechaza.
- Día no laborable (sábado o domingo): la agenda se muestra sin huecos libres y no admite
  altas.
- Cambio de horario de verano/invierno: ocurre de madrugada, fuera del horario de la clínica,
  por lo que no afecta a ninguna cita; las duraciones siempre son minutos reales.
- Una cita no asistida o completada nunca vuelve a «Reservada»; una cancelada tampoco.
- Alta rápida de paciente con un teléfono ya registrado (aunque se escriba con otro formato
  o llegue a la vez desde dos puestos): se rechaza y se ofrece la ficha existente; nunca
  quedan dos fichas con el mismo teléfono en una clínica.
- Intento de cambio de estado sobre una cita que otro puesto acaba de cambiar: se rechaza y
  se muestra el estado actual.
- Sesión caducada o clave cambiada: cualquier acción devuelve a la pantalla de entrada sin
  perder la indicación de qué ha pasado.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso**

- **FR-001**: El panel DEBE exigir la clave de la clínica antes de mostrar o modificar
  cualquier dato. En la 001 cada instalación sirve a una sola clínica y la clave se comprueba
  contra ella; es válida para todo su personal (autenticación simplificada v1; deuda técnica
  consciente, sin usuarios individuales).
- **FR-002**: Con clave incorrecta, el sistema DEBE mostrar un mensaje comprensible y no
  revelar ningún dato de la clínica.
- **FR-003**: Recepción DEBE poder cerrar la sesión; tras cerrarla, el panel vuelve a pedir
  la clave.
- **FR-004**: Todos los profesionales, servicios, pacientes y citas DEBEN pertenecer a una
  clínica, y el panel solo muestra y modifica los de la clínica de la instalación. (La
  convivencia de varias clínicas en una instalación queda fuera de la 001.)

**Agenda del día**

- **FR-005**: El sistema DEBE mostrar, para un profesional y un día elegidos, todas sus citas
  de ese día en orden cronológico con: hora de inicio y fin, paciente, servicio y estado.
- **FR-006**: El sistema DEBE mostrar los huecos libres del horario de ese día, diferenciados
  visualmente de los ocupados. Un tramo está ocupado si lo cubre una cita reservada o
  completada; las citas canceladas y no asistidas se muestran pero no ocupan el hueco.
- **FR-007**: Recepción DEBE poder cambiar de profesional y de día (día anterior, siguiente,
  hoy y fecha concreta).
- **FR-008**: Desde un hueco libre futuro, recepción DEBE poder iniciar el alta de cita con
  profesional, día y hora ya rellenados.

**Alta de cita**

- **FR-009**: Una cita DEBE unir exactamente un profesional, un servicio y un paciente de la
  misma clínica, con un inicio; el fin se calcula como inicio + duración del servicio y no se
  introduce manualmente.
- **FR-009a**: Cada servicio pertenece a una especialidad y solo DEBE poder reservarse con
  profesionales de esa especialidad. Al dar de alta una cita, solo se ofrecen los servicios
  de la especialidad del profesional; cualquier combinación incompatible se rechaza (p. ej.,
  «Consulta de nutrición» con María, que es de Fisioterapia).
- **FR-010**: Toda cita nueva DEBE nacer en estado «reservada».
- **FR-011 (RN1)**: El sistema NO DEBE permitir registrar una cita cuyo intervalo
  [inicio, fin) se solape con el de otra cita reservada o completada del mismo profesional.
  Dos citas se solapan si `inicio_A < fin_B` y `inicio_B < fin_A`.
- **FR-012 (RN1, concurrencia)**: La garantía de FR-011 DEBE mantenerse aunque varias altas
  que se solapan lleguen al mismo tiempo: exactamente una queda registrada y las demás
  reciben un rechazo claro. Ninguna vía de escritura puede saltarse esta regla.
- **FR-013 (RN2)**: El sistema NO DEBE permitir registrar una cita cuyo inicio sea anterior
  al momento actual en la hora local de la clínica, comprobado en el momento de registrar.
- **FR-014**: La duración de todo servicio DEBE ser múltiplo de 15 minutos. Las citas DEBEN
  empezar en múltiplos de 15 minutos y quedar completamente
  dentro del horario de la clínica: lunes a viernes de 09:00 a 20:00, sin pausa, igual para
  todos sus profesionales.
- **FR-015**: Todo rechazo DEBE explicar en lenguaje de clínica qué ha pasado y qué puede
  hacer la recepcionista (p. ej., indicar la cita con la que choca y sugerir otro hueco).
- **FR-016**: Al elegir el paciente, recepción DEBE poder buscarlo por nombre o teléfono
  entre las fichas existentes.
- **FR-016a**: Si el paciente no existe, recepción DEBE poder crear su ficha desde el propio
  formulario de alta de cita (nombre y teléfono obligatorios, correo electrónico opcional) y
  quedar seleccionada para la cita. En la 001 no hay edición de fichas ni listado de
  pacientes independiente.
- **FR-016b**: El teléfono DEBE ser único dentro de cada clínica. Al comparar se ignoran
  espacios, guiones y el prefijo +34 (p. ej., «612 345 678», «612-345-678» y
  «+34 612345678» son el mismo teléfono). Si ya existe una ficha con ese teléfono, la
  creación se rechaza con el mensaje «Ya hay un paciente con este teléfono: [nombre].» y se
  ofrece seleccionar esa ficha.
- **FR-016c**: Solo se aceptan teléfonos españoles: 9 cifras que empiezan por 6, 7, 8 o 9,
  con o sin prefijo +34 / 0034. Cualquier otro valor se rechaza con «Revisa el teléfono: debe
  ser un número español de 9 cifras.» (p. ej., «512 345 678» o «+44 7700 900123» se
  rechazan).

**Estados**

- **FR-017**: Los únicos cambios de estado permitidos son desde «reservada» a «completada»,
  «cancelada» o «no asistida». Los tres estados finales son definitivos.
- **FR-018** *(Enmienda S1, 2026-11-07)*: Política de cancelación. Este requisito es la
  única fuente del plazo para cancelar una cita «reservada», canal por canal. En todos los
  canales el plazo se comprueba con el reloj del servidor en el momento de procesar la
  cancelación (al confirmar), no al mostrar la pantalla o el enlace, y compara instantes,
  por lo que el cambio de hora no lo altera.

  **Plazo de cancelación por canal**

  | Canal | Se puede cancelar si | El plazo vence | Ejemplo: cita del lunes 16/11/2026 a las 10:00 |
  |-------|----------------------|----------------|------------------------------------------------|
  | Recepción (panel) | `ahora < inicio` | en el instante de inicio: con `ahora ≥ inicio` se rechaza | Último minuto permitido: lunes 16/11/2026 a las 09:59 (hasta las 09:59:59). Primer minuto rechazado: lunes 16/11/2026 a las 10:00 (desde las 10:00:00). |
  | Paciente – portal | `ahora < inicio` | en el instante de inicio: con `ahora ≥ inicio` se rechaza | Último minuto permitido: lunes 16/11/2026 a las 09:59 (hasta las 09:59:59). Primer minuto rechazado: lunes 16/11/2026 a las 10:00 (desde las 10:00:00). |
  | Paciente – recordatorio | `ahora < inicio` | en el instante de inicio: con `ahora ≥ inicio` se rechaza | Último minuto permitido: lunes 16/11/2026 a las 09:59 (hasta las 09:59:59). Primer minuto rechazado: lunes 16/11/2026 a las 10:00 (desde las 10:00:00). |

  - *Recepción (panel)*: «Cancelar» solo DEBE estar disponible antes de la hora de inicio de
    la cita, y DEBE pedir confirmación. Un intento de cancelar a partir de la hora de inicio
    (p. ej., con la pantalla abierta desde antes) se rechaza indicando que debe marcarse como
    completada o no asistida.
  - *Filas de paciente*: rigen los canales de paciente que definen la spec del portal del
    paciente (fila «Paciente – portal») y la spec de recordatorios de cita (fila «Paciente –
    recordatorio»). La 001 no implementa ningún canal de paciente; solo fija su plazo. Esas
    specs DEBEN citar «001, FR-018, fila Paciente – portal» o «001, FR-018, fila Paciente –
    recordatorio» y NO DEBEN fijar plazos propios, ni en requisitos ni en supuestos ni en
    ejemplos. Si un canal necesita otro plazo, se pide al propietario de la 001 como enmienda
    de esta tabla.
  - Las tres filas tienen hoy el mismo plazo por decisión de producto (S1, opción A); una fila
    solo cambia por enmienda de este requisito. Lo que se muestra al paciente fuera de plazo y
    cómo se registra quién canceló no forman parte de este requisito.
- **FR-019**: «Completada» y «No asistida» solo DEBEN estar disponibles a partir de la hora de
  inicio de la cita. «No asistida» significa exclusivamente que el paciente no se presentó a
  una cita que seguía reservada.
- **FR-020**: Si el estado de una cita cambió desde que se mostró, el sistema DEBE rechazar
  la acción y mostrar el estado actual.

**Datos de demostración**

- **FR-021**: El sistema DEBE poder generar una semilla determinista: con la misma fecha de
  referencia, produce exactamente los mismos datos, siempre, incluidos los identificadores de
  todos los registros (así las direcciones de la agenda citadas en documentación y tests son
  reproducibles). La única excepción es el hash de la clave de panel, que puede variar entre
  ejecuciones; la clave en sí es siempre la misma.
- **FR-022**: La semilla DEBE contener: «Clínica Eleva»; 3 profesionales (María y Jorge,
  Fisioterapia; Lucía, Nutrición); 4 servicios (Sesión de fisioterapia, 45 min, 40,00 €;
  Primera visita de fisioterapia, 60 min, 50,00 €; Consulta de nutrición, 30 min, 35,00 €;
  Primera visita de nutrición, 45 min, 45,00 €); 40 pacientes con nombres, teléfonos (todos
  distintos) y correos españoles ficticios.
- **FR-023**: La semilla DEBE generar 8 semanas de historia anteriores a la fecha de
  referencia, con citas en estados finales (en torno al 10 % no asistidas y al 8 %
  canceladas, ±1 punto, el resto completadas), y 2 semanas futuras con citas reservadas.
  Como consecuencia de FR-009a, los servicios de fisioterapia solo aparecen con María y
  Jorge, y los de nutrición solo con Lucía.
- **FR-024**: Ninguna cita de la semilla DEBE incumplir RN1, el horario ni la granularidad de
  15 minutos. Las cifras exactas resultantes (nº de citas por estado y profesional) DEBEN
  quedar documentadas junto a la semilla para poder citarlas.

### Constitution Requirements *(mandatory)*

- **Owner**: MarceloMansilla (registrado en `specs/MAPA.md`).
- **Writes to the agenda?**: Sí — alta de cita y cambios de estado (cancelar libera hueco).
  Pruebas de solape obligatorias: solape parcial por ambos lados, contenido, contenedor,
  contigüidad permitida, distinto profesional permitido, citas canceladas/no asistidas que no
  bloquean, y altas simultáneas del mismo hueco y de huecos parcialmente solapados. La
  semilla también escribe en la agenda y DEBE verificarse sin solapes.
- **Amounts and dates**:
  - Importes en euros con céntimos, formato español: «40,00 €», «50,00 €», «35,00 €»,
    «45,00 €». En esta spec no hay cálculos ni redondeos; los precios solo se muestran.
  - Fechas con día antes que mes y reloj de 24 h: «lunes, 16/11/2026», «10:00–10:45».
  - Toda hora se interpreta y muestra en la hora local de la clínica (Clínica Eleva:
    Europe/Madrid, hora peninsular). Una clínica en Canarias vería y reservaría en su hora
    local (una hora menos que la peninsular).
  - Ejemplo: Sesión de fisioterapia a las 09:30 → fin 10:15; Primera visita de fisioterapia
    a las 19:00 → fin 20:00 (válida); a las 19:15 → fin 20:15 (rechazada, fuera de horario).
  - Cambio de hora (último domingo de marzo/octubre, de madrugada): fuera de horario, sin
    efecto en citas.
- **Demo data**: esta spec crea la semilla (FR-021 a FR-024). Cifras fijas: 1 clínica,
  3 profesionales, 4 servicios, 40 pacientes, 8 semanas de historia, 2 semanas futuras. El
  plan DEBE documentar el total exacto de citas por estado para la fecha de referencia usada
  en ejemplos y tests.

### Key Entities *(include if feature involves data)*

- **Clínica**: nombre, zona horaria, horario de apertura y clave de panel. Agrupa todo lo
  demás.
- **Profesional**: nombre y especialidad; pertenece a una clínica.
- **Servicio**: nombre, especialidad, duración en minutos (siempre múltiplo de 15: 15, 30,
  45, 60…) y precio en euros (con céntimos); pertenece a una clínica. Solo lo atienden profesionales de su misma especialidad.
- **Paciente (ficha)**: nombre y teléfono (obligatorios; teléfono único por clínica) y
  correo electrónico (opcional); pertenece a una clínica. No tiene acceso al sistema.
- **Cita**: une profesional, servicio y paciente de la misma clínica; inicio, fin (= inicio +
  duración del servicio en el momento de reservar) y estado (reservada, completada,
  cancelada, no asistida).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En 1.000 intentos automatizados de provocar solapes (incluidas ráfagas de 10
  altas simultáneas sobre el mismo hueco), el número de solapes registrados es 0 y en cada
  ráfaga queda exactamente 1 cita.
- **SC-002**: Una recepcionista sin formación previa consigue dar de alta una cita en un
  hueco libre en menos de 1 minuto en el primer intento, en portátil y en móvil.
- **SC-003**: Una recepcionista identifica correctamente los huecos libres de un profesional
  en un día en menos de 10 segundos.
- *Verificación de SC-002 y SC-003*: prueba manual previa a la entrega con 2 personas que
  nunca han usado CitaClara, cronometradas en portátil y en móvil; ambas DEBEN cumplir los
  dos tiempos. El resultado se registra junto a la entrega.
- **SC-004**: La agenda del día se muestra completa en menos de 2 segundos tras elegir
  profesional o día.
- **SC-005**: Regenerar la semilla con la misma fecha de referencia produce datos idénticos
  (contenido e identificadores, salvo el hash de la clave) en el 100 % de las ejecuciones, y sus porcentajes de no asistencia y cancelación quedan en
  10 % ± 1 y 8 % ± 1.
- **SC-006**: Todas las pantallas se usan sin desplazamiento horizontal desde 360 px de ancho
  y cumplen el contraste mínimo AA.

## Assumptions

- Horario único por clínica, igual para todos sus profesionales: lunes a viernes de 09:00 a
  20:00, sin pausa. Horarios por profesional, festivos y vacaciones van en specs propias.
- Granularidad de inicio de 15 minutos; los huecos libres se muestran como tramos continuos
  del horario no ocupados.
- En la 001 no se editan ni mueven citas, ni se gestionan profesionales o servicios desde la
  interfaz: vienen de la semilla. Para cambiar una cita se cancela y se crea otra.
- La clave de panel se fija en la semilla/configuración; no hay pantalla para cambiarla. La
  sesión dura hasta cerrar sesión o 12 horas.
- El fin de la cita se fija al reservar; cambios posteriores en la duración del servicio no
  afectan a citas existentes.
- Las citas pasadas que sigan reservadas permanecen así hasta que recepción las marque; no
  hay cierre automático.
- Fuera de alcance: cualquier acceso del paciente, recordatorios, analítica, pagos online y
  varias clínicas en una misma instalación.
- Dependencia: `specs/MAPA.md` se crea con esta spec y la registra.
