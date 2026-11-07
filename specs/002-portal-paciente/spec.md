# Feature Specification: Portal del paciente

**Feature Branch**: `portal`

**Created**: 2026-11-07

**Status**: Aprobada (2026-11-07, MarceloMansilla)

**Input**: User description: "Portal del paciente. Los pacientes de la clínica quieren ver sus citas y cancelarlas sin llamar por teléfono (Sonia, recepción de Eleva, dedica «la mitad de la mañana» a esto). Alcance: un paciente accede a una página personal moderna donde ve sus citas futuras y pasadas y puede cancelar una cita futura. Interfaz limpia y responsive, pensada para móvil. Preguntas que la spec debe dejar decididas (formúlalas cerradas, para Sara): cómo accede el paciente sin crear cuentas ni contraseñas (las clínicas pequeñas no van a gestionar altas), hasta cuándo puede cancelar, y qué pasa con el hueco liberado. Datos: Cita casos reales de la semilla en los ejemplos. Fuera de alcance v1: reservar o mover citas online, pagos."

## Contexto

Sonia, de recepción de Clínica Eleva, dedica «la mitad de la mañana» a atender llamadas de
pacientes que solo quieren saber cuándo tienen cita o anularla. Esta spec da a cada paciente
una página personal, pensada para el móvil, donde consulta sus citas y cancela las futuras sin
llamar. No crea cuentas ni contraseñas: la clínica no gestiona altas de usuarios.

Todos los ejemplos usan la semilla de la spec 001 con fecha de referencia **lunes
09/11/2026** y el reloj de la aplicación fijado a las **12:10** de ese día (hora peninsular,
Europe/Madrid): Clínica Eleva; María y Jorge (Fisioterapia); Lucía (Nutrición); «Sesión de
fisioterapia» (45 min), «Primera visita de fisioterapia» (60 min), «Consulta de nutrición»
(30 min) y «Primera visita de nutrición» (45 min). La historia de la semilla va del lunes
14/09/2026 al viernes 06/11/2026; las citas futuras, todas reservadas, del lunes 09/11/2026
al viernes 20/11/2026.

## Clarifications

### Session 2026-11-07

- Q: ¿Cómo accede el paciente sin crear cuentas ni contraseñas? → A: Enlace personal + confirmar las 4 últimas cifras de su teléfono (opción C).
- Q: ¿Hasta cuándo puede cancelar el paciente desde el portal? → A: Hasta 24 horas antes del inicio de la cita (opción A).
- Q: ¿Qué pasa con el hueco que libera el paciente? → A: Queda libre al instante y recepción ve en el panel un aviso con los huecos liberados por pacientes (opción B).
- Q: ¿Cuánto tiempo vale el enlace personal del paciente? → A: No caduca; recepción puede generar uno nuevo, que anula el anterior (opción B).
- Q: ¿Cómo recibe el paciente su enlace personal en la v1? → A: Recepción lo copia desde la agenda y lo envía por el canal habitual de la clínica; los recordatorios podrán incluirlo cuando existan (opción B).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar mis citas desde el móvil (Priority: P1)

Un paciente de Clínica Eleva abre su acceso personal en el móvil y ve, sin crear ninguna
cuenta, sus próximas citas (día, hora, profesional y servicio) y su historial de citas
pasadas y canceladas.

**Why this priority**: «¿cuándo era mi cita?» es la llamada más repetida; resolverla ya
descarga a recepción aunque todavía no se pueda cancelar.

**Independent Test**: con la semilla cargada, elegir un paciente con citas futuras y pasadas,
entrar en su portal y comprobar que las citas mostradas coinciden exactamente con las suyas
en la semilla, y que no aparece ninguna cita de otro paciente.

**Acceptance Scenarios**:

1. **Given** un paciente de la semilla con una «Sesión de fisioterapia» con María reservada
   para el lunes 16/11/2026 a las 10:00, **When** entra en su portal, **Then** ve en
   «Próximas citas» «lunes, 16/11/2026 · 10:00–10:45 · Sesión de fisioterapia · María», en
   orden cronológico con el resto de sus citas futuras.
