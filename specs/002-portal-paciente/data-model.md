# Modelo de datos (Fase 1): Portal del paciente

**Feature**: [spec.md](spec.md) | **Investigación**: [research.md](research.md) |
**Base**: [modelo de la 001](../001-agenda-core/data-model.md)

Se parte del esquema de la 001 sin cambiar nada de lo existente; solo se añaden columnas y
una tabla. Mismas convenciones: `uuid`, `timestamptz` (UTC), nombres en español.

## Diagrama (lo nuevo en negrita)

```text
clinica 1───* paciente 1───0..1 **acceso_paciente**
clinica 1───* cita *───1 paciente
```

## Cambios en tablas de la 001 (Enmienda 1)

### clinica

| Campo nuevo | Tipo | Reglas |
|-------------|------|--------|
| telefono | texto | obligatorio; teléfono español válido (mismas reglas que FR-016c de la 001); se muestra tal cual. Semilla: `911 234 567` |

La migración añade la columna con el valor por defecto de la semilla para instalaciones
existentes y luego quita el valor por defecto.

### cita

| Campo nuevo | Tipo | Reglas |
|-------------|------|--------|
| cancelada_por | enum `origen_cancelacion` | `recepcion` \| `paciente`; nulo salvo si `estado = 'cancelada'` |

- `CHECK ((estado = 'cancelada') = (cancelada_por IS NOT NULL))`.
- El momento de la cancelación es el `estado_cambiado_en` que ya existe (FR-016).
- Migración: las citas ya canceladas pasan a `cancelada_por = 'recepcion'`.
- La restricción `cita_sin_solape` **no cambia**.

## acceso_paciente (nueva)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | uuid | PK |
| clinica_id | uuid | FK → clinica |
| paciente_id | uuid | FK → paciente (misma clínica); **único**: un acceso por ficha |
| token | texto | 43 caracteres base64url (32 bytes aleatorios); **único**; en claro (research P2) |
| generacion | integer | empieza en 1; +1 en cada regeneración; invalida sesiones antiguas |
| fallos_tanda | smallint | 0–4; fallos desde el último bloqueo temporal o acierto |
| fallos_acumulados | smallint | 0–10; fallos desde el último acierto |
| bloqueado_hasta | timestamptz | nulo o fin del bloqueo temporal de 15 min |
| bloqueado | boolean | `true` tras 10 fallos acumulados; solo se quita regenerando |
| creado_en | timestamptz | por defecto `now()` |
| regenerado_en | timestamptz | nulo hasta la primera regeneración |

Índices: único `(paciente_id)`, único `(token)`.

### Reglas de verificación de las 4 cifras (FR-002, FR-005)

En una transacción, con `SELECT … FOR UPDATE` sobre la fila del acceso:

1. Token inexistente → `ENLACE_NO_VALIDO` (no hay fila que contar).
2. `bloqueado` → `ENLACE_BLOQUEADO`.
3. `bloqueado_hasta > ahora` → `ENLACE_BLOQUEADO_TEMPORAL` (con la hora de fin). El
   intento no cuenta.
4. Cifras = 4 últimas de `paciente.telefono_normalizado` → acierto: `fallos_tanda = 0`,
   `fallos_acumulados = 0`, `bloqueado_hasta = null`; se emite la sesión.
5. Si no coinciden: `fallos_acumulados += 1`, `fallos_tanda += 1`;
   - si `fallos_acumulados = 10` → `bloqueado = true` → `ENLACE_BLOQUEADO`;
   - si no, si `fallos_tanda = 5` → `bloqueado_hasta = ahora + 15 min`, `fallos_tanda = 0`
     → `ENLACE_BLOQUEADO_TEMPORAL`;
   - si no → `CIFRAS_INCORRECTAS`.

Ejemplo (reloj 12:10): 5 fallos seguidos a las 12:10 → bloqueado hasta las 12:25; tras
otros 5 fallos a partir de las 12:25 → bloqueado hasta que recepción regenere el enlace.
Las cifras escritas solo se aceptan si son exactamente 4 dígitos; otro formato devuelve
`DATOS_NO_VALIDOS` y no cuenta como fallo.

### Regenerar (FR-002a)

`UPDATE acceso_paciente SET token = <nuevo>, generacion = generacion + 1, fallos_tanda = 0,
fallos_acumulados = 0, bloqueado_hasta = null, bloqueado = false, regenerado_en = now()
WHERE paciente_id = $1 AND clinica_id = $2`. El token anterior deja de existir: abrirlo da
`ENLACE_NO_VALIDO`. Las sesiones con la `generacion` anterior se rechazan
(`SESION_PORTAL_CADUCADA` → mensaje de enlace no válido).

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

Citas `c` con `cancelada_por = 'paciente'` y `c.inicio > ahora` para las que **no existe**
otra cita `o` del mismo profesional con `o.estado IN ('reservada','completada')` y
`o.inicio < c.fin AND c.inicio < o.fin`. Entradas con el mismo profesional, inicio y fin se
agrupan en una (la de `estado_cambiado_en` más reciente). Orden: `inicio` ascendente.

## Semilla (ampliación, research P8)

Orden de generación: lo de la 001 sin cambios (clínica → profesionales → servicios →
pacientes → citas), y **después** un `acceso_paciente` por cada paciente en orden de
creación: 16 bytes del PRNG para el `id` y 32 para el `token`; `generacion = 1`, contadores
a 0. `clinica.telefono = '911 234 567'`. Cancelaciones de la historia:
`cancelada_por = 'recepcion'`.
