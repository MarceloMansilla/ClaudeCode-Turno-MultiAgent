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

## P2. Enlace personal (FR-002, FR-002a)

- **Decisión**: cada paciente tiene una fila en `acceso_paciente` con un `token` aleatorio de
  32 bytes (256 bits) codificado en base64url (43 caracteres), único en toda la base de
  datos. La URL es `{CITACLARA_URL_PUBLICA}/p/{token}`. Se guarda **en claro** porque
  recepción debe poder copiar el enlace vigente (FR-002b). Regenerar sustituye el token y
  aumenta `generacion`, lo que invalida las sesiones abiertas (P4). La fila se crea la
  primera vez que recepción copia el enlace (o en la semilla), con `INSERT … ON CONFLICT DO
  NOTHING` para que dos puestos a la vez no creen dos enlaces.
- **Razón**: 256 bits no se pueden adivinar; las 4 cifras son la segunda barrera si el enlace
  se reenvía. Guardar un hash impediría «Copiar enlace»; quien pudiera leer la base de datos
  ya vería las citas y los teléfonos, así que el hash no protege nada que valga la pena.
- **Alternativas**: token firmado (HMAC) sin tabla: obliga a un secreto que haría la semilla
  no reproducible entre entornos y complica la revocación. Hash del token + mostrarlo solo al
  generarlo: obliga a regenerar cada vez que recepción quiera volver a enviarlo. Rechazadas.

## P3. Confirmación con las 4 cifras y límite de intentos (FR-002, FR-005)

- **Decisión**: se comparan las 4 cifras escritas con las 4 últimas de
  `paciente.telefono_normalizado`. Contadores en `acceso_paciente`:
  `fallos_tanda`, `fallos_acumulados`, `bloqueado_hasta`, `bloqueado`. La verificación se hace
  en una transacción con `SELECT … FOR UPDATE` sobre la fila del acceso, para que intentos en
  paralelo no superen el límite. Reglas exactas en [data-model.md](data-model.md).
- **Razón**: el límite es por enlace (lo que pide la spec) y el bloqueo de fila hace el
  recuento exacto aunque lleguen 10 intentos a la vez. Con 10 fallos como máximo,
  la probabilidad de acertar es ≤ 10/10.000 = 0,1 % (FR-005).
- **Alternativas**: limitación por IP: no protege frente a quien cambia de red y castiga a
  quienes comparten una (familia, wifi de la clínica); no la pide la spec. Rechazada.

## P4. Sesión del paciente (30 minutos sin actividad)

