---

description: "Lista de tareas de la feature 004-panel-analitica"
---

# Tasks: Panel de analítica de la clínica

**Input**: Design documents from `/specs/004-panel-analitica/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: OBLIGATORIOS (Constitución, Principio VI). Cada test cita en su nombre el FR, el
escenario (p. ej. `US1 #4`) o el SC que cubre. La feature **no escribe en la agenda**
(FR-015): no hay pruebas de solape; en su lugar, pruebas de que la BD queda idéntica (SC-003).

**Organization**: tareas agrupadas por historia de usuario para implementarlas y probarlas de
forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2)
- Rutas relativas a la raíz del repositorio (proyecto único de la 001, ver plan.md)

## Referencias rápidas

- Decisiones: [research.md](research.md) (R1–R10)
- Reglas de cálculo, modelos de vista e invariantes: [data-model.md](data-model.md)
- Página, gráficos, formato y estados: [contracts/ui-analitica.md](contracts/ui-analitica.md)
- Funciones `periodoAnalitica`, `calcularAnalitica`, `obtenerAnalitica`:
  [contracts/servicio-analitica.md](contracts/servicio-analitica.md)
- **Oráculo de cifras**: sección «Cifras de referencia (semilla 2026-11-09)» de
  [spec.md](spec.md). Los tests copian esas tablas literalmente; si un test y la spec
  discrepan, gana la spec (Principio I).
- Semilla en tests: `generarSemilla('2026-11-09', <hash>)` (pura, `src/semilla/generar.ts`) y
  `cargarSemilla(bd, '2026-11-09', clave)` (`src/semilla/cargar.ts`). Reloj:
  `fijarAhora('2026-11-09T12:10:00+01:00')` en Vitest; `CITACLARA_AHORA` en E2E (ya fijado en
  `playwright.config.ts`).
- Prohibido en esta feature: `insert`, `update`, `delete`, migraciones, índices nuevos y
  Server Actions (FR-015).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: partir de la 001 integrada y de cifras verificadas

- [X] T001 Integrar la rama `001-agenda-core` (con la implementación de la 001 ya confirmada en ella) en la rama `analitica` con `git merge`, sin tocar `specs/004-panel-analitica/` ni `specs/MAPA.md` salvo para resolver conflictos de la fila de la 004; comprobar la línea base en verde: `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` (research R10). Si la 001 aún no está confirmada, PARAR y avisar.
- [X] T002 Ejecutar `pnpm seed --fecha-referencia 2026-11-09` y comprobar que el resumen impreso coincide con `docs/datos-demo.md` y con la tabla «Totales del periodo por profesional» de `specs/004-panel-analitica/spec.md` (María 349/41/34, Jorge 335/50/32, Lucía 484/52/48). Si no coincide, PARAR: hay que recalcular las cifras de la spec antes de seguir (Principio V) (depende de T001)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: formato, reglas puras de periodo y redondeo, ruta protegida, navegación, tokens
de gráfico y huella de BD. Lo necesitan US1 y US2.

**⚠️ CRITICAL**: ninguna historia empieza hasta terminar esta fase

