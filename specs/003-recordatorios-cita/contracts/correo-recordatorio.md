# Contrato: correo de recordatorio

Contenido exacto del recordatorio (FR-007, FR-008, FR-019, FR-020) y forma del fichero del
modo simulado (FR-009). Ejemplo con la cita de los escenarios de la spec. Ningún texto de
este contrato menciona el plazo de cancelación salvo el enunciado que da la 005 (FR-022).

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

### Enunciado de la política (FR-020, FR-022)

El bloque `<enunciado … — 005, FR-016>` es **exactamente** el texto que devuelve
`enunciadoPoliticaCancelacion` (`src/dominio/politica-cancelacion.ts`, de la 005) para esa
cita, con el límite de `limiteCancelacionPaciente` (`src/dominio/plazo-paciente.ts`) y el
nombre y el teléfono de la clínica (001 FR-022). La 003 no lo redacta, no lo adapta (tampoco
el trato) y no calcula el límite. Este contrato no reproduce el texto: el ejemplo de
referencia es el de 005 FR-016, y si la 005 lo cambia, el correo cambia con ella sin tocar
la 003.

Trato: el correo va de usted (FR-008) y el ejemplo de 005 FR-016 va de tú. Está pedido a la
005 y a la 002 (spec, «Dependencias») que el enunciado salga en el trato que fije la guía de
textos de la 002; hasta entonces se incluye tal cual.

El resto del correo no dice hasta cuándo se puede cancelar: la frase «Si no puede venir,
cancele la cita…» invita a cancelar sin dar ningún plazo.
`tests/unit/coherencia-politica.test.ts` (de la 005) DEBE cubrir el asunto, el texto, el HTML
y el texto del botón.

Reglas:

- Saludo con el **nombre de pila** de la ficha (primera palabra del nombre).
- El único enlace a CitaClara es el enlace personal vigente del paciente, construido con
  `rutaEnlacePaciente` (`src/dominio/enlace.ts`, de la 005; 005 FR-001 y FR-008). No hay
  enlaces por cita ni tokens propios. Al abrirlo, el portal pide las 4 últimas cifras del
  teléfono (005 FR-006).
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
