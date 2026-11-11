# Modelo de datos (Fase 1): Portal del paciente

**Feature**: [spec.md](spec.md) | **Investigación**: [research.md](research.md) |
**Base**: [modelo de la 001](../001-agenda-core/data-model.md) y modelo de la 005

La 002 **no añade tablas, columnas, enums ni migraciones**. El origen de la cancelación y el
teléfono de la clínica son de la 001 (FR-018a, FR-022); el enlace personal, el acceso, el
plazo y el enunciado de la política son de la 005. La 002 solo define reglas derivadas de
lectura: clasificación del portal y huecos liberados.

## Diagrama (lo que la 002 usa; nada es suyo)

```text
clinica 1───* paciente 1───1 enlace_paciente      (de la 005)
clinica 1───* cita *───1 paciente                 (cita.cancelada_por: de la 001, FR-018a)
```

## Datos y reglas que usa de otras specs

| Qué | De quién | Uso en la 002 |
|-----|----------|---------------|
| `clinica.telefono` | 001 FR-022 | Todas las pantallas del portal (FR-009) |
| `cita.cancelada_por` (`recepcion` / `paciente`) y `estado_cambiado_en` | 001 FR-018a | Etiqueta «Cancelada por el paciente» (FR-015) y huecos liberados (FR-015a) |
| Enlace personal y acceso abierto | 005 FR-001–FR-008 | La lectura del portal recibe ya resuelta la ficha y la clínica |
| ¿Se puede cancelar? | 005 FR-009 → `pacientePuedeCancelar(cita, ahora)` | Mostrar u ocultar «Cancelar cita» |
| Límite de cancelación | 005 FR-009 → `limiteCancelacionPaciente(inicio)` | Solo si hace falta ordenar o comparar; nunca para redactar texto |
| Enunciado de la política | 005 FR-016 → `enunciadoPoliticaCancelacion(...)` | Único texto sobre el plazo en cada tarjeta |

La 002 no tiene ninguna tabla de ejemplos del plazo: los ejemplos de referencia son los de
005 FR-010.

## Reglas derivadas propias (no se almacenan)

### Clasificación en el portal (FR-007, FR-008)

| Condición | Lista | Etiqueta |
|-----------|-------|----------|
| `reservada` y `inicio > ahora` | Próximas citas (orden ascendente) | — (con «Cancelar cita» si la 005 lo permite, y siempre el enunciado) |
| `inicio ≤ ahora` y `completada` | Historial (orden descendente por `inicio`, igual para todos los estados) | «Realizada» |
| `inicio ≤ ahora` y `no_asistida` | Historial | «No asistida» |
| `inicio ≤ ahora` y `reservada` | Historial | «Pasada» |
| `cancelada` (cualquier fecha) y `cancelada_por = 'paciente'` | Historial | «Cancelada por usted» |
| `cancelada` (cualquier fecha) y `cancelada_por = 'recepcion'` | Historial | «Cancelada por la clínica» |

Ejemplo (reloj 12:10 del 09/11/2026): una cita reservada de hoy a las 12:00 va al Historial
como «Pasada»; una de las 12:15 va a Próximas (que tenga o no «Cancelar cita» lo decide
`pacientePuedeCancelar`). Una cita del 16/11/2026 cancelada hoy va la primera del Historial
(su inicio es el más reciente).

### Huecos liberados por pacientes (FR-015a)

Citas `c` con `cancelada_por = 'paciente'` (001 FR-018a) y `c.inicio > ahora` para las que
**no existe** otra cita `o` del mismo profesional con `o.estado IN ('reservada','completada')`
y `o.inicio < c.fin AND c.inicio < o.fin`. Entradas con el mismo profesional, inicio y fin se
agrupan en una (la de `estado_cambiado_en` más reciente). Orden: `inicio` ascendente.

## Semilla

La 002 no amplía la semilla: teléfono y origen, de la 001 (FR-022, FR-018a); los 40 enlaces,
de la 005 (FR-019). Propio de la 002: la regla de selección de los pacientes de ejemplo A y B
(research P8), que solo lee la semilla.
