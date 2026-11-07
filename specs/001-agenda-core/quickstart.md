# Guía rápida de validación: Núcleo de agenda

Cómo comprobar de principio a fin que la 001 cumple su [spec](spec.md). Detalles en
[data-model.md](data-model.md) y [contracts/](contracts/).

## Requisitos previos

- Node.js 22 LTS, pnpm 11, Docker (con Docker Compose).
- Copiar `.env.example` a `.env` (cadena de conexión a PostgreSQL, secreto de sesión,
  `CLAVE_DEMO`).

## Puesta en marcha

```bash
pnpm install
docker compose up -d db                     # PostgreSQL 18 en el puerto 5432
pnpm db:migrate                             # esquema + restricción de exclusión
pnpm seed --fecha-referencia 2026-11-09     # datos de Clínica Eleva (deterministas)
pnpm dev                                    # http://localhost:3000
```

Clave de demostración: la indicada en `CLAVE_DEMO` (por defecto `eleva-demo`).

## Pruebas automáticas (condición de integración, Principio VI)

```bash
pnpm test            # unitarias + integración (Testcontainers levanta su propio PostgreSQL)
pnpm test:e2e        # Playwright: portátil 1366×768 y móvil 360×800, con axe
pnpm lint && pnpm typecheck
```

Resultado esperado: todo en verde; la batería de solapes informa 0 solapes y 1 cita por
ráfaga (SC-001).

## Escenarios manuales

Con `pnpm seed --fecha-referencia 2026-11-09` y el reloj de la app fijado con
`CITACLARA_AHORA=2026-11-09T12:10:00+01:00`:

| # | Paso | Resultado esperado | Spec |
|---|------|--------------------|------|
| 1 | Abrir `/agenda` sin sesión | Redirige a `/entrar` | FR-001 |
| 2 | Clave «otra» | «La clave no es correcta…» | FR-002 |
| 3 | Clave correcta | Agenda de hoy (09/11/2026) de María con citas y huecos | US1 #3 |
| 4 | Cambiar a Jorge y a «Siguiente ›» | Agenda de Jorge del martes 10/11/2026 | US1 #4 |
| 5 | En María, lunes 16/11/2026, reservar en un hueco libre a las 10:00 «Sesión de fisioterapia» | Cita 10:00–10:45 reservada | US2 #1 |
| 6 | Mismo día, «Primera visita de fisioterapia» a las 10:30 | Rechazo `SOLAPE` citando 10:00–10:45 | US2 #2 |
| 7 | Mismo día, cita a las 10:45 | Se registra | US2 #3 |
| 8 | Hoy a las 12:00 | «No se pueden crear citas en el pasado.» | US2 #6 |
| 9 | 60 min a las 19:30 | Rechazo `FUERA_DE_HORARIO` | US2 #8 |
| 10 | Paciente nuevo con teléfono de un paciente existente escrito como «+34 …» | `TELEFONO_DUPLICADO` y «Usar esta ficha» | FR-016b |
| 11 | Con María, buscar servicios | Solo aparecen los dos de Fisioterapia | FR-009a |
| 12 | Cancelar la cita del paso 5 | Diálogo de confirmación → «Cancelada», hueco libre de nuevo | US3 #1 |
| 13 | En una cita reservada de hoy anterior a las 12:10, ver acciones | «Completar» y «No asistió»; sin «Cancelar» | US3 #2–#4 |
| 14 | Dos pestañas, reservar el mismo hueco a la vez | Una reserva; la otra, «Este hueco se acaba de ocupar…» | US2 #7 |
| 15 | Repetir con ventana de 360 px | Todo usable sin scroll horizontal | SC-006 |

## Datos de demostración

`pnpm seed --fecha-referencia 2026-11-09` debe imprimir un resumen con el total de citas por
estado y profesional, y generar el mismo resumen en cada ejecución (SC-005). Esas cifras se
copian a `docs/datos-demo.md` en la implementación y son las únicas que se citan en
documentación y tests. Comprobación: ejecutar el seed dos veces y comparar los resúmenes
(deben ser idénticos), y verificar no asistidas = 10 % ± 1 y canceladas = 8 % ± 1 de la
historia.
