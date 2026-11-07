# Investigación (Fase 0): Panel de analítica

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-07

Esta feature se construye sobre el stack ya decidido en la 001
([research 001](../001-agenda-core/research.md): Next.js 16, React 19, TypeScript, Tailwind 4 +
shadcn/ui, PostgreSQL 18 + Drizzle, date-fns + @date-fns/tz, Vitest + Testcontainers,
Playwright + axe). Aquí solo se decide lo nuevo. Formato: Decisión / Razón / Alternativas.

---

## R1. Dónde se calculan los indicadores

- **Decisión**: **una sola consulta de lectura** trae las citas del periodo de la clínica (con
  profesional, estado, `inicio`, `fin` y precio del servicio) y **una función pura**
  `calcularAnalitica()` en `src/dominio/analitica.ts` agrega todo en memoria: semana local,
  recuentos por estado, minutos, tasas, ocupación e ingresos.
- **Razón**: el volumen es pequeño (1.425 citas en las 8 semanas del periodo con 3 profesionales; una clínica
  de 5 profesionales no pasaría de unas 3.000). La agregación en una función pura se prueba
  sin BD contra las tablas de referencia de la spec, y la asignación a semanas reutiliza
  `fechaLocal()` de la 001, que ya resuelve la zona horaria y el cambio de hora (Principio II).
- **Alternativas**: `GROUP BY` en SQL con `date_trunc('week', inicio AT TIME ZONE zona)`:
  correcto, pero reparte la lógica entre SQL y TypeScript, se prueba solo con BD y duplica las
  reglas de zona. Vista materializada o tabla de resúmenes: escribiría datos (prohibido por
  FR-015) y añade invalidación.

## R2. Periodo y semanas (FR-004, FR-005)

- **Decisión**: `lunesActual = lunes de fechaLocal(ahora(), zona)`;
  periodo = `[instanteLocal(lunesActual − 56 días, '00:00'), instanteLocal(lunesActual, '00:00'))`.
  Cada cita va a la semana `lunes de fechaLocal(inicio, zona)`. «Ahora» sale de `reloj.ts`
  (fijable con `CITACLARA_AHORA`).
- **Razón**: trabajar con fechas locales `AAAA-MM-DD` y convertir solo los extremos evita
  errores en el cambio de hora (el 25/10/2026 la semana tiene 167 h reales, pero los límites
  siguen siendo las 00:00 locales). Con «ahora» = 09/11/2026 12:10 sale exactamente
  14/09/2026 – 08/11/2026.
- **Alternativas**: restar 56 × 24 h a un instante UTC: se desplaza una hora tras el cambio
  de horario y mete o saca citas de las 00:00–01:00 (ninguna en horario, pero sería
  incorrecto por definición).

## R3. Aritmética exacta y redondeo (Principio II)

- **Decisión**:
  - Importes: suma de `precio_centimos` enteros; nunca se divide ni se redondea un importe.
    Totales = suma de las partes (se comprueba en tests con las dos sumas: por servicio y por
    semana).
  - Porcentajes: en **décimas enteras** con aritmética entera, redondeo de la mitad hacia
    arriba: `decimas = ⌊(2 · 1000 · num + den) / (2 · den)⌋`. Ejemplo: 41/390 → 105 → «10,5 %»;
    1/16 → 63 → «6,3 %»; 2/47 → 43 → «4,3 %». Denominador 0 → `null` → «Sin datos».
  - Ocupación de la clínica: Σ minutos ocupados ÷ Σ minutos disponibles (FR-009).
- **Razón**: sin coma flotante en ningún paso que afecte a una cifra mostrada; el redondeo es
  el definido en la spec y es determinista.
- **Alternativas**: `Math.round(num / den * 1000) / 10` con flotantes: da el mismo resultado
  en todas las cifras de la semilla, pero en empates exactos depende de la representación
  binaria del cociente y no se puede garantizar por construcción; la versión entera cuesta lo
  mismo y sí lo garantiza.

## R4. Minutos ocupados y disponibles (FR-008)

- **Decisión**: minutos de una cita = `(fin − inicio)` en minutos (la duración fijada al
  reservar, spec 001). Ocupan: `completada`, `no_asistida` y `reservada` (estas solo pueden
  estar en el periodo si son pasadas sin desenlace). Minutos disponibles por profesional y
  semana = Σ días laborables de la semana × (cierre − apertura) con los datos de la clínica
  (`dias_laborables`, `hora_apertura`, `hora_cierre`): 5 × 660 = 3.300.
- **Razón**: se calculan desde la configuración real de la clínica y no desde una constante;
  si una spec futura añade festivos, solo cambia esta función.
- **Alternativas**: duración actual del servicio: daría otra ocupación si el servicio
  cambiara de duración; se descarta.

## R5. Gráficos (FR-013, Principio VII)

