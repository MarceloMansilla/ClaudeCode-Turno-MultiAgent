# Guía rápida de validación: Acceso y cancelación del paciente

Cómo comprobar de principio a fin que la 005 cumple su [spec](spec.md). Detalles en
[data-model.md](data-model.md) y [contracts/](contracts/).

## Requisitos previos

- La puesta en marcha de la 001 ([quickstart de la 001](../001-agenda-core/quickstart.md)):
  Node.js 22, pnpm 11, Docker y `.env`.
- La enmienda S2–S5 de la 001 ya en código (research R0): `clinica.telefono` y
  `cita.cancelada_por`.

## Puesta en marcha

```bash
docker compose up -d db
pnpm db:migrate                             # incluye la tabla enlace_paciente
pnpm seed --fecha-referencia 2026-11-09     # 40 enlaces deterministas (FR-019)
pnpm dev
```

Los enlaces y las 4 cifras de los pacientes de demostración están en `docs/datos-demo.md`,
sección «Enlaces de pacientes». En adelante, **P** es el primero de esa tabla.

El reloj se fija con `CITACLARA_AHORA` (ISO 8601 con zona) al arrancar `pnpm dev`.

## Pruebas automáticas

```bash
pnpm test        # unitarias + integración (plazo, intentos, concurrencia, semilla)
pnpm test:e2e    # US1–US3 en portátil y móvil con axe
pnpm lint && pnpm typecheck
```

Todas en verde (Principio VI). Recuentos de la semilla de la 001 sin cambios (FR-019):
`tests/integration/semilla.test.ts`.

## Validación manual

| # | Pasos | Resultado esperado | Cubre |
|---|-------|--------------------|-------|
| 1 | Abrir `/p/<token de P>` | «Confirme que es usted», con el nombre y el teléfono de la clínica y ningún dato de P | FR-006 |
| 2 | Escribir las 4 cifras de P | «Sus próximas citas», solo con citas de P | US1 #1 |
| 3 | Abrir `/p/` + 43 caracteres inventados | «Enlace no válido» con el teléfono; ningún nombre | US1 #2, FR-007 |
| 4 | En una ventana privada, abrir el enlace de P y escribir 4 cifras erróneas 5 veces | 5.º intento: «Ha hecho demasiados intentos. Podrá volver a intentarlo a las HH:mm» (HH:mm = ahora + 15 min); el intento correcto también se rechaza | US1 #5, FR-006a |
| 5 | Repetir hasta 10 fallos (con `CITACLARA_AHORA` 16 min después) | «Enlace bloqueado»; no se piden cifras | US1 #5 |
| 6 | En el panel, en una cita de P, «Enlace del paciente» → «Generar enlace nuevo» → confirmar | Aviso «Enlace nuevo generado»; el enlace antiguo da «Enlace no válido»; el nuevo pide cifras y deja entrar | US3 #1–#3, #5 |
| 7 | Con la pestaña de P abierta, regenerar desde el panel y pulsar «Cancelar cita» → «Sí» | «Enlace no válido»; la cita sigue reservada | US3 #4 |
| 8 | Con `CITACLARA_AHORA=2026-11-09T09:00:00+01:00`, en el panel, dar de alta para P una «Sesión de fisioterapia» con María en un hueco libre del lunes 16/11/2026 (hora **H**, p. ej. 10:00). Reiniciar con el reloj en **H − 25 h** (domingo 15/11), entrar como P y cancelarla | Diálogo con servicio, profesional, día y hora; tras confirmar, «Su cita del lunes, 16/11/2026 a las H está cancelada.» | US2 #1, FR-012 |
| 9 | En el panel (mismo reloj), alta para otro paciente con María el 16/11 a la hora H | Se registra | US2 #5 |
| 10 | Dar de alta para P otra cita con María el lunes 16/11 (hora **H2**). Reiniciar con el reloj en **H2 − 23 h** y entrar como P | Sin botón «Cancelar». Enunciado: «Puede cancelar esta cita desde su enlace antes del domingo, 15/11/2026 a las H2. Después, llame a Clínica Eleva al 911 234 567.» | US2 #2, FR-016 |
| 11 | Con ese mismo reloj, recepción cancela esa cita desde el panel | Se cancela | US2 #6 |
| 12 | Móvil de 360 px, cronometrado: abrir el enlace, escribir las cifras y cancelar una cita en plazo | Menos de 1 minuto, sin ayuda | SC-006 |

Los escenarios con frontera exacta (09:59:59 / 10:00:00), concurrencia (SC-003) y caducidad a
los 30 minutos se validan solo con las pruebas automáticas, con el reloj fijado por código.
