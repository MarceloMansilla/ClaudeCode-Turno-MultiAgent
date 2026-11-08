# Contrato: lectura del portal y ampliaciones del panel

Mismas convenciones que el [contrato de la 001](../../001-agenda-core/contracts/server-actions.md):
entradas validadas con Zod, respuesta `Resultado<T>` y mensajes en español de España, sin
jerga, que dicen qué ha pasado y qué hacer (guía FR-018).

**Qué no está en este contrato** (es de la 005 y la 002 lo usa tal cual): las acciones de
acceso (confirmar cifras, salir), sus códigos de error y mensajes (enlace no válido, cifras
incorrectas, pausa, bloqueo, acceso caducado), la acción de cancelación del paciente y su
rechazo fuera de plazo, y las acciones de recepción para copiar o generar el enlace. Ningún
mensaje de este contrato menciona el plazo de cancelación (spec FR-018a).

## Códigos de error

| codigo | Cuándo | Mensaje |
|--------|--------|---------|
| `CITA_NO_ENCONTRADA` | la cita no existe o no es del paciente del acceso (solo si la 005 no lo cubre ya) | «No encontramos esa cita entre las tuyas.» (no revela si existe) |

## Lectura del portal (Server Component)

Ampliación de la lectura de la 005 (`src/servicios/portal-paciente.ts`) para el caso «acceso
abierto». La ficha y la clínica las resuelve la 005; nunca vienen del cliente.

```ts
Portal = {
  clinica: { nombre: string; telefono: string };       // FR-009 (teléfono: 001 FR-022)
  proximas: CitaPortal[];                               // FR-007, orden ascendente
  historial: CitaPortal[];                              // FR-008, orden descendente
}
CitaPortal = {
  id: string;
  fecha: string;                  // «lunes, 16/11/2026»
  inicio: 'HH:mm'; fin: 'HH:mm';
  servicio: string;               // sin precio (FR-010)
  profesional: string;
  etiqueta?: 'Realizada' | 'Cancelada' | 'No asistida' | 'Pasada';   // solo historial
  puedeCancelar: boolean;         // solo próximas: pacientePuedeCancelar(...) de la 005
  enunciado?: string;             // solo próximas: enunciadoPoliticaCancelacion(...) de la 005
}
```

`puedeCancelar` y `enunciado` se calculan **solo** con las funciones de la 005; la 002 no
añade ningún campo con el límite formateado. Solo contiene citas del paciente del acceso;
nunca importes, teléfono del paciente ni datos de otros pacientes o de la agenda.

## Tras cancelar (presentación propia)

La acción es la de la 005. Con éxito, el portal muestra «Tu cita del lunes, 16/11/2026 a las
10:00 está cancelada.» y la cita pasa al Historial. Ante cualquier rechazo, muestra el mensaje
que devuelve la 005 y refresca la lista (spec FR-014).

## Ampliaciones del panel de recepción (sesión de recepción)

- La vista de cita de la agenda expone `canceladaPor: 'recepcion' | 'paciente' | null`
  (001 FR-018a) y, si es `paciente`, `canceladaEn: string` («09/11/2026 12:10»). La agenda
  muestra «Cancelada por el paciente» (US3 #1). Si la 001 enmendada ya lo expone, se usa.
- Nueva lectura `obtenerHuecosLiberados(clinicaId) → HuecoLiberado[]` (FR-015a):
  `{ profesional: string; fecha: string; inicio: 'HH:mm'; fin: 'HH:mm'; canceladaEn: string;
  enlaceAgenda: string }`.