- [X] T003 [P] Ampliar `tests/unit/formato.test.ts` (Principio II, clarificación de separador de miles): `formatearEntero(1311)` → «1.311», `formatearEntero(3300)` → «3.300», `formatearEntero(47)` → «47», `formatearEntero(0)` → «0»; `formatearPorcentaje(105)` → «10,5 %», `(800)` → «80,0 %», `(0)` → «0,0 %», `(1000)` → «100,0 %», `(null)` → «Sin datos» (espacio de no separación antes de «%»); `formatearPrecio(554000)` → «5.540,00 €» y `formatearPrecio(4714000)` → «47.140,00 €»; `formatearEntero(1.5)` y `formatearPorcentaje(10.5)` lanzan error (solo enteros)
- [X] T004 Implementar `formatearEntero(n)` (Intl `es-ES`, `useGrouping: 'always'`, solo enteros) y `formatearPorcentaje(decimas: number | null)` (entero de décimas → «X,Y %» con U+00A0; `null` → «Sin datos») en `src/lib/formato.ts`, sin cambiar las funciones existentes (depende de T003)
- [X] T005 [P] Escribir `tests/unit/analitica-base.test.ts` (FR-004, FR-005, FR-008, research R2–R4): `lunesDe('2026-11-11')` → '2026-11-09' y `lunesDe('2026-11-08')` → '2026-11-02'; `periodoAnalitica` con las 3 filas de la tabla de `contracts/servicio-analitica.md` (incluidos `desde`/`hasta` como instantes = 00:00 local de Europe/Madrid) y con `Atlantic/Canary` (el corte es una hora más tarde en UTC); `decimas(41, 390)` → 105, `(1, 16)` → 63, `(2, 47)` → 43, `(22, 160)` → 138, `(2640, 3300)` → 800, `(5, 0)` → `null`; `minutosDisponiblesSemana` = 3.300 para L–V 09:00–20:00, también en la semana del 19/10/2026 que termina con el cambio de hora; `Edge Cases — página abierta durante el cambio de semana`: con `ahora` = domingo 08/11/2026 23:59 y lunes 09/11/2026 00:00 (Europe/Madrid) el periodo pasa de 07/09–01/11 a 14/09–08/11 sin solaparse ni dejar huecos
- [X] T006 Crear `src/dominio/analitica.ts` con los tipos de [data-model.md](data-model.md) (`ResumenAnalitica`, `Indicadores`, `IndicadoresProfesional`, `IngresoServicio`, `Semana`, `EntradaAnalitica`) y las funciones puras `lunesDe(fecha)`, `periodoAnalitica(ahora, zona)`, `decimas(num, den)` (aritmética entera `⌊(2000·num + den) / (2·den)⌋`, den 0 → `null`) y `minutosDisponiblesSemana(clinica)`; reutilizar `fechaLocal`, `instanteLocal`, `sumarDias`, `diaSemanaIso` y `minutosDeHora` de `src/lib/zona.ts`; sin imports de BD ni de reloj (depende de T005)
- [X] T007 [P] Añadir `listarServicios(clinicaId, bd?)` (todos los servicios de la clínica, ordenados por especialidad, duración y nombre, igual que `listarServiciosDeEspecialidad`; en la semilla: Sesión de fisioterapia, Primera visita de fisioterapia, Consulta de nutrición, Primera visita de nutrición, el orden de la tabla de ingresos de la spec) en `src/servicios/catalogo.ts`, solo lectura y siguiendo el patrón de `listarProfesionales`
- [X] T008 [P] Añadir los tokens `--grafico-1`, `--grafico-2`, `--grafico-3` (María, Jorge, Lucía) en `src/app/globals.css`, con variante en el bloque `prefers-color-scheme: dark`; cada uno con contraste ≥ 3:1 contra `--background` y `--card` en ambos temas (WCAG 1.4.11); anotar las razones de contraste calculadas en un comentario junto a los tokens
- [X] T009 [P] Proteger `/analitica` en `src/proxy.ts`: añadir `'/analitica'` y `'/analitica/:path*'` al `matcher` y tratar `pathname.startsWith('/analitica')` sin sesión igual que `/agenda` (redirección a `/entrar` con `motivo=sesion` si había cookie)
- [X] T010 [P] Crear `src/app/analitica/layout.tsx` (igual que `src/app/agenda/layout.tsx`: `exigirSesion`, `obtenerClinica`, `<Cabecera … seccion="analitica" />`, `<main className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:pt-6">`) y `src/app/analitica/loading.tsx` con `role="status"` y «Cargando la analítica…» (como el `loading.tsx` de la agenda)
- [X] T011 Añadir la navegación del panel a `src/components/cabecera.tsx` (FR-002, contracts/ui-analitica.md): nueva prop `seccion: 'agenda' | 'analitica'`; enlaces «Agenda» (`/agenda`, icono `CalendarDays`) y «Analítica» (`/analitica`, icono `ChartColumn` de lucide-react) con `aria-current="page"` en el activo, dentro de `<nav aria-label="Secciones del panel">`, visibles en móvil (icono + texto, objetivo ≥ 44×44 px) sin provocar scroll horizontal a 360 px; pasar `seccion="agenda"` desde `src/app/agenda/layout.tsx`. En el mismo cambio, mantener al día el contrato de la 001: la línea «Cabecera» de `specs/001-agenda-core/contracts/ui-routes.md` ya recoge la navegación (actualizada al analizar la 004); si difiere de lo implementado, corregir primero ese contrato (Principio I) (depende de T010)
- [X] T012 [P] Crear `tests/helpers/huella-bd.ts` con `huellaBd(ejecutor)`: para `clinica`, `profesional`, `servicio`, `paciente` y `cita` devuelve `{ filas: count(*), hash: md5(string_agg(t::text, '|' ORDER BY id)) }` en una sola consulta SQL; acepta la BD de la app o la de E2E (SC-003, research R7)
- [X] T013 Crear `tests/e2e/analitica.spec.ts` con `test.beforeAll(recargarSemilla)` y los casos de acceso y navegación: `US1 #1` sin sesión, `/analitica` redirige a `/entrar` y no aparece ningún «%» ni «€»; `US1 #2` tras `entrar(page)`, el enlace «Analítica» de la cabecera lleva a `/analitica` sin pedir clave, tiene `aria-current="page"`, y «Agenda» vuelve a la agenda; `FR-001` sesión caducada (borrar cookie) → `/entrar` (depende de T009–T011)

