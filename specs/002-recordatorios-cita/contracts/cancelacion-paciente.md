# Contrato: cancelación desde el recordatorio

Página pública y acción de servidor para que el paciente cancele (US2, FR-011–FR-016). Diseño
en [research.md](../research.md) R5–R7. Textos en español de España, trato de usted.

## Ruta `GET /cancelar/[token]`

Pública (sin sesión; fuera del `matcher` de `proxy.ts`). **Solo lee**: abrirla nunca cancela.
Cabeceras: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`.

El servidor calcula `sha256(token)`, busca el recordatorio y su cita, y muestra uno de estos
estados:

| Estado de la página | Condición | Contenido |
|---------------------|-----------|-----------|
| `CANCELABLE` | cita `reservada` y `ahora < inicio` | Datos de la cita (clínica, día, hora, profesional, servicio) y botón «Cancelar mi cita» |
| `YA_CANCELADA` | cita `cancelada` | «Esta cita ya está cancelada.» + datos |
| `FINALIZADA` | cita `completada` o `no_asistida` | «Esta cita ya ha tenido lugar.» + datos, sin acciones |
| `FUERA_DE_PLAZO` | cita `reservada` y `ahora ≥ inicio` | «Ya no es posible cancelar esta cita desde aquí. Por favor, llame a Clínica Eleva.» |
| `ENLACE_NO_VALIDO` | token con formato incorrecto o hash inexistente | «Este enlace no es válido.» — sin ningún dato, misma respuesta en todos los casos |

Los datos mostrados son solo los del correo; nunca el teléfono ni el correo del paciente.

## Acción `cancelarDesdeRecordatorio({ token: string }) → Resultado<CitaPaciente>`

Mismo tipo `Resultado` y mismo estilo de mensajes que la 001
([server-actions](../../001-agenda-core/contracts/server-actions.md)). No exige sesión; el token
es la credencial y solo da acceso a su cita.

```ts
CitaPaciente = {
  clinica: string;                 // «Clínica Eleva»
  etiquetaFecha: string;           // «lunes, 16/11/2026»
  inicio: 'HH:mm'; fin: 'HH:mm';
  profesional: string; servicio: string;
  estado: 'reservada' | 'cancelada' | 'completada' | 'no_asistida';
}
```

Efecto si prospera: la cita pasa a `cancelada` con `cancelada_desde_recordatorio = true`
(actualización condicional, [data-model](../data-model.md)) y la página muestra:
«Su cita del lunes, 16/11/2026 a las 10:00 ha quedado cancelada. Gracias por avisar.»

| codigo | Cuándo | Mensaje |
|--------|--------|---------|
| `ENLACE_NO_VALIDO` | token desconocido | «Este enlace no es válido.» |
| `CANCELACION_TARDIA` | `ahora ≥ inicio` al confirmar | «Ya no es posible cancelar esta cita desde aquí. Por favor, llame a Clínica Eleva.» |
| `ESTADO_CAMBIADO` | la cita ya no está `reservada` (otro dispositivo o recepción) | «Esta cita ya figura como cancelada.» (o «…ya ha tenido lugar.») `detalle`: estado actual |

`CANCELACION_TARDIA` y `ESTADO_CAMBIADO` reutilizan los códigos de la 001 con mensajes propios
para el paciente.

## Garantías

- De varias cancelaciones o cambios de estado simultáneos sobre la misma cita, exactamente
  uno prospera (FR-015).
- Cancelar nunca crea ni mueve citas: no puede producir solapes; el hueco liberado se
  reserva con las garantías de la 001 (Principio III).
- La agenda de recepción muestra la cita como «Cancelada» y el hueco libre en la siguiente
  carga (SC-003); no se cambia la interfaz de la 001.
