# Contrato: rutas e interfaz de la 005

## Rutas

| Ruta | Acceso | Contenido |
|------|--------|-----------|
| `/p/[token]` | público (token + 4 cifras) | Pantallas de acceso y, con acceso abierto, «Sus próximas citas» (provisional hasta la 002, research R1) |
| `/agenda/…` (001) | sesión de panel | Añade el menú «Enlace del paciente» a cada bloque de cita |

`proxy.ts` (de la 001) amplía su `matcher` con `'/p/:path*'`. En `/p/*`:

- no exige la sesión del panel ni redirige a `/entrar`;
- renueva la cookie `citaclara_paciente` si es válida y su huella coincide con el token de la
  URL (research R5);
- añade `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow` y
  `Cache-Control: no-store` (research R10).

## `/p/[token]`: qué se muestra en cada estado

El estado lo decide el servidor en cada carga (data-model, «Estados del enlace»). En todas las
pantallas el `<title>` es «CitaClara · Clínica Eleva» y la cabecera solo muestra la marca de la
clínica. Nunca aparece el nombre del paciente antes de entrar.

| Estado | Pantalla | Elementos |
|--------|----------|-----------|
| No válido | «Enlace no válido» | Mensaje de `ENLACE_NO_VALIDO` y el teléfono como enlace `tel:` |
| Bloqueado | «Enlace bloqueado» | Mensaje de `ENLACE_BLOQUEADO` y el teléfono como enlace `tel:` |
| Vigente, sin acceso abierto | «Confirme que es usted» | Texto «Escriba las 4 últimas cifras de su teléfono». Campo de 4 cifras (`inputmode="numeric"`, `autocomplete="one-time-code"`, etiqueta visible) y botón «Entrar». Errores debajo del campo. Debajo del formulario, «¿Tiene algún problema? Llame a Clínica Eleva:» con el teléfono como enlace `tel:` (FR-006) |
| En pausa | la misma, deshabilitada | Mensaje de `ACCESO_EN_PAUSA` con la hora |
| Acceso abierto | «Sus próximas citas» | Lista de citas reservadas con `inicio ≥ ahora`, ordenadas por inicio. Por cita: «lunes, 16/11/2026 · 10:00», servicio y profesional. Si `pacientePuedeCancelar`: botón «Cancelar cita» y, debajo, el enunciado de FR-016. Si no: solo el enunciado (FR-011). Sin citas: «No tiene citas próximas.» y el teléfono de la clínica |

## Diálogo «Cancelar cita» (FR-012)

- Título: «¿Cancelar su cita?».
- Cuerpo: «Sesión de fisioterapia con María, el lunes, 16/11/2026 a las 10:00. El hueco
  quedará libre para otro paciente.».
- Botones: «No, mantener cita» (foco inicial) y «Sí, cancelar mi cita».
- Al confirmar llama a `cancelarMiCita`:
  - Éxito: aviso «Su cita del lunes, 16/11/2026 a las 10:00 está cancelada.» y la lista se
    actualiza; la cita deja de ofrecer «Cancelar».
  - `FUERA_DE_PLAZO` o `ESTADO_CAMBIADO`: aviso con el mensaje y la lista se actualiza, con el
    enunciado y el teléfono (US2 #3).
  - `ACCESO_CADUCADO`: vuelve a la pantalla de las 4 cifras; tras entrar, la cancelación hay
    que pedirla otra vez (edge case «Acceso caducado con la pantalla abierta»).
  - `ENLACE_NO_VALIDO`: pantalla «Enlace no válido» (US3 #4).

## Panel: menú «Enlace del paciente» (FR-004, FR-005)

En cada bloque de cita de la agenda (cualquier estado), un botón secundario «Enlace del
paciente» abre un menú con dos opciones:

- **«Copiar enlace»**: copia la URL completa y muestra el aviso «Enlace de Ana Pérez copiado».
  Si el portapapeles no está disponible, muestra la URL seleccionada en un campo de solo
  lectura con el texto «Cópialo y envíaselo al paciente».
- **«Generar enlace nuevo»**: abre un diálogo de confirmación.
  - Título: «¿Generar un enlace nuevo para Ana Pérez?».
  - Cuerpo: «El enlace actual dejará de funcionar ahora mismo, también si estaba bloqueado.
    Sus citas no cambian. Tendrás que darle el enlace nuevo.».
  - Botones: «Cancelar» y «Generar enlace nuevo».
  - Al terminar, el aviso «Enlace nuevo generado» con el botón «Copiar».

Toda ficha tiene al menos una cita (en la 001 solo se crean fichas desde el alta de cita), así
que todas son alcanzables desde la agenda.

## Accesibilidad y móvil (Principio VII, SC-006)

- Mobile-first desde 360 px, sin scroll horizontal. Botones de al menos 44 px de alto.
- Campo de cifras con etiqueta, errores con `aria-live="polite"` y foco devuelto al campo.
- Diálogos con Radix (`AlertDialog`): foco atrapado y Escape cierra sin cancelar.
- axe sin infracciones en las cinco pantallas de `/p/[token]` y en los dos diálogos.
