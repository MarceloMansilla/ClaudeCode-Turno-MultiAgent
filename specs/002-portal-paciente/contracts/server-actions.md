# Contrato: acciones del servidor del portal y ampliaciones del panel

Mismas convenciones que el [contrato de la 001](../../001-agenda-core/contracts/server-actions.md):
entradas validadas con Zod, respuesta `Resultado<T>` y mensajes en español de España, sin
jerga, que dicen qué ha pasado y qué hacer. En los mensajes, «Clínica Eleva» y «911 234 567»
son el nombre y el teléfono de la clínica de la instalación.

## Códigos de error nuevos

| codigo | Cuándo | Mensaje |
|--------|--------|---------|
| `ENLACE_NO_VALIDO` | token inexistente o sustituido | «Este enlace ya no es válido. Pide uno nuevo a Clínica Eleva en el 911 234 567.» |
| `CIFRAS_INCORRECTAS` | las 4 cifras no coinciden | «Las cifras no coinciden. Revísalas e inténtalo de nuevo.» |
| `ENLACE_BLOQUEADO_TEMPORAL` | 5 fallos seguidos (o bloqueo en curso) | «Has superado los intentos. Vuelve a probar a las 12:25.» `detalle`: `{ hasta: 'HH:mm' }` |
| `ENLACE_BLOQUEADO` | 10 fallos acumulados | «Por seguridad, este enlace se ha bloqueado. Llama a Clínica Eleva al 911 234 567.» |
| `SESION_PORTAL_CADUCADA` | sin sesión, caducada (30 min) o de otra `generacion` | Si el enlace sigue vigente: «Por seguridad, vuelve a escribir las 4 últimas cifras de tu teléfono.»; si no, el de `ENLACE_NO_VALIDO` |
| `FUERA_DE_PLAZO` | `ahora ≥ inicio − 24 h` al confirmar | «Ya no se puede cancelar desde aquí. Llama a Clínica Eleva al 911 234 567.» |
| `CITA_NO_ENCONTRADA` | la cita no existe o no es del paciente de la sesión | «No encontramos esa cita entre las tuyas.» (no revela si existe) |

Se reutilizan de la 001: `ESTADO_CAMBIADO` («Esta cita ya figura como cancelada. Hemos
actualizado tu lista.») y `DATOS_NO_VALIDOS` («Escribe las 4 últimas cifras de tu teléfono.»).

## Acciones del portal (público, ruta `/p/[token]`)

El `pacienteId` y el `clinicaId` salen **siempre** de la sesión del portal, nunca del
cliente (FR-004).

### `entrarPortal({ token, cifras }) → Resultado<void>`
`cifras`: exactamente 4 dígitos. Aplica las reglas de verificación de
[data-model.md](../data-model.md#reglas-de-verificación-de-las-4-cifras-fr-002-fr-005). Con
acierto crea la cookie `citaclara_portal` (30 min deslizantes). Errores: `DATOS_NO_VALIDOS`,
`ENLACE_NO_VALIDO`, `CIFRAS_INCORRECTAS`, `ENLACE_BLOQUEADO_TEMPORAL`, `ENLACE_BLOQUEADO`.

### `salirPortal() → Resultado<void>`
Borra la cookie (FR-006).

### `cancelarCitaPaciente({ citaId }) → Resultado<CitaPortal>`
FR-011–FR-014, FR-016. Sentencia condicional de research P5. Errores:
`SESION_PORTAL_CADUCADA`, `CITA_NO_ENCONTRADA`, `ESTADO_CAMBIADO` (`detalle`: estado
actual), `FUERA_DE_PLAZO`. Con éxito: «Tu cita del lunes, 16/11/2026 a las 10:00 está
cancelada.».

## Lectura del portal (Server Component)

### `obtenerPortal(sesion) → Portal`
```ts
Portal = {
  clinica: { nombre: string; telefono: string };       // FR-009
  proximas: CitaPortal[];                               // FR-007, orden ascendente
  historial: CitaPortal[];                              // FR-008, orden descendente
}
CitaPortal = {
  id: string;
  etiquetaFecha: string;          // «lunes, 16/11/2026»
  inicio: 'HH:mm'; fin: 'HH:mm';
  servicio: string;               // sin precio (FR-010)
  profesional: string;
  etiqueta?: 'Realizada' | 'Cancelada' | 'No asistida' | 'Pasada';   // solo historial
  cancelable: boolean;            // solo próximas
  plazo?: string;                 // «domingo, 15/11/2026 a las 10:00» (si cancelable)
}
```
Solo contiene citas del paciente de la sesión. Nunca incluye importes, teléfono del
paciente, ni datos de otros pacientes o de la agenda.

## Ampliaciones del panel de recepción (sesión de recepción)

### `obtenerEnlacePortal({ pacienteId }) → Resultado<{ url: string }>`
FR-002b. Crea el acceso si no existe (`ON CONFLICT DO NOTHING`) y devuelve
`{CITACLARA_URL_PUBLICA}/p/{token}`. Errores: `SESION_CADUCADA`.

### `regenerarEnlacePortal({ pacienteId }) → Resultado<{ url: string }>`
FR-002a. Exige confirmación en la interfaz. Sustituye el token, sube `generacion` y pone a
cero contadores y bloqueos. Errores: `SESION_CADUCADA`.

### Cambios en lecturas de la 001
- `CitaVista` añade `canceladaPor: 'recepcion' | 'paciente' | null` y, si es `paciente`,
  `canceladaEn: string` («09/11/2026 12:10»). La agenda muestra «Cancelada por el paciente»
  (US3 #1).
- `cambiarEstadoCita` (001) registra `cancelada_por = 'recepcion'` al cancelar.
- Nueva lectura `obtenerHuecosLiberados() → HuecoLiberado[]` (FR-015a):
  `{ profesional: string; etiquetaFecha: string; inicio: 'HH:mm'; fin: 'HH:mm';
  canceladaEn: string; enlaceAgenda: string }`.