- **Decisión**: cookie `citaclara_portal` (`httpOnly`, `Secure`, `SameSite=Lax`,
  `Path=/p`), firmada con **jose** (HS256) con el mismo secreto que la sesión de recepción
  pero con `aud: "portal"`. Contiene `clinicaId`, `pacienteId`, `accesoId` y `generacion`;
  caduca a los 30 minutos y `proxy.ts` la renueva en cada petición a `/p/*` (caducidad
  deslizante). Cada lectura o acción comprueba que `generacion` coincide con la del acceso:
  si recepción ha regenerado el enlace, la sesión deja de valer (US1 #6).
- **Razón**: misma técnica que la 001, sin tabla de sesiones; el `aud` impide usar una cookie
  de paciente como si fuera de recepción y al revés. `Path=/p` la separa del panel.
- **Alternativas**: tabla de sesiones: permitiría cerrar sesiones una a una, pero `generacion`
  ya cubre el único caso que pide la spec. Rechazada por simplicidad.

## P5. Cancelación desde el portal (FR-011–FR-014, FR-016)

- **Decisión**: el servicio de estados de la 001 gana un parámetro `origen`
  (`'recepcion' | 'paciente'`). Para el paciente, una sola sentencia condicional:
  `UPDATE cita SET estado='cancelada', cancelada_por='paciente', estado_cambiado_en=now()
  WHERE id=$1 AND clinica_id=$2 AND paciente_id=$3 AND estado='reservada'
  AND $ahora < inicio - interval '24 hours'`. Si no afecta a ninguna fila, se relee la cita
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

- **Decisión**: consulta derivada, sin tabla nueva: citas con `cancelada_por = 'paciente'`,
  `inicio > ahora`, y sin ninguna cita `reservada`/`completada` del mismo profesional que
  solape su intervalo. Si dos cancelaciones de paciente dejan libre el mismo tramo, se
  muestra una sola entrada (la cancelación más reciente). Se calcula al cargar cualquier
  página del panel; se muestra en la cabecera con su número.
- **Razón**: el aviso desaparece solo cuando el hueco se vuelve a ocupar o empieza (la spec
  pide que salga «sin intervención de recepción»); no hay estado «visto» que mantener.
- **Alternativas**: tabla de avisos con marca de leído: estado extra que la spec no pide.
  Notificaciones en tiempo real: fuera de alcance (SC-005 se cumple al recargar).

## P8. Semilla determinista (Principio V)

- **Decisión**: la semilla de la 001 se amplía **al final** de su secuencia: tras crear las
  citas, genera un `acceso_paciente` por cada uno de los 40 pacientes, en orden de creación,
  tomando 32 bytes del mismo PRNG para cada token. La clínica recibe `telefono =
  '911 234 567'` (Enmienda 1 de la 001). Las cancelaciones de la historia quedan con
  `cancelada_por = 'recepcion'`. Ninguna cita, identificador ni cifra de la 001 cambia.
- **Razón**: tomar los bytes después de todo lo anterior conserva intactos los
  identificadores y estados ya generados; los enlaces quedan reproducibles para ejemplos y
  tests.
- **Pacientes de ejemplo**: se eligen con una regla fija sobre la semilla de 09/11/2026 con
  el reloj a las 12:10, para que sean reproducibles sin conocer aún sus nombres:
  - **Paciente A**: el primero, en orden de creación, con al menos una cita reservada futura
    con inicio posterior al martes 10/11/2026 a las 12:10 (cancelable) y con historial en al
    menos dos estados distintos.
  - **Paciente B**: el primero, en orden de creación, sin citas futuras. Si la semilla no
    tiene ninguno, los tests lo crean con el alta rápida de la 001.
  Sus nombres, teléfonos, enlaces y citas se copian a `docs/datos-demo.md` en la
  implementación y son los únicos que se citan.

## P9. Recepción: copiar y regenerar enlace (FR-002a, FR-002b)

- **Decisión**: en el menú de acciones de cualquier cita de la agenda, «Copiar enlace del
  portal» (crea el acceso si no existe y copia la URL con la API del portapapeles; si el
  navegador no lo permite, muestra la URL seleccionable) y «Generar nuevo enlace del portal»
  (diálogo de confirmación; al aceptar, muestra el enlace nuevo con «Copiar»). Variable de
  entorno nueva `CITACLARA_URL_PUBLICA` para construir la URL.
- **Razón**: la cita es el único sitio donde la 001 muestra al paciente (no hay listado de
  fichas); es donde Sonia está cuando habla con él.
- **Alternativas**: pantalla de fichas de paciente: alcance nuevo no pedido (Principio IV).

## P10. Pruebas (Principio VI)

- **Decisión**: mismas herramientas que la 001 (Vitest + Testcontainers, Playwright + axe).
  Unitarias: plazo de 24 h (incluido el límite exacto y la semana del cambio de hora),
  clasificación «Próximas»/«Historial», etiquetas de estado, reglas de intentos. Integración:
  cancelación condicional, aislamiento entre pacientes, contadores bajo concurrencia,
  regeneración de enlace, solapes (P6), consulta de huecos liberados. E2E en móvil 360×800 y
  portátil 1366×768. Cada test cita el FR/escenario de la 002 en su nombre.

## Asuntos sin resolver

Ninguno. No queda ningún «NEEDS CLARIFICATION».
