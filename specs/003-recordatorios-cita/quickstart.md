# Guía rápida de validación: Recordatorios de cita

Cómo comprobar de principio a fin que la 003 cumple su [spec](spec.md). Detalles en
[data-model.md](data-model.md) y [contracts/](contracts/).

## Requisitos previos

- Todo lo de la [guía de la 001](../001-agenda-core/quickstart.md) (Node.js 22, pnpm,
  Docker) y la 001 integrada en la rama.
- La 005 implementada: enlaces personales en la semilla (005 FR-019) y límite de cancelación
  de cada cita disponible. Para el recorrido correo → portal, también la 002.
- En `.env`, además: `URL_PUBLICA=http://localhost:3000` y
  `CORREO_REMITENTE=recordatorios@clinicaeleva.example`. **Sin `SMTP_URL`** (modo simulado).

## Puesta en marcha

```bash
pnpm install
docker compose up -d db
pnpm db:migrate                             # incluye la migración de la 003
pnpm seed --fecha-referencia 2026-11-09
```

## Pruebas automáticas (condición de integración, Principio VI)

```bash
pnpm test            # unitarias + integración (incluye ejecuciones simultáneas)
pnpm lint && pnpm typecheck
```

Resultado esperado: todo en verde; 0 recordatorios duplicados (SC-001); cada correo lleva el
enlace personal de su paciente y un límite de cancelación igual al de la 005 (FR-019,
SC-007); ninguna ejecución cambia filas de `cita` (FR-021).

## Cifras de referencia (semilla 2026-11-09, Principio V)

Citas reservadas por día y cuántas tienen paciente con correo (32 de los 40 pacientes tienen
correo):

| Día de las citas | Ejecución que las recuerda | Reservadas | Enviados | Sin correo |
|------------------|----------------------------|-----------:|---------:|-----------:|
| mar 10/11/2026 | lun 09/11/2026 08:00 | 26 | 20 | 6 |
| mié 11/11/2026 | mar 10/11/2026 08:00 | 28 | 25 | 3 |
| jue 12/11/2026 | mié 11/11/2026 08:00 | 21 | 16 | 5 |
| vie 13/11/2026 | jue 12/11/2026 08:00 | 28 | 23 | 5 |
| sáb 14/11/2026 | vie 13/11/2026 08:00 | 0 | 0 | 0 |
| lun 16/11/2026 | dom 15/11/2026 08:00 | 28 | 24 | 4 |

Obtenidas con el generador de la semilla de la 001 tal como está hoy en su rama. Al
implementar, se comprueban contra la semilla integrada y se publican en `docs/datos-demo.md`
(sección «Recordatorios»); si difieren, mandan las de `docs/datos-demo.md` y se corrige esta
tabla.

## Escenarios manuales

| # | Paso | Resultado esperado | Spec |
|---|------|--------------------|------|
| 1 | `CITACLARA_AHORA=2026-11-09T08:00:00+01:00 pnpm recordatorios` | Resumen «Citas del martes, 10/11/2026»: Enviados 20 · Sin correo 6 · Fallidos 0; código de salida 0; 20 ficheros `2026-11-10_*.eml` en `datos/salida-correo/` | US1 #1, #5, #6 |
| 2 | Abrir uno de los `.eml` con un cliente de correo | Asunto «Recordatorio de su cita en Clínica Eleva: martes, 10/11/2026, HH:mm»; día, hora, profesional y servicio correctos; botón con el enlace `<URL_PUBLICA>/p/<token>` del paciente y ningún otro enlace a CitaClara; enunciado de la política con el límite que da la 005 para esa cita | FR-007, FR-008, FR-019, FR-020, US1 #8 |
| 3 | Repetir el paso 1 | Enviados 0 · Ya enviados antes 20 · Sin correo 6; ningún fichero nuevo | US1 #2 |
| 4 | Lanzar el paso 1 dos veces a la vez sobre una BD recién sembrada | Entre las dos: 20 enviados en total, 20 ficheros | US1 #3 |
| 5 | `CITACLARA_AHORA=2026-11-13T08:00:00+01:00 pnpm recordatorios` | «Citas del sábado, 14/11/2026»: todo a 0 | Edge Cases (fin de semana) |
| 6 | Tras el paso 1, consultar en `/agenda` las citas del martes 10/11/2026 | Todas siguen como estaban: la ejecución no cambia ninguna cita | FR-021 |
| 7 | Con la 002 y la 005 disponibles, abrir el enlace de un `.eml` del paso 1 | Se abre el portal del paciente de ese correo (lo que muestra y cómo se cancela lo definen la 002 y la 005) | FR-019 |

## Prueba de usabilidad previa a la entrega (SC-002)

Requiere la 002 y la 005. Dos personas que nunca han usado CitaClara reciben un `.eml` en el
móvil, con una cita dentro del plazo de la 005, y la cancelan desde el portal, cronometradas:
ambas en menos de 1 minuto. Se anotan los pasos que hicieron; el objetivo son 4 acciones como
máximo: pulsar el enlace, introducir las 4 últimas cifras del teléfono (005 FR-006), pedir
cancelar y confirmar (005 FR-012). El resultado se registra
junto a la entrega.

## Medición en el piloto (SC-005)

Tasa de no asistencia según la 004 (FR-006), calculada sobre las citas con recordatorio en
estado `'enviado'` durante 8 semanas tras la puesta en marcha y comparada con la de las 8
semanas anteriores. Objetivo: al menos un 30 % menos. La 003 no calcula el indicador; si se
quiere ver en el panel, es una petición de enmienda a la 004.
