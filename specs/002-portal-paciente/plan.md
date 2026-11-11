# Implementation Plan: Portal del paciente

**Branch**: `portal` | **Date**: 2026-11-07 · revisado el 2026-11-08 (enmienda «fuente única
005») | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-portal-paciente/spec.md`

## Summary

Página personal, pensada para móvil, donde cada paciente consulta sus próximas citas y su
historial y cancela las que la 005 le permite. El acceso (enlace + 4 cifras, intentos,
duración), el plazo, su enunciado y la propia cancelación son de la 005, que ya ha
implementado la ruta `/p/[token]` con una lista provisional. La 002 **sustituye esa lista**
por sus pantallas (pestañas, tarjetas, historial, vacíos), aplica su guía de textos y añade a
recepción la etiqueta «Cancelada por el paciente» y el aviso de huecos liberados (origen
`paciente`, 001 FR-018a). Sin dependencias, tablas ni migraciones propias. Detalle en
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Node.js 22 LTS (igual que la 001)

**Primary Dependencies**: las de la 001 (Next.js 16, React 19, Tailwind CSS 4, shadcn/ui,
Drizzle ORM, Zod 4, date-fns 4 + @date-fns/tz, jose). Ninguna nueva.

**Storage**: PostgreSQL 18 de la 001; sin migraciones propias. Lee `clinica.telefono`
(001 FR-022), `cita.cancelada_por` (001 FR-018a) y el acceso resuelto por la 005

**Testing**: Vitest (unitarias + integración con Testcontainers), Playwright +
@axe-core/playwright en móvil 360×800 y portátil 1366×768

**Target Platform**: navegadores móviles actuales (Safari iOS, Chrome Android; últimas 2
versiones) para el portal; los de la 001 para el panel

**Project Type**: aplicación web full-stack (el mismo proyecto de la 001)

**Performance Goals**: citas visibles en < 2 s tras completar el acceso; próxima cita
encontrada en < 10 s y cancelación en < 30 s de tarea de usuario (SC-001, SC-002)

**Constraints**: 0 citas ajenas en el portal (SC-004); 0 textos que redacten el plazo
(SC-007, `coherencia-politica.test.ts`); sin scroll horizontal desde 360 px y WCAG 2.2 AA
(SC-006); hora local de la clínica

**Scale/Scope**: una clínica por instalación; 40 pacientes en la semilla; 1 pantalla de
portal con 2 pestañas y 2 ampliaciones del panel (etiqueta de origen, aviso de huecos)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] **I. Spec primero**: ⚠️ spec aprobada, con propietario único y ya sin definiciones de
      acceso ni de plazo (citadas de la 005). **Pendiente**: integrar en `portal` la 005 y la
      001 enmendada (FR-018a, FR-022), que hoy viven en `005-acceso-cancelacion-paciente`
      (tarea T000). La implementación no empieza hasta entonces.
- [x] **II. Números**: ✅ sin importes (FR-010). Las fechas del portal en formato español y
      hora local; el plazo y su cálculo (cambio de hora, Canarias) son de 005 FR-009/FR-010.
- [x] **III. Solape**: ✅ la 002 no escribe en la agenda por su cuenta; la cancelación es de
      la 005 y la garantía sigue siendo `cita_sin_solape` de la 001. La 002 añade E2E de hueco
      liberado reservable.
- [x] **IV. Simplicidad**: ✅ misma aplicación y misma ruta de la 005; ninguna dependencia,
      tabla ni columna; aviso de huecos como consulta derivada; se reutilizan los componentes
      de acceso, cancelación, política y enlace de la 005.
- [x] **V. Datos demo**: ✅ la 002 no amplía la semilla; pacientes A y B elegidos con regla
      fija y publicados en `docs/datos-demo.md`.
- [x] **VI. Tests**: ✅ cada FR y escenario de la 002 con test nombrado por su identificador;
      suite completa de la 001, la 005 y la 002 en verde, incluida la de coherencia.
- [x] **VII. Interfaz**: ✅ portal mobile-first con shadcn/ui, guía de textos FR-018, enlaces
      `tel:`; E2E con axe en móvil y portátil.
- [x] **VIII. Idioma**: ✅ español de España en interfaz, mensajes, documentación e
      identificadores de dominio.

## Project Structure

### Documentation (this feature)

```text
specs/002-portal-paciente/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/ (server-actions.md, ui-routes.md)
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

Sobre la estructura de la 001 y la 005. ＋ nuevo, ～ ampliado; **[005]** = de la 005, se
**importa** y no se modifica.

```text
src/
├── app/p/[token]/page.tsx                ～ caso «dentro»: VistaPortal en lugar de ProximasCitas
├── components/
│   ├── portal/                           ＋ vista-portal, tarjeta-cita, lista-vacia
│   ├── paciente/                         [005] cifras, pausa, bloqueo, no válido, Salir,
│   │                                        diálogo de cancelación, PoliticaCancelacion
│   │                                        (proximas-citas.tsx se retira al sustituirla)
│   └── agenda/                           ～ bloque-cita (etiqueta de origen), aviso-huecos-liberados
│                                            · enlace-paciente.tsx [005]
├── dominio/
│   ├── portal.ts                         ＋ clasificación próximas/historial y etiquetas
│   ├── enlace.ts                         [005] rutaEnlacePaciente
│   ├── plazo-paciente.ts                 [005] pacientePuedeCancelar, limiteCancelacionPaciente
│   └── politica-cancelacion.ts           [005] enunciadoPoliticaCancelacion
├── servicios/
│   ├── portal-paciente.ts                ～ [005] + historial con clasificarCitas
│   ├── huecosLiberados.ts                ＋ consulta derivada (FR-015a)
│   └── agenda.ts                         ～ origen de la cancelación en la vista (si la 001 no lo expone)
└── components/cabecera.tsx               ～ aviso de huecos liberados

scripts/seed.ts                           ～ Paciente A/B en el resumen

tests/
├── unit/portal.test.ts                   ＋
├── integration/                          ＋ portal-lectura, huecos-liberados; ～ agenda
└── e2e/portal/, e2e/agenda/              ＋ consulta, cancelar, accesibilidad, rendimiento, huecos

docs/                                     ～ datos-demo.md; ＋ usabilidad-002.md, llamadas-eleva.md
```

**Structure Decision**: la 002 no tiene reglas de acceso ni de plazo. Importa de la 005
`rutaEnlacePaciente`, `pacientePuedeCancelar`, `limiteCancelacionPaciente` y
`enunciadoPoliticaCancelacion`, sin copiarlas. Toda mención al plazo sale de
`enunciadoPoliticaCancelacion` y `tests/unit/coherencia-politica.test.ts` lo vigila.

**Coordinación con el trabajo en paralelo**: el orden recomendado del MAPA es enmienda de la
001 → 005 → 002. Los cambios de la 002 en archivos de la 001 y la 005 son aditivos y se
limitan a lo que esas specs previeron (la 005 reserva la lista provisional para la 002).

## Complexity Tracking

Sin violaciones de la constitución que justificar.
