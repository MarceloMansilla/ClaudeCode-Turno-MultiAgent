# Contrato: acciones del servidor de la 005 (Server Actions)

Mismo formato de respuesta que la 001 ([contrato de la 001](../../001-agenda-core/contracts/server-actions.md)):

```ts
type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: CodigoError; mensaje: string; detalle?: unknown; campo?: string };
```

Entradas validadas con Zod. Mensajes en español de España, sin jerga técnica. Al paciente se
le trata de «usted» (revisión cruzada S10); el **contenido** de cada mensaje lo fija esta
spec. Los ejemplos usan Clínica Eleva, «911 234 567».

## Acciones del paciente (`src/acciones/paciente.ts`)

No usan la sesión del panel. El `pacienteId` y el `clinicaId` salen **siempre** del token de
la URL y de la cookie de acceso, nunca del cliente (FR-006). Toda acción comprueba primero el
token: si no es vigente responde `ENLACE_NO_VALIDO`, aunque la cookie sea válida (US3 #4).

### `confirmarCifras({ token, cifras })`

Segundo paso del acceso (FR-006, FR-006a, R4).

| Entrada | Regla |
|---------|-------|
| token | 43 caracteres base64url |
| cifras | exactamente 4 dígitos; otro valor → `DATOS_NO_VALIDOS`, **no cuenta** como fallo |

- **Éxito**: abre el acceso (cookie `citaclara_paciente`, 30 min) y pone la cuenta de fallos a
  cero. `datos: { }` (el cliente refresca la página).
- **Fallos**: `ENLACE_NO_VALIDO`, `ENLACE_BLOQUEADO`, `ACCESO_EN_PAUSA`, `CIFRAS_INCORRECTAS` y
  `DATOS_NO_VALIDOS`. El fallo que llega al 5.º seguido devuelve ya `ACCESO_EN_PAUSA`, y el que
  llega al 10.º, `ENLACE_BLOQUEADO`.

### `cancelarMiCita({ token, citaId })`

Cancelación por el paciente (FR-009 a FR-014). La confirmación previa (FR-012) es un paso de
interfaz: esta acción solo se llama desde el botón «Sí, cancelar mi cita» del diálogo.

- **Orden de comprobación**: token vigente → acceso abierto con la huella de ese token →
  `cancelarCita` con `origen = 'paciente'` (R7), que comprueba el plazo con `ahora()` al
  procesar.
- **Éxito**: `datos: { citaId, fecha: 'lunes, 16/11/2026', hora: '10:00' }`. El mensaje es
  «Su cita del lunes, 16/11/2026 a las 10:00 está cancelada.».
- **Fallos**: `ENLACE_NO_VALIDO`, `ACCESO_CADUCADO`, `NO_ENCONTRADO`, `ESTADO_CAMBIADO` y
  `FUERA_DE_PLAZO`.

### `salir({ token })`

Opcional en la interfaz («Salir»): borra la cookie de acceso. Siempre `ok`.

## Acciones del panel (`src/acciones/enlaces.ts`)

Exigen la sesión del panel; el `clinicaId` sale de la sesión (001 FR-004). La ficha tiene que
ser de esa clínica, o se responde `NO_ENCONTRADO`.

### `obtenerEnlacePaciente({ pacienteId })`

FR-005. `datos: { ruta: '/p/<token>', generadoEn: 'lunes, 09/11/2026 08:00' }`. El cliente
forma la URL completa con `window.location.origin` y la copia al portapapeles. Si el
navegador no lo permite, la muestra seleccionada en un campo de texto.

### `regenerarEnlacePaciente({ pacienteId })`

FR-004. Solo se llama tras el diálogo de confirmación. Sustituye el token, pone los contadores
a cero y devuelve lo mismo que `obtenerEnlacePaciente` con el enlace nuevo. Ninguna cita
cambia.

## Códigos nuevos (se añaden a `CodigoError` en `src/dominio/errores.ts`)

| codigo | Cuándo | Mensaje |
|--------|--------|---------|
| `ENLACE_NO_VALIDO` | token con formato incorrecto, inexistente o regenerado (FR-007). Misma respuesta en los tres casos | «Este enlace no es válido. Pida uno nuevo a Clínica Eleva en el 911 234 567.» |
| `CIFRAS_INCORRECTAS` | 4 cifras que no coinciden (fallos 1–4 y 6–9) | «Esas cifras no coinciden con el teléfono de su ficha. Revíselas e inténtelo de nuevo.» |
| `ACCESO_EN_PAUSA` | 5.º fallo seguido o intento durante la pausa (FR-006a). `detalle: { hasta: 'HH:mm' }` | «Ha hecho demasiados intentos. Podrá volver a intentarlo a las 10:15.» |
| `ENLACE_BLOQUEADO` | 10 fallos seguidos (FR-006a) | «Este enlace se ha bloqueado por seguridad. Pida uno nuevo a Clínica Eleva en el 911 234 567.» |
| `ACCESO_CADUCADO` | sin acceso abierto, o caducado tras 30 min sin actividad (FR-006b) | «Por seguridad, vuelva a escribir las 4 últimas cifras de su teléfono.» |
| `FUERA_DE_PLAZO` | cita reservada con `ahora ≥ inicio − 24 h` (FR-009, FR-011) | «Ya no puede cancelar esta cita desde su enlace.» seguido del enunciado de FR-016: «Puede cancelar esta cita desde su enlace antes del domingo, 15/11/2026 a las 10:00. Después, llame a Clínica Eleva al 911 234 567.» `detalle: { enunciado }` |

Reutilizados de la 001:

- `NO_ENCONTRADO`: la cita no existe o no es de este paciente; nunca se dice cuál de los dos.
  Mensaje: «No encontramos esa cita. Actualice la página.»
- `ESTADO_CAMBIADO`: la cita ya no está reservada (001 FR-020). Mensaje: «Esta cita ya figura
  como cancelada.» `detalle`: estado actual.
- `DATOS_NO_VALIDOS`: entrada mal formada. Mensaje: «Escriba las 4 últimas cifras de su
  teléfono.»

## Funciones de dominio que otras specs reutilizan

| Función | Fichero | Quién la usa |
|---------|---------|--------------|
| `limiteCancelacionPaciente(inicio)`, `pacientePuedeCancelar(cita, ahora)`, `PLAZO_CANCELACION_PACIENTE_MS` | `src/dominio/plazo-paciente.ts` | 005, 002 |
| `enunciadoPoliticaCancelacion({ inicio, zonaHoraria, clinicaNombre, clinicaTelefono })` | `src/dominio/politica-cancelacion.ts` | 005, 002, 003 (FR-017: único texto de la política) |
| `rutaEnlacePaciente(token)` → `'/p/<token>'` | `src/dominio/enlace.ts` | 005, 003 (FR-008: único enlace de paciente) |
