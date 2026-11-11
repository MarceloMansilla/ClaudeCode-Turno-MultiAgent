# Investigación (Fase 0): Núcleo de agenda

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-07

Petición del usuario para el plan: «selecciona un stack tecnológico moderno que permita crear
una aplicación con una apariencia profesional y adaptada al año 2026». Cada decisión sigue el
formato Decisión / Razón / Alternativas.

---

## R1. Arquitectura y framework

- **Decisión**: una única aplicación web full-stack con **Next.js 16 (App Router) + React 19 +
  TypeScript 5 (modo estricto)**, con Server Components para leer y **Server Actions** para
  escribir. Node.js 22 LTS.
- **Razón**: un solo proyecto, un solo despliegue y un solo lenguaje (Principio IV). Las
  Server Actions eliminan la capa de API REST separada que la 001 no necesita (no hay
  clientes externos). Es el estándar de facto en 2026 para aplicaciones web profesionales.
- **Alternativas**: frontend SPA (Vite + React) + backend separado (Fastify/NestJS): dos
  proyectos y un contrato HTTP sin consumidor externo → más complejidad. SvelteKit/Nuxt:
  válidos, pero con menor ecosistema de componentes accesibles listos para usar.

## R2. Interfaz y apariencia (Principio VII)

- **Decisión**: **Tailwind CSS 4** + **shadcn/ui** (componentes sobre Radix UI, copiados al
  repositorio) + iconos **lucide-react** + tipografía **Inter** autoalojada con `next/font`.
  Tema claro/oscuro con tokens CSS (modo del sistema). Diseño mobile-first desde 360 px.
- **Razón**: estética limpia y actual (2026) sin diseñar desde cero; Radix aporta foco,
  teclado y ARIA correctos (contraste AA, SC-006). Los componentes viven en el repo, así que
  no es una dependencia opaca y sus textos se escriben en español.
- **Alternativas**: MUI / Ant Design: aspecto más genérico y pesado, personalización más
  costosa. CSS a mano: más trabajo para el mismo resultado accesible.

## R3. Almacenamiento y garantía anti-solape (Principio III, RN1)

- **Decisión**: **PostgreSQL 18** con una **restricción de exclusión**:
  `EXCLUDE USING gist (profesional_id WITH =, tstzrange(inicio, fin, '[)') WITH &&)
  WHERE (estado IN ('reservada','completada'))` (extensión `btree_gist`).
- **Razón**: la garantía la impone la base de datos de forma atómica; dos inserciones
  simultáneas que se solapan no pueden confirmarse ambas, sin bloqueos manuales ni
  condiciones de carrera en la aplicación. El intervalo semiabierto `[)` implementa
  exactamente «contigüidad permitida». El filtro `WHERE` hace que canceladas y no asistidas
  no bloqueen (FR-006, FR-011). Cualquier vía de escritura futura queda cubierta (FR-012).
- **Alternativas**: comprobar en la aplicación + `SELECT … FOR UPDATE`: frágil, depende de
  que todo código lo use. Nivel de aislamiento SERIALIZABLE: funciona pero obliga a
  reintentos y no deja la regla explícita en el esquema. SQLite: sin restricciones de
  exclusión; obligaría a lógica propia.

## R4. Acceso a datos

- **Decisión**: **Drizzle ORM** + **drizzle-kit** para migraciones; la restricción de
  exclusión y el índice único de teléfono se escriben en una migración SQL propia.
  Validación de entradas con **Zod 4**.
- **Razón**: tipos de TypeScript derivados del esquema, SQL visible y sin motor pesado.
- **Alternativas**: Prisma: no modela restricciones de exclusión y añade un motor de
  consultas. `pg` a pelo: válido, pero sin tipado del esquema; se rechaza por mantenimiento.

## R5. Fechas, horas y zona horaria (Principio II)

- **Decisión**: instantes guardados como `timestamptz` (UTC). Cada clínica tiene su zona IANA
  (`Europe/Madrid` para Clínica Eleva). Toda conversión y validación de horario se hace en la
  zona de la clínica con **date-fns 4 + @date-fns/tz** y formato con locale `es`
  («lunes, 16/11/2026», «10:00–10:45»). Un módulo `reloj` inyectable da «ahora» (sobrescribible
  en tests y E2E).
- **Razón**: UTC en almacén evita ambigüedades; la zona de la clínica cubre Canarias. El
  horario 09:00–20:00 nunca toca la franja del cambio de hora (02:00–03:00), y las duraciones
  se suman en minutos reales.
