# Feature Specification: Portal del paciente

**Feature Branch**: `portal`

**Created**: 2026-11-07

**Status**: Aprobada (2026-11-07, MarceloMansilla) · Revisión cruzada S2–S4 (2026-11-07) ·
Enmienda «fuente única 005» (2026-11-08): el acceso del paciente y su plazo de cancelación
los define solo `005-acceso-cancelacion-paciente`; esta spec los cita y no los redefine (ver
«Dependencias»).

**Input**: User description: "Portal del paciente. Los pacientes de la clínica quieren ver sus citas y cancelarlas sin llamar por teléfono (Sonia, recepción de Eleva, dedica «la mitad de la mañana» a esto). Alcance: un paciente accede a una página personal moderna donde ve sus citas futuras y pasadas y puede cancelar una cita futura. Interfaz limpia y responsive, pensada para móvil. Preguntas que la spec debe dejar decididas (formúlalas cerradas, para Sara): cómo accede el paciente sin crear cuentas ni contraseñas (las clínicas pequeñas no van a gestionar altas), hasta cuándo puede cancelar, y qué pasa con el hueco liberado. Datos: Cita casos reales de la semilla en los ejemplos. Fuera de alcance v1: reservar o mover citas online, pagos."

## Contexto

Sonia, de recepción de Clínica Eleva, dedica «la mitad de la mañana» a atender llamadas de
pacientes que solo quieren saber cuándo tienen cita o anularla. Esta spec da a cada paciente
una página personal, pensada para el móvil, donde consulta sus citas y cancela las futuras sin
llamar.

**Qué es de esta spec y qué no.** Esta spec define las **pantallas** del portal, los **datos
que ve el paciente** y la **guía de textos y trato al paciente**, más lo que recepción ve de
las cancelaciones de los pacientes. **No** define cómo se accede (enlace, 4 cifras, intentos,
duración del acceso), **ni** hasta cuándo se puede cancelar, **ni** cómo se enuncia esa
política: todo eso es de la 005 y aquí solo se cita.

Todos los ejemplos usan la semilla de la spec 001 con fecha de referencia **lunes
09/11/2026** y el reloj de la aplicación fijado a las **12:10** de ese día (hora peninsular,
Europe/Madrid): Clínica Eleva; María y Jorge (Fisioterapia); Lucía (Nutrición); «Sesión de
fisioterapia» (45 min), «Primera visita de fisioterapia» (60 min), «Consulta de nutrición»
(30 min) y «Primera visita de nutrición» (45 min). La historia de la semilla va del lunes
14/09/2026 al viernes 06/11/2026; las citas futuras, todas reservadas, del lunes 09/11/2026
al viernes 20/11/2026.

## Clarifications

### Session 2026-11-07

- Q: ¿Cómo accede el paciente sin crear cuentas ni contraseñas? → A: Sara eligió enlace personal + 4 últimas cifras del teléfono. *(Decisión trasladada a la 005: FR-006, FR-006a y FR-006b.)*
- Q: ¿Hasta cuándo puede cancelar el paciente desde el portal? → A: *(Decisión trasladada a la 005: FR-009; su enunciado ante el paciente, 005 FR-016. Esta spec no repite el plazo.)*
- Q: ¿Qué pasa con el hueco que libera el paciente? → A: Queda libre al instante y recepción ve en el panel un aviso con los huecos liberados por pacientes (opción B). *(Propia de esta spec: US3, FR-015a; el hueco libre, 001 FR-006 y FR-011.)*
- Q: ¿Cuánto tiempo vale el enlace personal del paciente? → A: *(Decisión trasladada a la 005: FR-003 y FR-004.)*
- Q: ¿Cómo recibe el paciente su enlace personal en la v1? → A: *(Decisión trasladada a la 005: FR-005 y FR-008.)*

### Session 2026-11-08 (enmienda «fuente única 005»)

- Se retiran de esta spec las definiciones de acceso (antiguos FR-001 a FR-006, FR-002a,
  FR-002b y la entidad «Enlace personal (acceso del paciente)») y de plazo (antiguos FR-012,
  FR-013 y el supuesto del plazo en «Amounts and dates»). Equivalencias en «Dependencias».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar mis citas desde el móvil (Priority: P1)

