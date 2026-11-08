# Investigación (Fase 0): Portal del paciente

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-07 ·
revisada el 2026-11-08 (enmienda «fuente única 005»)

Punto de partida: el stack de la 001 ([research de la 001](../001-agenda-core/research.md)) y
lo que ya entrega la 005. Esta feature **no añade ninguna dependencia**. Cada decisión sigue
el formato Decisión / Razón / Alternativas.

---

## P1. Dónde vive el portal

- **Decisión**: dentro de la misma aplicación, en la ruta `/p/[token]` **que crea la 005**.
  La 002 sustituye, en el caso «acceso abierto», la lista provisional de la 005
  (`ProximasCitas`, su research R1) por sus pestañas «Próximas citas» e «Historial». Las demás
  pantallas de la ruta (no válido, cifras, pausa, bloqueo) siguen siendo de la 005.
- **Razón**: una sola ruta y una sola forma de acceder (005 FR-008, Principio IV); la 005 ya
  previó que la 002 reemplazara su lista.
- **Alternativas**: una ruta propia de la 002 (`/portal/...`): segundo enlace de paciente,
  prohibido por 005 FR-008. Rechazada.

## P2–P4. Enlace, 4 cifras, intentos y duración del acceso — *de la 005*

- **Estado**: no son decisiones de la 002. Las definen 005 FR-001–FR-008 (incluidos FR-006a y
  FR-006b) y las implementa la 005 (`src/dominio/enlace.ts`, `src/lib/acceso-paciente.ts`,
  `src/lib/sesion-paciente.ts`, `src/components/paciente/`). Las aportaciones técnicas que la
  002 hizo en su día (token de 32 bytes en claro, contadores con `FOR UPDATE`, cookie de
  30 minutos) se trasladaron al plan de la 005, que decidió por su cuenta.

## P5. Cancelación y plazo — *de la 005*

- **Estado**: la regla (005 FR-009), el rechazo fuera de plazo (FR-011), la confirmación
  (FR-012), el efecto y el origen (FR-013, con 001 FR-018a) y la concurrencia (FR-014) son de
  la 005, igual que su sentencia condicional y su Server Action.
- **Decisión de la 002**: para cada próxima cita, el portal usa los dos valores que ya calcula
  la 005: `pacientePuedeCancelar(cita, ahora)` para mostrar u ocultar «Cancelar cita» y
  `enunciadoPoliticaCancelacion(...)` para el único texto sobre el plazo. No hay
  `src/dominio/plazo.ts` en la 002 ni ningún texto con el plazo redactado.
- **Razón**: Principio I y 005 FR-017; `tests/unit/coherencia-politica.test.ts` lo verifica.
- **Alternativas**: calcular en la 002 un «plazo» formateado para la tarjeta: duplicaría la
  regla y el texto. Rechazada.

## P6. Solape tras liberar un hueco (Principio III)

- **Decisión**: ningún cambio: la restricción `cita_sin_solape` de la 001 sigue siendo la
  única garantía, y las pruebas de concurrencia de la cancelación del paciente son de la 005
  (su SC-003). La 002 solo comprueba de extremo a extremo que un hueco liberado se puede
  reservar y desaparece del aviso.

## P7. Aviso de huecos liberados (FR-015a)

- **Decisión**: consulta derivada, sin tabla nueva: citas con `cancelada_por = 'paciente'`
  (001 FR-018a), `inicio > ahora`, y sin ninguna cita `reservada`/`completada` del mismo
  profesional que solape su intervalo. Si dos cancelaciones de paciente dejan libre el mismo
  tramo, se muestra una sola entrada (la más reciente). Se calcula al cargar cualquier página
  del panel; se muestra en la cabecera con su número.
- **Razón**: el aviso desaparece solo cuando el hueco se vuelve a ocupar o empieza; no hay
  estado «visto» que mantener.
- **Alternativas**: tabla de avisos con marca de leído: estado extra que la spec no pide.
  Notificaciones en tiempo real: fuera de alcance (SC-005 se cumple al recargar).

## P8. Semilla determinista (Principio V)

- **Decisión**: la 002 **no amplía la semilla** (teléfono y origen: 001; enlaces: 005
  FR-019). Solo lee la semilla para elegir a sus pacientes de ejemplo, con una regla fija
  sobre la semilla de 09/11/2026 y el reloj a las 12:10:
  - **Paciente A**: el primero, en orden de creación, con al menos una cita reservada futura
    para la que `pacientePuedeCancelar` es verdadero, al menos una para la que es falso (si
    no la hay, basta con la primera condición) y historial en al menos dos estados distintos.
  - **Paciente B**: el primero, en orden de creación, sin citas futuras. Si no hay ninguno,
    los tests lo crean con el alta rápida de la 001.
  Sus nombres, enlaces, 4 cifras y citas se copian a `docs/datos-demo.md` en la
  implementación.

## P9. Recepción: copiar y generar el enlace — *de la 005*

- **Estado**: el comportamiento (005 FR-004, FR-005) y su presentación, el menú «Enlace del
  paciente» (`src/components/agenda/enlace-paciente.tsx`), los entrega la 005. La 002 retira
  su propio menú «Copiar / Generar nuevo enlace del portal» para no tener dos.

## P10. Pruebas (Principio VI)

- **Decisión**: mismas herramientas que la 001. Unitarias: clasificación «Próximas» /
  «Historial» y etiquetas. Integración: lectura del portal (aislamiento entre pacientes,
  `puedeCancelar` y `enunciado` iguales a los de las funciones de la 005), consulta de huecos
  liberados, origen en la agenda. E2E en móvil 360×800 y portátil 1366×768. En los tests, el
  texto esperado del enunciado se obtiene llamando a `enunciadoPoliticaCancelacion`, nunca
  escrito a mano. Las pruebas del acceso, el plazo y la concurrencia de la cancelación son de
  la 005.

## Asuntos sin resolver

- **Integración**: la 005 y la 001 enmendada aún no están en `portal` (`specs/MAPA.md`).
- **Petición a la 005**: enunciado de FR-016 para citas ya fuera de plazo (ver spec,
  «Peticiones a otros propietarios»).
