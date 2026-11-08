# Quickstart y validación: Portal del paciente

**Requisito previo**: la 005 integrada en `portal` con la 001 enmendada (FR-018a, FR-022)
y su suite en verde (ver `specs/MAPA.md`). La 002 no tiene migraciones ni semilla propias.

## Puesta en marcha

```bash
pnpm install
docker compose up -d                          # PostgreSQL 18
pnpm db:migrate                               # migraciones de la 001 y la 005 (la 002 no añade)
pnpm seed --fecha-referencia 2026-11-09       # semilla 001 + enlaces de pacientes (005 FR-019)
CITACLARA_AHORA=2026-11-09T12:10:00+01:00 pnpm dev
```

El resumen de la semilla imprime el **Paciente A** y el **Paciente B** (regla en
[research.md](research.md#p8-semilla-determinista-principio-v)) con su enlace y sus 4 últimas
cifras. Se copian a `docs/datos-demo.md`.

## Tests

```bash
pnpm test          # unitarias + integración (incluye coherencia-politica de la 005)
pnpm test:e2e      # Playwright, móvil 360×800 y portátil 1366×768, con axe
```

## Escenarios manuales

Reloj fijado el lunes 09/11/2026 a las 12:10. Los pasos de acceso (cifras, pausa, bloqueo,
regenerar el enlace) los valida el quickstart de la 005.

| # | Paso | Resultado esperado | Spec |
|---|------|--------------------|------|
| 1 | Abrir el enlace de A en un móvil y escribir sus 4 cifras | Próximas citas de A en orden, con fecha, hora, servicio y profesional; sin precios | US1 #1, FR-007, FR-010; 005 FR-006 |
| 2 | Abrir «Historial» | Citas de A de la más reciente a la más antigua con «Realizada», «Cancelada», «No asistida» o «Pasada» | US1 #2, FR-008 |
| 3 | Mirar cada tarjeta de Próximas | Todas muestran el enunciado de 005 FR-016; solo las que la 005 permite cancelar tienen «Cancelar cita» | US2 #1, #4, FR-011 |
| 4 | En una cita con botón, «Cancelar cita» → «No, mantenerla» | Sigue reservada | US2 #3 |
| 5 | Repetir y confirmar | «Tu cita del … está cancelada.»; pasa al Historial | US2 #2 |
| 6 | En el panel, abrir la agenda de ese profesional y día | «Cancelada por el paciente» y hueco libre y reservable | US2 #7, US3 #1 |
| 7 | Ver la cabecera del panel | «Huecos liberados por pacientes (1)» con ese hueco | US3 #3 |
| 8 | Reservar ese hueco para otro paciente | El hueco sale del aviso y el aviso desaparece | US3 #4 |
| 9 | Cancelar otra cita desde el panel (recepción) | «Cancelada», sin indicación de paciente, y no entra en el aviso | US3 #2 |
| 10 | Enlace de B + sus cifras | «No tienes próximas citas…» con el teléfono | US1 #3 |
| 11 | Todo lo anterior a 360 px | Sin desplazamiento horizontal, controles ≥ 44 px | SC-006, FR-017 |

## Prueba de usabilidad previa a la entrega (SC-001, SC-002)

Dos personas que no conocen CitaClara, en móvil, con el enlace y las cifras de A (se les dan):

1. «¿Cuándo es tu próxima cita?» → cronometrar desde que ven el portal; DEBE ser < 10 s.
2. «Cancela la cita de [fecha de una cita de A con botón “Cancelar cita”]» → DEBE ser < 30 s.

Puede hacerse en la misma sesión que la prueba de 005 SC-005/SC-006. Registrar en
`docs/usabilidad-002.md`.

## Medición de SC-003 (tras la entrega)

Sonia anota en `docs/llamadas-eleva.md` las llamadas para consultar o cancelar citas durante
la semana anterior a activar el portal y la cuarta semana después. Objetivo: −50 % o más.
