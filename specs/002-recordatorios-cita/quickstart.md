# Guía rápida de validación: Recordatorios de cita

Cómo comprobar de principio a fin que la 002 cumple su [spec](spec.md). Detalles en
[data-model.md](data-model.md) y [contracts/](contracts/).

## Requisitos previos

- Todo lo de la [guía de la 001](../001-agenda-core/quickstart.md) (Node.js 22, pnpm,
  Docker) y la 001 integrada en la rama.
- En `.env`, además: `URL_PUBLICA=http://localhost:3000` y
  `CORREO_REMITENTE=recordatorios@clinicaeleva.example`. **Sin `SMTP_URL`** (modo simulado).

## Puesta en marcha

```bash
pnpm install
docker compose up -d db
pnpm db:migrate                             # incluye la migración de la 002
pnpm seed --fecha-referencia 2026-11-09
```

## Pruebas automáticas (condición de integración, Principio VI)

```bash
pnpm test            # unitarias + integración (incluye ejecuciones simultáneas y cancelaciones concurrentes)
pnpm test:e2e        # incluye la página de cancelación en móvil 360×800 y portátil, con axe
pnpm lint && pnpm typecheck
```

Resultado esperado: todo en verde; 0 recordatorios duplicados (SC-001) y ningún token
inventado muestra datos (SC-004).

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
| 2 | Abrir uno de los `.eml` con un cliente de correo | Asunto «Recordatorio de su cita en Clínica Eleva: martes, 10/11/2026, HH:mm»; día, hora, profesional y servicio correctos; botón «Cancelar mi cita» | FR-007, FR-008 |
| 3 | Repetir el paso 1 | Enviados 0 · Ya enviados antes 20 · Sin correo 6; ningún fichero nuevo | US1 #2 |
| 4 | Lanzar el paso 1 dos veces a la vez sobre una BD recién sembrada | Entre las dos: 20 enviados en total, 20 ficheros | US1 #3 |
| 5 | `CITACLARA_AHORA=2026-11-13T08:00:00+01:00 pnpm recordatorios` | «Citas del sábado, 14/11/2026»: todo a 0 | Edge Cases (fin de semana) |
| 6 | `CITACLARA_AHORA=2026-11-09T12:10:00+01:00 pnpm dev`; abrir el enlace de un `.eml` del paso 1 en el móvil (o ventana de 360 px) | Datos de la cita y botón «Cancelar mi cita»; la cita sigue reservada en la agenda | US2 #1 |
| 7 | Pulsar «Cancelar mi cita» | «Su cita del martes, 10/11/2026 a las HH:mm ha quedado cancelada. Gracias por avisar.»; en `/agenda` de ese profesional y día, cita «Cancelada» y hueco libre | US2 #2, SC-003 |
| 8 | Volver a abrir el mismo enlace | «Esta cita ya está cancelada.», sin botón | US2 #4 |
| 9 | Desde recepción, reservar otra cita en el hueco liberado | Se registra sin solape | Principio III |
| 10 | Reiniciar con `CITACLARA_AHORA=2026-11-10T20:30:00+01:00` y abrir otro enlace del paso 1 | «Ya no es posible cancelar esta cita desde aquí. Por favor, llame a Clínica Eleva.» | US2 #3 |
| 11 | Abrir `/cancelar/abc` y `/cancelar/<43 caracteres inventados>` | «Este enlace no es válido.», sin datos | US2 #6, SC-004 |

## Prueba de usabilidad previa a la entrega (SC-002)

Dos personas que nunca han usado CitaClara reciben un `.eml` en el móvil y cancelan la cita,
cronometradas: ambas en menos de 1 minuto y con 2 pulsaciones como máximo. El resultado se
registra junto a la entrega.

## Medición en el piloto (SC-005)

Tasa de no asistencia = no asistidas / (completadas + no asistidas) de las citas con
recordatorio `enviado`, durante 8 semanas tras la puesta en marcha, comparada con la de las
8 semanas anteriores. Objetivo: al menos un 30 % menos.
