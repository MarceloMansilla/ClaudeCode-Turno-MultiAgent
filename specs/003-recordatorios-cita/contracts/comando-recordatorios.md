# Contrato: comando `pnpm recordatorios`

Proceso diario de recordatorios (FR-001–FR-006, FR-009, FR-010). Detalle de diseño en
[research.md](../research.md) R1–R3 y R8; datos en [data-model.md](../data-model.md).

## Uso

```bash
pnpm recordatorios
```

Sin argumentos. Una ejecución cubre el **día natural siguiente** al «ahora» en la zona de la
clínica. Programación recomendada (planificador del sistema o del hosting):

```text
CRON_TZ=Europe/Madrid
0 8 * * *  cd /ruta/citaclara && pnpm recordatorios
```

## Configuración (variables de entorno)

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `DATABASE_URL` | sí | la misma de la 001 |
| `URL_PUBLICA` | sí | base del enlace personal del paciente (`/p/<token>`, 005 FR-001), p. ej. `https://citas.clinicaeleva.es` (en desarrollo `http://localhost:3000`) |
| `CORREO_REMITENTE` | sí | dirección del remitente; el nombre mostrado es el de la clínica |
| `SMTP_URL` | no | p. ej. `smtps://usuario:clave@smtp.ejemplo.es:465`. **Si falta → modo simulado** |
| `SALIDA_CORREO_DIR` | no | carpeta del modo simulado; por defecto `datos/salida-correo` |
| `CITACLARA_AHORA` | no | fija el «ahora» (pruebas y demostraciones), como en la 001 |

Configuración inválida (falta una obligatoria, `URL_PUBLICA` sin `http(s)://`) → código `1` y
mensaje que dice qué variable falta, sin enviar nada.

## Salida estándar (en español)

```text
Recordatorios de Clínica Eleva — ejecución del lunes, 09/11/2026 a las 08:00
Citas del martes, 10/11/2026 · modo simulado (datos/salida-correo)

  09:00  María   enviado
  09:00  Lucía   sin correo
  ...

Enviados: 20 · Ya enviados antes: 0 · Sin correo: 6 · Correo no válido: 0 · Fallidos: 0
```

Resultado de cada línea (FR-005): `enviado`, `ya enviado antes`, `sin correo`,
`correo no válido`, `fallido` o `fallido (interrumpido)`. Este último es un envío que se cortó
a medias en una ejecución anterior y no se reintenta (FR-010); cuenta en «Fallidos». Ejemplo:

```text
  11:30  Javier  fallido (interrumpido)
```

Los nombres de pacientes y sus correos **no** se imprimen (la salida acaba en registros del
servidor); se identifica cada cita por hora y profesional, y el detalle completo queda en
`ejecucion_recordatorios.resumen` con el `citaId`.

## Códigos de salida

| Código | Significado |
|--------|-------------|
| `0` | ejecución completa sin fallidos |
| `2` | ejecución completa con al menos un «fallido», incluido «fallido (interrumpido)» (revisar el resumen) |
| `1` | no se pudo ejecutar (configuración, base de datos) — no se envió nada o se interrumpió |

## Garantías

- Cada cita recibe como máximo un recordatorio, con cualquier número de ejecuciones,
  simultáneas o no (FR-003).
- Repetir la ejecución el mismo día no envía nada nuevo: las citas ya avisadas salen como
  «ya enviado antes» (US1 #2).
- En modo simulado no se abre ninguna conexión de correo.
