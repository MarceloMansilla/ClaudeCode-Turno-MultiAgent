<!--
Informe de impacto de sincronización (Sync Impact Report)
- Versión: (plantilla sin rellenar) → 1.0.0
- Ratificación inicial: todos los principios son nuevos.
- Principios añadidos:
  I. Spec primero, con un propietario por spec
  II. Los números no admiten creatividad
  III. El solape es el fallo capital (NO NEGOCIABLE)
  IV. Simplicidad y cero alcance fantasma
  V. Demostrable con datos reproducibles
  VI. Los tests acompañan a la spec (NO NEGOCIABLE)
  VII. Interfaz clara, moderna y accesible
  VIII. Español de España en todo
- Secciones añadidas: «Alcance y límites de esta constitución»,
  «Flujo de trabajo y trabajo en paralelo», «Gobierno».
- Secciones eliminadas: ninguna.
- Plantillas:
  ✅ .specify/templates/plan-template.md (Constitution Check con las puertas I–VIII)
  ✅ .specify/templates/spec-template.md (propietario, importes/fechas, solape, datos demo)
  ✅ .specify/templates/tasks-template.md (tests obligatorios, pruebas de solape)
  ✅ .specify/templates/checklist-template.md (revisada, sin cambios necesarios)
  ⚠ specs/MAPA.md: no existe todavía; debe crearse con la primera spec.
- TODO diferidos: ninguno.
-->

# Constitución de CitaClara

CitaClara es un gestor de citas para clínicas y consultas pequeñas (fisioterapia, nutrición,
podología). Nace con desarrollo guiado por especificaciones (SDD) y está pensado para que
varias features y varios agentes trabajen en paralelo desde el primer mes.

## Core Principles

### I. Spec primero, con un propietario por spec

- Todo comportamiento observable del producto DEBE nacer de una spec aprobada en `specs/`.
- Todo cambio de comportamiento DEBE empezar corrigiendo la spec existente o creando una
  nueva; no se modifica el comportamiento y luego se "actualiza la spec".
- La propiedad de cada spec se registra en `specs/MAPA.md`. Cada spec tiene exactamente un
  propietario. Solo el propietario aprueba cambios en su spec; quien necesite cambiar una
  spec ajena lo solicita a su propietario.
- Un comportamiento que no esté en ninguna spec es un defecto, aunque "funcione".

**Razón**: con varios agentes en paralelo, la spec es la única fuente de verdad compartida;
un propietario único evita ediciones cruzadas contradictorias.

### II. Los números no admiten creatividad

- Todo importe DEBE cuadrar al céntimo, siempre: los totales son exactamente la suma de sus
  partes, y cualquier redondeo está definido por escrito en la spec que lo origina.
- Ningún cálculo monetario puede producir diferencias de céntimos entre pantallas, informes,
  recibos o exportaciones del mismo hecho.
- Toda fecha y hora DEBE mostrarse sin ambigüedad posible para una clínica española:
  convenciones españolas (día antes que mes, reloj de 24 horas), siempre en la hora local
  de la clínica, y con comportamiento definido en los cambios de horario de verano/invierno
  y para clínicas fuera de la hora peninsular.
- Las specs que manejen importes o fechas DEBEN incluir ejemplos numéricos concretos y
  verificables.

**Razón**: un céntimo descuadrado o una cita leída en el día equivocado destruyen la
confianza de la clínica en el producto.

### III. El solape es el fallo capital (NO NEGOCIABLE)

- Un profesional NO PUEDE tener dos citas que se solapen en el tiempo. Jamás.
- La garantía DEBE mantenerse aunque dos o más reservas del mismo hueco lleguen en el mismo
  instante: exactamente una prospera y las demás reciben un rechazo claro.
- Toda feature que escriba en la agenda (crear, mover, ampliar, reasignar o restaurar citas)
  DEBE incluir pruebas que intenten activamente provocar un solape, incluidas reservas
  simultáneas del mismo hueco.
- Ninguna excepción de negocio, permiso de usuario ni operación masiva puede saltarse esta
  regla.

**Razón**: un solape es el fallo que un paciente y un profesional sufren en persona; es el
error que define si CitaClara sirve o no.

### IV. Simplicidad y cero alcance fantasma

- Ante dos soluciones que cumplen la spec, se elige la más simple.
- No se construye funcionalidad, opción, pantalla ni dependencia que no esté justificada en
  una spec. "Por si acaso" no es una justificación.
