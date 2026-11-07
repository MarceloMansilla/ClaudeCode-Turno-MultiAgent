# Modelo de datos (Fase 1): Núcleo de agenda

**Feature**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

Convenciones: identificadores `uuid`; instantes en `timestamptz` (UTC); importes en céntimos
enteros; nombres de tablas y columnas en español, en minúsculas y con guion bajo.

## Diagrama

```text
clinica 1───* profesional
clinica 1───* servicio
clinica 1───* paciente
clinica 1───* cita *───1 profesional
                   *───1 servicio
                   *───1 paciente
```

## clinica

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | uuid | PK |
| nombre | texto | obligatorio, 1–120 caracteres |
| zona_horaria | texto | zona IANA válida; Clínica Eleva: `Europe/Madrid` |
| hora_apertura | time | 09:00 en la 001 (FR-014) |
| hora_cierre | time | 20:00 en la 001; `hora_cierre > hora_apertura` |
| dias_laborables | smallint[] | ISO 1–7; en la 001 `{1,2,3,4,5}` |
| clave_hash | texto | hash Argon2id de la clave de panel; nunca se guarda en claro |

## profesional

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | uuid | PK |
| clinica_id | uuid | FK → clinica, obligatorio |
| nombre | texto | obligatorio |
| especialidad | enum `especialidad` | `fisioterapia` \| `nutricion` (etiquetas: «Fisioterapia», «Nutrición») |
| orden | smallint | orden de aparición en la agenda (el primero es el de por defecto) |

## servicio

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | uuid | PK |
| clinica_id | uuid | FK → clinica |
| nombre | texto | obligatorio |
| especialidad | enum `especialidad` | FR-009a |
| duracion_minutos | integer | > 0 y múltiplo de 15 |
| precio_centimos | integer | ≥ 0 (40,00 € → 4000) |

## paciente

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | uuid | PK |
| clinica_id | uuid | FK → clinica |
| nombre | texto | obligatorio, 2–120 caracteres tras recortar espacios |
| telefono | texto | obligatorio, tal como se introdujo (para mostrar) |
| telefono_normalizado | texto | solo dígitos, sin prefijo `34`/`+34`/`0034`; 9 dígitos que empiezan por 6, 7, 8 o 9 |
| email | texto | opcional; formato de correo válido si se informa |
| creado_en | timestamptz | por defecto `now()` |

- **Único** `(clinica_id, telefono_normalizado)` (FR-016b). El índice único resuelve también
  dos altas simultáneas con el mismo teléfono.
- Ejemplo: «612 345 678», «612-345-678», «+34 612345678» → `612345678`.

## cita

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | uuid | PK |
| clinica_id | uuid | FK → clinica |
| profesional_id | uuid | FK → profesional (misma clínica) |
| servicio_id | uuid | FK → servicio (misma clínica, misma especialidad que el profesional — FR-009a) |
| paciente_id | uuid | FK → paciente (misma clínica) |
| inicio | timestamptz | múltiplo de 15 min en hora local; ≥ ahora al crear (FR-013) |
| fin | timestamptz | = inicio + duracion_minutos del servicio al reservar (FR-009); `fin > inicio` |
| estado | enum `estado_cita` | `reservada` \| `completada` \| `cancelada` \| `no_asistida` |
| creado_en | timestamptz | por defecto `now()` |
| estado_cambiado_en | timestamptz | nulo mientras esté reservada |

### Restricciones de base de datos

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE cita ADD CONSTRAINT cita_sin_solape
  EXCLUDE USING gist (
    profesional_id WITH =,
    tstzrange(inicio, fin, '[)') WITH &&
  ) WHERE (estado IN ('reservada', 'completada'));   -- RN1, FR-011, FR-012

ALTER TABLE cita ADD CONSTRAINT cita_fin_posterior CHECK (fin > inicio);
```

Las reglas que dependen de la hora local (horario, granularidad, pasado) y de otras tablas
(especialidad, misma clínica) se validan en el servicio de dominio dentro de la misma
transacción de alta. La de solape la impone siempre la BD.

### Índices

- `cita (clinica_id, profesional_id, inicio)` — lectura de la agenda del día.
- `paciente (clinica_id, nombre)` y el único de teléfono — búsqueda del alta.

## Transiciones de estado (FR-017–FR-020)

```text
                ┌── cancelar        (solo si ahora < inicio)  ──► cancelada
reservada ──────┼── completar       (solo si ahora ≥ inicio)  ──► completada
                └── no_asistida     (solo si ahora ≥ inicio)  ──► no_asistida
```

- Estados finales sin salida. La actualización es condicional
  (`UPDATE … WHERE id = $1 AND estado = 'reservada'`); si no afecta a ninguna fila, la acción
  se rechaza y se devuelve el estado actual (FR-020).
- Pasar a `cancelada` libera el tramo: la fila deja de entrar en la restricción de exclusión.

## Huecos libres (derivado, no se almacena)

Para un profesional y un día local: tramos = [apertura, cierre) del día laborable menos la
unión de los intervalos de sus citas `reservada`/`completada`. Ejemplo: María el 16/11/2026
con citas 10:00–10:45 y 12:00–13:00 → libres 09:00–10:00, 10:45–12:00 y 13:00–20:00.
