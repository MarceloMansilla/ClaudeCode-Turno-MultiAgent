# Modelo de datos (Fase 1): Acceso y cancelación del paciente

**Feature**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

Mismas convenciones que la 001 ([data-model de la 001](../001-agenda-core/data-model.md)):
`uuid`, `timestamptz` en UTC y nombres en español con guion bajo. La 005 añade **una tabla**
y no añade columnas a las tablas de la 001. Usa `clinica.telefono` y `cita.cancelada_por`,
que define la 001 (enmienda S2–S5; prerrequisito R0).

## Diagrama

```text
clinica 1───* paciente 1───1 enlace_paciente
                  │
                  1
                  │
                  *
                cita   (la 005 solo lee inicio/estado y aplica reservada → cancelada)
```

## enlace_paciente (nueva)

| Campo | Tipo | Reglas |
|-------|------|--------|
| paciente_id | uuid | PK y FK → paciente (`ON DELETE CASCADE`). Una fila por ficha: exactamente un enlace vigente (FR-001) |
| token | texto | único; 43 caracteres base64url (`^[A-Za-z0-9_-]{43}$`), 32 bytes aleatorios (FR-002, R2); en claro para poder copiarlo (FR-005) |
| generado_en | timestamptz | momento de la creación o de la última regeneración (Key Entities) |
| fallos_seguidos | smallint | `≥ 0`, por defecto 0; fallos consecutivos de las 4 cifras (FR-006a) |
| pausa_hasta | timestamptz | nulo salvo durante la pausa de 15 minutos tras el 5.º fallo seguido |

- **Único** `token`.
- `CHECK (fallos_seguidos >= 0)` y `CHECK (token ~ '^[A-Za-z0-9_-]{43}$')`.
- **Bloqueado** es derivado, no una columna: `fallos_seguidos >= 10`.
- La clínica del enlace es la de su ficha (`paciente.clinica_id`); toda consulta une
  `enlace_paciente → paciente` y filtra por esa clínica.

### Migración

1. Crear la tabla, el índice único y las restricciones.
2. Crear el enlace de las fichas que ya existen (en una instalación con datos):
   `INSERT INTO enlace_paciente (paciente_id, token, generado_en)
    SELECT id, <32 bytes aleatorios en base64url>, now() FROM paciente`
   (con `gen_random_bytes` de `pgcrypto` y `translate(rtrim(encode(…, 'base64'), '='), '+/', '-_')`).
3. La semilla borra y vuelve a crear todo, con sus enlaces deterministas (R9).

## Estados del enlace (derivados de `fallos_seguidos`, `pausa_hasta` y `ahora`)

```text
             acierto (fallos = 0)
          ┌──────────────────────┐
          ▼                      │
     ┌─────────┐  fallo 1–4  ┌───┴─────┐
     │ vigente │────────────►│ vigente │ (fallos 1–4)
     └─────────┘             └────┬────┘
          ▲                       │ 5.º fallo seguido
          │ pasan 15 min          ▼
          │                  ┌──────────┐  cualquier intento: rechazado sin comprobar,
          └──────────────────│ en pausa │  no cuenta como fallo
                             └──────────┘
     vigente (fallos 5–9) ── 10.º fallo seguido ──► bloqueado ── regenerar ──► vigente (fallos 0)
```

| Estado | Condición | Qué ve quien abre el enlace |
|--------|-----------|-----------------------------|
| No válido | el token no tiene el formato o no existe (inventado, mal copiado o regenerado) | «Enlace no válido» con el nombre y el teléfono de la clínica (FR-007). Sin consulta si no tiene el formato |
| Bloqueado | `fallos_seguidos ≥ 10` | «Enlace bloqueado» con el nombre y el teléfono de la clínica; no se piden las cifras |
| En pausa | `pausa_hasta > ahora` | formulario de cifras deshabilitado con «Podrás volver a intentarlo a las HH:mm» |
| Vigente sin acceso abierto | resto | formulario de las 4 cifras, con el nombre y el teléfono de la clínica |
| Vigente con acceso abierto | cookie válida con la huella del token (ver abajo) | sus datos (lista provisional, R1) |

