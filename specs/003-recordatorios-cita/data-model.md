# Modelo de datos (Fase 1): Recordatorios de cita

**Feature**: [spec.md](spec.md) | **Investigación**: [research.md](research.md) | **Base**:
[modelo de la 001](../001-agenda-core/data-model.md)

Mismas convenciones que la 001: identificadores `uuid`, instantes `timestamptz` (UTC), nombres
en español con guion bajo. Todo cambio va en una migración nueva de la 003, generada tras
rebasar sobre `main` (research R11).

## Diagrama

```text
clinica 1───* ejecucion_recordatorios
clinica 1───* recordatorio *───1 cita      (como máximo un recordatorio por cita)
```

## Lo que esta feature NO añade (revisión cruzada S2 y S4)

- **Ningún cambio en `cita`**: la 003 no escribe estados de cita ni el origen de una
  cancelación (spec FR-021). El origen lo define la 001 (FR-018a, `cita.cancelada_por`) y lo
  escribe la 005. Se retira la antigua columna `cancelada_desde_recordatorio`.
- **Ningún enlace ni credencial de paciente**: el enlace del correo es el enlace personal de
  la 005 (FR-001, FR-008), que se lee al componer el correo. Su almacenamiento lo define la
  005. Se retiran `recordatorio.token_hash` y su índice.

## recordatorio

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | uuid | PK |
| clinica_id | uuid | FK → clinica |
| cita_id | uuid | FK → cita; **UNIQUE** (FR-003) |
| destinatario | texto | correo de la ficha en el momento del envío |
| modo | enum `modo_correo` | `simulado` \| `smtp` |
| estado | enum `estado_recordatorio` | `enviando` \| `enviado` \| `fallido` |
| intentos | smallint | ≥ 1 |
| generado_en | timestamptz | primera reclamación |
| ultimo_intento_en | timestamptz | última reclamación |
| enviado_en | timestamptz | nulo salvo `enviado` |
| ultimo_error | texto | nulo salvo `fallido`; texto técnico solo para el resumen |
| fichero | texto | ruta relativa del `.eml` en modo simulado; nulo en `smtp` |

Índices: único `(cita_id)`.

`estado = 'enviado'` define la población de SC-005 («citas con recordatorio enviado»); la
fórmula de la tasa es la de la 004 (FR-006).

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

Datos que se leen para componer cada correo (solo lectura): la cita, su paciente, profesional
y servicio (001); la clínica, con nombre, zona y teléfono (001 FR-022); el
enlace personal vigente de la ficha y el límite de cancelación de la cita (005, FR-001 y
FR-009: `rutaEnlacePaciente` y `limiteCancelacionPaciente`, importadas de la 005; el plazo no
se calcula aquí). La 003 no guarda tokens.

## Ventana: ejemplos (Europe/Madrid)

| «Ahora» de la ejecución | fecha_objetivo | ventana_desde (UTC) | ventana_hasta (UTC) | Horas |
|-------------------------|----------------|---------------------|---------------------|-------|
| lun 09/11/2026 08:00 | mar 10/11/2026 | 2026-11-09T23:00Z | 2026-11-10T23:00Z | 24 |
| sáb 27/03/2027 08:00 | dom 28/03/2027 | 2027-03-27T23:00Z | 2027-03-28T22:00Z | 23 |
| sáb 30/10/2027 08:00 | dom 31/10/2027 | 2027-10-30T22:00Z | 2027-10-31T23:00Z | 25 |

Ventana confirmada en P1 (2026-11-08).