**Checkpoint**: `/analitica` existe, está protegida y enlazada; formato y reglas base probados

---

## Phase 3: User Story 1 - Ver de un vistazo cómo ha ido la clínica (Priority: P1) 🎯 MVP

**Goal**: ocupación y no asistencia por profesional y de la clínica, ingresos por servicio y
total del periodo, cada bloque con gráfico y tabla de cifras exactas.

**Independent Test**: con la semilla 2026-11-09, entrar, abrir «Analítica» y comprobar que
todas las cifras de los bloques de resumen, ocupación, no asistencia e ingresos coinciden con
las tablas de referencia de la spec.

### Tests for User Story 1 (MANDATORY - Principle VI) ⚠️

> Escribirlos primero y comprobar que fallan.

- [X] T014 [P] [US1] Escribir `tests/unit/analitica-totales.test.ts` con `calcularAnalitica` alimentada por `generarSemilla('2026-11-09', 'x')` (mapeando clínica, profesionales, servicios y citas a `EntradaAnalitica`) y `ahora = 2026-11-09T12:10:00+01:00`: periodo '2026-09-14'–'2026-11-08' (`US1 #3`); por profesional, completadas/no asistidas/canceladas y minutos de la tabla «Totales del periodo por profesional»; `tasaNoAsistenciaDecimas` 105/130/97 y clínica 109 con numeradores y denominadores 41/390, 50/385, 52/536, 143/1311 (`US1 #5`, `FR-006`); `ocupacionDecimas` 716/712/684 y clínica 704 con 18.900, 18.795, 18.045 y 55.740 de 26.400/79.200 minutos (`US1 #6`, `FR-008`, `FR-009`); ingresos 520 citas/2.080.000, 164/820.000, 364/1.274.000, 120/540.000 céntimos y total 4.714.000 = suma de servicios (`US1 #4`, `FR-010`, `FR-011`); `clinica.X = Σ profesionales.X` (invariante 2)
- [X] T015 [P] [US1] Crear `tests/unit/analitica-casos.test.ts` con entradas sintéticas mínimas (una clínica Europe/Madrid L–V 09:00–20:00, 2 profesionales, 2 servicios): `Edge Cases` cita pasada aún `reservada` de 45 min suma 45 min a la ocupación y nada a tasa ni ingresos; `FR-006` canceladas fuera de numerador y denominador; profesional sin completadas ni no asistidas → tasa `null`; servicio sin citas completadas aparece con 0 citas y 0 céntimos; `Principio II` 3 completadas de 3.750 céntimos + 1 de 4.500 → 15.750 céntimos exactos; `FR-004` citas de la semana en curso (incluso completadas) y anteriores al primer lunes se ignoran; sin citas en el periodo → `hayDatos = false`; solo citas pasadas aún reservadas → `hayDatos = false`; resultado idéntico en dos llamadas con la misma entrada
- [X] T016 [P] [US1] Escribir `tests/integration/analitica.test.ts` contra PostgreSQL real: `beforeEach` → `vaciarTablas()` + `cargarSemilla(obtenerBd(), '2026-11-09', 'clave')` + `fijarAhora('2026-11-09T12:10:00+01:00')`; `US1 #4–#6` `obtenerAnalitica(clinicaId)` devuelve las mismas cifras que T014; `FR-003` una segunda clínica insertada a mano con citas completadas en el periodo no altera ninguna cifra de Clínica Eleva; `SC-003`/`FR-015` `huellaBd()` antes y después de `obtenerAnalitica` es idéntica (usar `tests/helpers/huella-bd.ts`)
- [X] T017 [US1] Añadir a `tests/e2e/analitica.spec.ts`: `US1 #3` subtítulo «Últimas 8 semanas: 14/09/2026 – 08/11/2026» y nota «La semana en curso no se incluye.»; `US1 #4` tabla de ingresos con «20.800,00 €», «8.200,00 €», «12.740,00 €», «5.400,00 €» y total «47.140,00 €»; `US1 #5` «10,5 %», «13,0 %», «9,7 %», «10,9 %» y «50 de 385» en la fila de Jorge; `US1 #6` «71,6 %», «71,2 %», «68,4 %», «70,4 %»; `US1 #7` cada gráfico tiene `role="img"` con nombre accesible y una tabla en el mismo bloque, y cada barra muestra como texto su etiqueta (nombre del profesional o del servicio) y su valor, de modo que nada depende solo del color (`FR-013`); `FR-015` dentro de `<main>` no hay `form` ni `button[type=submit]`; `SC-003` `huellaBd` de la BD E2E (vía `conBd`) idéntica antes y después de cargar y recorrer la página (depende de T013)

