# Contrato: pantallas del portal y del panel

La ruta `/p/[token]`, las pantallas de acceso (enlace no válido, cifras, pausa, bloqueo) y el
menú «Enlace del paciente» del panel son de la 005 (FR-001–FR-008) y se usan tal cual. Este
contrato fija lo que la 002 pinta **con el acceso abierto** y lo que añade al panel.

## Portal (acceso abierto, 005 FR-006)

- **Marco**: el de la 005 (nombre de la clínica y teléfono como enlace `tel:`, FR-009) y su
  botón «Salir».
- **Pestañas** «Próximas citas» (por defecto) e «Historial».
- **Tarjeta de cita próxima**: fecha («lunes, 16/11/2026»), hora («10:00–10:45»), servicio y
  profesional. Si `puedeCancelar`: botón «Cancelar cita». **Siempre**, debajo, el enunciado de
  005 FR-016 con el componente `PoliticaCancelacion` de la 005 (teléfono como `tel:`). La
  tarjeta no lleva ningún otro texto sobre el plazo.
- **Diálogo de confirmación** (005 FR-012): «¿Cancelar su cita?» con fecha, hora, servicio y
  profesional; botones «Sí, cancelar» y «No, mantenerla» (el foco empieza en «No,
  mantenerla»).
- **Tras cancelar**: aviso «Su cita del lunes, 16/11/2026 a las 10:00 está cancelada.» y la
  cita pasa al Historial como «Cancelada por usted».
- **Historial**: tarjetas con fecha, hora, servicio, profesional y etiqueta de estado (texto
  + icono, nunca solo color): «Realizada», «Cancelada por usted», «Cancelada por la clínica»,
  «No asistida» o «Pasada»; orden por inicio de la cita, de la más reciente a la más antigua.
- **Vacíos**: «No tiene próximas citas. Para pedir una, llame a Clínica Eleva al
  911 234 567.»; «Todavía no tiene citas anteriores.».

## Panel de recepción (ampliaciones de la 001)

- **Cabecera**: botón «Huecos liberados por pacientes (N)», visible solo si N > 0; abre un
  panel lateral (pantalla completa en móvil) con la lista «María · lunes, 16/11/2026 ·
  10:00–10:45 · cancelada el 09/11/2026 a las 12:10», cada una enlazada a la agenda de ese
  profesional y día.
- **Bloque de cita con `cancelada_por = 'paciente'`** (001 FR-018a): etiqueta «Cancelada por
  el paciente» y «el 09/11/2026 a las 12:10».
- **Enlace del paciente**: el menú de la 005, sin cambios.

## Calidad (Principio VII, FR-017, FR-018, SC-006)

- Portal diseñado primero para móvil: sin desplazamiento horizontal desde 360 px, objetivos
  táctiles ≥ 44×44 px, texto base 16 px, botón principal al alcance del pulgar.
- Contraste WCAG 2.2 AA; navegable con teclado; foco visible; trato de «usted» (revisión cruzada S10).
- Mismo sistema visual que el panel (shadcn/ui, tokens de tema, modo claro/oscuro).
