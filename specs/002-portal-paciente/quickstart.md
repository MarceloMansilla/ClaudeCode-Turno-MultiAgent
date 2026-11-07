# Quickstart y validación: Portal del paciente

**Requisito previo**: la 001 implementada y en verde (ver
[quickstart de la 001](../001-agenda-core/quickstart.md)). Esta feature se construye sobre
su código, su base de datos y su semilla.

## Puesta en marcha

```bash
pnpm install
docker compose up -d                          # PostgreSQL 18
pnpm db:migrate                               # incluye las migraciones de la 002
pnpm seed --fecha-referencia 2026-11-09       # semilla 001 + accesos de pacientes (research P8)
CITACLARA_AHORA=2026-11-09T12:10:00+01:00 CITACLARA_URL_PUBLICA=http://localhost:3000 pnpm dev
```

El resumen de la semilla imprime, además de las cifras de la 001, el **Paciente A** y el
**Paciente B** (regla de selección en [research.md](research.md#p8-semilla-determinista-principio-v))
con su enlace y sus 4 cifras. Se copian a `docs/datos-demo.md`.

## Tests

```bash
pnpm test          # unitarias + integración (Testcontainers)
pnpm test:e2e      # Playwright, móvil 360×800 y portátil 1366×768, con axe
```

Resultado esperado: todo en verde; las baterías de concurrencia informan 0 solapes, 1 sola
cancelación efectiva por ráfaga y contadores de intentos exactos (SC-004).

## Escenarios manuales

Reloj fijado el lunes 09/11/2026 a las 12:10. «A» y «B» son los pacientes de ejemplo.

| # | Paso | Resultado esperado | Spec |
|---|------|--------------------|------|
| 1 | Abrir el enlace de A en un móvil | Pantalla de cifras, sin nombre ni citas | FR-002, FR-003 |
| 2 | Escribir unas cifras incorrectas | «Las cifras no coinciden…» | US1 #4 |
| 3 | Escribir las 4 cifras de A | Próximas citas de A en orden, con fecha, hora, servicio y profesional; sin precios | US1 #1, FR-007, FR-010 |
| 4 | Abrir «Historial» | Citas de A de la más reciente a la más antigua con «Realizada», «Cancelada», «No asistida» o «Pasada» | US1 #2, FR-008 |
| 5 | En una cita de A posterior al martes 10/11/2026 12:10, «Cancelar cita» → «No, mantenerla» | Sigue reservada | US2 #2 |
| 6 | Repetir y confirmar | «Tu cita del … está cancelada.»; pasa al Historial | US2 #1 |
| 7 | En el panel, abrir la agenda de ese profesional y día | «Cancelada por el paciente» y hueco libre y reservable | US2 #6, US3 #1 |
| 8 | Ver la cabecera del panel | «Huecos liberados por pacientes (1)» con ese hueco | US3 #3 |
| 9 | Reservar ese hueco para otro paciente | El hueco sale del aviso y el aviso desaparece | US3 #4 |
| 10 | En el portal de A, una cita del martes 10/11/2026 antes de las 12:10 (si existe; si no, crearla desde el panel) | Sin botón, «Ya no se puede cancelar desde aquí…» | US2 #3 |
| 11 | Enlace de B + sus cifras | «No tienes próximas citas…» con el teléfono | US1 #3 |
| 12 | En el panel, «Generar nuevo enlace del portal» para A con el portal de A abierto | La siguiente acción en el portal muestra «Este enlace ya no es válido…» | US1 #5, #6, FR-002a |
| 13 | Abrir el enlace nuevo con 5 cifras incorrectas seguidas | «Has superado los intentos. Vuelve a probar a las 12:25.» | FR-005 |
| 14 | «Copiar enlace del portal» en una cita de B | «Enlace copiado…»; el enlace pegado abre el portal de B | FR-002b |
| 15 | Todo lo anterior a 360 px | Sin desplazamiento horizontal, controles ≥ 44 px | SC-006, FR-017 |

## Prueba de usabilidad previa a la entrega (SC-001, SC-002)

Dos personas que no conocen CitaClara, en móvil, con el enlace y las cifras de A:

1. «¿Cuándo es tu próxima cita?» → cronometrar desde que abren el enlace; DEBE ser < 10 s
   (tras escribir las cifras, que se les dan).
2. «Cancela la cita de [fecha de una cita cancelable de A]» → DEBE ser < 30 s.

Registrar tiempos y observaciones en `docs/usabilidad-002.md`.

## Medición de SC-003 (tras la entrega)

Sonia anota en `docs/llamadas-eleva.md` las llamadas para consultar o cancelar citas durante
la semana anterior a activar el portal y la cuarta semana después. Objetivo: −50 % o más.
