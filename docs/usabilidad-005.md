# Prueba de usabilidad de la 005 (SC-005 y SC-006)

Tarea T058 de [`specs/005-acceso-cancelacion-paciente/tasks.md`](../specs/005-acceso-cancelacion-paciente/tasks.md).
Se hace junto con la de la 001 (T066, `docs/usabilidad-001.md`).

**Estado**: pendiente (requiere 2 personas reales que no conozcan CitaClara).

## Preparación

```bash
docker compose up -d db
pnpm db:migrate
pnpm seed --fecha-referencia 2026-11-09
CITACLARA_AHORA=2026-11-09T12:10:00+01:00 pnpm dev
```

- Móvil real o emulado a **360 px** de ancho.
- Enlace y cifras de **P** (Pablo Marín Blanco) en [`docs/datos-demo.md`](datos-demo.md),
  sección «Enlaces de pacientes». Con ese reloj, P tiene citas cancelables desde el miércoles
  11/11/2026.
- Una persona cada vez; sin explicaciones previas sobre la aplicación.

## Tareas

1. **SC-005 (política)**: la persona lee una vez el enunciado de una cita de P («Puede cancelar
   esta cita desde su enlace antes del… Después, llame a Clínica Eleva al 911 234 567.») y, sin
   volver a mirarlo, lo explica con sus palabras. Pasa si dice el límite (24 h antes) y qué hacer
   después (llamar a la clínica).
2. **SC-006 (cancelar en móvil)**: con el cronómetro en marcha, abre el enlace de P, escribe las
   4 cifras y cancela una cita en plazo. Pasa si termina en **menos de 1 minuto y sin ayuda**.

## Resultados

| Persona | Fecha | Dispositivo | SC-005: repite la política | SC-006: tiempo | SC-006: sin ayuda | Observaciones |
|---------|-------|-------------|----------------------------|----------------|-------------------|---------------|
| 1 | | | | | | |
| 2 | | | | | | |

## Conclusión

_Por rellenar: ¿se cumplen SC-005 y SC-006? Cambios propuestos, si los hay._
