# Specification Quality Checklist: Portal del paciente

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-07 · revalidada el 2026-11-08 (enmienda «fuente única 005»)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Enmienda 2026-11-08: retirados FR-001–FR-006, FR-002a, FR-002b, FR-012, FR-013, el supuesto
  del plazo y la entidad «Enlace personal (acceso del paciente)»; todo se cita de la 005
  (tabla «Equivalencias de lo retirado»). Ya no hay dependencia de ninguna clarificación
  ajena: 005 FR-006 está decidido (enlace + 4 cifras).
- Comprobación de la regla 5 de la enmienda: búsqueda en toda la carpeta de la 002 de la
  duración del plazo, «hasta el [día de la semana]», «día anterior», «un día» y
  «antelación»: 0 resultados como texto propio.
- Detalles de implementación: la spec solo nombra valores de dominio de la 001
  (`paciente` / `recepcion`, FR-018a); los nombres de funciones y archivos de la 005 están en
  plan.md y tasks.md.
- Pendiente fuera de la spec: integrar la 005 en `portal` (tasks T000) y las peticiones a la
  005 y al MAPA de «Peticiones a otros propietarios».
