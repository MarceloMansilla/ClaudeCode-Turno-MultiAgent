# Investigación (Fase 0): Acceso y cancelación del paciente

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-07

El stack es el de la 001 ([research de la 001](../001-agenda-core/research.md)): Next.js 16
(App Router, Server Actions, `proxy.ts`), React 19, TypeScript estricto, PostgreSQL 18 con
Drizzle, jose, Zod, date-fns + @date-fns/tz, Vitest + Testcontainers y Playwright + axe. La 005
**no añade ninguna dependencia**: el azar criptográfico y el SHA-256 salen de `node:crypto`.
Cada decisión sigue el formato Decisión / Razón / Alternativas.

---

## R0. Prerrequisito: la enmienda S2–S5 de la 001 en código

- **Decisión**: antes de las tareas de la 005 debe estar en el código la enmienda S2–S5 de la
  001, que hoy solo está en su spec y su data-model: `clinica.telefono` (FR-022),
  `cita.cancelada_por` con el enum `origen_cancelacion` (`recepcion` | `paciente`) y su
  `CHECK`, `cambiarEstadoCita` escribiendo `recepcion` y la semilla con el teléfono de la
  clínica y las canceladas con origen `recepcion`. Es trabajo **de la 001** (Principio I): se
  hace con `/speckit-converge` sobre la 001 (o como tareas de la 001), no como tareas de la 005.
- **Razón**: la 005 lee el teléfono de la clínica (FR-007, FR-016) y escribe
  `cancelada_por = 'paciente'` (FR-013). Hoy `src/db/esquema.ts` no tiene ninguna de las dos
  columnas.
- **Alternativas**: hacerlo dentro de la 005 → mezcla propietarios y deja la 001 desalineada
  de su propia spec si la 005 se retrasa.

## R1. Qué superficie de interfaz construye la 005

- **Decisión**: la 005 construye todo lo que su spec define y nada de lo que define la 002:
  1. La ruta pública `/p/[token]` con sus **pantallas de acceso**: enlace no válido (FR-007),
     enlace bloqueado y pausa (FR-006a), petición de las 4 cifras (FR-006) y acceso caducado
     (FR-006b).
  2. El **flujo de cancelar**: confirmación con día, hora, servicio y profesional (FR-012),
     rechazo fuera de plazo con el enunciado (FR-011, FR-016) y confirmación final.
  3. Una **lista mínima y provisional** tras entrar, «Sus próximas citas», que solo muestra
     las citas reservadas futuras con los cuatro datos de FR-012 y el botón «Cancelar» o el
     enunciado. La 002 la sustituye por sus pantallas al integrarse y reutiliza los
     componentes de los puntos 1 y 2.
  4. En el panel, el menú **«Enlace del paciente»** de cada cita: «Copiar enlace» (FR-005) y
     «Generar enlace nuevo» con confirmación (FR-004).
- **Razón**: el orden de integración del MAPA es 001 → 005 → 002, así que la 005 debe poder
  demostrarse y probarse sola (Principio VI: US1–US3 tienen escenarios de pantalla). La lista
  provisional es la mínima que hace probables US2 #1–#3 y SC-006.
- **Alternativas**: esperar a la 002 para tener pantallas → la 005 quedaría sin E2E y sus
  criterios sin prueba. Construir ya el portal completo → alcance de la 002 (Principio IV).

## R2. Token del enlace personal

- **Decisión**: 32 bytes de `crypto.randomBytes` codificados en base64url sin relleno
  (43 caracteres, `^[A-Za-z0-9_-]{43}$`). Se guarda **en claro** con índice único. Una ruta
  con un token que no cumple el formato se responde como enlace no válido sin consultar la BD.
- **Razón**: 256 bits hacen impracticable adivinarlo (FR-002) y no contienen datos. FR-005
  exige que recepción pueda copiar el enlace vigente en cualquier momento, así que debe poder
  leerse. Leer la BD ya da acceso a todos los datos de pacientes, y aun con el token falta el
  segundo paso de las 4 cifras.
- **Alternativas**: guardar solo el hash SHA-256 → recepción no podría copiarlo y tendría que
  regenerar cada vez (incumple FR-005 y FR-003). Cifrarlo con una clave de la aplicación →
  complejidad sin ganancia real con el segundo paso ya en marcha.

## R3. Un enlace por ficha: tabla `enlace_paciente` 1:1

- **Decisión**: tabla `enlace_paciente` con clave primaria `paciente_id` (una fila por
  ficha, FR-001). Regenerar es un `UPDATE` que sustituye el token y pone a cero los contadores
  (FR-004): el token anterior deja de existir en la BD en la misma operación. El enlace se
  crea en la misma transacción que la ficha (`crearPaciente`), y una migración crea los de las
  fichas que ya existen.
- **Razón**: «exactamente un enlace vigente» lo garantiza la clave primaria; no hace falta
  ningún estado «revocado» ni ninguna consulta de «el último». Sin historial, un token
  regenerado y uno inventado son indistinguibles por construcción (FR-007).
- **Alternativas**: tabla con historial y columna `vigente` → índice parcial único y más
  casos que probar, sin ningún requisito que pida el historial.

