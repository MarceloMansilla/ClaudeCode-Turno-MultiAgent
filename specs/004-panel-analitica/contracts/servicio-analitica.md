# Contrato: cálculo y lectura de la analítica

Funciones de servidor que usa la página `/analitica`. No hay Server Actions: la feature no
escribe (FR-015). Tipos de retorno en [data-model.md](../data-model.md).

## `calcularAnalitica(entrada) → ResumenAnalitica` — `src/dominio/analitica.ts`

Función **pura** (sin BD, sin reloj, sin E/S).

| Entrada | Tipo | Notas |
|---------|------|-------|
| `ahora` | `Date` | instante de referencia |
| `clinica` | `{ zonaHoraria, horaApertura, horaCierre, diasLaborables }` | de la 001 |
| `profesionales` | `{ id, nombre }[]` | en el orden de la agenda |
| `servicios` | `{ id, nombre, precioCentimos }[]` | en el orden del catálogo |
| `citas` | `{ profesionalId, servicioId, estado, inicio: Date, fin: Date }[]` | ya filtradas o no: la función ignora las que caen fuera del periodo |

Garantías: las invariantes 1–5 de [data-model.md](../data-model.md); mismo resultado para la
misma entrada.

## `periodoAnalitica(ahora, zona) → { desde: Date, hasta: Date, lunes: string[8] }` — `src/dominio/analitica.ts`

Pura. Devuelve los instantes de corte para la consulta y los 8 lunes del periodo.

| `ahora` (Europe/Madrid) | `lunes[0]` | `lunes[7]` | `hasta` (local) |
|-------------------------|-----------|-----------|-----------------|
| 09/11/2026 12:10 | 2026-09-14 | 2026-11-02 | 09/11/2026 00:00 |
| 08/11/2026 23:59 (domingo) | 2026-09-07 | 2026-10-26 | 02/11/2026 00:00 |
| 26/10/2026 00:30 (lunes tras el cambio de hora) | 2026-08-31 | 2026-10-19 | 26/10/2026 00:00 |

## `obtenerAnalitica(clinicaId) → ResumenAnalitica` — `src/servicios/analitica.ts`

Lee clínica, profesionales, servicios y citas del periodo (solo `SELECT`, filtrado por
`clinicaId` de la sesión, FR-003) y delega en `calcularAnalitica` con `ahora()` del reloj.
Clínica inexistente → error interno (no puede ocurrir con una sesión válida).

## Errores visibles

Ninguno propio. La sesión caducada sigue el flujo de la 001 (`SESION_CADUCADA`). Un fallo
inesperado de lectura muestra la página de error genérica del panel: «No hemos podido cargar
la analítica. Vuelve a intentarlo en unos segundos.»