2. **Given** ese paciente tuvo citas entre el 14/09/2026 y el 06/11/2026, **When** abre
   «Historial», **Then** las ve de la más reciente a la más antigua, cada una con su estado
   («Realizada», «Cancelada» o «No asistida»).
3. **Given** un paciente sin ninguna cita futura, **When** entra en su portal, **Then** ve
   «No tienes próximas citas» y el teléfono de la clínica para pedir una.
4. **Given** alguien abre el enlace personal de un paciente, **When** escribe unas cifras que
   no son las 4 últimas del teléfono de la ficha, **Then** ve «Las cifras no coinciden.
   Revísalas e inténtalo de nuevo.» y no ve ningún dato de ninguna cita ni de ningún paciente.
5. **Given** recepción ha generado un enlace nuevo para un paciente, **When** alguien abre
   el enlace anterior, **Then** se muestra «Este enlace ya no es válido. Pide uno nuevo a
   Clínica Eleva en el 911 234 567.» y ningún dato.
6. **Given** un paciente con el portal abierto, **When** recepción genera un enlace nuevo
   para él, **Then** su siguiente acción en el portal le lleva al mensaje de US1 #5.

---

### User Story 2 - Cancelar una cita futura sin llamar (Priority: P1)

El paciente cancela una de sus próximas citas desde el portal, con una confirmación, y la
cita queda cancelada en la agenda de la clínica al instante.

**Why this priority**: es la otra mitad de las llamadas de Sonia y la razón de ser del
portal; además es la única escritura en la agenda de esta spec.

**Independent Test**: cancelar desde el portal una cita futura de la semilla dentro de plazo
y comprobar que pasa a «Cancelada» en el portal y en la agenda de recepción; intentar
cancelar otra fuera de plazo y comprobar que se rechaza.

**Acceptance Scenarios**:

1. **Given** el paciente tiene una cita reservada dentro del plazo de cancelación (FR-012),
   **When** pulsa «Cancelar cita» y confirma, **Then** la cita pasa a «Cancelada», desaparece
   de «Próximas citas», aparece en «Historial» y ve «Tu cita del lunes, 16/11/2026 a las
   10:00 está cancelada.».
2. **Given** el paciente pulsa «Cancelar cita», **When** en la confirmación elige «No,
   mantenerla», **Then** la cita sigue reservada sin cambios.
3. **Given** una cita fuera del plazo de cancelación, **When** el paciente la ve, **Then** no
   tiene botón «Cancelar cita» y se le indica «Ya no se puede cancelar desde aquí. Llama a
   Clínica Eleva al 911 234 567.».
4. **Given** el paciente abrió el portal dentro de plazo y confirma cuando el plazo ya ha
   vencido, **When** se procesa la cancelación, **Then** se rechaza con el mensaje de US2 #3
   y la cita sigue reservada.
5. **Given** recepción acaba de cambiar el estado de esa cita (p. ej., la canceló), **When**
   el paciente confirma la cancelación, **Then** se le muestra el estado actual de la cita y
   no se cambia nada.
6. **Given** el paciente cancela una cita de María el lunes 16/11/2026 de 10:00 a 10:45,
   **When** recepción abre la agenda de María de ese día, **Then** la cita aparece
   «Cancelada por el paciente» y el hueco de 10:00 a 10:45 aparece libre y reservable.

---

### User Story 3 - Recepción se entera de los huecos que liberan los pacientes (Priority: P2)

Sonia ve en la agenda qué citas canceló el propio paciente desde el portal, para no llamarle
a confirmar, y un aviso en el panel le reúne los huecos liberados que siguen libres, para
ofrecérselos a otros pacientes.

**Why this priority**: evita que el portal genere llamadas nuevas («¿la canceló usted?») y
cierra el circuito con recepción; el portal ya aporta valor sin ello.

**Independent Test**: cancelar una cita desde el portal y otra desde recepción, y comprobar
que en la agenda se distingue quién canceló cada una y que solo la primera aparece en el
aviso de huecos liberados, hasta que recepción vuelve a ocupar ese hueco.