- **Decisión**: **gráficos SVG propios renderizados en el servidor** (Server Components), sin
  biblioteca de gráficos: barras horizontales (ocupación, no asistencia, ingresos por
  servicio), líneas de 8 puntos (evolución de ocupación y de no asistencia por profesional) y
  barras verticales (ingresos semanales). `viewBox` con ancho 100 % para adaptarse a 360 px.
  Cada gráfico lleva `role="img"`, título y descripción, y a su lado una tabla con las cifras
  exactas (la tabla es la fuente accesible). Profesionales distinguidos por color **y** por
  forma del marcador (círculo, cuadrado, triángulo) y etiqueta directa al final de cada línea.
  Colores como tokens nuevos `--grafico-1..3` en `globals.css`, con variante oscura,
  verificados con contraste ≥ 3:1 contra el fondo (WCAG 1.4.11).
- **Razón**: son 5 gráficos simples con ≤ 32 puntos; un componente SVG de unas decenas de
  líneas es más simple que una dependencia, no envía JavaScript al navegador, se renderiza
  igual en servidor y en tests, y deja el control total de accesibilidad y formato español
  (Principio IV). La página carga sin hidratar nada (SC-004).
- **Alternativas**: Recharts (base de los «charts» de shadcn/ui): componentes de cliente,
  +≈100 kB de JS, mide el contenedor en el navegador (renderizado vacío en servidor) y su
  formato de ejes requiere configuración por gráfico; justificable solo si se piden tooltips o
  interacción, que la spec no pide. Chart.js / ECharts: canvas, peor accesibilidad.

## R6. Formato (Principio II, clarificación de 2026-11-07)

- **Decisión**: importes con `formatearPrecio()` de la 001 (separador de miles siempre:
  «5.540,00 €»). Se añaden a `src/lib/formato.ts` `formatearEntero()` («1.311», misma regla)
  y `formatearPorcentaje(decimas)` («10,5 %», con espacio de no separación antes de «%», como
  el «€»). Periodo y semanas con `dd/MM/yyyy` («semana del 12/10/2026»).
- **Razón**: un único formato de importes en todo el producto.
- **Alternativas**: `Intl.NumberFormat` con `style: 'percent'`: trabaja con flotantes y
  redondea a su manera; el valor ya llega en décimas exactas.

## R7. Solo lectura garantizada (FR-015, SC-003)

- **Decisión**: el módulo `src/servicios/analitica.ts` solo usa `select`; la página no tiene
  Server Actions ni formularios. Pruebas: (1) integración que toma una «huella» de todas las
  tablas de negocio (recuento + hash ordenado de cada fila) antes y después de
  `obtenerAnalitica()` y exige igualdad; (2) E2E que recorre la página y compara la huella de
  la BD antes y después. No se añaden índices ni migraciones.
- **Razón**: la garantía se demuestra con un test, no solo con una convención.
- **Alternativas**: usuario de BD de solo lectura para la página: la app usa una sola
  conexión; añadir un segundo rol es complejidad sin necesidad mientras haya una sola vía de
  acceso.

## R8. Navegación y acceso (FR-001, FR-002)

- **Decisión**: ruta `/analitica`, protegida por `exigirSesion()` en su layout y añadida al
  `matcher` de `src/proxy.ts`. La `Cabecera` de la 001 recibe una navegación con dos enlaces,
  «Agenda» y «Analítica» (con `aria-current="page"` en la activa), visible en portátil y móvil.
- **Razón**: reutiliza sesión y cabecera; el cambio en código de la 001 es aditivo y lo pide
  esta spec (FR-002), con el mismo propietario.
- **Alternativas**: grupo de rutas `(panel)` que agrupe agenda y analítica bajo un layout
  común: más limpio a largo plazo, pero mueve archivos de la 001 en paralelo con otras ramas;
  se deja para cuando haya una tercera sección.

## R9. Pruebas (Principio VI)

- **Decisión**:
  - Unitarias de `dominio/analitica.ts` alimentadas con `generarSemilla('2026-11-09')`
    (función pura de la 001, sin BD): comprueban **todas** las cifras de «Cifras de
    referencia» de la spec. Más casos sintéticos: denominador 0, cita reservada pasada (suma
    ocupación y nada más), cita a las 00:30 del lunes tras el cambio de hora, empate de
    redondeo (1/16 → 6,3 %), servicio de 37,50 € (157,50 €).
  - Integración (PostgreSQL real): `obtenerAnalitica()` con la semilla cargada = mismas
    cifras; aislamiento por clínica; huella de BD idéntica (SC-003).
  - E2E (portátil y móvil): acceso sin sesión, navegación agenda ↔ analítica, cifras visibles,
    estado vacío, 360 px sin scroll horizontal, axe sin violaciones, carga < 2 s (SC-004).
  - Cada test cita su FR/SC/escenario en el nombre.
- **Razón**: la semilla determinista convierte las tablas de la spec en oráculo exacto.

## R10. Dependencia de la 001 (prerrequisito)

- **Decisión**: la implementación de la 004 empieza **después de integrar la 001** en la rama
  `analitica` (hoy la 001 está implementada pero sin commit en su rama). Las cifras de
  referencia se obtuvieron con ese código; si cambia la semilla antes de integrarse, se
  recalculan (Principio V).
- **Razón**: la 004 lee el esquema, la sesión, el reloj, el formato y la semilla de la 001.

## Asuntos sin resolver

Ninguno. No queda ningún «NEEDS CLARIFICATION».
