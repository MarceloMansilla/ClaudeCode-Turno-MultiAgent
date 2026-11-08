# Modelo de datos (Fase 1): Panel de analítica

**Feature**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

**Esta feature no crea, modifica ni borra tablas, columnas, índices ni filas** (FR-015). Lee
el esquema de la 001 ([data-model 001](../001-agenda-core/data-model.md)) y calcula al vuelo
los modelos de vista descritos abajo.

## Lectura (única consulta)

Citas de la clínica de la sesión con `inicio` en el periodo `[desde, hasta)`:

| Campo leído | Origen | Uso |
|-------------|--------|-----|
| `cita.profesional_id` | cita | agrupar por profesional |
| `cita.estado` | cita | recuentos, tasa, ocupación, ingresos |
| `cita.inicio` | cita | semana local (FR-005) |
| `cita.fin` | cita | minutos = fin − inicio (FR-008) |
| `cita.servicio_id`, `servicio.nombre`, `servicio.precio_centimos` | servicio | ingresos (FR-010) |

Más, de la 001: `clinica` (zona horaria, horario, días laborables), `profesional` (nombre,
orden) y `servicio` (para listar también servicios sin citas completadas, con 0,00 €).

No se lee ningún dato de recordatorios: el panel no distingue citas con o sin recordatorio
(R12).

Filtro: `cita.clinica_id = :clinicaId AND cita.inicio >= :desde AND cita.inicio < :hasta`.
Sin índices nuevos: con el volumen esperado (≤ 3.000 filas) la consulta es trivial.

## Reglas de cálculo (función pura `calcularAnalitica`)

| Regla | Definición | Spec |
|-------|------------|------|
| Periodo | `lunesActual` = lunes de la fecha local de «ahora»; semanas = los 8 lunes anteriores | FR-004 |
| Semana de una cita | lunes de `fechaLocal(inicio, zona)` | FR-005 |
| Tasa de no asistencia (definición canónica del producto) | `no_asistida ÷ (completada + no_asistida)`; den. 0 → `null`. No es la proporción sobre el total de citas de la 001 (R11) | FR-006, FR-007 |
| Minutos ocupados | Σ `(fin − inicio)` de citas `completada`, `no_asistida` y `reservada` | FR-008 |
| Minutos disponibles | nº de días laborables de la semana × (cierre − apertura) por profesional | FR-008 |
| Ocupación | ocupados ÷ disponibles; clínica = Σ ocupados ÷ Σ disponibles | FR-008, FR-009 |
| Ingresos | Σ `precio_centimos` de citas `completada` | FR-010–FR-012 |
| Porcentajes | décimas enteras, mitad hacia arriba: `⌊(2000·num + den) / (2·den)⌋` | Spec, «Amounts and dates» |
| Canceladas | solo se cuentan (detalle semanal); no entran en tasa, ocupación ni ingresos | FR-006, FR-008, FR-010 |

## Modelos de vista (no se almacenan)

```text
ResumenAnalitica
├── periodo: { desde: 'AAAA-MM-DD' (lunes), hasta: 'AAAA-MM-DD' (domingo), etiqueta }
├── hayDatos: boolean                      # false → estado vacío (Edge Cases)
├── profesionales: IndicadoresProfesional[]  (orden de la agenda)
├── clinica: Indicadores                   # agregado de todos los profesionales
├── ingresosPorServicio: IngresoServicio[]   (orden del catálogo)
├── ingresosTotalCentimos: number          # = Σ ingresosPorServicio = Σ semanas[].ingresosCentimos
└── semanas: Semana[8]                     (cronológico)

Indicadores
├── completadas, noAsistidas, canceladas: number
├── minutosOcupados, minutosDisponibles: number
├── tasaNoAsistenciaDecimas: number | null   # p. ej. 105 → «10,5 %»
└── ocupacionDecimas: number | null

IndicadoresProfesional = Indicadores + { profesionalId, nombre }

IngresoServicio = { servicioId, nombre, precioCentimos, citas, importeCentimos }

Semana
├── lunes: 'AAAA-MM-DD'
├── porProfesional: IndicadoresProfesional[]
├── clinica: Indicadores
└── ingresosCentimos: number
```

## Invariantes (cada una con test)

1. `ingresosTotalCentimos = Σ ingresosPorServicio[].importeCentimos = Σ semanas[].ingresosCentimos`.
2. `clinica.X = Σ profesionales[].X` para recuentos y minutos; ídem en cada semana.
3. Para cada profesional, `Σ semanas[].porProfesional[p].X = profesionales[p].X`.
4. `semanas.length = 8`, lunes consecutivos, el último = `lunesActual − 7 días`.
5. Todos los importes y minutos son enteros; ningún valor depende de coma flotante.
6. La BD queda idéntica tras calcular (FR-015).

## Ejemplo trazado (semilla 2026-11-09, María, semana del 02/11/2026)

Citas en estados finales: 50 completadas (2.430 min), 1 no asistida (60 min), 3 canceladas
(150 min). Tasa = 1 ÷ 51 → ⌊(2000 + 51) / 102⌋ = 20 décimas → «2,0 %». Ocupación =
(2.430 + 60) ÷ 3.300 → ⌊(2000 · 2.490 + 3.300) / 6.600⌋ = 755 → «75,5 %».