Un paciente de Clínica Eleva abre su enlace personal en el móvil, entra como indica la 005 y
ve, sin crear ninguna cuenta, sus próximas citas (día, hora, profesional y servicio) y su
historial de citas pasadas y canceladas.

**Why this priority**: «¿cuándo era mi cita?» es la llamada más repetida; resolverla ya
descarga a recepción aunque todavía no se pueda cancelar.

**Independent Test**: con la semilla cargada, elegir un paciente con citas futuras y pasadas,
entrar en su portal (005 FR-006) y comprobar que las citas mostradas coinciden exactamente con
las suyas en la semilla, y que no aparece ninguna cita de otro paciente.

**Acceptance Scenarios** (en todos, el paciente ya ha entrado según 005 FR-006):

1. **Given** un paciente de la semilla con una «Sesión de fisioterapia» con María reservada
   para el lunes 16/11/2026 a las 10:00, **When** entra en su portal, **Then** ve en
   «Próximas citas» «lunes, 16/11/2026 · 10:00–10:45 · Sesión de fisioterapia · María», en
   orden cronológico con el resto de sus citas futuras.
2. **Given** ese paciente tuvo citas entre el 14/09/2026 y el 06/11/2026, **When** abre
   «Historial», **Then** las ve de la más reciente a la más antigua, cada una con su estado
   («Realizada», «Cancelada» o «No asistida»).
3. **Given** un paciente sin ninguna cita futura, **When** entra en su portal, **Then** ve
   «No tienes próximas citas» y el teléfono de la clínica para pedir una.
4. **Given** alguien abre un enlace, **When** todavía no ha completado el acceso de la 005
   (enlace no válido, cifras sin confirmar, en pausa o bloqueado), **Then** el portal no
   muestra ninguna de sus pantallas ni ningún dato de citas o pacientes, solo lo que permiten
   005 FR-006, FR-006a y FR-007, con los textos según la guía de FR-018.
5. **Given** un paciente con el portal abierto, **When** su acceso termina (005 FR-006b:
   inactividad o enlace regenerado), **Then** su siguiente acción en el portal no muestra ni
   cambia nada y le lleva a la pantalla que corresponda según la 005.

---

### User Story 2 - Cancelar una cita futura sin llamar (Priority: P1)

El paciente cancela una de sus próximas citas desde el portal, con una confirmación, y la
cita queda cancelada en la agenda de la clínica al instante. Cuándo se puede cancelar lo
decide la 005; el portal lo presenta.

**Why this priority**: es la otra mitad de las llamadas de Sonia y la razón de ser del
portal.

**Independent Test**: cancelar desde el portal una cita futura de la semilla para la que
005 FR-009 permite cancelar y comprobar que pasa a «Cancelada» en el portal y en la agenda de
recepción; ver otra que 005 FR-009 ya no permite cancelar y comprobar que no ofrece la
opción y muestra el enunciado de 005 FR-016.

**Acceptance Scenarios**:

1. **Given** una cita reservada que 005 FR-009 permite cancelar (p. ej., la del lunes
   16/11/2026 a las 10:00 con el reloj de la semilla), **When** el paciente la ve en
   «Próximas citas», **Then** ve el botón «Cancelar cita» y, debajo, el enunciado de la
   política de 005 FR-016 para esa cita, sin ningún otro texto sobre el plazo.
2. **Given** esa cita, **When** pulsa «Cancelar cita» y confirma en el paso que exige
   005 FR-012, **Then** la cita pasa a «Cancelada», desaparece de «Próximas citas», aparece en
   «Historial» y ve «Tu cita del lunes, 16/11/2026 a las 10:00 está cancelada.».
3. **Given** el paciente pulsa «Cancelar cita», **When** en la confirmación elige «No,
   mantenerla», **Then** la cita sigue reservada sin cambios.
4. **Given** una cita reservada futura que 005 FR-009 ya no permite cancelar, **When** el
   paciente la ve, **Then** no tiene botón «Cancelar cita» y ve el enunciado de 005 FR-016 con
   el teléfono de la clínica como enlace para llamar (005 FR-011).