## R4. Segundo paso y límite de intentos (FR-006, FR-006a)

- **Decisión**: la comprobación de las 4 cifras se hace en una transacción que bloquea la
  fila del enlace (`SELECT … FOR UPDATE`), en este orden: (1) bloqueado
  (`fallos_seguidos ≥ 10`) → `ENLACE_BLOQUEADO`; (2) `pausa_hasta > ahora` →
  `ACCESO_EN_PAUSA`, sin comprobar ni contar; (3) se comparan las cifras con las 4 últimas de
  `paciente.telefono_normalizado` en ese momento. Si aciertan → `fallos_seguidos = 0`,
  `pausa_hasta = null` y se abre el acceso. Si fallan → `fallos_seguidos + 1`; al llegar a 5,
  `pausa_hasta = ahora + 15 min`; al llegar a 10, el enlace queda bloqueado. Una entrada que
  no son exactamente 4 cifras se rechaza (`DATOS_NO_VALIDOS`) **sin contar** como fallo.
- **Razón**: el bloqueo de fila serializa los intentos simultáneos desde varios dispositivos,
  así que la cuenta es exacta (edge case «Fallos desde varios dispositivos»). Usar el
  teléfono actual cubre el edge case «Recepción cambia el teléfono de la ficha». No contar
  los errores de formato evita que un error al teclear acerque a un paciente legítimo al
  bloqueo, sin dar ventaja a quien adivina.
- **Alternativas**: contadores en memoria o en caché → se pierden al reiniciar y no se
  comparten entre instancias. Contar por IP → no protege un enlace concreto, que es lo que
  pide la spec.

## R5. Acceso abierto: cookie firmada de 30 minutos sin actividad (FR-006b)

- **Decisión**: al acertar las cifras se emite una cookie `citaclara_paciente`, firmada con
  jose (HS256, el mismo `SESION_SECRETO`), `httpOnly`, `Secure` en producción,
  `SameSite=Lax`, `path=/p`, con `{ pacienteId, clinicaId, huella }` (huella = SHA-256 del
  token, en hexadecimal) y caducidad a los 30 minutos. El `proxy.ts` la **renueva** en cada
  petición a `/p/*` cuya huella coincida con el token de la URL (incluidas las Server
  Actions, que son POST a esa ruta). Cada página y acción vuelve a verificarla y comprueba en
  la BD que el token de la URL sigue vigente y es de ese paciente.
