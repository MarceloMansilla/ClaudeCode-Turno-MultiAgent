# Investigación (Fase 0): Portal del paciente

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-07

Punto de partida: el stack de la 001 ([research de la 001](../001-agenda-core/research.md)).
Esta feature **no añade ninguna dependencia**: todo se resuelve con Next.js 16, PostgreSQL 18,
Drizzle, Zod, jose, date-fns y shadcn/ui, ya elegidos. Cada decisión sigue el formato
Decisión / Razón / Alternativas.

---

## P1. Dónde vive el portal

- **Decisión**: dentro de la misma aplicación Next.js de la 001, bajo la ruta pública
  `/p/[token]`, con su propio layout pensado para móvil. Reutiliza `src/dominio`,
  `src/servicios`, `reloj`, `zona` y `formato`.
- **Razón**: una sola aplicación, un solo despliegue y una sola base de datos (Principio IV);
  la cancelación del paciente pasa por el mismo servicio de estados que la de recepción, así
  que hereda sin código nuevo la garantía de FR-020 de la 001 y la restricción anti-solape.
- **Alternativas**: aplicación separada para pacientes: duplicaría reglas y acceso a datos, y
  abriría la puerta a dos implementaciones de la cancelación. Rechazada.

## P2. Enlace personal — *trasladada a la 005 (revisión cruzada S4)*

- **Estado**: ya no es una decisión de la 002. El enlace personal, su almacenamiento,
  unicidad, regeneración y generación en la semilla los define la 005 (FR-001–FR-008, FR-019)
  y los decide su plan. La 002 solo necesita resolver un enlace vigente a la ficha y clínica
  del paciente (spec FR-001–FR-004).
- **Aportación al plan de la 005** (rastro de la decisión anterior): token aleatorio de 32
  bytes en base64url (43 caracteres), guardado **en claro** para que recepción pueda copiar
  el enlace vigente (005 FR-005); `INSERT … ON CONFLICT DO NOTHING` para que dos puestos a la
  vez no creen dos enlaces. Alternativas que se habían descartado: token firmado (HMAC) sin
  tabla, y hash del token mostrado solo al generarlo.

## P3. Confirmación con las 4 cifras y límite de intentos — *pendiente de 005 FR-006*