5. **Given** el paciente vio «Cancelar cita» y confirma cuando 005 FR-009 ya no lo permite,
   **When** se procesa, **Then** se rechaza sin cambiar nada y ve lo mismo que en US2 #4
   (005 FR-011).
6. **Given** recepción acaba de cambiar el estado de esa cita (p. ej., la canceló), **When**
   el paciente confirma la cancelación, **Then** se le muestra el estado actual de la cita y
   no se cambia nada (005 FR-014; 001 FR-020).
7. **Given** el paciente cancela una cita de María el lunes 16/11/2026 de 10:00 a 10:45,
   **When** recepción abre la agenda de María de ese día, **Then** la cita aparece
   «Cancelada por el paciente» y el hueco de 10:00 a 10:45 aparece libre y reservable.

---

### User Story 3 - Recepción se entera de los huecos que liberan los pacientes (Priority: P2)

Sonia ve en la agenda qué citas canceló el propio paciente, para no llamarle a confirmar, y
un aviso en el panel le reúne los huecos liberados que siguen libres, para ofrecérselos a
otros pacientes. «Canceló el paciente» significa origen `paciente` (001 FR-018a), sea cual
sea el canal del paciente: el origen no distingue canales (005 FR-013).

**Why this priority**: evita que el portal genere llamadas nuevas («¿la canceló usted?») y
cierra el circuito con recepción; el portal ya aporta valor sin ello.

**Independent Test**: cancelar una cita desde el portal y otra desde recepción, y comprobar
que en la agenda se distingue quién canceló cada una y que solo la primera aparece en el
aviso de huecos liberados, hasta que recepción vuelve a ocupar ese hueco.

**Acceptance Scenarios**:

1. **Given** una cita con origen de cancelación `paciente`, **When** recepción la ve en la
   agenda, **Then** aparece como «Cancelada por el paciente» con día y hora de la cancelación.
2. **Given** una cita con origen de cancelación `recepcion`, **When** se ve en la agenda,
   **Then** aparece como «Cancelada» sin esa indicación y no genera aviso.
3. **Given** un paciente canceló desde el portal su cita con María del lunes 16/11/2026 de
   10:00 a 10:45, **When** recepción entra en el panel, **Then** ve el aviso «Huecos
   liberados por pacientes (1)» y, al abrirlo, «María · lunes, 16/11/2026 · 10:00–10:45».
4. **Given** ese hueco aparece en el aviso, **When** recepción reserva en él una «Sesión de
   fisioterapia» a las 10:00 para otro paciente, **Then** el hueco desaparece del aviso y,
   si no queda ninguno, el aviso deja de mostrarse.

---

### Edge Cases

- Dos cancelaciones simultáneas de la misma cita (dos pestañas del paciente, o paciente y
  recepción a la vez): exactamente una surte efecto; la otra ve el estado actual
  (005 FR-014).
- El paciente cancela y en ese mismo instante recepción reserva ese hueco para otro paciente:
  nunca quedan dos citas solapadas (Principio III; 001 FR-011, FR-012).
- El plazo vence con la pantalla abierta, o la cita se reservó ya fuera de plazo: lo resuelve
  la 005 (sus Edge Cases y FR-009); el portal se limita a mostrar u ocultar «Cancelar cita»
  según la 005 y a mostrar su enunciado.
- Varias citas futuras del mismo paciente: cada tarjeta muestra su propio enunciado de
  005 FR-016; unas pueden tener «Cancelar cita» y otras no a la vez.
- Cita de hoy, 09/11/2026, a las 12:00 (ya empezada a las 12:10): aparece en «Historial» como
  pasada, sin opción de cancelar.
- Cita pasada que recepción aún no ha marcado (sigue «reservada», spec 001): en «Historial»
  aparece como «Pasada», sin afirmar si se realizó o no.
- Paciente cuyo teléfono comparten varios miembros de una familia: imposible, el teléfono es
  único por clínica (001 FR-016b); cada ficha tiene su propio enlace (005 FR-001).