**Acceptance Scenarios**:

1. **Given** una cita cancelada desde el portal, **When** recepción la ve en la agenda,
   **Then** aparece como «Cancelada por el paciente» con día y hora de la cancelación.
2. **Given** una cita cancelada desde recepción, **When** se ve en la agenda, **Then** aparece
   como «Cancelada» sin esa indicación y no genera aviso.
3. **Given** un paciente canceló desde el portal su cita con María del lunes 16/11/2026 de
   10:00 a 10:45, **When** recepción entra en el panel, **Then** ve el aviso «Huecos
   liberados por pacientes (1)» y, al abrirlo, «María · lunes, 16/11/2026 · 10:00–10:45».
4. **Given** ese hueco aparece en el aviso, **When** recepción reserva en él una «Sesión de
   fisioterapia» a las 10:00 para otro paciente, **Then** el hueco desaparece del aviso y,
   si no queda ninguno, el aviso deja de mostrarse.

---

### Edge Cases

- Dos cancelaciones simultáneas de la misma cita (dos pestañas del paciente, o paciente y
  recepción a la vez): exactamente una surte efecto; la otra ve el estado actual.
- El paciente cancela y en ese mismo instante recepción reserva ese hueco para otro paciente:
  la reserva solo prospera si el hueco ya está libre; nunca quedan dos citas solapadas
  (Principio III).