- **Estado**: retirada de la 002. Que exista o no esta confirmación es la clarificación
  pendiente de 005 FR-006; la propuesta (reglas y textos) está en
  [spec.md](spec.md#dependencias-y-enmiendas-requeridas).
- **Aportación técnica, si la 005 la mantiene** (rastro): contadores por enlace
  (`fallos_tanda`, `fallos_acumulados`, `bloqueado_hasta`, `bloqueado`) verificados en una
  transacción con `SELECT … FOR UPDATE` sobre la fila del enlace, para que intentos en
  paralelo no superen el límite; la limitación por IP se había descartado.

## P4. Sesión del paciente — *pendiente de 005 FR-006*

- **Estado**: una sesión solo hace falta si la 005 exige una confirmación además del enlace.
  Si basta con el enlace, cada petición a `/p/[token]` se autoriza con el propio enlace
  vigente y no hay cookie ni «Salir».
- **Aportación técnica, si la 005 mantiene la confirmación** (rastro): cookie
  `citaclara_portal` (`httpOnly`, `Secure`, `SameSite=Lax`, `Path=/p`) firmada con jose
  (HS256, `aud: "portal"`), con `clinicaId`, `pacienteId` y la generación del enlace;
  30 minutos deslizantes renovados en `proxy.ts`; regenerar el enlace invalida la sesión
  (US1 #6).

## P5. Cancelación desde el portal (FR-011–FR-014; origen: 001 FR-018a)

- **Decisión**: el servicio de estados de la 001 gana un parámetro `origen` con los valores
  de 001 FR-018a (`'recepcion' | 'paciente'`); la columna y su migración son de la 001. Para
  el paciente, una sola sentencia condicional:
  `UPDATE cita SET estado='cancelada', cancelada_por='paciente', estado_cambiado_en=now()
  WHERE id=$1 AND clinica_id=$2 AND paciente_id=$3 AND estado='reservada'
  AND $ahora < inicio - interval '24 hours'`, donde `$3` es la ficha del enlace vigente
  (005 FR-006). Si no afecta a ninguna fila, se relee la cita
  para devolver el motivo exacto: no es suya (`CITA_NO_ENCONTRADA`), estado cambiado
  (`ESTADO_CAMBIADO`) o plazo vencido (`FUERA_DE_PLAZO`). `$ahora` sale del módulo `reloj`.
- **Razón**: atómica, sin carreras: si paciente y recepción cancelan a la vez, solo una
  sentencia encuentra la cita en `reservada`. El plazo se evalúa en el instante de confirmar
  (US2 #4). El plazo de 24 h es una resta de instantes (horas reales); en hora local siempre
  da la misma hora del día anterior porque ningún plazo cruza un cambio de hora (spec,
  «Amounts and dates»).
- **Alternativas**: comprobar plazo y estado en la aplicación y luego actualizar: deja una
  ventana de carrera. Rechazada.

## P6. Solape tras liberar un hueco (Principio III)

- **Decisión**: ningún cambio en la garantía: la restricción de exclusión `cita_sin_solape`
  de la 001 solo cuenta citas `reservada`/`completada`. Si recepción reserva el hueco
  mientras la cancelación del paciente aún no se ha confirmado, PostgreSQL hace esperar la
  inserción hasta que la cancelación termine y entonces la evalúa: si la cancelación se
  confirmó, la reserva entra; si no, se rechaza con `HUECO_OCUPADO_A_LA_VEZ`. Nunca quedan
  dos citas solapadas.
- **Razón**: la garantía sigue estando en un único sitio, la base de datos.
- **Pruebas**: ráfagas de cancelación de paciente + 10 reservas simultáneas del mismo hueco
  (exactamente 1 reserva si la cancelación entra; 0 si no), doble cancelación simultánea
  (paciente + paciente, paciente + recepción) y cancelación en el último segundo del plazo.

## P7. Aviso de huecos liberados (FR-015a)

- **Decisión**: consulta derivada, sin tabla nueva: citas con `cancelada_por = 'paciente'`
  (001 FR-018a),
  `inicio > ahora`, y sin ninguna cita `reservada`/`completada` del mismo profesional que
  solape su intervalo. Si dos cancelaciones de paciente dejan libre el mismo tramo, se
  muestra una sola entrada (la cancelación más reciente). Se calcula al cargar cualquier
  página del panel; se muestra en la cabecera con su número.
- **Razón**: el aviso desaparece solo cuando el hueco se vuelve a ocupar o empieza (la spec
  pide que salga «sin intervención de recepción»); no hay estado «visto» que mantener.
- **Alternativas**: tabla de avisos con marca de leído: estado extra que la spec no pide.
  Notificaciones en tiempo real: fuera de alcance (SC-005 se cumple al recargar).

## P8. Semilla determinista (Principio V)

- **Decisión** *(revisada en la revisión cruzada S2–S4)*: la 002 **no amplía la semilla**.
  El teléfono de la clínica (`911 234 567`) y `cancelada_por = 'recepcion'` en las
  cancelaciones de la historia los aporta la 001 (FR-022, FR-018a); los 40 enlaces personales
  reproducibles, la 005 (FR-019, «sin alterar ninguna cita, ficha ni identificador que ya
  genere la 001»). La 002 solo lee la semilla para elegir a sus pacientes de ejemplo.
- **Aportación a la 005** (rastro de la decisión anterior): generar los enlaces **al final**
  de la secuencia de la semilla, en orden de creación de los pacientes y con el mismo PRNG,
  conserva intactos los identificadores y estados ya generados.
- **Pacientes de ejemplo**: se eligen con una regla fija sobre la semilla de 09/11/2026 con
  el reloj a las 12:10, para que sean reproducibles sin conocer aún sus nombres:
  - **Paciente A**: el primero, en orden de creación, con al menos una cita reservada futura
    con inicio posterior al martes 10/11/2026 a las 12:10 (cancelable) y con historial en al
    menos dos estados distintos.
  - **Paciente B**: el primero, en orden de creación, sin citas futuras. Si la semilla no
    tiene ninguno, los tests lo crean con el alta rápida de la 001.
  Sus nombres, teléfonos, enlaces (de la 005) y citas se copian a `docs/datos-demo.md` en la
  implementación y son los únicos que se citan.

## P9. Recepción: copiar y regenerar enlace (FR-002a, FR-002b)

- **Decisión**: el comportamiento (obtener el enlace vigente, regenerarlo e invalidar el
  anterior) es de la 005 (FR-004, FR-005) y lo implementa su plan. La 002 decide solo la
  presentación: en el menú de acciones de cualquier cita de la agenda, «Copiar enlace del
  portal» (copia la URL con la API del portapapeles; si el navegador no lo permite, muestra
  la URL seleccionable) y «Generar nuevo enlace del portal» (diálogo de confirmación; al
  aceptar, muestra el enlace nuevo con «Copiar»). La URL pública (`CITACLARA_URL_PUBLICA`)
  la necesita cualquier canal que entregue el enlace; si la 005 la define, la 002 la usa.
- **Razón**: la cita es el único sitio donde la 001 muestra al paciente (no hay listado de
  fichas); es donde Sonia está cuando habla con él.
- **Alternativas**: pantalla de fichas de paciente: alcance nuevo no pedido (Principio IV).

## P10. Pruebas (Principio VI)

- **Decisión**: mismas herramientas que la 001 (Vitest + Testcontainers, Playwright + axe).
  Unitarias: plazo de 24 h (incluido el límite exacto y la semana del cambio de hora),
  clasificación «Próximas»/«Historial», etiquetas de estado. Integración: cancelación
  condicional, aislamiento entre pacientes en la lectura del portal, solapes (P6), consulta
  de huecos liberados. E2E en móvil 360×800 y portátil 1366×768. Cada test cita el
  FR/escenario de la 002 en su nombre. Las pruebas del acceso (enlace válido, no válido y
  regenerado; intentos, si los hay) son de la 005 (SC-001, SC-002 de la 005).

## Asuntos sin resolver

- **005 FR-006** (NEEDS CLARIFICATION en la 005): ¿basta con el enlace o se confirman además
  las 4 últimas cifras? Decide si existen la pantalla de cifras, la sesión (P4) y «Salir». La
  aportación de la 002 está en [spec.md](spec.md#dependencias-y-enmiendas-requeridas).
- **001 FR-018a y FR-022**: acordados, pero aún no figuran en la 001 de `001-agenda-core`.
