# Datos de demostración de Clínica Eleva

Cifras reproducibles (Constitución, Principio V; spec 001, FR-021–FR-024). Son las únicas que
se citan en documentación y pruebas.

## Cómo reproducirlas

```bash
pnpm seed --fecha-referencia 2026-11-09
```

La misma fecha de referencia genera siempre los mismos datos **e identificadores** (FR-021).
Solo cambia el hash de la clave de panel; la clave sigue siendo `CLAVE_DEMO` (por defecto
`eleva-demo`).

## Resumen con fecha de referencia 2026-11-09 (lunes)

| Concepto | Valor |
|----------|-------|
| Clínica | Clínica Eleva (Europe/Madrid, lunes a viernes 09:00–20:00), teléfono 911 234 567 (spec 001, FR-022) |
| Profesionales | María y Jorge (Fisioterapia), Lucía (Nutrición) |
| Servicios | Sesión de fisioterapia 45 min 40,00 € · Primera visita de fisioterapia 60 min 50,00 € · Consulta de nutrición 30 min 35,00 € · Primera visita de nutrición 45 min 45,00 € |
| Pacientes | 40 (teléfonos españoles, todos distintos) |
| Historia | 40 días laborables: 14/09/2026 – 06/11/2026 |
| Futuro | 10 días laborables: 09/11/2026 – 20/11/2026 |
| Citas totales | 1705 |
| Historia | 1425 citas: 1168 completadas, 114 canceladas (8,0 %), 143 no asistidas (10,0 %) |
| Futuro | 280 citas reservadas |

Los porcentajes de la historia son **proporciones sobre el total de citas de la historia**
(spec 001, FR-023): no asistidas 143 de 1425 = 10,0 %; canceladas 114 de 1425 = 8,0 %. No son
la «tasa de no asistencia» del panel de analítica: esa la define la spec 004, FR-006, como
no asistidas ÷ (completadas + no asistidas), y sobre estos mismos datos vale **10,9 %**
(143 de 1.311). Las canceladas de la historia son todas de recepción
(`cancelada_por = 'recepcion'`, spec 001, FR-018a).

### Por profesional

| Profesional | Reservadas | Completadas | Canceladas | No asistidas |
|-------------|-----------:|------------:|-----------:|-------------:|
| María | 84 | 349 | 34 | 41 |
| Jorge | 87 | 335 | 32 | 50 |
| Lucía | 109 | 484 | 48 | 52 |
| **Total** | **280** | **1168** | **114** | **143** |

## Analítica (spec 004)

Con la misma semilla (`pnpm seed --fecha-referencia 2026-11-09`) y «ahora» el lunes
09/11/2026, la página «Analítica» cubre las 8 semanas completas del **14/09/2026 al
08/11/2026** (la semana en curso no se incluye) y muestra:

| Profesional | No asistencia | Ocupación |
|-------------|--------------:|----------:|
| María | 10,5 % (41 de 390) | 71,6 % |
| Jorge | 13,0 % (50 de 385) | 71,2 % |
| Lucía | 9,7 % (52 de 536) | 68,4 % |
| **Clínica** | **10,9 % (143 de 1.311)** | **70,4 %** |

| Servicio | Citas completadas | Ingresos |
|----------|------------------:|---------:|
| Sesión de fisioterapia | 520 | 20.800,00 € |
| Primera visita de fisioterapia | 164 | 8.200,00 € |
| Consulta de nutrición | 364 | 12.740,00 € |
| Primera visita de nutrición | 120 | 5.400,00 € |
| **Total** | **1.168** | **47.140,00 €** |

Las tablas completas (por semana y por profesional) están en
[Cifras de referencia](../specs/004-panel-analitica/spec.md#cifras-de-referencia-semilla-2026-11-09)
de la spec 004; los tests las usan como oráculo, así que cualquier cambio en la semilla obliga
a recalcularlas (Principio V).

## Enlaces de pacientes (spec 005, FR-019)

Cada paciente tiene un enlace personal determinista. Para entrar hacen falta el enlace y las 4
últimas cifras del teléfono de su ficha (spec 005, FR-006). **P** es el primero (quickstart de la 005).

| Paciente | Enlace | 4 cifras |
|----------|--------|----------|
| Pablo Marín Blanco (**P**) | `/p/ZKMK6mfIPpP1wk982OEY1YSFFrkC5977gToHkvRIVYA` | 9229 |
| Manuel Sánchez Muñoz | `/p/l95yvqRQ4f32ZfiKDEph7hQGTNIMwM-vJs7IPcBfad8` | 8411 |
| Manuel Ortiz Gómez | `/p/m1oGnwYf4G7yVWAkTgu_gjt-NOl8ooix9duqBDbcuZ4` | 6157 |

Los enlaces no cambian ninguna otra cifra de este documento.