- Clínica en Canarias: el paciente ve sus citas en la hora local de la clínica; el límite que
  muestra el enunciado también (005 FR-009, FR-016).
- Pantalla de 360 px de ancho: todo usable sin desplazamiento horizontal.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso del paciente — de la 005**

Esta spec no define ninguna credencial, regla de acceso, límite de intentos ni duración del
acceso. El portal se muestra solo tras completar el acceso de **005 FR-006** (enlace vigente
+ 4 últimas cifras del teléfono de la ficha), con el límite de intentos de **005 FR-006a** y
la duración del acceso de **005 FR-006b**; el enlace que se entrega al paciente es el de
**005 FR-008**, y la respuesta a un enlace no válido, la de **005 FR-007**. Los antiguos
FR-001 a FR-006, FR-002a y FR-002b se han retirado (equivalencias en «Dependencias»); sus
identificadores no se reutilizan.

**Consulta de citas**

- **FR-007**: El portal DEBE mostrar «Próximas citas»: las citas reservadas del paciente cuyo
  inicio aún no ha llegado, en orden cronológico, con día de la semana y fecha, hora de
  inicio y fin, servicio y profesional.
- **FR-008**: El portal DEBE mostrar «Historial»: las citas cuyo inicio ya ha llegado y todas
  las canceladas, de la más reciente a la más antigua, con su estado en lenguaje de paciente:
  completada → «Realizada», cancelada → «Cancelada», no asistida → «No asistida», reservada
  con inicio pasado → «Pasada».
- **FR-009**: El portal DEBE mostrar el nombre y el teléfono de la clínica en todas sus
  pantallas, con el teléfono como enlace para llamar. El teléfono es el de 001 FR-022.
- **FR-010**: El portal NO DEBE mostrar importes, notas internas ni datos de otros pacientes o
  de la agenda de los profesionales. Solo muestra citas de la ficha a la que da acceso el
  enlace (005 FR-006).

**Cancelación — presentación**

- **FR-011**: Para cada cita de «Próximas citas», el portal DEBE ofrecer «Cancelar cita» si y
  solo si la 005 lo permite (005 FR-009 y FR-011), y DEBE mostrar siempre debajo el enunciado
  de la política de **005 FR-016** para esa cita, tal como lo produce la 005, sin añadirle,
  quitarle ni reformularle nada sobre el plazo. El paso de confirmación es el de 005 FR-012;
  esta spec fija sus botones («Sí, cancelar» / «No, mantenerla», con el foco inicial en
  «No, mantenerla») y el mensaje tras cancelar («Tu cita del [día], [dd/mm/aaaa] a las
  [hh:mm] está cancelada.»).
- *(FR-012 y FR-013 retirados: plazo y comportamiento fuera de plazo → 005 FR-009, FR-011 y
  FR-016.)*
- **FR-014**: Una cancelación rechazada (fuera de plazo, estado cambiado o acceso terminado)
  DEBE dejar la pantalla coherente: se refresca la lista y se muestra lo que indique la 005
  (005 FR-011, FR-014, FR-006b), sin dejar el diálogo abierto ni ocultar el error.
- **FR-015**: Tras una cancelación del paciente, recepción DEBE ver la cita como «Cancelada
  por el paciente» con el día y la hora de la cancelación, mostrado para toda cita con origen
  `paciente` (001 FR-018a). Las de origen `recepcion` se muestran como «Cancelada», sin más.
- **FR-015a**: El panel de recepción DEBE mostrar un aviso «Huecos liberados por pacientes»
  con el número de huecos y, al abrirlo, la lista de esos huecos: profesional, día, hora de
  inicio y fin, y momento de la cancelación, en orden cronológico del hueco. Solo cuentan las
  citas canceladas con origen `paciente` (001 FR-018a). Un hueco sale de la lista sin
  intervención de recepción en cuanto vuelve a ocuparse (total o parcialmente) o su hora de
  inicio llega. Sin huecos pendientes, el aviso no se muestra.
- **FR-016**: Esta spec no define el origen de la cancelación ni la transición de estado: los
  definen 001 FR-018a y 005 FR-013. Solo los lee para FR-015 y FR-015a.

