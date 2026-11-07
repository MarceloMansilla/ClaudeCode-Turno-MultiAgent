# Feature Specification: Portal del paciente

**Feature Branch**: `portal`

**Created**: 2026-11-07

**Status**: Aprobada (2026-11-07, MarceloMansilla) · Revisión cruzada S2–S4 (2026-11-07): el
acceso del paciente pasa a `005-acceso-cancelacion-paciente`
y el origen de la cancelación y el teléfono de la clínica, a la 001 (ver «Dependencias y
enmiendas requeridas»)

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

- Q: ¿Cómo accede el paciente sin crear cuentas ni contraseñas? → A: Enlace personal + confirmar las 4 últimas cifras de su teléfono (opción C). *(Revisión cruzada S4: el acceso lo define ahora la 005, FR-001–FR-008; la confirmación de 4 cifras se aporta a la clarificación pendiente de 005 FR-006, ver «Dependencias y enmiendas requeridas».)*
- Q: ¿Hasta cuándo puede cancelar el paciente desde el portal? → A: Hasta 24 horas antes del inicio de la cita (opción A).
- Q: ¿Qué pasa con el hueco que libera el paciente? → A: Queda libre al instante y recepción ve en el panel un aviso con los huecos liberados por pacientes (opción B).
- Q: ¿Cuánto tiempo vale el enlace personal del paciente? → A: No caduca; recepción puede generar uno nuevo, que anula el anterior (opción B). *(Revisión cruzada S4: recogido en 005, FR-003 y FR-004.)*
- Q: ¿Cómo recibe el paciente su enlace personal en la v1? → A: Recepción lo copia desde la agenda y lo envía por el canal habitual de la clínica; los recordatorios podrán incluirlo cuando existan (opción B). *(Revisión cruzada S4: recogido en 005, FR-005 y FR-008.)*

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
4. *(Retirado en la revisión cruzada S4: la confirmación de las 4 cifras depende de la
   clarificación pendiente de 005 FR-006. El escenario y su texto se aportan como propuesta en
   «Dependencias y enmiendas requeridas».)*
5. **Given** recepción ha generado un enlace nuevo para un paciente (005 FR-004), **When**
   alguien abre el enlace anterior, **Then** no ve ningún dato (005 FR-007) y el portal
   muestra «Este enlace ya no es válido. Pide uno nuevo a Clínica Eleva en el 911 234 567.».
