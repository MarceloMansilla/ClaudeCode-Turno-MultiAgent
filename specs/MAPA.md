# Mapa de specs de CitaClara

Registro global de specs, su propietario único (Constitución, Principio I) y las relaciones
entre ellas. Lo mantiene el propietario de la 001 (revisión cruzada, S3).

**Actualizado**: 2026-11-07, a partir de la punta de cada rama (`001-agenda-core`,
`portal`, `recordatorio`, `analitica`, `005-acceso-cancelacion-paciente`) y de
[`000-revision-cruzada-jul2026.md`](000-revision-cruzada-jul2026.md).

## Tabla de specs

| Nº | Nombre | Propietario | Estado | Escribe en la agenda | Consume | La consumen |
|----|--------|-------------|--------|----------------------|---------|-------------|
| [001](001-agenda-core/spec.md) | Núcleo de agenda | MarceloMansilla | Implementada | Sí | — | 002, 003, 004, 005 |
| [002](002-portal-paciente/spec.md) | Portal del paciente | MarceloMansilla | En revisión | Sí (vía 005) | 001, 005 | 003 |
| [003](003-recordatorios-cita/spec.md) | Recordatorios de cita por correo | MarceloMansilla | En revisión | No | 001, 002, 004, 005 | — |
| [004](004-panel-analitica/spec.md) | Panel de analítica de la clínica | MarceloMansilla | Implementada | No | 001 | 003 (y 001, que le remite el indicador) |
| [005](005-acceso-cancelacion-paciente/spec.md) | Acceso y cancelación del paciente | MarceloMansilla | Borrador | Sí (solo cancelar) | 001 | 002, 003 (y 001, que le remite el acceso del paciente) |

**Criterio de estado**

- *Borrador*: la spec está en `Draft` o tiene `[NEEDS CLARIFICATION]` sin resolver.
- *En revisión*: la spec está aprobada o en revisión pero sin código, o se ha cambiado
  después de aprobarse y tiene trabajo pendiente.
- *Implementada*: hay código y pruebas en su rama.

**Qué significa «consume»**: la spec cita requisitos de la otra y no puede redefinirlos.
Para cada spec, los requisitos concretos que cita se detallan en su sección «Dependencias».

**Dónde vive cada spec**: la 001 y la 005 están en esta rama; la 002 en `portal`, la 003 en
`recordatorio` y la 004 en `analitica`. Los enlaces a la 002, la 003 y la 004 solo funcionan
cuando sus ramas se integren.

## Dominio de cada spec

**001 · Núcleo de agenda.** Es la agenda de recepción y la base de todo el sistema: clínica,
profesionales, servicios, fichas de paciente, citas y sus estados (reservada → completada,
cancelada o no asistida). También define las reglas sin solape y sin citas en el pasado, el
plazo de cancelación de recepción (FR-018, que remite a la 005 para el del paciente), el
origen de la cancelación (FR-018a), el teléfono
de la clínica y la semilla determinista de Clínica Eleva. Es la única spec que todas las
demás consumen. *Estado*: el código está implementado en `001-agenda-core` (`899df8e`). La
enmienda de la revisión cruzada S2–S5 (`cancelada_por` y el teléfono de la clínica) está
aprobada en la spec pero todavía no está en el código. La enmienda S1 (plazo del paciente →
005 FR-009) está aprobada y solo afecta a la spec: no cambia código de la 001.

**002 · Portal del paciente.** Es la página móvil donde el paciente ve sus citas futuras y
pasadas y las cancela. En recepción añade «Cancelada por el paciente», el aviso de huecos
liberados y las acciones del enlace del portal. Tras la revisión cruzada ya no define el
acceso ni el plazo: los toma de la 005 y se queda con las pantallas, los datos visibles y la
guía de textos y trato al paciente. *Estado*: se aprobó, pero tiene cambios de la revisión
S2–S4. 005 FR-006 ya está decidido (enlace + 4 cifras, FR-006a y FR-006b); falta que la 002
retire sus propias definiciones de acceso y plazo y cite la 005. No hay código.

**003 · Recordatorios de cita por correo.** Es el proceso diario que envía un correo de
recordatorio por cada cita reservada próxima, sin duplicar envíos. Sin SMTP, el correo se
simula con ficheros `.eml`. Cada correo lleva el enlace personal y el enunciado de la
política de cancelación de la 005, y su éxito se mide con la tasa de no asistencia de la 004.
*Estado*: se renumeró de 002 a 003 y queda pendiente su pregunta abierta P1 (si el envío de
las 08:00 de la víspera deja margen con el plazo de 24 h). No hay código.

**004 · Panel de analítica de la clínica.** Es una página del panel, de solo lectura, con la
ocupación semanal y la tasa de no asistencia por profesional y los ingresos por servicio.
Sirve para que Sara enseñe en las renovaciones lo que CitaClara ahorra a la clínica. Es
propietaria de las fórmulas de los indicadores (p. ej., la tasa de no asistencia, FR-006).
*Estado*: está implementada en `analitica` (`63af298`, más la revisión S3/S5 en `cbf6a02`)
pero no se ha integrado en el tronco. Sus cifras de referencia dependen de que la semilla de
la 001 no cambie.

**005 · Acceso y cancelación del paciente.** Es la única fuente de verdad sobre cómo un
paciente entra a sus datos: un enlace personal estable `/p/[token]` regenerable por
recepción más las 4 últimas cifras de su teléfono, sin cuentas ni contraseñas, con límite de
intentos y acceso que caduca a los 30 minutos sin actividad. También fija hasta cuándo puede
cancelar (24 h antes del inicio, FR-009) y con qué enunciado se le comunica esa política en
cualquier canal. *Estado*: en borrador, sin marcadores pendientes ni conflictos bloqueantes
con la 001; pendiente de aprobación por su propietario.

## Conflictos abiertos entre specs

- ~~**S1, plazo de cancelación del paciente.**~~ Resuelto el 2026-11-07: 001 FR-018 remite
  a 005 FR-009 (24 h antes).
- ~~**005 FR-006, segundo factor.**~~ Resuelto el 2026-11-07: enlace + 4 últimas cifras.
  Queda la consecuencia para la 003: su SC-002 (pulsaciones para cancelar desde el correo)
  debe revisarse porque abrir el enlace pide las 4 cifras.
- **002 y 003 aún redefinen acceso y plazo** en sus ramas; deben retirarlo y citar la 005
  (ver «Dependencias y enmiendas requeridas» de la 005).
- **Orden de integración recomendado** (S8): enmienda de la 001 → 005 → 002 → 003 → 004.
  Al integrar la 004, hay que volver a calcular sus cifras de referencia sobre la semilla
  ampliada.