- El plazo vence con la pantalla abierta: la comprobación se hace al confirmar (US2 #4).
- Cita de hoy, 09/11/2026, a las 12:00 (ya empezada a las 12:10): aparece en «Historial» como
  pasada, sin opción de cancelar.
- Cita pasada que recepción aún no ha marcado (sigue «reservada», spec 001): en «Historial»
  aparece como «Pasada», sin afirmar si se realizó o no.
- Paciente cuyo teléfono comparten varios miembros de una familia: imposible, el teléfono es
  único por clínica (FR-016b de la 001); cada ficha tiene su propio acceso.
- Cambio de hora (último domingo de marzo/octubre): ningún plazo de 24 horas cruza el cambio
  (ver «Amounts and dates»); el plazo se muestra en la hora local de la clínica.
- Plazo vencido con la cita aún futura: cita del martes 10/11/2026 a las 10:00 vista el lunes
  09/11/2026 a las 12:10 → se muestra en «Próximas citas» sin botón de cancelar y con el
  teléfono de la clínica.
- Clínica en Canarias: el paciente ve sus citas y plazos en la hora local de la clínica.
- Pantalla de 360 px de ancho: todo usable sin desplazamiento horizontal.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso sin cuentas**

- **FR-001**: El paciente DEBE acceder a su portal sin crear cuenta ni contraseña y sin que la
  clínica tenga que darle de alta en nada distinto de su ficha de paciente (spec 001).
- **FR-002**: El acceso DEBE hacerse en dos pasos: (1) el paciente abre su enlace personal,
  único por ficha e imposible de deducir a partir de otro; (2) confirma las 4 últimas cifras
  del teléfono de su ficha. Solo con ambos se muestran sus citas. Ejemplo: para una ficha con
  teléfono «612 345 678», el paciente escribe «5678». El enlace por sí solo no muestra ningún
  dato, ni siquiera el nombre del paciente.
- **FR-002a**: El enlace personal NO DEBE caducar por tiempo: cada ficha tiene un único enlace
  válido. Recepción DEBE poder generar un enlace nuevo para un paciente desde cualquiera de
  sus citas en la agenda («Generar nuevo enlace del portal», con confirmación); al hacerlo,
  el enlace anterior deja de funcionar al instante y cualquier sesión abierta con él se
  cierra.
- **FR-002b**: En la v1 el sistema no envía el enlace por sí mismo. Recepción DEBE poder
  copiar el enlace vigente de un paciente desde cualquiera de sus citas en la agenda
  («Copiar enlace del portal») para enviárselo por el canal habitual de la clínica (WhatsApp,
  correo…). Cuando exista la spec de recordatorios, sus mensajes podrán incluirlo.
- **FR-003**: Sin haber completado el acceso, el sistema NO DEBE mostrar ningún dato de citas
  ni de pacientes, ni siquiera el nombre. Ante un enlace, lo único que DEBE distinguir es si
  sigue vigente (pide las 4 cifras) o no (mensaje de US1 #5); como el enlace es imposible de
  deducir (FR-002), esa distinción no permite descubrir pacientes. El portal nunca pide el
  teléfono completo, así que no sirve para averiguar si un teléfono es de un paciente.
- **FR-004**: Un acceso solo DEBE dar visibilidad sobre las citas de la ficha de ese paciente
  en esa clínica; jamás sobre las de otro paciente.
- **FR-005**: Los intentos fallidos de confirmar las 4 cifras DEBEN limitarse por enlace:
  tras 5 fallos seguidos, el enlace se bloquea 15 minutos («Has superado los intentos.
  Vuelve a probar a las [hora].»); tras 10 fallos acumulados sin un acceso correcto entre
  medias, el enlace queda bloqueado hasta que recepción genere uno nuevo (FR-002a) («Por
  seguridad, este enlace se ha bloqueado. Llama a Clínica Eleva al 911 234 567.»). Así, quien
  tenga un enlace ajeno acierta las 4 cifras como mucho en 10 de 10.000 combinaciones (0,1 %).
- **FR-006**: El paciente DEBE poder salir del portal; después necesita volver a acceder.

**Consulta de citas**

- **FR-007**: El portal DEBE mostrar «Próximas citas»: las citas reservadas del paciente cuyo
  inicio aún no ha llegado, en orden cronológico, con día de la semana y fecha, hora de
  inicio y fin, servicio y profesional.
- **FR-008**: El portal DEBE mostrar «Historial»: las citas cuyo inicio ya ha llegado y todas
  las canceladas, de la más reciente a la más antigua, con su estado en lenguaje de paciente:
  completada → «Realizada», cancelada → «Cancelada», no asistida → «No asistida», reservada
  con inicio pasado → «Pasada».
- **FR-009**: El portal DEBE mostrar el nombre y el teléfono de la clínica en todas sus
  pantallas.
- **FR-010**: El portal NO DEBE mostrar importes, notas internas ni datos de otros pacientes o
  de la agenda de los profesionales.

**Cancelación**

- **FR-011**: El paciente DEBE poder cancelar cualquier cita propia en estado «reservada»
  dentro del plazo de FR-012, con un paso de confirmación que repite día, hora, servicio y
  profesional.
- **FR-012**: El paciente DEBE poder cancelar desde el portal solo mientras falten más de
  24 horas para el inicio de la cita: el plazo vence exactamente 24 horas antes del inicio y,
  desde ese instante, ya no se puede cancelar desde el portal.
  Para cada cita futura el portal DEBE mostrar el plazo como fecha y hora local concretas, y
  comprobarlo en el momento de confirmar. Ejemplos con el reloj a las 12:10 del lunes
  09/11/2026: cita del martes 10/11/2026 a las 10:00 → plazo vencido el lunes 09/11/2026 a
  las 10:00, no se puede cancelar desde el portal; cita del martes 10/11/2026 a las 12:15 →
  se puede cancelar hasta el lunes 09/11/2026 a las 12:15; cita del lunes 16/11/2026 a las
  10:00 → «Puedes cancelarla hasta el domingo, 15/11/2026 a las 10:00».
- **FR-013**: Fuera de plazo, el portal NO DEBE ofrecer la cancelación y DEBE indicar el
  teléfono de la clínica. Recepción mantiene su propia regla de la spec 001 (cancelar hasta
  la hora de inicio).
- **FR-014**: La cancelación desde el portal DEBE producir el mismo cambio de estado que la de
  recepción («reservada» → «cancelada», definitivo) y respetar FR-017 y FR-020 de la 001: si
  el estado cambió desde que se mostró, se rechaza y se muestra el estado actual.
- **FR-015**: El hueco que libera una cancelación desde el portal DEBE quedar libre en la
  agenda al instante, igual que cuando cancela recepción, y la cita se muestra como
  «Cancelada por el paciente» (US3).
- **FR-015a**: El panel de recepción DEBE mostrar un aviso «Huecos liberados por pacientes»
  con el número de huecos y, al abrirlo, la lista de esos huecos: profesional, día, hora de
  inicio y fin, y momento de la cancelación, en orden cronológico del hueco. Un hueco sale de
  la lista sin intervención de recepción en cuanto vuelve a ocuparse (total o parcialmente)
  o su hora de inicio llega. Sin huecos pendientes, el aviso no se muestra.
- **FR-016**: Toda cancelación DEBE registrar quién la hizo (paciente desde el portal o
  recepción) y cuándo.

**Calidad de interfaz (Principio VII)**

- **FR-017**: Todo el portal DEBE poder usarse con una mano en un móvil desde 360 px de ancho,
  sin desplazamiento horizontal, con contraste AA y elementos táctiles de tamaño accesible.
- **FR-018**: Ningún texto del portal DEBE contener jerga técnica; todo error dice qué ha
  pasado y qué puede hacer el paciente. Se trata al paciente de «tú».

### Constitution Requirements *(mandatory)*

- **Owner**: MarceloMansilla (se registra en `specs/MAPA.md` como borrador).
- **Writes to the agenda?**: Sí — solo la cancelación desde el portal («reservada» →
  «cancelada»). No crea ni mueve citas, por lo que no puede crear solapes por sí misma, pero
  libera huecos que recepción vuelve a ocupar. Pruebas obligatorias (Principio III):
  cancelación del paciente simultánea con una reserva de recepción sobre ese mismo hueco
  (nunca dos citas solapadas; la reserva solo prospera si la cancelación ya se aplicó);
  doble cancelación simultánea (paciente + paciente, paciente + recepción); cancelación al
  límite del plazo.
- **Amounts and dates**:
  - Sin importes: el portal no muestra precios ni calcula nada (FR-010).
  - Fechas en formato español y reloj de 24 h, en la hora local de la clínica: «lunes,
    16/11/2026 · 10:00–10:45».
  - Ejemplos con reloj fijado el lunes 09/11/2026 a las 12:10: una cita del 09/11/2026 a las
    12:00 ya es pasada; una de las 12:15 de ese mismo día es futura.
  - El plazo de cancelación (24 horas antes del inicio, FR-012) se muestra siempre como fecha
    y hora concretas: cita de María del lunes 16/11/2026 a las 10:00 → «hasta el domingo,
    15/11/2026 a las 10:00».
  - Cambio de hora: el plazo se cuenta en horas reales. Como el cambio ocurre el domingo de
    madrugada y las citas son de lunes a viernes de 09:00 a 20:00, ningún plazo de 24 horas
    lo cruza, y el plazo es siempre la misma hora local del día anterior. Ejemplo: cita del
    lunes 30/03/2026 a las 09:00 (el reloj se adelantó el domingo 29/03 a las 02:00) → plazo
    «domingo, 29/03/2026 a las 09:00».
- **Demo data**: usa la semilla de la 001 sin cambiar su contenido de citas (fecha de
  referencia 09/11/2026). El plan DEBE fijar, a partir de `docs/datos-demo.md`, al menos dos
  pacientes concretos de la semilla para ejemplos y tests: uno con citas futuras y de
  historial en varios estados, y uno sin citas futuras. La semilla DEBE generar de forma
  determinista el enlace personal de cada uno de sus 40 pacientes, para que los ejemplos y
  tests puedan citar enlaces reproducibles (ampliación de la semilla que hace esta spec).

### Key Entities *(include if feature involves data)*

- **Paciente (ficha)** — de la 001: nombre, teléfono único por clínica, correo opcional. Esta
  spec le da, por primera vez, acceso de solo lectura a sus propias citas y la capacidad de
  cancelarlas.
- **Acceso de paciente**: enlace personal que, junto con las 4 últimas cifras del teléfono de
  la ficha, permite al paciente entrar en su portal sin cuenta (FR-002); pertenece a una ficha
  y a una clínica y registra los intentos fallidos (FR-005). Cada ficha tiene exactamente un
  enlace válido; no caduca por tiempo y solo deja de valer cuando recepción genera otro
  (FR-002a).
- **Cita** — de la 001: se añade a la cancelación el origen (paciente o recepción) y el
  momento en que se produjo (FR-016).
- **Clínica** — de la 001: necesita además un teléfono de contacto que mostrar al paciente
  (FR-009, FR-013).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un paciente que nunca ha usado el portal cancela una cita dentro de plazo en
  menos de 30 segundos desde que abre su acceso, en un móvil, al primer intento.
- **SC-002**: Un paciente encuentra el día y la hora de su próxima cita en menos de 10
  segundos desde que abre su acceso.
- *Verificación de SC-001 y SC-002*: prueba manual previa a la entrega con 2 personas que no
  conocen CitaClara, en móvil, cronometradas; ambas DEBEN cumplir los dos tiempos.
- **SC-003**: Las llamadas a recepción de Clínica Eleva para consultar o cancelar citas bajan
  al menos un 50 % entre la semana anterior a activar el portal y la cuarta semana tras
  activarlo (recuento manual de Sonia, mismas categorías ambas semanas).
- **SC-004**: En las pruebas automatizadas, 0 casos en que un acceso muestre o cancele una
  cita de otro paciente, y 0 solapes en las ráfagas de cancelación + reserva simultáneas.
- **SC-005**: Una cancelación hecha desde el portal es visible en la agenda de recepción y en
  el aviso de huecos liberados en cuanto recepción vuelve a cargar el panel, sin pasos
  manuales.
- **SC-006**: Todas las pantallas del portal se usan sin desplazamiento horizontal desde
  360 px de ancho y cumplen el contraste mínimo AA.

## Assumptions

- El paciente ya tiene ficha en la clínica (creada por recepción en la 001) con un teléfono
  español válido; el correo puede faltar, así que el acceso no puede depender solo del correo.
- Una instalación sirve a una sola clínica, como en la 001.
- Tras confirmar las 4 cifras, la sesión del portal dura hasta que el paciente sale o pasan
  30 minutos sin actividad; después vuelve a pedir las 4 cifras (el enlace sigue valiendo).
- El historial muestra todas las citas registradas del paciente en la clínica, sin límite
  temporal (en la semilla, desde el 14/09/2026).
- Cancelar desde el portal es definitivo: no hay «deshacer». Para recuperar la cita, el
  paciente llama a la clínica y recepción crea una nueva si el hueco sigue libre.
- El enlace personal se entrega a mano desde recepción (FR-002b); CitaClara no envía SMS ni
  correos en esta spec. La spec de recordatorios, en paralelo, podrá incluirlo en sus
  mensajes sin cambiar esta spec.
- Fuera de alcance v1: reservar citas online, moverlas o cambiarlas, pagos, lista de espera y
  avisos automáticos a otros pacientes cuando se libera un hueco, editar los datos de la ficha,
  y portal para varias clínicas a la vez.

## Dependencias

- **Spec 001, Enmienda 1 (aprobada el 2026-11-07, MarceloMansilla)** (Principio I): la 001
  ya admite el acceso del paciente mediante esta spec, el teléfono de la clínica
  («911 234 567» en la semilla, FR-009) y el origen y momento de cada cancelación (FR-016,
  FR-018a de la 001). El enlace personal de cada paciente y su generación en la semilla
  (FR-002) son propios de esta spec. **La implementación de la 002 requiere la de la 001**
  (agenda, panel y semilla), sobre la que se construye. Además, esta spec añade al
  panel de recepción de la 001 la indicación «Cancelada por el paciente», el aviso de huecos
  liberados (US3, FR-015a) y las acciones «Copiar enlace del portal» y «Generar nuevo enlace
  del portal» (FR-002a, FR-002b).
- **Spec de recordatorios (en paralelo)**: canal futuro, no necesario, para enviar el enlace
  personal (FR-002b). Esta spec no depende de ella para entregarse.
