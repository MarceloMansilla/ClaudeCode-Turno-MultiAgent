# Feature Specification: Panel de analítica de la clínica

**Feature Branch**: `analitica`

**Created**: 2026-11-07

**Status**: Aprobada (2026-11-07, MarceloMansilla)

**Input**: User description: "Panel de analítica para la clínica. Sara lo necesita para las
renovaciones: «enseñar a la clínica lo que CitaClara le ahorra». Alcance: una página del panel
(misma clave que la agenda), con interfaz moderna y gráficos claros: ocupación semanal por
profesional, tasa de no asistencia por profesional, ingresos por servicio (citas completadas;
importes exactos, al céntimo), y evolución de las últimas 8 semanas. Solo lectura: esta
feature no escribe NADA. Construye los ejemplos de la spec con los números reales de la
semilla (p. ej., la tasa de no asistencia real de cada profesional). Preguntas cerradas para
Sara: ¿cómo se define exactamente «tasa de no asistencia» y «ocupación»?"

## Clarifications

### Session 2026-11-07

- Q: ¿Cómo se define la tasa de no asistencia? → A: No asistidas ÷ (completadas + no asistidas); las canceladas no cuentan (opción A).
- Q: ¿Qué citas cuentan como tiempo ocupado en la ocupación? → A: Completadas + no asistidas + citas pasadas aún reservadas; las canceladas no ocupan (opción A).
- Q: ¿Separador de miles en importes y recuentos de 4 cifras? → A: Siempre «.» a partir de 1.000 («5.540,00 €», «1.311»), igual que el formato de importes de la agenda (spec 001).

## User Scenarios & Testing *(mandatory)*