**Guía de textos y trato al paciente (Principios VII y VIII)**

- **FR-017**: Todo el portal DEBE poder usarse con una mano en un móvil desde 360 px de ancho,
  sin desplazamiento horizontal, con contraste AA y elementos táctiles de tamaño accesible.
  Se aplica también a las pantallas de acceso que presenta el portal (005 FR-006, FR-006a,
  FR-007).
- **FR-018**: Guía de textos al paciente, para todas las pantallas que ve (las de esta spec y
  las de acceso y cancelación de la 005): español de España; trato de «tú»; sin jerga técnica
  («token», «sesión», «error 404»…); frases cortas; todo error dice qué ha pasado y qué puede
  hacer el paciente; siempre que el paciente no pueda seguir, se le da el nombre y el teléfono
  de la clínica. La guía fija la forma; el contenido de los mensajes de acceso y de la política
  lo fija la 005.
- **FR-018a (RN de coherencia)**: Ningún texto del portal ni de recepción creado por esta spec
  DEBE mencionar cuándo se puede cancelar salvo a través del enunciado de 005 FR-016 (005
  FR-017). Esta spec no redacta el plazo en ningún texto, ejemplo ni mensaje de error.

### Constitution Requirements *(mandatory)*

- **Owner**: MarceloMansilla (registrado en `specs/MAPA.md`, que mantiene el propietario de
  la 001).
- **Writes to the agenda?**: Sí, vía la 005: la cancelación del paciente («reservada» →
  «cancelada») la define y ejecuta la 005 (FR-009 a FR-014). Esta spec no añade otra
  escritura; presenta la acción y lee el resultado. Las pruebas obligatorias de concurrencia
  (Principio III) son las de la 005 (su SC-003); esta spec añade pruebas de extremo a extremo
  de que el portal y el aviso de huecos reflejan el resultado (SC-004, SC-005).
- **Amounts and dates**:
  - Sin importes: el portal no muestra precios ni calcula nada (FR-010).
  - Fechas en formato español y horas en formato HH:mm, en la hora local de la clínica: «lunes,
    16/11/2026 · 10:00–10:45».
  - Ejemplos con reloj fijado el lunes 09/11/2026 a las 12:10: una cita del 09/11/2026 a las
    12:00 ya es pasada; una de las 12:15 de ese mismo día es futura.
  - El límite de cancelación y su cálculo (incluido el cambio de hora y Canarias) son de la
    005 (FR-009, FR-010, FR-016): esta spec no los repite ni pone ejemplos propios.
- **Demo data**: usa la semilla de la 001 sin cambiar su contenido de citas (fecha de
  referencia 09/11/2026). El plan DEBE fijar, a partir de `docs/datos-demo.md`, al menos dos
  pacientes concretos de la semilla para ejemplos y tests: uno con citas futuras y de
  historial en varios estados, y uno sin citas futuras. Los enlaces de los 40 pacientes los
  genera la semilla según 005 FR-019; el teléfono de la clínica y el origen de las
  cancelaciones de la historia, según la 001 (FR-022, FR-018a). Esta spec no amplía la
  semilla.

### Key Entities *(include if feature involves data)*

- **Paciente (ficha)** — de la 001: esta spec muestra su nombre solo una vez dentro del
  portal; cómo se llega a la ficha es de la 005.
- **Cita** — de la 001: esta spec lee inicio, fin, servicio, profesional, estado y, si está
  cancelada, el origen y el momento (001 FR-018a) para FR-007, FR-008, FR-015 y FR-015a.
- **Clínica** — de la 001: nombre, zona horaria y teléfono (001 FR-022).
- **Hueco liberado por un paciente** — derivado, propio de esta spec: tramo de agenda de una
  cita cancelada con origen `paciente` cuyo inicio aún no ha llegado y que no está ocupado por
  ninguna cita activa (FR-015a). No se almacena.
- *(La entidad «Enlace personal (acceso del paciente)» se ha retirado de esta spec: es de la
  005, Key Entities «Enlace personal» y «Acceso abierto».)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un paciente que nunca ha usado el portal cancela una cita cancelable en menos
  de 30 segundos desde que ve sus «Próximas citas», en un móvil, al primer intento. El tiempo
  total desde abrir el enlace lo mide la 005 (su SC-006).
