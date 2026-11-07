# CitaClara

Gestor de citas para clínicas y consultas pequeñas (fisioterapia, nutrición, podología).
Desarrollado con especificaciones (SDD): todo comportamiento nace de una spec en `specs/`.

**Feature 001 — Núcleo de agenda** ([spec](specs/001-agenda-core/spec.md)): panel de
recepción con acceso por clave de clínica, agenda del día por profesional con huecos libres y
ocupados, alta de citas sin solapes (también con reservas simultáneas) y registro del
desenlace (completada, cancelada, no asistida).

## Tecnología

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 + shadcn/ui · PostgreSQL 18 + Drizzle ORM ·
Vitest + Testcontainers · Playwright + axe. Decisiones y alternativas en
[research.md](specs/001-agenda-core/research.md).

La regla capital (un profesional nunca tiene dos citas solapadas) la impone la base de datos
con una restricción de exclusión (`cita_sin_solape`), no el código de la aplicación.

## Puesta en marcha

Requisitos: Node.js 22, pnpm 11 y Docker.

```bash
pnpm install
cp .env.example .env          # y pon un SESION_SECRETO largo
docker compose up -d db
pnpm db:migrate
pnpm seed --fecha-referencia 2026-11-09
pnpm dev                      # http://localhost:3000 · clave: eleva-demo
```

Para ver la demo como el lunes 09/11/2026 a las 12:10, añade a `.env`:
`CITACLARA_AHORA=2026-11-09T12:10:00+01:00`.

Guía de validación completa: [quickstart.md](specs/001-agenda-core/quickstart.md). Cifras de
los datos de demostración: [docs/datos-demo.md](docs/datos-demo.md).

## Pruebas

```bash
pnpm test        # unitarias + integración (PostgreSQL real con Testcontainers; requiere Docker)
pnpm test:e2e    # Playwright en portátil (1366×768) y móvil (360×800), con axe
pnpm lint && pnpm typecheck
```

Cada prueba cita en su nombre el requisito o escenario de la spec que cubre (Principio VI).

## Deuda técnica consciente

- **Autenticación simplificada (v1)**: una clave compartida por clínica, sin usuarios
  individuales, sin límite de intentos fallidos y sin pantalla para cambiar la clave
  ([research.md R7](specs/001-agenda-core/research.md)). Irá en una spec propia.
- **Una clínica por instalación** en la 001; el soporte multiclínica irá en una spec propia
  (los servicios ya filtran por clínica).