### Implementation for User Story 1

- [X] T018 [US1] Implementar `calcularAnalitica(entrada)` en `src/dominio/analitica.ts` para el periodo completo: filtrar citas por `[desde, hasta)` de `periodoAnalitica`; acumular por profesional recuentos por estado y minutos (`(fin − inicio)` en minutos enteros) de completadas, no asistidas y reservadas; minutos disponibles = 8 × `minutosDisponiblesSemana`; tasas y ocupación con `decimas`; clínica = suma de profesionales; ingresos por servicio (todas las entradas de `servicios`, en su orden) y total; `hayDatos` = hay alguna cita completada, no asistida o cancelada en el periodo (un periodo con solo citas pasadas aún reservadas muestra el estado vacío, como fija la spec en «Sin historia»; cubrirlo en T015); dejar `semanas` como `[]` hasta US2 (depende de T006, T014, T015)
- [X] T019 [US1] Implementar `obtenerAnalitica(clinicaId)` en `src/servicios/analitica.ts`: `obtenerClinica`, `listarProfesionales`, `listarServicios` y una consulta `select` de `cita` (`profesionalId`, `servicioId`, `estado`, `inicio`, `fin`) con `clinica_id = clinicaId` e `inicio` en `[desde, hasta)` de `periodoAnalitica(ahora(), zona)`; delegar en `calcularAnalitica`; solo lectura (research R7) (depende de T007, T018, T016)
- [X] T020 [P] [US1] Crear `src/components/analitica/grafico-barras.tsx` (Server Component, SVG): props `{ id, titulo, descripcion, orientacion: 'horizontal' | 'vertical', maximo, filas: { etiqueta, valor: number | null, texto, color? }[] }`; `viewBox` con ancho 100 % y alto según nº de filas; `role="img"`, `aria-labelledby` (título) y `aria-describedby` (descripción); etiqueta y valor en texto visible por barra; `valor = null` → sin barra y «Sin datos»; colores por token (`var(--grafico-n)`, por defecto `--primary`); sin JavaScript de cliente (contracts/ui-analitica.md «Gráficos»)
- [X] T021 [P] [US1] Crear `src/components/analitica/leyenda.tsx`: asignación fija por orden del profesional → color `--grafico-1..3` y forma (●, ■, ▲) y «Clínica» con línea discontinua en `--foreground`; exporta `estiloSerie(indice)` (color + forma) para reutilizar en gráficos y un componente `<Leyenda series=… />` con forma + nombre en texto
- [X] T022 [P] [US1] Crear `src/components/analitica/tablas.tsx` con `TablaOcupacion` (profesional · minutos ocupados · minutos disponibles · ocupación), `TablaNoAsistencia` (profesional · no asistidas · completadas + no asistidas · tasa) y `TablaIngresos` (servicio · precio · citas completadas · importe, con fila «Total»), incluyendo la fila «Clínica» en las dos primeras; formato con `formatearEntero`, `formatearPorcentaje` y `formatearPrecio`; `<caption>` en cada tabla; contenedor con desplazamiento horizontal propio en móvil
- [X] T023 [P] [US1] Crear `src/components/analitica/tarjetas-resumen.tsx` con 3 tarjetas de la clínica: Ocupación («70,4 %»), No asistencia («10,9 %» + «143 de 1.311») e Ingresos («47.140,00 €» + «1.168 citas completadas»), en rejilla de 1 columna en móvil y 3 en portátil
- [X] T024 [US1] Crear `src/app/analitica/page.tsx`: `exigirSesion` → `obtenerAnalitica`; `<h1>Analítica</h1>`, subtítulo «Últimas 8 semanas: dd/MM/yyyy – dd/MM/yyyy» y nota «La semana en curso no se incluye.»; si `hayDatos` es falso, solo «Todavía no hay citas suficientes para mostrar la analítica.»; si no, tarjetas y tres bloques (`<section aria-labelledby>`: «Ocupación por profesional», «No asistencia por profesional», «Ingresos por servicio»), cada uno con `GraficoBarras` horizontal + tabla; descripciones accesibles que nombran el máximo (p. ej. «Jorge tiene la tasa más alta: 13,0 %»). Crear también `src/app/analitica/error.tsx` (componente de cliente) con «No hemos podido cargar la analítica. Vuelve a intentarlo en unos segundos.» (spec, Edge Cases «Fallo al cargar») (depende de T019–T023)

