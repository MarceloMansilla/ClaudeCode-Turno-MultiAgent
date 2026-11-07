# Contrato: correo de recordatorio

Contenido exacto del recordatorio (FR-007, FR-008, FR-019, FR-020) y forma del fichero del
modo simulado (FR-009). Ejemplo con la cita de los escenarios de la spec.

## Cabeceras

| Cabecera | Valor |
|----------|-------|
| From | `"Clínica Eleva" <CORREO_REMITENTE>` |
| To | correo de la ficha del paciente |
| Subject | `Recordatorio de su cita en Clínica Eleva: lunes, 16/11/2026, 10:00` |
| Message-ID | `<recordatorio-<citaId>@<dominio de URL_PUBLICA>>` |
| Date | «ahora» de la ejecución |
| Content-Type | `multipart/alternative` (texto plano + HTML), UTF-8 |

Formato del asunto: `Recordatorio de su cita en <clínica>: <día de la semana>, <dd/mm/aaaa>,
<HH:mm>`, con la hora de inicio local de la clínica.

## Cuerpo (texto plano; el HTML lleva lo mismo)

```text
Hola, Ana:

Le recordamos su cita en Clínica Eleva:

  Día:         lunes, 16/11/2026
  Hora:        10:00–10:45
  Profesional: María
  Servicio:    Sesión de fisioterapia

Si no puede venir, cancele la cita para que otra persona pueda aprovechar el hueco:
<URL_PUBLICA>/p/<token>

<enunciado de la política de cancelación de esta cita — 005, FR-016>

Clínica Eleva
```

### Enunciado de la política (FR-020)

Se deriva de **005, FR-016** y contiene sus tres elementos y ningún otro plazo: la regla, el
límite concreto de esa cita («antes del [día de la semana], [dd/mm/aaaa] a las [hh:mm]», con
el vencimiento de 005 FR-009) y la alternativa de llamar a la clínica con su nombre y
teléfono. Esta spec no redacta el plazo ni lo calcula: toma el límite de la 005. Solo adapta el
trato al del correo (usted, FR-008). Ejemplo de referencia derivado de 005 FR-016 para la cita
de Ana:

```text
Puede cancelar esta cita desde su enlace antes del domingo, 15/11/2026 a las 10:00.
Después, llame a Clínica Eleva al <teléfono de la clínica>.
```

El teléfono procede de la 001 (pendiente de S9). Si la 005 cambia el enunciado o el plazo, este
ejemplo cambia con ella; el texto final y el trato los revisa la guía de textos de la 002 (S10).

Reglas:

- Saludo con el **nombre de pila** de la ficha (primera palabra del nombre).
- El único enlace a CitaClara es el enlace personal vigente del paciente (`/p/<token>`, 005
  FR-001 y FR-008). No hay enlaces por cita.
- No incluye precio, teléfono del paciente ni ningún otro dato de la ficha.
- En HTML, el enlace es un botón «Ver o cancelar mi cita» (texto ≥ 16 px, contraste AA, área
  táctil ≥ 44 px) y debajo la URL en texto por si el botón no se muestra. El texto del botón
  es provisional hasta la guía de textos de la 002 (S10).
- Una columna, ancho máximo 600 px, sin imágenes ni recursos externos; legible desde 360 px
  (SC-006).

## Fichero del modo simulado

- Carpeta: `SALIDA_CORREO_DIR` (por defecto `datos/salida-correo/`), creada si no existe.
- Nombre: `AAAA-MM-DD_HHmm_<citaId>.eml` con la fecha y hora local de la cita, p. ej.
  `2026-11-16_1000_3f2a….eml`.
- Contenido: el mensaje MIME completo, tal como se enviaría por SMTP; se abre con cualquier
  cliente de correo.
- Un reintento tras un fallo sobrescribe el fichero de esa cita (solo puede existir uno por
  cita).
