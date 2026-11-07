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
| Clínica | Clínica Eleva (Europe/Madrid, lunes a viernes 09:00–20:00) |
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