**Checkpoint**: US1 completa y demostrable sola; T014–T017 en verde

---

## Phase 4: User Story 2 - Ver la evolución semana a semana (Priority: P2)

**Goal**: evolución de las 8 semanas: ocupación y no asistencia por profesional y clínica, e
ingresos semanales, con gráfico y tablas.

**Independent Test**: con la semilla 2026-11-09, comprobar que las 8 semanas y sus valores
coinciden con las tablas semanales de la spec y que Σ ingresos semanales = 47.140,00 €.

### Tests for User Story 2 (MANDATORY - Principle VI) ⚠️

- [X] T025 [P] [US2] Escribir `tests/unit/analitica-semanas.test.ts` con la semilla 2026-11-09: `US2 #1` 8 lunes de '2026-09-14' a '2026-11-02'; las 24 filas de la tabla «Por semana y profesional» de la spec (C, NA, Can y minutos de cada estado) copiadas literalmente como oráculo; no asistencia semanal de la clínica en décimas 127, 138, 102, 107, 91, 120, 138, 54 con `US2 #3` 20 de 157 y 9 de 166; ocupación semanal de la clínica 674, 686, 674, 721, 758, 708, 694, 715; ingresos semanales 554.000, 552.500, 568.500, 609.000, 642.500, 585.000, 564.500, 638.000 (`US2 #2`, `FR-012`); `US2 #4` la semana de mayor ocupación de Jorge es '2026-10-12' con 800 décimas (2.640 de 3.300); `US2 #5` semana '2026-11-02': María 50/1/3, Jorge 41/2/4, Lucía 66/6/8; `FR-007` tasas semanales por profesional, al menos Lucía semana '2026-10-26' → 172 décimas (11 de 64) y María semana '2026-11-02' → 20 décimas (1 de 51); invariantes 1 (Σ semanas = total = Σ servicios) y 3 (Σ semanas de cada profesional = sus totales); `SC-002` «en cualquier conjunto de datos»: repetir las invariantes 1–3 con `generarSemilla` para las fechas de referencia '2026-03-30', '2026-06-15', '2026-11-09' y '2027-01-11' (la primera cruza el cambio de hora de marzo) y `ahora` = lunes de esa fecha a las 12:10
- [X] T026 [P] [US2] Crear `tests/unit/analitica-semanas-casos.test.ts` con entradas sintéticas: `Edge Cases` cita del lunes 26/10/2026 a las 09:00 (08:00 UTC) → semana '2026-10-26'; cita del viernes 23/10/2026 a las 19:15 → semana '2026-10-19'; con `ahora` = lunes 26/10/2026 00:30 el periodo termina el domingo 25/10 y la cita del 26/10 no cuenta; semana sin citas de un profesional → tasa `null` («Sin datos»), ocupación 0 décimas (hay minutos disponibles) e ingresos 0
- [X] T027 [US2] Añadir a `tests/integration/analitica.test.ts`: `US2 #2` ingresos semanales y `US2 #5` detalle de la semana del 02/11/2026 desde `obtenerAnalitica` con la semilla cargada (depende de T016)
- [X] T028 [US2] Añadir a `tests/e2e/analitica.spec.ts`: `US2 #1` el eje/tabla muestra 8 semanas de «semana del 14/09/2026» a «semana del 02/11/2026» en orden; `US2 #2` «5.540,00 €» … «6.380,00 €» y fila total «47.140,00 €»; `US2 #3` «12,7 %» y «5,4 %» en la tabla semanal; `US2 #4` «80,0 %» en la fila de Jorge de la semana del 12/10/2026 dentro del detalle por profesional; `US2 #5` abrir «Ver detalle por profesional» muestra 50/1/3, 41/2/4 y 66/6/8 en la semana del 02/11/2026; los dos gráficos de líneas y el de barras semanales tienen `role="img"` con nombre (depende de T017)

