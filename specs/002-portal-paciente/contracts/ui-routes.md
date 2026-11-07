# Contrato: rutas y pantallas del portal y del panel

**Revisión cruzada S4 (2026-11-07)**: la forma del enlace (`/p/[token]`), su validez y qué se
muestra sin acceso los define la 005 (FR-001–FR-008). Este contrato fija las pantallas y los
textos del portal. Lo marcado **[005 FR-006]** solo existe si la 005 mantiene la confirmación
de 4 cifras (clarificación pendiente).

## Portal del paciente

| Ruta | Acceso | Contenido |
|------|--------|-----------|
| `/p/[token]` | público (enlace personal, 005 FR-001) | Enlace vigente: portal (próximas e historial), precedido de la pantalla de cifras si no hay sesión válida [005 FR-006]. Enlace no válido: mensaje de `ENLACE_NO_VALIDO` (005 FR-007). |

La ruta no muestra ningún dato de citas ni de pacientes (ni el nombre) sin acceso válido
(005 FR-006, FR-007). `/p/*` queda fuera de la protección de `/agenda/*`; si la 005 exige
sesión, `proxy.ts` la renueva en cada petición a `/p/*` [005 FR-006].

### Pantalla de cifras — [005 FR-006]

Propuesta, solo si la 005 mantiene la confirmación:

- Cabecera con el nombre de la clínica.
- Texto: «Para ver tus citas, escribe las 4 últimas cifras de tu teléfono.»
- Campo de 4 dígitos con teclado numérico en móvil (`inputmode="numeric"`,
  `autocomplete="off"`), botón «Ver mis citas».
- Errores del contrato junto al campo. Bloqueado: el campo se desactiva y se muestra el
  mensaje con la hora o con el teléfono de la clínica.

### Portal

- **Cabecera**: nombre de la clínica, teléfono como enlace `tel:` («Llamar a la clínica») y,
  si hay sesión [005 FR-006], botón «Salir».
- **Pestañas** «Próximas citas» (por defecto) e «Historial».
- **Tarjeta de cita próxima**: fecha («lunes, 16/11/2026»), hora («10:00–10:45»), servicio y
  profesional. Si es cancelable: «Puedes cancelarla hasta el domingo, 15/11/2026 a las
  10:00» y botón «Cancelar cita». Si no: «Ya no se puede cancelar desde aquí. Llama a
  Clínica Eleva al 911 234 567.» con enlace `tel:`.
- **Diálogo de confirmación**: «¿Cancelar tu cita?» con fecha, hora, servicio y profesional;
  botones «Sí, cancelar cita» y «No, mantenerla» (el foco empieza en «No, mantenerla»).
- **Tras cancelar**: aviso «Tu cita del lunes, 16/11/2026 a las 10:00 está cancelada.» y la
  cita pasa al Historial.
- **Historial**: tarjetas con fecha, hora, servicio, profesional y etiqueta de estado (texto
  + icono, nunca solo color).
- **Vacíos**: «No tienes próximas citas. Para pedir una, llama a Clínica Eleva al
  911 234 567.»; «Todavía no tienes citas anteriores.».

## Panel de recepción (ampliaciones de la 001)

- **Cabecera**: botón «Huecos liberados por pacientes (N)», visible solo si N > 0; abre un
  panel lateral (pantalla completa en móvil) con la lista «María · lunes, 16/11/2026 ·
  10:00–10:45 · cancelada el 09/11/2026 a las 12:10», cada una enlazada a la agenda de ese
  profesional y día.
- **Bloque de cita cancelada por el paciente** (`cancelada_por = 'paciente'`, 001 FR-018a):
  etiqueta «Cancelada por el paciente» y «el 09/11/2026 a las 12:10».
- **Acciones de cualquier cita** (en todos los estados; comportamiento de 005 FR-004 y
  FR-005): «Copiar enlace del portal» (aviso «Enlace copiado. Envíaselo al paciente por
  WhatsApp o correo.»; si no se puede copiar, se muestra el enlace seleccionable) y «Generar
  nuevo enlace del portal» (diálogo: «Se creará un enlace nuevo para [nombre del paciente] y
  el anterior dejará de funcionar. ¿Continuar?»; después, muestra el enlace nuevo con
  «Copiar»).

## Calidad (Principio VII, FR-017, FR-018, SC-006)

- Portal diseñado primero para móvil: sin desplazamiento horizontal desde 360 px, objetivos
  táctiles ≥ 44×44 px, texto base 16 px, botón principal al alcance del pulgar.
- Contraste WCAG 2.2 AA; navegable con teclado; foco visible; trato de «tú».
- Mismo sistema visual que el panel (shadcn/ui, tokens de tema, modo claro/oscuro).
