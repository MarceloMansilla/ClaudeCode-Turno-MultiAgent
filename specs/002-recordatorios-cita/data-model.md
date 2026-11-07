# Modelo de datos (Fase 1): Recordatorios de cita

**Feature**: [spec.md](spec.md) | **Investigación**: [research.md](research.md) | **Base**:
[modelo de la 001](../001-agenda-core/data-model.md)

Mismas convenciones que la 001: identificadores `uuid`, instantes `timestamptz` (UTC), nombres
en español con guion bajo. Todo cambio va en una migración nueva de la 002, generada tras
rebasar sobre `main` (research R11).

## Diagrama

```text
clinica 1───* ejecucion_recordatorios
clinica 1───* recordatorio *───1 cita      (como máximo un recordatorio por cita)
```

## Cambio en `cita` (de la 001)

| Campo nuevo | Tipo | Reglas |
|-------------|------|--------|
| cancelada_desde_recordatorio | boolean | `NOT NULL DEFAULT false`; `true` solo si la canceló el paciente desde el recordatorio (FR-013) |

```sql
ALTER TABLE cita ADD COLUMN cancelada_desde_recordatorio boolean NOT NULL DEFAULT false;
ALTER TABLE cita ADD CONSTRAINT cita_cancelada_desde_recordatorio_coherente
  CHECK (NOT cancelada_desde_recordatorio OR estado = 'cancelada');
```

El momento de la cancelación es `estado_cambiado_en` (ya existe). Las cancelaciones de
recepción y de la semilla siguen igual (`false`): el código de la 001 no cambia.

## recordatorio

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | uuid | PK |
| clinica_id | uuid | FK → clinica |
| cita_id | uuid | FK → cita; **UNIQUE** (FR-003) |
| destinatario | texto | correo de la ficha en el momento del envío |
| modo | enum `modo_correo` | `simulado` \| `smtp` |
| estado | enum `estado_recordatorio` | `enviando` \| `enviado` \| `fallido` |
| token_hash | texto | SHA-256 (hex) del token del enlace; **UNIQUE**; cambia en cada intento |
| intentos | smallint | ≥ 1 |
| generado_en | timestamptz | primera reclamación |
| ultimo_intento_en | timestamptz | última reclamación |
| enviado_en | timestamptz | nulo salvo `enviado` |
| ultimo_error | texto | nulo salvo `fallido`; texto técnico solo para el resumen |
| fichero | texto | ruta relativa del `.eml` en modo simulado; nulo en `smtp` |

Índices: único `(cita_id)`, único `(token_hash)`.

### Estados

```text
           reclamar (INSERT … ON CONFLICT DO NOTHING)
(sin fila) ─────────────────────────────────────────► enviando ──ok──► enviado   (final)
                                                          │
                                                          └─error─► fallido
fallido ── reclamar (UPDATE … WHERE estado='fallido') ──► enviando             (FR-010)
enviando con > 10 min ── no se reintenta; resumen: «fallido (interrumpido)»   (R2)
```

Solo reintenta un `fallido` una ejecución cuya ventana contenga la cita y mientras esta siga
`reservada` (FR-010).

## ejecucion_recordatorios

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | uuid | PK |
| clinica_id | uuid | FK → clinica |
| iniciada_en | timestamptz | «ahora» del reloj (inyectable) |
| terminada_en | timestamptz | nulo si la ejecución se interrumpe |
| fecha_objetivo | date | día local cubierto (mañana respecto a `iniciada_en`) |
| ventana_desde | timestamptz | `fecha_objetivo 00:00` local en UTC |
| ventana_hasta | timestamptz | `fecha_objetivo + 1 día 00:00` local en UTC (excluido) |
| modo | enum `modo_correo` | `simulado` \| `smtp` |
| resumen | jsonb | ver forma abajo (FR-005) |

```ts
resumen = {
  totales: { enviado: number; yaEnviadoAntes: number; sinCorreo: number;
             correoNoValido: number; fallido: number };
  citas: { citaId: string; hora: 'HH:mm'; profesional: string;
           resultado: 'enviado' | 'ya_enviado_antes' | 'sin_correo' | 'correo_no_valido' | 'fallido';
           interrumpido?: true;           // solo con 'fallido': envío interrumpido (FR-010, R2)
           detalle?: string }[];          // orden cronológico
}
```

Un `fallido` con `interrumpido: true` es el resultado «fallido (interrumpido)» de FR-005: cuenta
en `totales.fallido` y se muestra con ese texto en la salida del comando.

## Selección de citas de una ejecución (FR-002, FR-004)

Citas de la clínica con `estado = 'reservada'` y `ventana_desde ≤ inicio < ventana_hasta`.
Para cada una, en orden de inicio:

1. Sin correo en la ficha → `sin_correo`. Correo que no pasa `z.email()` → `correo_no_valido`.
2. Con recordatorio `enviado` → `ya_enviado_antes`; `enviando` reciente (≤ 10 min, otra
   ejecución en curso) → `ya_enviado_antes`; `enviando` antiguo → `fallido` con `interrumpido: true`.
3. Sin recordatorio o con `fallido` → reclamar y enviar → `enviado` o `fallido`. Si la
   reclamación no devuelve fila (la ganó otra ejecución) → `ya_enviado_antes`.

Las citas canceladas, completadas o no asistidas no se seleccionan (escenario US1 #4).

## Ventana: ejemplos (Europe/Madrid)

| «Ahora» de la ejecución | fecha_objetivo | ventana_desde (UTC) | ventana_hasta (UTC) | Horas |
|-------------------------|----------------|---------------------|---------------------|-------|
| lun 09/11/2026 08:00 | mar 10/11/2026 | 2026-11-09T23:00Z | 2026-11-10T23:00Z | 24 |
| sáb 27/03/2027 08:00 | dom 28/03/2027 | 2027-03-27T23:00Z | 2027-03-28T22:00Z | 23 |
| sáb 30/10/2027 08:00 | dom 31/10/2027 | 2027-10-30T22:00Z | 2027-10-31T23:00Z | 25 |

## Cancelación desde el recordatorio (FR-012–FR-015)

```sql
UPDATE cita
   SET estado = 'cancelada', estado_cambiado_en = $ahora, cancelada_desde_recordatorio = true
 WHERE id = $citaId AND estado = 'reservada' AND inicio > $ahora
RETURNING id;
```

0 filas → se relee la cita: `estado ≠ 'reservada'` → se muestra su estado (`ESTADO_CAMBIADO`
o «ya cancelada»); `inicio ≤ ahora` → `CANCELACION_TARDIA`. Al pasar a `cancelada`, la fila
sale de `cita_sin_solape` y el hueco queda libre para la agenda de la 001.
