# Quickstart: validar el panel de analítica

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Prerrequisitos

- La 001 integrada en la rama (`src/`, migraciones y semilla presentes) — research R10.
- Entorno de la 001: Node 22, pnpm, Docker ([quickstart 001](../001-agenda-core/quickstart.md)).

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm seed --fecha-referencia 2026-11-09
```

## Pruebas automáticas

```bash
pnpm test:unit            # dominio/analitica: todas las «Cifras de referencia» de la spec
pnpm test:integration     # obtenerAnalitica con BD real, aislamiento por clínica, BD intacta
pnpm test:e2e             # página en portátil y móvil, accesibilidad, rendimiento
```

Resultado esperado: todo en verde, incluida la suite completa de la 001.

## Escenarios manuales

Con la semilla anterior y `CITACLARA_AHORA=2026-11-09T12:10:00+01:00`:

| # | Paso | Resultado esperado | Spec |
|---|------|--------------------|------|
| 1 | Abrir `/analitica` sin sesión | Redirige a `/entrar`; ninguna cifra visible | US1 #1, FR-001 |
| 2 | Entrar con la clave y pulsar «Analítica» | Página sin pedir otra vez la clave; «Agenda» vuelve a la agenda | US1 #2, FR-002 |
| 3 | Leer el subtítulo | «Últimas 8 semanas: 14/09/2026 – 08/11/2026» | US1 #3, FR-004 |
| 4 | Bloque de ingresos | 20.800,00 € · 8.200,00 € · 12.740,00 € · 5.400,00 € · Total 47.140,00 € | US1 #4 |
| 5 | Bloque de no asistencia | María 10,5 % (41 de 390) · Jorge 13,0 % (50 de 385) · Lucía 9,7 % (52 de 536) · Clínica 10,9 % | US1 #5 |
| 6 | Bloque de ocupación | María 71,6 % · Jorge 71,2 % · Lucía 68,4 % · Clínica 70,4 % | US1 #6 |
| 7 | Evolución: ingresos semanales | 5.540,00 € … 6.380,00 €; suma 47.140,00 € | US2 #2 |
| 8 | Evolución: no asistencia de la clínica | 14/09: 12,7 % (20 de 157) · 02/11: 5,4 % (9 de 166) | US2 #3 |
| 9 | Evolución: ocupación de Jorge | máximo en la semana del 12/10/2026: 80,0 % | US2 #4 |
| 10 | Detalle por profesional, semana del 02/11 | María 50/1/3 · Jorge 41/2/4 · Lucía 66/6/8 | US2 #5 |
| 11 | Ventana de 360 px | Sin scroll horizontal; gráficos legibles | SC-006 |
| 12 | Tema oscuro del sistema | Gráficos y textos con contraste suficiente | SC-006 |
| 13 | Con BD vacía de citas (`TRUNCATE cita`, solo en BD de pruebas) | «Todavía no hay citas suficientes para mostrar la analítica.» | Edge Cases |

Las cifras completas (por semana y profesional) están en «Cifras de referencia» de la
[spec](spec.md#cifras-de-referencia-semilla-2026-11-09).

## Comprobación de solo lectura (SC-003)

Antes y después de recorrer la página, calcular la huella de la BD (recuento y hash de cada
tabla de negocio, como hace el test de integración) y comprobar que es idéntica.