### Implementation for User Story 2

- [X] T029 [US2] Completar `calcularAnalitica` en `src/dominio/analitica.ts` con `semanas`: asignar cada cita a `lunesDe(fechaLocal(inicio, zona))`; por semana, `porProfesional` y `clinica` con las mismas reglas que el periodo (minutos disponibles = `minutosDisponiblesSemana`) e `ingresosCentimos`; extraer la acumulación a una función común para que periodo y semana no dupliquen reglas (depende de T018, T025, T026)
- [X] T030 [P] [US2] Crear `src/components/analitica/grafico-lineas.tsx` (Server Component, SVG): 8 puntos por serie, eje Y 0–100 % con marcas cada 25 %, eje X «dd/MM» (lunes), una serie por profesional con color y marcador de `estiloSerie` y la de la clínica discontinua, etiqueta de texto al final de cada línea, huecos donde el valor es `null`; `role="img"` + `aria-labelledby`/`aria-describedby`; sin scroll horizontal a 360 px (depende de T021)
- [X] T031 [US2] Añadir a `src/components/analitica/tablas.tsx` `TablaSemanal` (semana del dd/MM/yyyy · completadas · no asistidas · canceladas · no asistencia · ocupación · ingresos, con fila «Total» del periodo) y `TablaSemanalProfesional` (mismas columnas por profesional y semana) dentro de `<details><summary>Ver detalle por profesional</summary>` (depende de T022)
- [X] T032 [US2] Añadir en `src/app/analitica/page.tsx` la sección «Evolución de las últimas 8 semanas»: `GraficoLineas` de ocupación, `GraficoLineas` de no asistencia, `GraficoBarras` vertical de ingresos semanales (etiquetas «dd/MM»), `Leyenda`, `TablaSemanal` y `TablaSemanalProfesional` (depende de T029–T031, T020)