**Regenerar** (FR-004): `UPDATE enlace_paciente SET token = $nuevo, generado_en = $ahora,
fallos_seguidos = 0, pausa_hasta = NULL WHERE paciente_id = $id` (tras comprobar que la ficha
es de la clínica de la sesión). Ninguna cita ni dato de la ficha cambia.

## Acceso abierto (no se almacena)

Cookie firmada `citaclara_paciente` (R5):

| Campo | Contenido |
|-------|-----------|
| pacienteId | ficha a la que da acceso |
| clinicaId | clínica de la ficha |
| huella | SHA-256 (hex) del token con el que se abrió |
| exp | ahora + 30 min; se renueva en cada petición a `/p/*` |

Es válida solo si la firma es correcta, no ha caducado y `huella = sha256(token de la URL)`.
Además, el token de la URL tiene que existir en `enlace_paciente` para ese `pacienteId`. Al
regenerar cambia el token y todas las cookies anteriores dejan de servir.

## cita (de la 001; lo que usa la 005)

| Campo | Uso en la 005 |
|-------|---------------|
| paciente_id | solo se leen y cancelan citas con `paciente_id` = el de la sesión (FR-006) |
| inicio | plazo: se puede cancelar si `ahora < inicio − 24 h` (FR-009) |
| estado | solo `reservada` es cancelable; la transición es `reservada → cancelada` (001 FR-017) |
| estado_cambiado_en | `= ahora` al cancelar (001 FR-018a) |
| cancelada_por | `= 'paciente'` al cancelar desde el enlace (FR-013, 001 FR-018a) |

### Cancelación por el paciente (operación única `cancelarCita`, R7)

```sql
UPDATE cita
   SET estado = 'cancelada', estado_cambiado_en = $ahora, cancelada_por = 'paciente'
 WHERE id = $citaId
   AND clinica_id = $clinicaId
   AND paciente_id = $pacienteId
   AND estado = 'reservada'
   AND inicio > $ahora + interval '24 hours'   -- calculado en TS con PLAZO_CANCELACION_PACIENTE_MS
RETURNING id;
```

- 1 fila → cancelada; la fila sale de `cita_sin_solape` y el hueco admite otra cita.
- 0 filas → se relee la cita para devolver `NO_ENCONTRADO`, `ESTADO_CAMBIADO` o
  `FUERA_DE_PLAZO` (ver [contracts/server-actions.md](contracts/server-actions.md)).
- Recepción usa la misma operación con `cancelada_por = 'recepcion'` e
  `inicio > $ahora` (001 FR-018).

### Ejemplos del plazo (FR-010, Clínica Eleva, `Europe/Madrid`)

| Cita (local) | inicio (UTC) | Límite (UTC) | Límite (local) |
|--------------|--------------|--------------|----------------|
| lunes 16/11/2026 10:00 | 2026-11-16T09:00Z | 2026-11-15T09:00Z | domingo 15/11/2026 10:00 |
| martes 17/11/2026 19:15 | 2026-11-17T18:15Z | 2026-11-16T18:15Z | lunes 16/11/2026 19:15 |
| lunes 26/10/2026 09:00 | 2026-10-26T08:00Z | 2026-10-25T08:00Z | domingo 25/10/2026 09:00 (ya en horario de invierno) |

## Semilla (FR-019)

- 40 filas en `enlace_paciente`, una por paciente, con un token determinista que sale de un
  flujo PRNG propio, generado después de todo lo demás (R9). `generado_en` es la fecha de
  alta de los pacientes. `fallos_seguidos = 0`.
- Ningún identificador, cita, estado ni recuento de la 001 cambia. `docs/datos-demo.md` añade
  la tabla de enlaces de demostración y no cambia ninguna otra cifra.