- Toda complejidad añadida DEBE quedar justificada por escrito en el plan, indicando la
  alternativa más simple descartada y por qué.

**Razón**: el alcance fantasma multiplica el coste de mantenimiento y los conflictos entre
features desarrolladas en paralelo.

### V. Demostrable con datos reproducibles

- El producto DEBE mantener datos de demostración deterministas: misma semilla, misma
  historia, siempre.
- Specs, ejemplos, documentación y analítica DEBEN citar números que cualquiera pueda
  reproducir regenerando esos datos.
- Toda feature que cambie lo que muestran los datos de demostración DEBE actualizar los
  datos y las cifras citadas que dependan de ellos.

**Razón**: un número que nadie puede reproducir no se puede revisar ni discutir.

### VI. Los tests acompañan a la spec (NO NEGOCIABLE)

- Cada regla de negocio y cada criterio de aceptación relevante de una spec DEBE tener al
  menos un test que lo referencie de forma trazable.
- Los tests no son opcionales: forman parte de la entrega de cada feature.
- La suite completa en verde es condición necesaria para integrar cualquier cambio.
- Un test que falla no se desactiva ni se borra para poder integrar; se corrige el código o,
  si la regla cambió, primero la spec (Principio I).

**Razón**: el test es la prueba ejecutable de que la spec se cumple y sigue cumpliéndose.

### VII. Interfaz clara, moderna y accesible

- El personal de recepción DEBE poder usar CitaClara sin formación y sin manual.
- En pantalla no aparece jerga técnica: mensajes, errores y etiquetas usan el lenguaje de
  una clínica, y todo error indica qué ha pasado y qué puede hacer la persona.
- Contraste y tamaños de texto y de elementos interactivos DEBEN ser accesibles.
- Todo flujo DEBE funcionar tanto en el portátil de recepción como en el móvil de un
  paciente.
- Este principio fija calidad, no tecnología: la tecnología de la interfaz se decide en el
  plan.

**Razón**: la adopción en una clínica pequeña depende de que recepción lo entienda a la
primera.

### VIII. Español de España en todo

- Interfaz, mensajes, specs, planes, tareas, documentación y datos de demostración DEBEN
  estar en español de España: vocabulario, ortografía y convenciones de España.
- Los nombres propios de productos o estándares de terceros se mantienen tal cual.

**Razón**: el público son clínicas españolas; un término ajeno genera desconfianza y dudas.

## Alcance y límites de esta constitución

- Esta constitución fija principios de negocio y de calidad. NO contiene decisiones
  técnicas: el stack, los formatos, las estructuras de datos y de proyecto se deciden en el
  plan de cada feature y deben respetar estos principios.
- Cuando un plan tome una decisión técnica, DEBE explicar cómo cumple los principios que le
  afectan, especialmente II, III y VII.

## Flujo de trabajo y trabajo en paralelo

- Orden obligatorio de cada feature: spec aprobada → plan → tareas → implementación. No se
  implementa sobre una spec sin aprobar.
- Toda spec nueva se registra en `specs/MAPA.md` con su propietario antes de empezar el plan.
- Un agente o persona solo modifica las specs de las que es propietario. Si una feature
  necesita cambiar el comportamiento definido en otra spec, el cambio se pide al propietario
  de esa spec y se integra allí primero.
- Las features que escriben en la agenda declaran en su spec que lo hacen, para que la
  revisión verifique las pruebas de solape (Principio III).
- Puertas de integración: suite completa en verde (VI), Constitution Check del plan superado
  o con desviaciones justificadas (IV), y datos de demostración coherentes (V).

## Governance

- Esta constitución prevalece sobre cualquier otra práctica, plantilla o costumbre del
  proyecto. En caso de conflicto, gana la constitución.
- Enmiendas: se proponen por escrito con su motivación y su impacto en specs, planes y
  plantillas; se aprueban explícitamente y se aplican junto con la actualización de las
  plantillas afectadas y un informe de impacto.
- Versionado semántico de la constitución:
  - MAJOR: eliminación o redefinición incompatible de un principio o de la gobernanza.
  - MINOR: principio o sección nuevos, o ampliación material de una regla.
  - PATCH: aclaraciones, redacción y erratas sin cambio de significado.
- Cumplimiento: cada plan supera el Constitution Check antes de investigar y de nuevo tras
  el diseño; cada revisión de cambios verifica los principios afectados; cualquier
  desviación queda registrada y justificada en el plan.

**Version**: 1.0.0 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-07