- **Razón**: no hace falta tabla de sesiones (igual que el panel, R7 de la 001). Al
  regenerar, el token cambia: la URL antigua ya no resuelve a ninguna ficha y la huella del
  nuevo no coincide, así que todos los accesos abiertos terminan al instante (FR-006b,
  US3 #4). En Next.js 16 el proxy corre en Node.js y puede escribir cookies en la respuesta;
  los Server Components no pueden hacerlo, por eso la renovación vive en el proxy.
- **Alternativas**: tabla de sesiones de paciente → más escrituras y limpieza, sin requisito
  que lo pida. Cookie de 30 minutos fijos sin renovar → incumple «cada petición reinicia los
  30 minutos».

## R6. Plazo del paciente: una sola constante, comprobada en la misma escritura (FR-009)

- **Decisión**: `PLAZO_CANCELACION_PACIENTE_MS = 24 · 60 · 60 · 1000` en
  `src/dominio/plazo-paciente.ts`, con `limiteCancelacionPaciente(inicio) = inicio − 24 h` y
  `pacientePuedeCancelar(cita, ahora)` ⇔ `estado = 'reservada' ∧ ahora < límite`. La
  escritura repite la condición en SQL, en el mismo `UPDATE` condicional:
  `WHERE … AND estado = 'reservada' AND inicio > $ahora + 24 h` (parámetro calculado con la
  misma constante). La pantalla usa la función pura solo para decidir qué mostrar.
- **Razón**: FR-018 pide que el valor viva en un solo sitio. Comprobar en el `UPDATE`
  cubre la pantalla abierta desde antes (US2 #3) y la frontera exacta (US2 #4) sin ventanas
  de carrera. Restar milisegundos a un instante UTC da 24 h reales, que coinciden con «la
  misma hora del día anterior» en el horario de la clínica (FR-010, tercera fila).
- **Alternativas**: restar «1 día» en calendario local → coincide hoy, pero no es la regla
  escrita (24 h reales) y fallaría en una clínica con otro horario.

## R7. Una sola operación de cancelación (S7) con origen (FR-013)

- **Decisión**: `src/servicios/citas.ts` expone `cancelarCita(ejecutor, { clinicaId, citaId,
  origen, ahora, pacienteId?, inicioMinimo })`, que hace el único `UPDATE` condicional que
  pasa una cita a `cancelada` (`estado_cambiado_en = ahora`, `cancelada_por = origen`).
  Recepción la usa con `origen = 'recepcion'` e `inicioMinimo = ahora`; el paciente, con
  `origen = 'paciente'`, su `pacienteId` e `inicioMinimo = ahora + 24 h`. Si no actualiza
  ninguna fila, se relee la cita para devolver el motivo: no existe o no es suya →
  `NO_ENCONTRADO`; ya no está reservada → `ESTADO_CAMBIADO` (001 FR-020); si no →
  `FUERA_DE_PLAZO`.
- **Razón**: la revisión cruzada (S7) pide no repetir la transición. El `UPDATE` condicional
  garantiza que de dos cancelaciones simultáneas solo una cambia el estado (FR-014). Pasar a
  `cancelada` saca la fila de `cita_sin_solape`, así que el hueco queda libre al confirmar la
  transacción. Un alta simultánea en ese hueco solo puede registrarse después (001 FR-011,
  FR-012). La 005 no escribe ningún otro estado ni crea citas.
- **Alternativas**: un `UPDATE` propio en un servicio de la 005 → segunda copia de la
  transición, justo lo que S7 señala como riesgo.

## R8. Enunciado canónico como función pura única (FR-016, FR-017)

- **Decisión**: `src/dominio/politica-cancelacion.ts` exporta
  `enunciadoPoliticaCancelacion({ inicio, zonaHoraria, clinicaNombre, clinicaTelefono })`,
  que devuelve las dos frases de FR-016 a partir de `limiteCancelacionPaciente`. El límite
  se formatea como «antes del [día], [dd/mm/aaaa] a las [hh:mm]» en la zona de la clínica. Es
  el único sitio que redacta la política: portal, lista provisional, mensaje
  `FUERA_DE_PLAZO` y los futuros correos de la 003 la importan, y su comentario cita
  «005, FR-016».
- **Razón**: SC-004 pide 0 discrepancias entre canales. Si todos usan la misma función con
  la misma constante de R6, el límite mostrado y el aplicado son el mismo instante.
- **Alternativas**: plantillas de texto en cada pantalla o correo → es el problema que
  originó S1.

## R9. Semilla determinista de enlaces (FR-019, Principio V)

- **Decisión**: `generarSemilla` crea los 40 enlaces **después** de todo lo demás y con un
  flujo PRNG propio (`crearPrng(SEMILLA_DEMO ^ 0x0e1ace)`), del que salen 32 bytes por paciente
  en el orden de la lista de pacientes. No consume nada de los flujos `azar` ni `ids`. Fecha de
  generación de cada enlace: la de alta de los pacientes. `docs/datos-demo.md` añade una
  tabla con el enlace y las 4 cifras de 3 pacientes de demostración, para el quickstart y los
  E2E.
- **Razón**: añadir lecturas a los flujos existentes cambiaría identificadores y citas, y con
  ellos las cifras de la 004 y de `docs/datos-demo.md`. Un flujo aparte deja intacto todo lo
  que ya genera la 001 (FR-019, edge «Demo data» de la spec).
- **Alternativas**: tokens aleatorios en cada carga → rompen el determinismo y los ejemplos
  documentados. Derivar el token del id del paciente → sería deducible (incumple FR-002).

## R10. Privacidad de la ruta `/p/*`

- **Decisión**: el proxy añade a toda respuesta de `/p/*` `Referrer-Policy: no-referrer`,
  `X-Robots-Tag: noindex, nofollow` y `Cache-Control: no-store`. El `<title>` de estas
  páginas es siempre «CitaClara · Clínica Eleva» (nunca el nombre del paciente). Las páginas
  son dinámicas.
- **Razón**: el token va en la URL. Así no se filtra a otros sitios por el `Referer`, no se
  indexa y no queda en cachés compartidas. Cuesta tres cabeceras.
- **Alternativas**: token en un fragmento (`#`) → el servidor no lo vería en la primera
  carga y complicaría el flujo sin necesidad.

## R11. Pruebas (Principio VI)

- **Decisión**: mismas herramientas que la 001; cada test cita el FR o el escenario en su
  nombre.
  - **Unitarias**: plazo y frontera (FR-009, FR-010, con las tres filas, también la del cambio
    de hora), enunciado exacto (FR-016), formato del token y transiciones de intentos
    (FR-006a).
  - **Integración** (BD real):
    - acceso válido, no válido y regenerado, y aislamiento entre fichas (FR-006);
    - pausa, bloqueo y puesta a cero, con ráfagas de 20 intentos simultáneos (cuenta exacta);
    - cancelación a 25 h y 23 h y en la frontera de 09:59:59 y 10:00:00 (`fijarAhora`);
    - 100 ráfagas paciente + paciente y paciente + recepción (SC-003: exactamente 1 cambio);
    - cancelación + alta simultánea en el mismo hueco (0 solapes);
    - semilla con 40 enlaces deterministas y el resto sin cambios (FR-019).
  - **E2E** (portátil y móvil 360 px, axe): US1 #1–#7, US2 #1–#3 y #6, US3 #1–#5 y
    SC-006 cronometrado.
- **Razón**: la 005 escribe en la agenda (Principio III): las pruebas de concurrencia contra
  PostgreSQL real son obligatorias.

## Asuntos sin resolver

Ninguno. No queda ningún «NEEDS CLARIFICATION». Solo queda el prerrequisito R0, que no es una
incógnita sino trabajo de la 001.
