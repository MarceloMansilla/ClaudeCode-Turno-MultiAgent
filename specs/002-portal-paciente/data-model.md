# Modelo de datos (Fase 1): Portal del paciente

**Feature**: [spec.md](spec.md) | **Investigación**: [research.md](research.md) |
**Base**: [modelo de la 001](../001-agenda-core/data-model.md)

**Revisión cruzada S2–S4 (2026-11-07)**: la 002 **no añade tablas, columnas, enums ni
migraciones propias**. Todo lo que este modelo añadía pertenece a otras specs y aquí solo se
referencia: el origen de la cancelación y el teléfono de la clínica son de la 001 (FR-018a,
FR-022); el enlace personal del paciente es de la 005 (FR-001–FR-008, FR-019). La 002 solo
define reglas derivadas de lectura (plazo mostrado, clasificación, huecos liberados).

## Diagrama (lo que la 002 usa; nada es suyo)

```text
clinica 1───* paciente 1───1 enlace personal      (de la 005)
clinica 1───* cita *───1 paciente                 (cita.cancelada_por: de la 001, FR-018a)
```

## Datos que usa de otras specs

### clinica.telefono — de la 001, FR-022

Teléfono de contacto que el portal muestra en todas sus pantallas (spec FR-009, FR-013).
Semilla: `911 234 567`. Esquema, reglas y migración: los define la 001.

### cita.cancelada_por — de la 001, FR-018a

Origen de la cancelación, con valores `'recepcion'` y `'paciente'`; el momento es
`estado_cambiado_en`. Enum, restricción, migración y valor de las cancelaciones ya
existentes: los define la 001. La 002:

- escribe `cancelada_por = 'paciente'` al cancelar desde el portal (research P5);
- lo lee para la etiqueta «Cancelada por el paciente» y para los huecos liberados (abajo).

La restricción `cita_sin_solape` de la 001 no cambia.

### Enlace personal del paciente — de la 005

Credencial, almacenamiento, unicidad, regeneración, respuesta ante enlace no válido y
generación en la semilla: 005, FR-001–FR-008 y FR-019 (y su plan). La 002 solo necesita
resolver un enlace vigente a `(clinica_id, paciente_id)` y que un enlace regenerado deje de
resolverse.

*Rastro*: la tabla `acceso_paciente` (token en claro, `generacion`, contadores de fallos y
bloqueos) y las reglas de verificación de las 4 cifras que figuraban aquí se han retirado; la
confirmación de las 4 cifras, su límite de intentos y la sesión se aportan como propuesta a la
clarificación pendiente de 005 FR-006 en [spec.md](spec.md#dependencias-y-enmiendas-requeridas),
y el almacenamiento del token, al plan de la 005.

## Reglas derivadas (no se almacenan)

### Plazo de cancelación (FR-012)

`plazo = inicio − 24 horas` (resta de instantes). Cancelable desde el portal si
`estado = 'reservada'` y `ahora < plazo`. Se muestra en hora local de la clínica.

| Cita (hora local) | Plazo mostrado | Con reloj lunes 09/11/2026 12:10 |
|-------------------|----------------|-----------------------------------|
| martes 10/11/2026 10:00 | lunes, 09/11/2026 a las 10:00 | vencido: sin botón |
| martes 10/11/2026 12:15 | lunes, 09/11/2026 a las 12:15 | cancelable 5 min más |
| lunes 16/11/2026 10:00 | domingo, 15/11/2026 a las 10:00 | cancelable |
| lunes 30/03/2026 09:00 | domingo, 29/03/2026 a las 09:00 | (semana del cambio de hora: mismo resultado) |

En el instante exacto del plazo ya no se puede cancelar.

### Clasificación en el portal (FR-007, FR-008)

| Condición | Lista | Etiqueta |
|-----------|-------|----------|
| `reservada` y `inicio > ahora` | Próximas citas (orden ascendente) | — (con plazo o aviso de fuera de plazo) |
| `inicio ≤ ahora` y `completada` | Historial (orden descendente) | «Realizada» |
| `inicio ≤ ahora` y `no_asistida` | Historial | «No asistida» |
| `inicio ≤ ahora` y `reservada` | Historial | «Pasada» |
| `cancelada` (cualquier fecha) | Historial | «Cancelada» |

Ejemplo (reloj 12:10): una cita reservada de hoy a las 12:00 va al Historial como «Pasada»;
una de las 12:15 va a Próximas, sin botón de cancelar (plazo vencido).

### Huecos liberados por pacientes (FR-015a)

Citas `c` con `cancelada_por = 'paciente'` (001 FR-018a) y `c.inicio > ahora` para las que
**no existe** otra cita `o` del mismo profesional con `o.estado IN ('reservada','completada')`
y `o.inicio < c.fin AND c.inicio < o.fin`. Entradas con el mismo profesional, inicio y fin se
agrupan en una (la de `estado_cambiado_en` más reciente). Orden: `inicio` ascendente.

## Semilla

La 002 no amplía la semilla por su cuenta (research P8):

- `clinica.telefono = '911 234 567'` y `cancelada_por = 'recepcion'` en las cancelaciones de
  la historia: de la 001 (FR-022, FR-018a).
- Un enlace personal reproducible por cada uno de los 40 pacientes: de la 005 (FR-019).
- Propio de la 002: la regla de selección de los pacientes de ejemplo A y B (research P8),
  que solo lee la semilla.