**Checkpoint**: US1 y US2 completas; T025–T028 en verde

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T033 [P] Añadir a `tests/e2e/accesibilidad.spec.ts` la página `/analitica` (`SC-006`): `sinInfracciones` (axe WCAG 2.2 AA) y `sinScrollHorizontal` en los proyectos portátil y móvil, y repetir con `page.emulateMedia({ colorScheme: 'dark' })`
- [X] T034 [P] Añadir a `tests/e2e/rendimiento.spec.ts` `SC-004`: tras entrar, `/analitica` muestra la tabla de ingresos y la tabla semanal en < 2 s desde la navegación
- [X] T035 [P] Crear `tests/e2e/analitica-vacia.spec.ts` (`Edge Cases`): con `conBd` borrar las citas de la BD E2E, entrar y comprobar «Todavía no hay citas suficientes para mostrar la analítica.» sin gráficos; `test.afterAll(recargarSemilla)` para dejar la semilla intacta para el resto de pruebas
- [X] T036 Revisar todos los textos de `src/app/analitica/` y `src/components/analitica/` contra `contracts/ui-analitica.md`: español de España, sin jerga técnica, «Sin datos» en lugar de «0 %» o «NaN» (Principios VII y VIII)
- [X] T037 [P] Añadir a `docs/datos-demo.md` la sección «Analítica (spec 004)» con las cifras clave del periodo 14/09/2026 – 08/11/2026 (tasas, ocupaciones, ingresos por servicio y total) y un enlace a «Cifras de referencia» de la spec, indicando que se reproducen con la misma semilla (Principio V)
- [X] T038 Ejecutar la suite completa (`pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`) y los escenarios manuales 1–13 de `specs/004-panel-analitica/quickstart.md`; anotar cualquier discrepancia y corregirla antes de integrar
- [ ] T039 Prueba de usabilidad `SC-005` con 2 personas que no conocen CitaClara, en portátil y móvil: «¿Qué profesional tuvo más no asistencias en las últimas 8 semanas?» y «¿Qué servicio generó más ingresos?», cada una < 15 s y correcta; registrar tiempos y observaciones en `docs/usabilidad-004.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 → T002. Bloquea todo lo demás (sin la 001 no hay esquema, sesión
  ni semilla).
- **Foundational (Phase 2)**: depende de Setup; bloquea US1 y US2.
- **US1 (Phase 3)**: depende de Foundational.
- **US2 (Phase 4)**: depende de Foundational y, en código, de US1 (amplía `calcularAnalitica`,
  `tablas.tsx` y `page.tsx`, y reutiliza `grafico-barras.tsx` y `leyenda.tsx`). Sus tests
  unitarios (T025, T026) se pueden escribir en paralelo con US1.
- **Polish (Phase 5)**: depende de US1 y US2.

### Within Each User Story

- Tests primero y fallando; cada test cita su FR/escenario/SC.
- Dominio puro → servicio de lectura → componentes → página.
- Archivos compartidos dentro de la feature (editar en serie): `src/dominio/analitica.ts`
  (T006 → T018 → T029), `src/components/analitica/tablas.tsx` (T022 → T031),
  `src/app/analitica/page.tsx` (T024 → T032), `tests/e2e/analitica.spec.ts`
  (T013 → T017 → T028), `tests/integration/analitica.test.ts` (T016 → T027).

### Parallel Opportunities

- Foundational: T003, T005, T007, T008, T009, T010 y T012 en paralelo.
- US1: tests T014, T015, T016 en paralelo; componentes T020, T021, T022, T023 en paralelo
  entre sí y con T018–T019.
- US2: T025 y T026 en paralelo (incluso durante US1); T030 en paralelo con T029.
- Polish: T033, T034, T035, T037 en paralelo.

---

## Parallel Example: User Story 1

```bash
# Tests de US1 a la vez:
Task: "T014 tests/unit/analitica-totales.test.ts (cifras de referencia del periodo)"
Task: "T015 tests/unit/analitica-casos.test.ts (casos sintéticos)"
Task: "T016 tests/integration/analitica.test.ts (BD real, aislamiento, huella)"

# Componentes de presentación a la vez:
Task: "T020 src/components/analitica/grafico-barras.tsx"
Task: "T021 src/components/analitica/leyenda.tsx"
Task: "T022 src/components/analitica/tablas.tsx"
Task: "T023 src/components/analitica/tarjetas-resumen.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T025 tests/unit/analitica-semanas.test.ts (oráculo semanal)"
Task: "T026 tests/unit/analitica-semanas-casos.test.ts (cambio de hora, semanas vacías)"
Task: "T030 src/components/analitica/grafico-lineas.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: integrar la 001 y verificar cifras.
2. Phase 2: formato, reglas base, ruta, navegación, tokens, huella.
3. Phase 3: US1.
4. **PARAR Y VALIDAR**: quickstart escenarios 1–6 y 11–13; ya sirve para una reunión de
   renovación con los totales de las 8 semanas.

### Incremental Delivery

1. Setup + Foundational → `/analitica` protegida y enlazada.
2. US1 → totales del periodo (MVP).
3. US2 → evolución semanal.
4. Polish → accesibilidad, rendimiento, estado vacío, documentación y usabilidad.

---

## Notes

- La 004 no escribe nada: cualquier `insert`/`update`/`delete` fuera de `tests/` es un defecto.
- Las cifras de los tests salen de la spec; si cambian, primero se corrige la spec (Principio I).
- Los cambios en archivos de la 001 (`cabecera.tsx`, `agenda/layout.tsx`, `proxy.ts`,
  `formato.ts`, `catalogo.ts`, `globals.css`) son aditivos, para facilitar la integración con
  las ramas `portal` (spec 002-portal-paciente), `recordatorio` (spec 003-recordatorios-cita)
  y `005-acceso-cancelacion-paciente`.