6. **Given** un paciente con el portal abierto, **When** recepción genera un enlace nuevo
   para él, **Then** su siguiente acción en el portal le lleva al mensaje de US1 #5
   (005 US3 #4).

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

Sonia ve en la agenda qué citas canceló el propio paciente (desde el portal o desde cualquier
otro canal del paciente: el origen de 001 FR-018a no distingue canales), para no llamarle
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
  único por clínica (FR-016b de la 001); cada ficha tiene su propio enlace personal (005
  FR-001).
- Cambio de hora (último domingo de marzo/octubre): ningún plazo de 24 horas cruza el cambio
  (ver «Amounts and dates»); el plazo se muestra en la hora local de la clínica.
- Plazo vencido con la cita aún futura: cita del martes 10/11/2026 a las 10:00 vista el lunes
  09/11/2026 a las 12:10 → se muestra en «Próximas citas» sin botón de cancelar y con el
  teléfono de la clínica.
- Clínica en Canarias: el paciente ve sus citas y plazos en la hora local de la clínica.
- Pantalla de 360 px de ancho: todo usable sin desplazamiento horizontal.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso del paciente (de la 005)**

El acceso del paciente (credencial, enlace, validez, regeneración, respuesta ante un enlace
no válido y qué se muestra sin acceso) lo define únicamente
`005-acceso-cancelacion-paciente`, FR-001–FR-008.
Esta spec no define ninguna credencial ni regla de acceso: las consume. Los identificadores
FR-001 a FR-006 se conservan para no romper referencias.

- **FR-001** *(Revisión cruzada S4)*: El paciente entra en su portal con su enlace personal
  `/p/[token]`, sin cuenta ni contraseña: 005, FR-001.
- **FR-002** *(Revisión cruzada S4)*: Credencial y requisito de acceso: 005, FR-001, FR-002 y
  FR-006. La posible confirmación de las 4 últimas cifras del teléfono está pendiente de
  clarificar en 005 FR-006; la propuesta de esta spec figura en «Dependencias y enmiendas
  requeridas».
- **FR-002a** *(Revisión cruzada S4)*: Validez y regeneración del enlace: 005, FR-003 y
  FR-004. Presentación en el panel (propia de esta spec): la acción «Generar nuevo enlace del
  portal», con confirmación, está disponible desde cualquiera de las citas del paciente en la
  agenda.
- **FR-002b** *(Revisión cruzada S4)*: Obtención y entrega del enlace: 005, FR-005 y FR-008.
  Presentación en el panel (propia de esta spec): la acción «Copiar enlace del portal» está
  disponible desde cualquiera de las citas del paciente en la agenda, para enviárselo por el
  canal habitual de la clínica (WhatsApp, correo…). Los correos de
  `003-recordatorios-cita` llevan el mismo enlace (005, FR-008).
- **FR-003** *(Revisión cruzada S4)*: Sin acceso válido no se muestra ningún dato de citas ni
  de pacientes, y todos los enlaces no válidos reciben la misma respuesta: 005, FR-006 y
  FR-007. El texto de esa respuesta en el portal es el de US1 #5.
- **FR-004** *(Revisión cruzada S4)*: Un enlace solo da acceso a las citas de su ficha en su
  clínica: 005, FR-006.
- **FR-005** *(Retirado en la revisión cruzada S4)*: El límite de intentos de la confirmación
  de 4 cifras depende de 005 FR-006; se aporta como propuesta en «Dependencias y enmiendas
  requeridas».
- **FR-006** *(Retirado en la revisión cruzada S4)*: «Salir del portal» solo tiene sentido si
  005 FR-006 establece una confirmación con sesión; se aporta como propuesta en «Dependencias
  y enmiendas requeridas».

**Consulta de citas**

- **FR-007**: El portal DEBE mostrar «Próximas citas»: las citas reservadas del paciente cuyo
  inicio aún no ha llegado, en orden cronológico, con día de la semana y fecha, hora de
  inicio y fin, servicio y profesional.
- **FR-008**: El portal DEBE mostrar «Historial»: las citas cuyo inicio ya ha llegado y todas
  las canceladas, de la más reciente a la más antigua, con su estado en lenguaje de paciente:
  completada → «Realizada», cancelada → «Cancelada», no asistida → «No asistida», reservada
  con inicio pasado → «Pasada».
- **FR-009**: El portal DEBE mostrar el nombre y el teléfono de la clínica en todas sus
  pantallas. El teléfono es el de la clínica que define la 001, FR-022.
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
  o su hora de inicio llega. Sin huecos pendientes, el aviso no se muestra. «Liberado por un
  paciente» significa `cita.cancelada_por = 'paciente'` (001, FR-018a).
- **FR-016** *(Revisión cruzada S2)*: El origen y el momento de cada cancelación los define y
  registra la 001, FR-018a (`cita.cancelada_por ∈ {'recepcion','paciente'}`). Esta spec no
  define el valor ni su esquema: la cancelación desde el portal escribe `'paciente'`, y la
  etiqueta «Cancelada por el paciente» (US3) y el aviso de FR-015a lo leen.

**Calidad de interfaz (Principio VII)**

- **FR-017**: Todo el portal DEBE poder usarse con una mano en un móvil desde 360 px de ancho,
  sin desplazamiento horizontal, con contraste AA y elementos táctiles de tamaño accesible.
- **FR-018**: Ningún texto del portal DEBE contener jerga técnica; todo error dice qué ha
  pasado y qué puede hacer el paciente. Se trata al paciente de «tú».

### Constitution Requirements *(mandatory)*

- **Owner**: MarceloMansilla. El registro en `specs/MAPA.md` lo hace el propietario de la
  001, que mantiene el MAPA (revisión cruzada S3); hoy la 002 no figura en el MAPA del
  tronco.
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
  historial en varios estados, y uno sin citas futuras. Los enlaces personales reproducibles
  de los 40 pacientes los genera la semilla según 005, FR-019; el teléfono de la clínica y el
  origen de las cancelaciones de la historia, según la 001 (FR-022, FR-018a). Esta spec no
  amplía la semilla por su cuenta.

### Key Entities *(include if feature involves data)*

- **Paciente (ficha)** — de la 001: nombre, teléfono único por clínica, correo opcional. Su
  acceso lo define la 005; esta spec define qué ve en el portal una vez dentro (FR-007–FR-010)
  y presenta la cancelación de sus citas.
- **Enlace personal (acceso del paciente)** — de la 005 (Key Entities, FR-001–FR-008): esta
  spec solo lo usa para saber de qué ficha y clínica son las citas que muestra.
- **Cita** — de la 001: esta spec lee el origen y el momento de la cancelación
  (`cancelada_por`, 001 FR-018a) para US3 y FR-015a.
- **Clínica** — de la 001: esta spec lee su nombre y su teléfono de contacto (001 FR-022)
  para mostrarlos al paciente (FR-009, FR-013).

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
- *(Retirado en la revisión cruzada S4: la sesión de 30 minutos tras confirmar las 4 cifras
  depende de 005 FR-006; se aporta como propuesta en «Dependencias y enmiendas requeridas».)*
- El historial muestra todas las citas registradas del paciente en la clínica, sin límite
  temporal (en la semilla, desde el 14/09/2026).
- Cancelar desde el portal es definitivo: no hay «deshacer». Para recuperar la cita, el
  paciente llama a la clínica y recepción crea una nueva si el hueco sigue libre.
- El enlace personal se entrega a mano desde recepción (FR-002b; 005, FR-005); CitaClara no
  envía SMS ni correos en esta spec. Los correos de `003-recordatorios-cita` llevan ese
  mismo enlace (005, FR-008) sin cambiar esta spec.
- Fuera de alcance v1: reservar citas online, moverlas o cambiarlas, pagos, lista de espera y
  avisos automáticos a otros pacientes cuando se libera un hueco, editar los datos de la ficha,
  y portal para varias clínicas a la vez.

## Dependencias y enmiendas requeridas

Revisión cruzada S2–S4 (2026-11-07, `specs/000-revision-cruzada-jul2026.md`): esta spec deja
de definir lo que pertenece a otras y lo cita (Principio I). La «Enmienda 1» que esta rama
llevaba sobre la copia de la 001 se ha retirado: la 001 queda idéntica a la rama
`001-agenda-core`, y lo que pedía se solicita aquí a su propietario.

- **001 Núcleo de agenda (propietario de la 001; bloqueante para implementar).**
  - **001 FR-018a — origen de la cancelación**: `cita.cancelada_por ∈ {'recepcion','paciente'}`,
    con el momento en `estado_cambiado_en`. La 001 define el enum, la restricción y la
    migración (incluidas las cancelaciones ya existentes); esta spec escribe `'paciente'` al
    cancelar desde el portal y lo lee en US3 y FR-015a. Como el valor no distingue canales,
    las cancelaciones que un paciente haga desde otro canal (p. ej., `003-recordatorios-cita`)
    también aparecerán como «Cancelada por el paciente» y en el aviso de huecos liberados.
  - **001 FR-022 — teléfono de la clínica** («911 234 567» en la semilla): esta spec lo
    muestra (FR-009, FR-013) y no lo define.
  - Estado: ninguno de los dos figura todavía en la 001 de la rama `001-agenda-core`. Hasta
    que su propietario los incorpore, las citas «001 FR-018a» y «001 FR-022» de esta spec son
    referencias pendientes.
  - **La implementación de la 002 requiere la de la 001** (agenda, panel y semilla), sobre la
    que se construye. Esta spec añade al panel de recepción la indicación «Cancelada por el
    paciente», el aviso de huecos liberados (US3, FR-015a) y la presentación de las acciones
    «Copiar enlace del portal» y «Generar nuevo enlace del portal» (FR-002a, FR-002b).
- **005 Acceso y cancelación del paciente (propietario de la 005; bloqueante para
  implementar).** Esta spec consume 005 FR-001–FR-008 (acceso) y FR-019 (enlaces en la
  semilla).
  - **Aportación a la clarificación pendiente de 005 FR-006** (no se decide aquí): Sara eligió
    en la clarificación de esta spec (2026-11-07, opción C) «enlace personal + confirmar las 4
    últimas cifras de su teléfono». Si la 005 la mantiene, esta spec propone, tal como estaba
    especificado:
    1. *Confirmación*: tras abrir el enlace, el paciente escribe las 4 últimas cifras del
       teléfono de su ficha (para «612 345 678», «5678»). Sin ellas no se muestra ningún dato,
       ni siquiera el nombre; nunca se pide el teléfono completo. Cifras incorrectas: «Las
       cifras no coinciden. Revísalas e inténtalo de nuevo.» (antiguo US1 #4).
    2. *Límite de intentos por enlace*: tras 5 fallos seguidos, bloqueo de 15 minutos («Has
       superado los intentos. Vuelve a probar a las [hora].»); tras 10 fallos acumulados sin
       un acierto entre medias, bloqueo hasta que recepción regenere el enlace («Por
       seguridad, este enlace se ha bloqueado. Llama a Clínica Eleva al 911 234 567.»).
       Probabilidad máxima de acierto con un enlace ajeno: 10 de 10.000 (0,1 %) (antiguo
       FR-005).
    3. *Sesión*: tras confirmar, dura hasta que el paciente sale («Salir») o pasan 30 minutos
       sin actividad; después vuelve a pedir las cifras. Regenerar el enlace cierra las
       sesiones abiertas (antiguos FR-006 y Assumption de sesión).
    Datos para decidir: la 005 extiende el mismo enlace a los correos de recordatorio (005
    FR-008), así que la confirmación también se pediría desde el correo; y la 005 decide no
    limitar intentos de abrir enlaces (Assumptions), que es compatible con limitar solo la
    confirmación.
  - **Aportación al plan de la 005** (almacenamiento del enlace): «Copiar enlace del portal»
    (005 FR-005) requiere poder volver a obtener el enlace vigente; la propuesta de esta spec
    era guardar el token en claro (32 bytes aleatorios, base64url).
  - Mientras 005 FR-006 siga sin clarificar, las tareas de acceso de esta spec quedan
    bloqueadas (ver `tasks.md`).
- **`003-recordatorios-cita` (en paralelo)**: canal futuro, no necesario, que lleva el enlace
  personal a los pacientes (005, FR-008). Esta spec no depende de ella para entregarse.
- **`specs/MAPA.md`**: registrar la 002 con su propietario (lo hace el propietario de la 001,
  que mantiene el MAPA).
