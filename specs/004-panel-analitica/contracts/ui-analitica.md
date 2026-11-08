# Contrato: página «Analítica» del panel

| Ruta | Acceso | Contenido |
|------|--------|-----------|
| `/analitica` | sesión | Página única de analítica (FR-001–FR-015). Sin parámetros. |

Sin sesión → redirige a `/entrar` (mismo comportamiento y aviso `SESION_CADUCADA` que
`/agenda`). La ruta se añade al `matcher` del proxy.

## Navegación (FR-002)

La cabecera común del panel muestra dos enlaces: «Agenda» (`/agenda`) y «Analítica»
(`/analitica`); el de la sección actual lleva `aria-current="page"` y estilo de activo. En
móvil siguen visibles (texto + icono, objetivo táctil ≥ 44×44 px).

## Estructura de la página

1. **Título**: «Analítica» y subtítulo con el periodo: «Últimas 8 semanas: 14/09/2026 –
   08/11/2026». Nota breve: «La semana en curso no se incluye.»
2. **Resumen de la clínica** (3 tarjetas, los valores «de la clínica» de FR-006, FR-008 y
   FR-011): Ocupación («70,4 %»), No asistencia («10,9 %», «143 de 1.311») e Ingresos
   («47.140,00 €», «1.168 citas completadas»). Toda cifra de no asistencia de la página es la
   tasa de FR-006. La página nunca muestra la proporción sobre el total de citas (10,0 %,
   143 de 1.425) de la 001 (research R11).
3. **Ocupación por profesional**: barras horizontales (una por profesional, escala 0–100 %)
   con el valor al final de la barra; tabla: profesional · minutos ocupados · minutos
   disponibles · ocupación.
4. **No asistencia por profesional**: barras horizontales con valor; tabla: profesional · no
   asistidas · completadas + no asistidas · tasa.
5. **Ingresos por servicio**: barras horizontales con importe; tabla: servicio · precio ·
   citas completadas · importe; fila final «Total».
6. **Evolución de las últimas 8 semanas**:
   - Líneas de ocupación semanal por profesional y clínica (eje Y 0–100 %).
   - Líneas de no asistencia semanal por profesional y clínica.
   - Barras de ingresos por semana.
   - Tabla semanal: semana · completadas · no asistidas · canceladas · no asistencia ·
     ocupación · ingresos (clínica), con fila «Total»; y detalle por profesional desplegable
     («Ver detalle por profesional»).
   - Eje X: «14/09», «21/09», … ; en la tabla, «semana del 14/09/2026».

## Gráficos (FR-013, Principio VII)

- SVG renderizado en servidor, ancho 100 % del bloque; sin desplazamiento horizontal a 360 px.
- `role="img"` con `aria-labelledby` (título del bloque) y `aria-describedby` (resumen en una
  frase, p. ej. «Jorge tiene la tasa más alta: 13,0 %»).
- Profesionales: color (`--grafico-1..3`; clínica en `--foreground`) **+** forma del marcador
  (María ●, Jorge ■, Lucía ▲, Clínica línea discontinua) **+** etiqueta de texto. Contraste de
  marcas ≥ 3:1 y de textos ≥ 4,5:1 en tema claro y oscuro.
- Valores «Sin datos» (`null`): sin barra / hueco en la línea, y el texto «Sin datos» en la
  tabla.

## Formato

| Valor | Ejemplo | Función |
|-------|---------|---------|
| Importe | «5.540,00 €», «47.140,00 €», «0,00 €» | `formatearPrecio` (001) |
| Entero | «1.311», «3.300» | `formatearEntero` (nueva) |
| Porcentaje | «10,5 %», «80,0 %», «Sin datos» | `formatearPorcentaje(decimas \| null)` (nueva) |
| Periodo | «14/09/2026 – 08/11/2026» | `dd/MM/yyyy` |
| Semana | «semana del 12/10/2026» / eje «12/10» | `dd/MM/yyyy` / `dd/MM` |

Los espacios antes de «€» y «%» son de no separación.

## Estados

- **Vacío** (`hayDatos = false`): «Todavía no hay citas suficientes para mostrar la
  analítica.» en lugar de los bloques 2–6.
- **Carga**: «Cargando la analítica…» (`loading.tsx`).
- **Sin acciones**: la página no contiene formularios, botones de envío ni Server Actions
  (FR-015). El único control es el desplegable de detalle.