- **SC-002**: Un paciente encuentra el día y la hora de su próxima cita en menos de 10
  segundos desde que ve el portal.
- *Verificación de SC-001 y SC-002*: prueba manual previa a la entrega con 2 personas que no
  conocen CitaClara, en móvil, cronometradas; ambas DEBEN cumplir los dos tiempos (puede
  hacerse en la misma sesión que la de 005 SC-005/SC-006).
- **SC-003**: Las llamadas a recepción de Clínica Eleva para consultar o cancelar citas bajan
  al menos un 50 % entre la semana anterior a activar el portal y la cuarta semana tras
  activarlo (recuento manual de Sonia, mismas categorías ambas semanas).
- **SC-004**: En las pruebas automatizadas, 0 casos en que el portal muestre una cita de otro
  paciente, y en el 100 % de las citas futuras el portal ofrece «Cancelar cita» exactamente
  cuando la 005 lo permite y muestra su enunciado de FR-016 sin cambios.
- **SC-005**: Una cancelación hecha desde el portal es visible en la agenda de recepción y en
  el aviso de huecos liberados en cuanto recepción vuelve a cargar el panel, sin pasos
  manuales.
- **SC-006**: Todas las pantallas que ve el paciente se usan sin desplazamiento horizontal
  desde 360 px de ancho y cumplen el contraste mínimo AA.
- **SC-007**: 0 textos de esta spec (pantallas, mensajes, ejemplos) que redacten el plazo de
  cancelación por su cuenta: lo comprueba la prueba de coherencia de la 005 (FR-017, SC-004)
  sobre todo el código del portal.

## Assumptions

- El paciente ya tiene ficha en la clínica (creada por recepción en la 001) con un teléfono
  español válido.
- Una instalación sirve a una sola clínica, como en la 001.
- El historial muestra todas las citas registradas del paciente en la clínica, sin límite
  temporal (en la semilla, desde el 14/09/2026).
- Cancelar desde el portal es definitivo: no hay «deshacer» (005 FR-013). Para recuperar la
  cita, el paciente llama a la clínica y recepción crea una nueva si el hueco sigue libre.
- Las acciones de recepción sobre el enlace (copiar, generar uno nuevo) son de la 005
  (FR-004, FR-005) y su presentación en el panel también; esta spec no añade otra.
- Fuera de alcance v1: reservar citas online, moverlas o cambiarlas, pagos, lista de espera y
  avisos automáticos a otros pacientes cuando se libera un hueco, editar los datos de la ficha,
  y portal para varias clínicas a la vez.

## Dependencias

Esta spec **consume** las siguientes reglas y **no las reescribe** (Principio I). Si alguna
cambia, cambia en su spec y esta la sigue sin enmienda.

### De la 001 · Núcleo de agenda

