/**
 * Gráfico de barras en SVG renderizado en el servidor (spec 004, FR-013, research R5).
 * Las coordenadas horizontales van en porcentaje para ocupar el 100 % del bloque sin
 * deformar el texto (sin `viewBox`), así que se adapta a 360 px sin desplazamiento.
 * Nada depende solo del color: cada barra horizontal lleva su etiqueta y su valor en texto, y
 * junto al gráfico siempre hay una tabla con las cifras exactas.
 */
export interface FilaGrafico {
  etiqueta: string;
  /** Valor en la unidad del gráfico (décimas, céntimos…); `null` = «Sin datos». */
  valor: number | null;
  /** Valor ya formateado: «10,5 %», «5.540,00 €». */
  texto: string;
  /** Color CSS de la barra; por defecto `var(--primary)`. */
  color?: string;
}

interface Props {
  id: string;
  titulo: string;
  descripcion: string;
  orientacion: 'horizontal' | 'vertical';
  /** Valor que ocupa el 100 % del eje. */
  maximo: number;
  filas: FilaGrafico[];
  /** Solo vertical: marcas del eje de valores, ya formateadas. */
  marcas?: { valor: number; texto: string }[];
}

const ALTO_FILA = 48;
const GROSOR_BARRA = 14;
const ALTO_VERTICAL = 220;
const MARGEN_SUPERIOR = 16;
const ALTO_EJE_X = 24;

function proporcion(valor: number, maximo: number): number {
  if (maximo <= 0) return 0;
  return Math.max(0, Math.min(1, valor / maximo));
}

export function GraficoBarras(props: Props) {
  return props.orientacion === 'horizontal' ? <Horizontal {...props} /> : <Vertical {...props} />;
}

function Cabecera({ id, titulo, descripcion }: Pick<Props, 'id' | 'titulo' | 'descripcion'>) {
  return (
    <>
      <title id={`${id}-titulo`}>{titulo}</title>
      <desc id={`${id}-desc`}>{descripcion}</desc>
    </>
  );
}

function Horizontal({ id, titulo, descripcion, maximo, filas }: Props) {
  const alto = filas.length * ALTO_FILA;
  return (
    <svg
      role="img"
      aria-labelledby={`${id}-titulo`}
      aria-describedby={`${id}-desc`}
      width="100%"
      height={alto}
      className="block overflow-visible text-foreground"
      data-grafico={id}
    >
      <Cabecera id={id} titulo={titulo} descripcion={descripcion} />
      {filas.map((fila, i) => {
        const y = i * ALTO_FILA;
        const ancho = fila.valor === null ? 0 : proporcion(fila.valor, maximo) * 100;
        return (
          <g key={fila.etiqueta} data-barra={fila.etiqueta}>
            <text x="0" y={y + 16} className="fill-current text-sm">
              {fila.etiqueta}
            </text>
            <text x="100%" y={y + 16} textAnchor="end" className="fill-current text-sm font-semibold tabular-nums">
              {fila.texto}
            </text>
            <rect x="0" y={y + 24} width="100%" height={GROSOR_BARRA} rx="4" className="fill-muted" />
            {ancho > 0 && (
              <rect
                x="0"
                y={y + 24}
                width={`${ancho}%`}
                height={GROSOR_BARRA}
                rx="4"
                style={{ fill: fila.color ?? 'var(--primary)' }}
              >
                <title>{`${fila.etiqueta}: ${fila.texto}`}</title>
              </rect>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Vertical({ id, titulo, descripcion, maximo, filas, marcas = [] }: Props) {
  const altoTrazado = ALTO_VERTICAL - MARGEN_SUPERIOR - ALTO_EJE_X;
  const base = MARGEN_SUPERIOR + altoTrazado;
  // El 10 % izquierdo queda para las marcas del eje de valores.
  const inicio = 10;
  const hueco = (100 - inicio) / filas.length;
  const ancho = hueco * 0.45;
  return (
    <svg
      role="img"
      aria-labelledby={`${id}-titulo`}
      aria-describedby={`${id}-desc`}
      width="100%"
      height={ALTO_VERTICAL}
      className="block overflow-visible text-foreground"
      data-grafico={id}
    >
      <Cabecera id={id} titulo={titulo} descripcion={descripcion} />
      {marcas.map((m) => {
        const y = base - proporcion(m.valor, maximo) * altoTrazado;
        return (
          <g key={m.valor}>
            <line x1="0" x2="100%" y1={y} y2={y} className="stroke-border" strokeWidth="1" />
            <text x="0" y={y - 4} className="fill-muted-foreground text-[11px] tabular-nums">
              {m.texto}
            </text>
          </g>
        );
      })}
      {filas.map((fila, i) => {
        const alto = fila.valor === null ? 0 : proporcion(fila.valor, maximo) * altoTrazado;
        const x = inicio + i * hueco + (hueco - ancho) / 2;
        return (
          <g key={fila.etiqueta} data-barra={fila.etiqueta}>
            {alto > 0 && (
              <rect
                x={`${x}%`}
                y={base - alto}
                width={`${ancho}%`}
                height={alto}
                rx="3"
                style={{ fill: fila.color ?? 'var(--primary)' }}
              >
                <title>{`${fila.etiqueta}: ${fila.texto}`}</title>
              </rect>
            )}
            <text
              x={`${inicio + i * hueco + hueco / 2}%`}
              y={ALTO_VERTICAL - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] tabular-nums sm:text-[11px]"
            >
              {fila.etiqueta}
            </text>
          </g>
        );
      })}
      <line x1="0" x2="100%" y1={base} y2={base} className="stroke-muted-foreground" strokeWidth="1" />
    </svg>
  );
}
