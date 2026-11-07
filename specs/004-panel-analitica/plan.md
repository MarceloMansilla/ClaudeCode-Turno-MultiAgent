# Implementation Plan: Panel de analítica de la clínica

**Branch**: `analitica` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-panel-analitica/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Página `/analitica` del panel, protegida por la misma sesión que la agenda, que muestra para
las 8 semanas completas anteriores a la semana en curso: ocupación y tasa de no asistencia
por profesional y de la clínica, ingresos por servicio (citas completadas, al céntimo) y su
evolución semanal. Enfoque técnico: **una consulta de solo lectura** sobre las tablas de la
001 y **una función pura** que agrega en memoria con aritmética entera (céntimos y décimas de
porcentaje), probada contra las cifras exactas de la semilla 2026-11-09. Gráficos **SVG
propios renderizados en servidor**, sin biblioteca nueva, cada uno con su tabla accesible.
Detalle en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Node.js 22 LTS (heredado de la 001)

**Primary Dependencies**: las de la 001 (Next.js 16, React 19, Tailwind CSS 4, shadcn/ui,
Drizzle ORM, date-fns 4 + @date-fns/tz). **Ninguna dependencia nueva.**

**Storage**: PostgreSQL 18 de la 001, **solo lectura**; sin migraciones ni índices nuevos

**Testing**: Vitest (unitarias con la semilla pura como oráculo; integración con
Testcontainers), Playwright + @axe-core/playwright (portátil 1366×768 y móvil 360×800)

**Target Platform**: navegadores actuales en portátil y móvil; servidor Node.js 22

**Project Type**: aplicación web full-stack (el mismo proyecto de la 001)

**Performance Goals**: página completa en < 2 s con la semilla (SC-004); una consulta de
1.425 filas con la semilla y agregación O(n)

**Constraints**: 0 escrituras (FR-015, SC-003); importes exactos en céntimos y porcentajes en
décimas enteras (Principio II); sin scroll horizontal desde 360 px y WCAG 2.2 AA, también en
gráficos (SC-006)

**Scale/Scope**: una clínica, 2–5 profesionales, 8 semanas; 1 página nueva, 5 gráficos y sus
tablas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Puertas derivadas de `.specify/memory/constitution.md` (v1.0.0). Evaluación previa a la
investigación y repetida tras el diseño (mismo resultado):

- [x] **I. Spec primero**: ✅ spec registrada en `specs/MAPA.md` con propietario único
      (MarceloMansilla), clarificada (3 preguntas) y aprobada el 2026-11-07. El plan no añade
      comportamiento: el resumen de la clínica son los valores «de la clínica» de FR-006,
      FR-008 y FR-011; el cambio en la cabecera de la 001 es el que pide FR-002.
- [x] **II. Números**: ✅ importes como suma de céntimos enteros, sin divisiones ni redondeos;
      porcentajes en décimas con aritmética entera y redondeo de la mitad hacia arriba (R3);
      totales verificados por dos caminos (por servicio y por semana). Semanas por fecha local
      de la clínica; periodo calculado con fechas locales, inmune al cambio de hora (R2).
      Formato de importes único en el producto (`formatearPrecio` de la 001).
- [x] **III. Solape**: N/A — la feature no escribe en la agenda (FR-015). En su lugar, prueba
      de que la BD queda idéntica tras usar la analítica (R7).
- [x] **IV. Simplicidad**: ✅ sin dependencias, tablas, índices ni migraciones nuevas; una
      consulta + una función pura; gráficos SVG propios en lugar de una biblioteca (R5,
      alternativa descartada documentada); sin selector de periodo ni exportación.
- [x] **V. Datos demo**: ✅ no cambia la semilla; las cifras de la spec se reproducen con
      `pnpm seed --fecha-referencia 2026-11-09` y los tests las usan como oráculo (R9).
- [x] **VI. Tests**: ✅ unitarias para cada regla y cada cifra de referencia, integración con
      BD real (incluido solo lectura y aislamiento por clínica) y E2E en portátil y móvil;
      cada test cita su FR/SC/escenario.
