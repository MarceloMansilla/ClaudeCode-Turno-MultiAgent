# Contrato: rutas y pantallas del panel de recepción

| Ruta | Acceso | Contenido |
|------|--------|-----------|
| `/entrar` | público | Formulario de clave de clínica (FR-001, FR-002). Con sesión válida, redirige a `/agenda`. |
| `/agenda` | sesión | Redirige a `/agenda/{primerProfesional}/{hoy}` (US1 #3). |
| `/agenda/[profesionalId]/[fecha]` | sesión | Agenda del día (FR-005–FR-008). `fecha` = `AAAA-MM-DD` local. |
| `/agenda/[profesionalId]/[fecha]/nueva?hora=HH:mm` | sesión | Alta de cita (panel lateral en portátil, pantalla completa en móvil) con datos prerrellenados (FR-008). |

Sin sesión, cualquier ruta del panel redirige a `/entrar` con el aviso de `SESION_CADUCADA`.
Fecha o profesional inexistentes → «No encontramos esa agenda» con enlace a hoy.

## Agenda del día: elementos obligatorios

- **Cabecera**: nombre de la clínica, botón «Cerrar sesión» y navegación del panel
  («Agenda» / «Analítica», con la sección actual marcada), añadida por la spec 004 (FR-002).
- **Selector de profesional**: pestañas en portátil, desplegable en móvil; muestra nombre y
  especialidad.
- **Navegación de día**: «‹ Anterior», «Hoy», «Siguiente ›» y selector de fecha; etiqueta
  «lunes, 16/11/2026».
- **Línea de tiempo 09:00–20:00**: citas como bloques con hora, paciente, servicio y estado
  (color + icono + texto, nunca solo color); huecos libres como bloques con borde discontinuo
  y botón «Reservar» si son futuros. Canceladas y no asistidas se muestran atenuadas sin
  ocupar el hueco. Línea de «ahora» si es hoy.
- **Día no laborable**: mensaje «La clínica no abre este día.» sin huecos.
- **Acciones de cita**: solo las de `accionesDisponibles`. «Cancelar cita» abre diálogo de
  confirmación «¿Cancelar la cita de Ana Pérez (10:00–10:45)?».

## Alta de cita: elementos obligatorios

- Servicio (solo los de la especialidad del profesional, con duración y precio: «Sesión de
  fisioterapia · 45 min · 40,00 €»).
- Fecha y hora (pasos de 15 min dentro del horario); muestra el fin calculado («Termina a las
  10:45»).
- Paciente: buscador por nombre o teléfono; opción «Paciente nuevo» con nombre, teléfono y
  correo (opcional). Ante `TELEFONO_DUPLICADO`, botón «Usar esta ficha».
- Botón «Reservar cita». Errores junto al campo afectado o en un aviso destacado, con el
  mensaje del contrato de acciones.

## Calidad (Principio VII, SC-002–SC-006)

- Sin desplazamiento horizontal desde 360 px; objetivos táctiles ≥ 44×44 px; texto base 16 px.
- Contraste WCAG 2.2 AA; navegable con teclado; foco visible; etiquetas en todos los campos.
- Estados vacío y de carga con textos en español («Cargando la agenda…»).