| Requisito | Para qué lo usa la 002 |
|-----------|------------------------|
| Estados de la cita y FR-017 (transición a «cancelada») | Etiquetas de FR-008; la cancelación la aplica la 005 sobre esta transición |
| FR-006, FR-011, FR-012 (sin solapes, hueco libre) | El hueco liberado es reservable (US2 #7, US3 #4) |
| FR-016b (teléfono único por ficha) | Edge case de familias |
| FR-018a (origen `recepcion` / `paciente` y momento) | «Cancelada por el paciente» (FR-015) y «Huecos liberados» (FR-015a) filtran por `paciente` |
| FR-020 (estado cambiado desde que se mostró) | US2 #6 |
| FR-022 (teléfono de la clínica) | FR-009 y pantallas sin salida |
| Semilla determinista (fecha de referencia 09/11/2026) | Ejemplos, Paciente A y B, tests |
| Panel y agenda de recepción | Donde se añaden FR-015 y FR-015a |

### De la 005 · Acceso y cancelación del paciente

| Requisito | Para qué lo usa la 002 |
|-----------|------------------------|
| FR-001–FR-005 (enlace personal, opaco, estable, regenerable, copiable) | La ruta del portal es el enlace del paciente; recepción lo gestiona con el menú de la 005 |
| FR-006 (enlace + 4 últimas cifras) | Condición para mostrar cualquier pantalla del portal |
| FR-006a (límite de intentos) | Pantallas de pausa y bloqueo que presenta el portal |
| FR-006b (duración del acceso) | US1 #5 |
| FR-007 (respuesta única a enlace no válido) | US1 #4 |
| FR-008 (único enlace en todos los canales) | El portal no define otro enlace |
| FR-009 (plazo de cancelación del paciente) | Cuándo se ofrece «Cancelar cita» (FR-011) |
| FR-011 (fuera de plazo) | US2 #4, #5 |
| FR-012 (confirmación) | Diálogo de FR-011 |
| FR-013, FR-014 (efecto, origen, concurrencia) | US2 #2, #6; FR-016 |
| FR-016, FR-017 (enunciado canónico y RN de coherencia) | Único texto sobre el plazo (FR-011, FR-018a) |
| FR-019 (enlaces en la semilla) | Paciente A y B |

### Regla para el código (al integrar la 005 en `portal`)

El código de la 002 usa las reglas, el enlace y el enunciado tal como los implementa la 005,
sin redefinirlos ni copiarlos, y reutiliza sus pantallas de acceso y cancelación; la 002
sustituye la lista provisional de la 005 por sus pantallas. Qué se importa y de dónde, y la
prueba de coherencia que lo vigila: [plan.md](plan.md) («Structure Decision») y
[tasks.md](tasks.md) («Regla de código»).

### Equivalencias de lo retirado

| Antes en la 002 | Ahora |
|-----------------|-------|
| FR-001 (entrar con enlace, sin cuenta) | 005 FR-001, FR-006 |
| FR-002 (credencial, 4 cifras) | 005 FR-002, FR-006 |
| FR-002a (generar enlace nuevo en el panel) | 005 FR-004 y su menú «Enlace del paciente» |
| FR-002b (copiar enlace en el panel) | 005 FR-005, FR-008 y su menú «Enlace del paciente» |
| FR-003 (sin acceso no hay datos; enlace no válido) | 005 FR-006, FR-007 |
| FR-004 (solo citas de su ficha) | 005 FR-006 |
| FR-005 (límite de intentos) | 005 FR-006a |
| FR-006 (sesión / salir) | 005 FR-006b |
| FR-012 (plazo) | 005 FR-009 (ejemplos: 005 FR-010) |
| FR-013 (fuera de plazo) | 005 FR-011, FR-016 |
| Supuesto del plazo en «Amounts and dates» | 005 FR-009, FR-010 |
| Entidad «Enlace personal (acceso del paciente)» | 005 Key Entities |

### Peticiones a otros propietarios (no se cambian desde aquí)

- **005 — enunciado para citas ya fuera de plazo.** 005 FR-011 pide mostrar el enunciado de
  FR-016 en una cita reservada fuera de plazo, pero el enunciado dice «Puedes cancelar esta
  cita desde tu enlace antes del [fecha ya pasada]». ¿Puede la 005 dar una variante para ese
  caso (p. ej., que el elemento 1 cambie a pasado), o confirmar que se muestra tal cual? La
  002 lo mostrará como lo produzca `enunciadoPoliticaCancelacion`.
- **005 — textos de sus pantallas.** Al integrar, revisar los textos de las pantallas de
  acceso de la 005 con la guía de FR-018 (p. ej., «No tienes citas próximas.» de la lista
  provisional frente a «No tienes próximas citas» de US1 #3; la lista desaparece al integrar
  la 002).
- **005 — prueba de coherencia.** `coherencia-politica.test.ts` recorre `src/`: cubre el
  código de la 002 sin cambios. Si algún texto de la 002 viviera fuera de `src/` (p. ej.,
  datos de `docs/`), pedir que se amplíe.
- **005 — numeración menor.** En US3 los escenarios están en el orden 1, 2, 3, 5, 4.
- **MAPA (propietario de la 001).** Al integrar este commit, actualizar la fila y el párrafo
  de la 002 y retirar la 002 de «002 y 003 aún redefinen acceso y plazo».