Todos los ejemplos usan la semilla de la spec 001 con fecha de referencia **lunes
09/11/2026** y «ahora» = 09/11/2026 12:10 (hora de Madrid). Con esa fecha, el **periodo
analizado** son las 8 semanas completas anteriores a la semana en curso: del lunes
14/09/2026 al domingo 08/11/2026 (40 días laborables, 1.425 citas con desenlace). Las cifras
completas están en [Cifras de referencia](#cifras-de-referencia-semilla-2026-11-09).

### User Story 1 - Ver de un vistazo cómo ha ido la clínica (Priority: P1)

Sara (o cualquier persona de la clínica con la clave) abre la página «Analítica» desde el
panel y ve, para las últimas 8 semanas, cuatro bloques: ocupación por profesional, tasa de no
asistencia por profesional, ingresos por servicio y la evolución semana a semana. Le sirve
para enseñar a la clínica, en la reunión de renovación, qué ha pasado en su agenda.

**Why this priority**: es el motivo de la feature: sin estos cuatro bloques no hay nada que
enseñar en la renovación.

**Independent Test**: con la semilla 2026-11-09 cargada, entrar con la clave, abrir
«Analítica» y comprobar que cada cifra mostrada coincide exactamente con las tablas de
referencia de esta spec.

**Acceptance Scenarios**:

1. **Given** la persona no ha entrado, **When** abre la dirección de la página de analítica,
   **Then** se le pide la clave de la clínica (la misma que la agenda) y no ve ninguna cifra.
2. **Given** ha entrado con la clave en la agenda, **When** pulsa «Analítica» en la
   navegación del panel, **Then** ve la página sin volver a introducir la clave, y desde ella
   puede volver a la agenda.
3. **Given** la semilla 2026-11-09, **When** se abre la página, **Then** el periodo se
   indica como «Últimas 8 semanas: 14/09/2026 – 08/11/2026» y la semana en curso
   (09/11–15/11) no se incluye en ningún bloque.
4. **Given** la semilla 2026-11-09, **When** se mira el bloque de ingresos, **Then** muestra
   exactamente: Sesión de fisioterapia **20.800,00 €** (520 citas), Primera visita de
   fisioterapia **8.200,00 €** (164), Consulta de nutrición **12.740,00 €** (364), Primera
   visita de nutrición **5.400,00 €** (120), y un total de **47.140,00 €** (1.168 citas
   completadas), que es exactamente la suma de las cuatro líneas.
5. **Given** la semilla 2026-11-09, **When** se mira el bloque de no asistencia, **Then**
   muestra para cada profesional su tasa (FR-006): María **10,5 %** (41 de 390), Jorge
   **13,0 %** (50 de 385), Lucía **9,7 %** (52 de 536) y clínica **10,9 %** (143 de 1.311),
   junto con los recuentos que la originan (p. ej., «Jorge: 50 no asistidas de 385»).
6. **Given** la semilla 2026-11-09, **When** se mira el bloque de ocupación, **Then** muestra
   para cada profesional su ocupación de las 8 semanas (FR-008): María **71,6 %**, Jorge
   **71,2 %**, Lucía **68,4 %** y clínica **70,4 %**.
7. **Given** cualquier gráfico de la página, **When** se consulta, **Then** existe junto a él
   la misma información en forma de tabla o texto con las cifras exactas, y ningún dato se
   comunica solo mediante el color.

---

### User Story 2 - Ver la evolución semana a semana (Priority: P2)

En la misma página, un bloque de evolución muestra las 8 semanas en orden cronológico: la
ocupación y la tasa de no asistencia de cada profesional y de la clínica, y los ingresos de
cada semana. Permite contar una historia («la no asistencia ha bajado») y detectar semanas
anómalas.

**Why this priority**: añade la dimensión temporal que pide Sara, pero los totales de la
US1 ya tienen valor por sí solos.

**Independent Test**: con la semilla 2026-11-09, comprobar que las 8 semanas mostradas y sus
valores coinciden con la tabla semanal de referencia y que la suma de los ingresos semanales
es igual al total de ingresos de la US1.

**Acceptance Scenarios**:

1. **Given** la semilla 2026-11-09, **When** se mira la evolución, **Then** aparecen
   exactamente 8 semanas, de la «semana del 14/09/2026» a la «semana del 02/11/2026», en
   orden cronológico.
2. **Given** la semilla 2026-11-09, **When** se miran los ingresos semanales, **Then** son
   5.540,00 €, 5.525,00 €, 5.685,00 €, 6.090,00 €, 6.425,00 €, 5.850,00 €, 5.645,00 € y 6.380,00 €,
   y su suma es exactamente 47.140,00 €.
3. **Given** la semilla 2026-11-09, **When** se mira la no asistencia
   de la clínica, **Then** la semana del 14/09/2026 muestra **12,7 %** (20 de 157) y la del
   02/11/2026 **5,4 %** (9 de 166).
4. **Given** la semilla 2026-11-09, **When** se mira la ocupación de
   Jorge, **Then** su semana más alta es la del 12/10/2026 con **80,0 %** (2.640 de 3.300
   minutos).
5. **Given** la semana del 02/11/2026, **When** se mira el detalle por profesional, **Then**
   se ven sus recuentos: María 50 completadas, 1 no asistida, 3 canceladas; Jorge 41, 2, 4;
   Lucía 66, 6, 8.

---

### Edge Cases

- **Sin historia** (instalación recién creada o clínica sin citas con desenlace en el
  periodo): la página se muestra con el mensaje «Todavía no hay citas suficientes para
  mostrar la analítica.» y sin gráficos vacíos ni cifras inventadas. Un periodo con solo
  citas pasadas aún «reservadas» (ninguna con desenlace) también muestra este mensaje.
- **Profesional o semana sin citas que cuenten para una tasa** (denominador 0): se muestra
  «Sin datos» para esa tasa, nunca «0 %» ni un error. Una semana sin ingresos muestra
  «0,00 €».
- **Semana en curso**: nunca se incluye, aunque tenga citas completadas; el periodo siempre
  son 8 semanas completas (lunes a domingo) anteriores al lunes de la semana actual.
- **Citas pasadas que siguen «reservadas»** (recepción no marcó su desenlace): no cuentan
  como completadas ni como no asistidas, no entran en la tasa de no asistencia y no suman
  ingresos, pero sí cuentan como tiempo ocupado (FR-008). Ejemplo: si una cita de 45 min de
  la semana pasada sigue «reservada», suma 45 min a la ocupación de esa semana y nada más.
- **Cambio de horario de verano/invierno**: cada cita se asigna a la semana de su fecha
  local de inicio. Ejemplo: el cambio del domingo 25/10/2026 no mueve ninguna cita; la cita
  de María del lunes 26/10/2026 a las 09:00 (08:00 UTC) pertenece a la «semana del
  26/10/2026». Las duraciones se cuentan en minutos reales.
- **Página abierta durante el cambio de semana** (p. ej., el lunes a las 00:00): al recargar,
  el periodo se desplaza una semana; nunca se mezclan dos periodos en la misma vista.
- **Sesión caducada**: al recargar, se vuelve a pedir la clave, como en la agenda.
- **Fallo al cargar** (p. ej., la base de datos no responde): en lugar de la página se
  muestra «No hemos podido cargar la analítica. Vuelve a intentarlo en unos segundos.», sin
  ninguna cifra parcial.
- **Pantalla de móvil (360 px)**: los gráficos se adaptan al ancho sin desplazamiento
  horizontal de la página; las tablas equivalentes pueden desplazarse dentro de su propio
  bloque.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso y navegación**

- **FR-001**: La página de analítica DEBE estar protegida por la misma clave y la misma
  sesión que la agenda (spec 001, FR-001–FR-003): sin sesión válida no se muestra ninguna
  cifra y se pide la clave.
- **FR-002**: El panel DEBE ofrecer un acceso visible a «Analítica» desde la agenda y desde
  la analítica a la agenda.
- **FR-003**: La página solo DEBE mostrar datos de la clínica de la sesión (spec 001,
  FR-004).

**Periodo**

- **FR-004**: El periodo analizado DEBEN ser las 8 semanas completas (lunes 00:00 a domingo
  24:00, hora local de la clínica) inmediatamente anteriores a la semana en curso. La página
  DEBE indicar las fechas del periodo («Últimas 8 semanas: 14/09/2026 – 08/11/2026»). En
  esta versión no hay selector de periodo.
- **FR-005**: Cada cita se asigna a la semana de su fecha local de inicio. Solo cuentan las
  citas de la clínica de la sesión cuyo inicio cae dentro del periodo.

**Tasa de no asistencia**

- **FR-006**: El sistema DEBE mostrar la tasa de no asistencia de cada profesional y de la
  clínica para el periodo completo, calculada como **no asistidas ÷ (completadas + no
  asistidas)**: solo cuentan las citas a las que se esperaba que el paciente acudiera. Las
  canceladas y las que siguen reservadas no entran ni en el numerador ni en el denominador.
  Junto a cada tasa DEBEN mostrarse el numerador y el denominador (p. ej., «41 de 390»).
  Ejemplo: María, 41 no asistidas y 349 completadas → 41 ÷ 390 = 10,51… % → «10,5 %».

  **Definición canónica del producto**: esta FR es la única definición de «tasa de no
  asistencia» en CitaClara, y esta spec es su propietaria (revisión cruzada, S5). Las demás
  specs que usen o midan ese indicador la citan como «tasa de no asistencia (004, FR-006)» y
  no pueden usar ese nombre con otra fórmula. Si necesitan otra magnitud, le dan otro
  nombre. Si necesitan otra población (otro periodo o un subconjunto de citas), piden una
  enmienda de esta spec.
- **FR-007**: El sistema DEBE mostrar la misma tasa por semana (US2) con la misma
  definición.

> **Aclaración: 10,0 % y 10,9 % no se contradicen.** Sobre la misma semilla 2026-11-09, la
> spec 001 (FR-023, SC-005) y `docs/datos-demo.md` dan **10,0 %**: 143 no asistidas de las
> 1.425 citas de la historia, es decir, la **proporción de no asistidas sobre el total de
> citas**, canceladas incluidas. Esa es la magnitud que calibra la semilla. El panel da
> **10,9 %**: 143 de 1.311 (completadas + no asistidas), la **tasa de no asistencia** de
> FR-006. Son magnitudes distintas sobre los mismos 143 casos, y solo la segunda se llama
> «tasa de no asistencia». En la renovación se enseña la del panel.

**Ocupación**

- **FR-008**: El sistema DEBE mostrar la ocupación de cada profesional y de la clínica para
  el periodo completo y por semana, calculada como minutos ocupados ÷ minutos disponibles.
  Minutos disponibles por profesional y semana = horario de la clínica (lunes a viernes,
  09:00–20:00) = 5 × 660 = **3.300 minutos**; 26.400 por profesional en 8 semanas; 79.200 para
  la clínica (3 profesionales). **Minutos ocupados = duración de las citas completadas, no
  asistidas y reservadas** (estas últimas: citas pasadas a las que recepción aún no ha
  puesto desenlace). Es decir, todo hueco que estuvo bloqueado en la agenda hasta su hora;
  las canceladas no ocupan porque liberaron el hueco (spec 001, FR-006). Ejemplo: María, 8
  semanas, 16.875 min completadas + 2.025 min no asistidas = 18.900 ÷ 26.400 = 71,59… % →
  «71,6 %».
- **FR-009**: La ocupación de la clínica DEBE ser la suma de minutos ocupados de todos sus
  profesionales dividida entre la suma de sus minutos disponibles (no la media de los
  porcentajes).

**Ingresos**

- **FR-010**: El sistema DEBE mostrar, para el periodo completo, los ingresos por servicio:
  número de citas **completadas** de ese servicio y su importe = suma de los precios de esas
  citas. Las citas canceladas, no asistidas y reservadas no suman ingresos.
- **FR-011**: El total de ingresos DEBE ser exactamente la suma de los importes por
  servicio, y la suma de los ingresos semanales DEBE ser exactamente ese mismo total. Todos
  los cálculos se hacen con importes exactos en céntimos; no se redondea ningún importe.
- **FR-012**: El sistema DEBE mostrar los ingresos de cada semana del periodo (US2).

**Presentación**

- **FR-013**: Cada bloque DEBE presentarse con un gráfico claro (barras por profesional o por
  servicio; líneas o barras por semana para la evolución) y, junto a él, una tabla o texto
  con las cifras exactas. El color nunca es el único medio para distinguir profesionales o
  series.
- **FR-014**: Los nombres de profesionales y servicios, las etiquetas y los mensajes DEBEN
  estar en español de España y sin jerga técnica.

**Solo lectura**

- **FR-015**: Esta feature NO DEBE crear, modificar ni borrar ningún dato: ni citas, ni
  pacientes, ni profesionales, ni servicios, ni la semilla, ni datos propios (no guarda
  resúmenes, preferencias ni históricos). La página no ofrece ninguna acción que cambie
  datos. Todo lo que muestra se calcula a partir de la agenda en el momento de consultarla.

### Constitution Requirements *(mandatory)*

- **Owner**: MarceloMansilla. La fila de esta spec en `specs/MAPA.md` la integra el
  propietario de la 001, que mantiene el MAPA (revisión cruzada, S3).
- **Writes to the agenda?**: **No**. Esta feature es de solo lectura (FR-015); no requiere
  pruebas de solape, pero sí una prueba de que consultar la analítica deja los datos
  exactamente iguales.
- **Amounts and dates**:
  - Importes en euros con céntimos y formato español: separador decimal «,», separador de
    miles «.» siempre a partir de 1.000 (el mismo formato que la agenda, spec 001), símbolo
    detrás: «5.540,00 €», «47.140,00 €», «0,00 €». Los recuentos y minutos siguen la misma
    regla: «1.311», «3.300 minutos». Los importes se suman en céntimos exactos, sin redondeo; todo total es la suma
    exacta de sus partes.
  - Ejemplo de verificación fuera de la semilla (todas sus tarifas acaban en «,00»): 3 citas
    completadas de un servicio de 37,50 € y 1 de 45,00 € → 112,50 € + 45,00 € = 157,50 €.
  - Porcentajes: se calculan sobre los recuentos exactos y se muestran con **un decimal**,
    redondeando la mitad hacia arriba: 41 ÷ 390 = 10,51… % → «10,5 %»; 2 ÷ 47 = 4,255… % →
    «4,3 %»; 1 ÷ 16 = 6,25 % → «6,3 %». Denominador 0 → «Sin datos».
  - Fechas con día antes que mes: «Últimas 8 semanas: 14/09/2026 – 08/11/2026», «semana del
    12/10/2026». Semanas de lunes a domingo según la hora local de la clínica (Clínica Eleva:
    Europe/Madrid); una clínica en Canarias usa su propia hora local.
- **Demo data**: no cambia la semilla. Cita las cifras de la semilla de la spec 001 con
  fecha de referencia 2026-11-09 (`docs/datos-demo.md` de la 001: 1.425 citas de historia,
  1.168 completadas, 114 canceladas, 143 no asistidas). Las cifras derivadas de esta spec
  están en «Cifras de referencia» y DEBEN reproducirse exactamente; si la semilla cambia,
  esas cifras se recalculan y se actualizan aquí (Principio V).

### Key Entities *(include if feature involves data)*

Esta feature no añade datos almacenados; lee los de la spec 001 y calcula al vuelo:

- **Periodo de análisis**: las 8 semanas completas anteriores a la semana en curso.
- **Semana**: lunes a domingo en hora local; se identifica por la fecha de su lunes.
- **Indicadores por profesional (periodo y semana)**: citas completadas, no asistidas y
  canceladas; minutos ocupados; tasa de no asistencia; ocupación.
- **Ingresos por servicio (periodo) y por semana**: número de citas completadas e importe
  exacto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con la semilla 2026-11-09, el 100 % de las cifras mostradas (recuentos,
  porcentajes e importes) coincide exactamente con las tablas de referencia de esta spec.
- **SC-002**: En cualquier conjunto de datos, la suma de ingresos por servicio y la suma de
  ingresos semanales son idénticas al total, al céntimo, en el 100 % de los casos.
- **SC-003**: Tras abrir la analítica y recorrer todos sus bloques, el contenido de la
  agenda (todas las citas, pacientes, profesionales y servicios) es idéntico al de antes: 0
  cambios.
- **SC-004**: La página se muestra completa en menos de 2 segundos con la semilla cargada.
- **SC-005**: Una persona que nunca ha usado CitaClara responde correctamente en menos de
  15 segundos «¿Qué profesional tuvo más no asistencias en las últimas 8 semanas?» y «¿Qué
  servicio generó más ingresos?» (prueba manual con 2 personas, en portátil y móvil).
- **SC-006**: La página se usa sin desplazamiento horizontal desde 360 px de ancho y cumple
  el contraste mínimo AA, también en los gráficos.

## Assumptions

- Quién la usa: Sara la enseña en las reuniones de renovación con la clave de la clínica; el
  personal de la clínica puede verla con la misma clave. No hay permisos distintos.
- «Lo que CitaClara le ahorra» se apoya en estas cifras, pero la página **no calcula ningún
  ahorro**: no existe una referencia de «antes de CitaClara» con la que comparar. Un
  indicador de ahorro, exportar a PDF o imprimir, comparar clínicas y elegir otro periodo
  quedan fuera de alcance (spec propia si se piden).
- Los ingresos usan el precio actual del servicio. En la 001 los precios no se pueden
  cambiar, así que coincide con el precio al reservar. Si una spec futura permite cambiar
  precios, habrá que pedir al propietario de la 001 que la cita guarde su precio, para que
  los ingresos pasados no cambien.
- Los minutos disponibles salen del horario único de la clínica de la 001 (lunes a viernes,
  09:00–20:00). Festivos, vacaciones y horarios por profesional no existen aún; cuando una
  spec los añada, la ocupación deberá descontarlos.
- Los recuentos de citas por estado y profesional coinciden con `docs/datos-demo.md` de la
  spec 001; esta spec depende de que esa semilla no cambie (o de actualizar sus cifras).
- **Fuera de alcance: citas con o sin recordatorio.** El panel no distingue entre citas con
  recordatorio y citas sin él. Ni el periodo ni los agregados separan esa población. Medir
  así el SC-005 de la spec 003-recordatorios-cita («tasa de no asistencia de las citas con
  recordatorio») requiere una enmienda de esta spec, pedida por el propietario de la 003. La
  003 no calcula el indicador por su cuenta.
- Dependencias: spec 001 (acceso con clave, sesión, entidades y semilla). Otras specs en
  paralelo: 002-portal-paciente, 003-recordatorios-cita y 005-acceso-cancelacion-paciente.
  Ninguna es dependencia de esta.

## Cifras de referencia (semilla 2026-11-09)

Periodo: 14/09/2026 – 08/11/2026. Minutos disponibles: 3.300 por profesional y semana.
Recuentos y minutos por estado; tasas y ocupaciones según FR-006 y FR-008.

### Totales del periodo por profesional

| Profesional | Completadas | No asistidas | Canceladas | Total | Min. completadas | Min. no asistidas | Min. canceladas | Min. disponibles |
|-------------|------------:|-------------:|-----------:|------:|-----------------:|------------------:|----------------:|-----------------:|
| María | 349 | 41 | 34 | 424 | 16.875 | 2.025 | 1.635 | 26.400 |
| Jorge | 335 | 50 | 32 | 417 | 16.365 | 2.430 | 1.605 | 26.400 |
| Lucía | 484 | 52 | 48 | 584 | 16.320 | 1.725 | 1.620 | 26.400 |
| **Clínica** | **1.168** | **143** | **114** | **1.425** | **49.560** | **6.180** | **4.860** | **79.200** |

### Tasa de no asistencia del periodo (FR-006: NA ÷ (C + NA))

| Profesional | No asistidas | Completadas + no asistidas | Tasa |
|-------------|-------------:|---------------------------:|-----:|
| María | 41 | 390 | **10,5 %** |
| Jorge | 50 | 385 | **13,0 %** |
| Lucía | 52 | 536 | **9,7 %** |
| Clínica | 143 | 1.311 | **10,9 %** |

### Ocupación (FR-008: minutos de completadas + no asistidas ÷ minutos disponibles)

En la semilla no hay citas pasadas sin desenlace dentro del periodo, así que las reservadas no
suman minutos.

| Profesional | Min. ocupados (8 sem.) | Ocupación (8 sem.) | Min. ocupados (sem. 02/11) | Ocupación (sem. 02/11) |
|-------------|-----------------------:|-------------------:|---------------------------:|-----------------------:|
| María | 18.900 de 26.400 | **71,6 %** | 2.490 de 3.300 | **75,5 %** |
| Jorge | 18.795 de 26.400 | **71,2 %** | 2.130 de 3.300 | **64,5 %** |
| Lucía | 18.045 de 26.400 | **68,4 %** | 2.460 de 3.300 | **74,5 %** |
| Clínica | 55.740 de 79.200 | **70,4 %** | 7.080 de 9.900 | **71,5 %** |

### Ingresos por servicio (citas completadas)

| Servicio | Precio | Citas | Importe |
|----------|-------:|------:|--------:|
| Sesión de fisioterapia | 40,00 € | 520 | 20.800,00 € |
| Primera visita de fisioterapia | 50,00 € | 164 | 8.200,00 € |
| Consulta de nutrición | 35,00 € | 364 | 12.740,00 € |
| Primera visita de nutrición | 45,00 € | 120 | 5.400,00 € |
| **Total** | | **1.168** | **47.140,00 €** |

### Por semana y profesional

C = completadas, NA = no asistidas, Can = canceladas; minutos de cada estado.

| Semana del | Profesional | C | NA | Can | Min. C | Min. NA | Min. Can |
|------------|-------------|--:|---:|----:|-------:|--------:|---------:|
| 14/09/2026 | María | 36 | 7 | 5 | 1.815 | 330 | 240 |
| 14/09/2026 | Jorge | 39 | 9 | 6 | 1.860 | 420 | 285 |
| 14/09/2026 | Lucía | 62 | 4 | 4 | 2.115 | 135 | 120 |
| 21/09/2026 | María | 40 | 9 | 7 | 1.920 | 450 | 345 |
| 21/09/2026 | Jorge | 43 | 7 | 4 | 2.115 | 360 | 210 |
| 21/09/2026 | Lucía | 55 | 6 | 6 | 1.770 | 180 | 195 |
| 28/09/2026 | María | 44 | 5 | 8 | 2.130 | 225 | 390 |
| 28/09/2026 | Jorge | 40 | 6 | 3 | 1.935 | 300 | 150 |
| 28/09/2026 | Lucía | 57 | 5 | 10 | 1.920 | 165 | 345 |
| 05/10/2026 | María | 46 | 3 | 5 | 2.175 | 150 | 240 |
| 05/10/2026 | Jorge | 43 | 6 | 4 | 2.100 | 300 | 195 |
| 05/10/2026 | Lucía | 62 | 9 | 4 | 2.130 | 285 | 120 |
| 12/10/2026 | María | 45 | 6 | 1 | 2.145 | 285 | 45 |
| 12/10/2026 | Jorge | 47 | 7 | 3 | 2.280 | 360 | 165 |
| 12/10/2026 | Lucía | 67 | 3 | 3 | 2.325 | 105 | 105 |
| 19/10/2026 | María | 42 | 7 | 4 | 1.995 | 375 | 180 |
| 19/10/2026 | Jorge | 43 | 5 | 6 | 2.070 | 240 | 300 |
| 19/10/2026 | Lucía | 62 | 8 | 3 | 2.040 | 285 | 105 |
| 26/10/2026 | María | 46 | 3 | 1 | 2.265 | 150 | 45 |
| 26/10/2026 | Jorge | 39 | 8 | 2 | 1.965 | 360 | 105 |
| 26/10/2026 | Lucía | 53 | 11 | 10 | 1.770 | 360 | 360 |
| 02/11/2026 | María | 50 | 1 | 3 | 2.430 | 60 | 150 |
| 02/11/2026 | Jorge | 41 | 2 | 4 | 2.040 | 90 | 195 |
| 02/11/2026 | Lucía | 66 | 6 | 8 | 2.250 | 210 | 270 |

### Por semana: clínica e ingresos

| Semana del | C | NA | Can | No asistencia | Ocupación | Ingresos |
|------------|--:|---:|----:|--------------:|----------:|---------:|
| 14/09/2026 | 137 | 20 | 15 | 12,7 % | 67,4 % | 5.540,00 € |
| 21/09/2026 | 138 | 22 | 17 | 13,8 % | 68,6 % | 5.525,00 € |
| 28/09/2026 | 141 | 16 | 21 | 10,2 % | 67,4 % | 5.685,00 € |
| 05/10/2026 | 151 | 18 | 13 | 10,7 % | 72,1 % | 6.090,00 € |
| 12/10/2026 | 159 | 16 | 7 | 9,1 % | 75,8 % | 6.425,00 € |
| 19/10/2026 | 147 | 20 | 13 | 12,0 % | 70,8 % | 5.850,00 € |
| 26/10/2026 | 138 | 22 | 13 | 13,8 % | 69,4 % | 5.645,00 € |
| 02/11/2026 | 157 | 9 | 15 | 5,4 % | 71,5 % | 6.380,00 € |
| **Total** | **1.168** | **143** | **114** | **10,9 %** | **70,4 %** | **47.140,00 €** |

Cómo reproducirlas: `pnpm seed --fecha-referencia 2026-11-09` (spec 001) y agrupar las citas
del periodo por profesional, semana local de inicio, estado y servicio.