- **Alternativas**: Temporal API: aún sin soporte nativo estable en Node 22; se reconsiderará.
  Luxon/Day.js: equivalentes, date-fns es modular y ya integra zonas.

## R6. Importes (Principio II)

- **Decisión**: precios como **enteros en céntimos** (`precio_centimos`), formateados con
  `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })` → «40,00 €».
- **Razón**: sin coma flotante; la 001 no calcula importes, solo los muestra.
- **Alternativas**: `numeric(10,2)`: correcto, pero obliga a convertir en JS; se rechaza.

## R7. Acceso con clave de clínica (FR-001–FR-004)

- **Decisión**: la clave se guarda con hash **Argon2id** (`@node-rs/argon2`). Al acertar se
  emite una cookie de sesión `httpOnly`, `Secure`, `SameSite=Lax`, firmada con **jose**
  (HS256), que contiene el `clinica_id` y caduca a las 12 h. En la 001 cada instalación sirve
  a **una sola clínica** (clarificación 2026-11-07): `entrar` compara la clave con el hash de
  esa única clínica. El `proxy.ts` de Next.js 16 (antes `middleware.ts`) protege todas las
  rutas del panel, y cada consulta sigue filtrando por el `clinica_id` de la sesión para que
  el futuro soporte multiclínica no obligue a reescribir los servicios.
- **Razón**: lo mínimo seguro para «auth simplificada v1» sin tabla de sesiones ni
  proveedor externo. El aislamiento por clínica se aplica en una única función de acceso.
- **Alternativas**: Auth.js / Better Auth: pensados para usuarios individuales; exceso para
  una clave compartida. **Deuda consciente**: sin usuarios individuales, sin limitación de
  intentos fallidos y sin rotación de clave en la 001 → spec propia futura.

## R8. Datos de demostración deterministas (Principio V)

- **Decisión**: script `pnpm seed --fecha-referencia AAAA-MM-DD` (por defecto, hoy) con un
  generador pseudoaleatorio con semilla fija (mulberry32, semilla `20261107`). Historia =
  los 40 días laborables anteriores a la fecha de referencia; futuro = la fecha de
  referencia y los 9 días laborables siguientes. Los estados de la historia se asignan
  barajando con el PRNG y fijando exactamente `round(0,10·N)` no asistidas y
  `round(0,08·N)` canceladas; el resto, completadas. Todas las citas del futuro, reservadas.
  El script inserta en la misma BD con las mismas restricciones (si generase un solape,
  fallaría). **Identificadores deterministas** (FR-021): cada `uuid` se construye con 16 bytes
  del PRNG (formato v4 válido), generados en un orden fijo (clínica → profesionales →
  servicios → pacientes → citas). Solo el hash Argon2 de la clave varía (sal aleatoria); la
  comparación de dos ejecuciones lo excluye.
- **Razón**: misma fecha + misma semilla ⇒ mismos datos; porcentajes exactos dentro de la
  tolerancia de SC-005. Fecha de referencia de documentación y tests: **lunes 09/11/2026**.
- **Alternativas**: faker con semilla: añade dependencia grande y su salida puede cambiar
  entre versiones (rompe el determinismo); se usan listas propias de nombres españoles.

## R9. Pruebas (Principio VI)

- **Decisión**: **Vitest** para unitarias (reglas puras: solape, horario, granularidad,
  transiciones, normalización de teléfono, formato) e integración contra **PostgreSQL real**
  con **Testcontainers**; **Playwright** para E2E (portátil 1366×768 y móvil 360×800) con
  **@axe-core/playwright** para accesibilidad. Cada test cita el FR/escenario en su nombre
  (p. ej. `FR-011 rechaza solape parcial por el final`).
- **Razón**: la garantía de solape solo se prueba de verdad contra la BD real con
  concurrencia real (ráfagas de 10 inserciones en paralelo, SC-001).
- **Alternativas**: BD en memoria (pg-mem): no implementa restricciones de exclusión.

## R10. Entorno y despliegue

- **Decisión**: desarrollo con **pnpm** y PostgreSQL en **Docker Compose**. Despliegue
  objetivo: cualquier hosting de Node.js con PostgreSQL gestionado (se decide fuera de la 001).
- **Razón**: herramientas ya instaladas en el equipo (Node 22, pnpm 11, Docker 29).

## Asuntos sin resolver

Ninguno. No queda ningún «NEEDS CLARIFICATION».
