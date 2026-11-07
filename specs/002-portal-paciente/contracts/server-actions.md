# Contrato: acciones del servidor del portal y ampliaciones del panel

Mismas convenciones que el [contrato de la 001](../../001-agenda-core/contracts/server-actions.md):
entradas validadas con Zod, respuesta `Resultado<T>` y mensajes en español de España, sin
jerga, que dicen qué ha pasado y qué hacer. En los mensajes, «Clínica Eleva» y «911 234 567»
son el nombre y el teléfono de la clínica de la instalación (teléfono: 001 FR-022).

**Revisión cruzada S2–S4 (2026-11-07)**: el comportamiento del acceso es de la 005
(FR-001–FR-008) y el origen de la cancelación, de la 001 (FR-018a). Este contrato conserva los
textos que el portal muestra al paciente (guía de textos de la 002) y marca con **[005]** lo
que depende del acceso de la 005 y con **[005 FR-006]** lo que solo existirá si la 005
mantiene la confirmación de 4 cifras (clarificación pendiente).

## Códigos de error nuevos

| codigo | Cuándo | Mensaje |
|--------|--------|---------|
| `ENLACE_NO_VALIDO` [005] | enlace no válido: inexistente, mal copiado o regenerado (005 FR-007, misma respuesta para todos) | «Este enlace ya no es válido. Pide uno nuevo a Clínica Eleva en el 911 234 567.» |
| `CIFRAS_INCORRECTAS` [005 FR-006] | las 4 cifras no coinciden | «Las cifras no coinciden. Revísalas e inténtalo de nuevo.» |
| `ENLACE_BLOQUEADO_TEMPORAL` [005 FR-006] | 5 fallos seguidos (o bloqueo en curso) | «Has superado los intentos. Vuelve a probar a las 12:25.» `detalle`: `{ hasta: 'HH:mm' }` |
| `ENLACE_BLOQUEADO` [005 FR-006] | 10 fallos acumulados | «Por seguridad, este enlace se ha bloqueado. Llama a Clínica Eleva al 911 234 567.» |
| `SESION_PORTAL_CADUCADA` [005 FR-006] | sin sesión, caducada (30 min) o de un enlace ya regenerado | Si el enlace sigue vigente: «Por seguridad, vuelve a escribir las 4 últimas cifras de tu teléfono.»; si no, el de `ENLACE_NO_VALIDO` |
| `FUERA_DE_PLAZO` | `ahora ≥ inicio − 24 h` al confirmar | «Ya no se puede cancelar desde aquí. Llama a Clínica Eleva al 911 234 567.» |
| `CITA_NO_ENCONTRADA` | la cita no existe o no es del paciente del enlace | «No encontramos esa cita entre las tuyas.» (no revela si existe) |

Se reutilizan de la 001: `ESTADO_CAMBIADO` («Esta cita ya figura como cancelada. Hemos
actualizado tu lista.») y, solo si existe la confirmación [005 FR-006], `DATOS_NO_VALIDOS`
(«Escribe las 4 últimas cifras de tu teléfono.»).

## Acciones del portal (público, ruta `/p/[token]`)

El `pacienteId` y el `clinicaId` salen **siempre** del enlace vigente (y de la sesión, si la
005 la exige), nunca del cliente (005 FR-006).

### `entrarPortal({ token, cifras }) → Resultado<void>` — [005 FR-006]
Solo existe si la 005 mantiene la confirmación de 4 cifras; su verificación y su límite de
intentos los definirá la 005 (propuesta en
[spec.md](../spec.md#dependencias-y-enmiendas-requeridas)). Errores previstos:
`DATOS_NO_VALIDOS`, `ENLACE_NO_VALIDO`, `CIFRAS_INCORRECTAS`, `ENLACE_BLOQUEADO_TEMPORAL`,
`ENLACE_BLOQUEADO`.

### `salirPortal() → Resultado<void>` — [005 FR-006]
Solo existe si hay sesión: la cierra.

### `cancelarCitaPaciente({ citaId }) → Resultado<CitaPortal>`
FR-011–FR-014. Se autoriza con el enlace vigente de la ruta (y la sesión, si la 005 la
exige) [005]. Sentencia condicional de research P5; escribe `cancelada_por = 'paciente'`
(001 FR-018a). Errores: `ENLACE_NO_VALIDO` [005] (o `SESION_PORTAL_CADUCADA` si hay sesión
[005 FR-006]), `CITA_NO_ENCONTRADA`, `ESTADO_CAMBIADO` (`detalle`: estado actual),
`FUERA_DE_PLAZO`. Con éxito: «Tu cita del lunes, 16/11/2026 a las 10:00 está cancelada.».

## Lectura del portal (Server Component)

### `obtenerPortal(acceso) → Portal`
`acceso`: la ficha y clínica del enlace vigente, resueltas según la 005.
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
Solo contiene citas del paciente del enlace. Nunca incluye importes, teléfono del
paciente, ni datos de otros pacientes o de la agenda.

## Ampliaciones del panel de recepción (sesión de recepción)

### `obtenerEnlacePortal({ pacienteId }) → Resultado<{ url: string }>` — [005]
Comportamiento: 005 FR-005 (enlace vigente de la ficha, `/p/[token]`). La 002 solo lo invoca
desde «Copiar enlace del portal» (FR-002b). Errores: `SESION_CADUCADA`.

### `regenerarEnlacePortal({ pacienteId }) → Resultado<{ url: string }>` — [005]
Comportamiento: 005 FR-004 (el anterior deja de valer al instante). La 002 solo lo invoca desde
«Generar nuevo enlace del portal», con confirmación en la interfaz (FR-002a). Errores:
`SESION_CADUCADA`.

### Cambios en lecturas de la 001
- `CitaVista` añade `canceladaPor: 'recepcion' | 'paciente' | null` (valores de 001
  FR-018a) y, si es `paciente`, `canceladaEn: string` («09/11/2026 12:10»). La agenda muestra
  «Cancelada por el paciente» (US3 #1).
- Que `cambiarEstadoCita` (001) registre `cancelada_por = 'recepcion'` al cancelar es parte de
  001 FR-018a: lo implementa la 001, no la 002.
- Nueva lectura `obtenerHuecosLiberados() → HuecoLiberado[]` (FR-015a):
  `{ profesional: string; etiquetaFecha: string; inicio: 'HH:mm'; fin: 'HH:mm';
  canceladaEn: string; enlaceAgenda: string }`.