- [x] **VII. Interfaz**: ✅ cada gráfico con tabla de cifras exactas, color + forma + texto,
      contraste verificado en claro y oscuro, mobile-first, textos de clínica («Sin datos»,
      «La semana en curso no se incluye.»).
- [x] **VIII. Idioma**: ✅ interfaz, documentación e identificadores de dominio en español
      de España.

## Project Structure

### Documentation (this feature)

```text
specs/004-panel-analitica/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── ui-analitica.md
│   └── servicio-analitica.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

Sobre la estructura de la 001; `+` = nuevo, `~` = cambio aditivo en archivo de la 001.

```text
src/
├── app/
│   ├── analitica/
│   │   ├── layout.tsx            + exigirSesion + Cabecera (como app/agenda/layout.tsx)
│   │   ├── page.tsx              + obtenerAnalitica → bloques
│   │   ├── loading.tsx           + «Cargando la analítica…»
│   │   └── error.tsx             + «No hemos podido cargar la analítica…»
│   └── globals.css               ~ tokens --grafico-1..3 (claro y oscuro)
├── components/
│   ├── cabecera.tsx              ~ navegación «Agenda» / «Analítica» (FR-002)
│   └── analitica/                +
│       ├── tarjetas-resumen.tsx
│       ├── grafico-barras.tsx        # barras horizontales y verticales (SVG)
│       ├── grafico-lineas.tsx        # evolución de 8 semanas (SVG)
│       ├── leyenda.tsx               # color + forma + nombre
│       └── tablas.tsx                # tablas de cifras exactas por bloque
├── dominio/
│   └── analitica.ts              + periodoAnalitica, calcularAnalitica, decimas (puras)
├── servicios/
│   ├── analitica.ts              + obtenerAnalitica (solo SELECT)
│   └── catalogo.ts               ~ listarServicios(clinicaId)
├── lib/
│   └── formato.ts                ~ formatearEntero, formatearPorcentaje
└── proxy.ts                      ~ matcher incluye /analitica

tests/
├── unit/
│   ├── analitica-base.test.ts            + periodo, redondeo, minutos disponibles
│   ├── analitica-totales.test.ts         + cifras del periodo con generarSemilla('2026-11-09')
│   ├── analitica-casos.test.ts           + casos sintéticos del periodo
│   ├── analitica-semanas.test.ts         + cifras semanales con la semilla
│   ├── analitica-semanas-casos.test.ts   + cambio de hora, semanas vacías
│   └── formato.test.ts                   ~ enteros y porcentajes
├── helpers/
│   └── huella-bd.ts              + huella de las tablas de negocio (SC-003)
├── integration/
│   └── analitica.test.ts         + BD real: mismas cifras, aislamiento, huella de BD intacta
└── e2e/
    ├── analitica.spec.ts         + acceso, navegación, cifras de US1 y US2, solo lectura
    ├── analitica-vacia.spec.ts   + estado vacío
    ├── accesibilidad.spec.ts     ~ /analitica en claro y oscuro, 360 px
    └── rendimiento.spec.ts       ~ /analitica < 2 s
```

**Structure Decision**: mismo proyecto Next.js de la 001 y misma separación por capas: la
regla de negocio (periodo, tasas, ocupación, ingresos) vive en `src/dominio/analitica.ts`
como función pura; `src/servicios/analitica.ts` solo lee; la página y los componentes solo
presentan. Los únicos archivos de la 001 que se tocan reciben cambios aditivos
(cabecera, proxy, formato, tokens de tema).

## Dependencias y riesgos

- **Prerrequisito (R10)**: integrar la 001 en la rama `analitica` antes de implementar. Hoy la
  001 está implementada pero sin commit en `001-agenda-core`.
- **Cifras de referencia**: dependen de la semilla de la 001; si cambia antes de integrarse,
  recalcular las tablas de la spec y los tests (Principio V).
- **Ramas en paralelo**: `cabecera.tsx`, `proxy.ts`, `formato.ts` y `globals.css` también
  pueden tocarlos `portal` y `recordatorio`; los cambios aquí son aditivos para facilitar la
  integración. Además, `portal` y `recordatorio` usan ambas el número de spec `002`
  (colisión ajena a esta feature, a resolver por su propietario).

## Complexity Tracking

Sin violaciones de la constitución que justificar.
