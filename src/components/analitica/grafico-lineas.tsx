/**
 * Evolución semanal en líneas (spec 004, US2, FR-013): SVG renderizado en el servidor, una
 * serie por profesional (color + forma del marcador) y la de la clínica discontinua, con el
 * nombre al final de cada línea. Las coordenadas horizontales van en porcentaje para ocupar el
 * ancho del bloque sin deformar el texto. Un valor `null` deja un hueco en la línea.
 */
import { cn } from '@/lib/utils';
import { Marcador, type EstiloSerie } from './leyenda';

export interface SerieLineas {
  nombre: string;
  estilo: EstiloSerie;
  /** Un valor por semana (décimas de porcentaje) o `null` = «Sin datos». */
  valores: (number | null)[];
}

interface Props {
  id: string;
  titulo: string;
  descripcion: string;
  /** Etiquetas del eje X («14/09»…). */
  semanas: string[];
  series: SerieLineas[];
  /** Décimas que ocupan el 100 % del eje Y. */
  maximo: number;
  /** Separación de las marcas del eje Y, en décimas. */
  paso: number;
  formatearMarca: (decimas: number) => string;
}

const ALTO = 250;
const ARRIBA = 14;
const ABAJO = 26;
const X_INICIO = 9; // % (deja sitio a las marcas del eje Y)
const X_FIN = 76; // %
const X_ETIQUETA = 79; // %
const SEPARACION_ETIQUETAS = 15; // px

export function GraficoLineas({ id, titulo, descripcion, semanas, series, maximo, paso, formatearMarca }: Props) {
  const altoTrazado = ALTO - ARRIBA - ABAJO;
  const base = ARRIBA + altoTrazado;
  const xDe = (i: number) => X_INICIO + (i * (X_FIN - X_INICIO)) / Math.max(1, semanas.length - 1);
  const yDe = (v: number) => base - (Math.min(v, maximo) / maximo) * altoTrazado;

  const marcas: number[] = [];
  for (let v = 0; v <= maximo; v += paso) marcas.push(v);

  // Etiquetas finales: a la altura del último valor de cada serie, separadas para no solaparse.
  const finales = series
    .map((s, i) => {
      const ultimo = [...s.valores].reverse().find((v) => v !== null);
      return { i, nombre: s.nombre, y: ultimo === undefined || ultimo === null ? null : yDe(ultimo) };
    })
    .filter((e): e is { i: number; nombre: string; y: number } => e.y !== null)
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < finales.length; k++) {
    finales[k]!.y = Math.max(finales[k]!.y, finales[k - 1]!.y + SEPARACION_ETIQUETAS);
  }
  const desborde = (finales.at(-1)?.y ?? 0) - (base + 4);
  if (desborde > 0) for (const e of finales) e.y -= desborde;

  return (
    <svg
      role="img"
      aria-labelledby={`${id}-titulo`}
      aria-describedby={`${id}-desc`}
      width="100%"
      height={ALTO}
      className="block overflow-visible text-foreground"
      data-grafico={id}
    >
      <title id={`${id}-titulo`}>{titulo}</title>
      <desc id={`${id}-desc`}>{descripcion}</desc>

      {marcas.map((v) => (
        <g key={v}>
          <line x1="0" x2={`${X_FIN + 1}%`} y1={yDe(v)} y2={yDe(v)} className={v === 0 ? 'stroke-muted-foreground' : 'stroke-border'} strokeWidth="1" />
          <text x="0" y={yDe(v) - 4} className="fill-muted-foreground text-[11px] tabular-nums">
            {formatearMarca(v)}
          </text>
        </g>
      ))}

      {semanas.map((s, i) => (
        <text
          key={s}
          x={`${xDe(i)}%`}
          y={ALTO - 6}
          textAnchor="middle"
          // En móvil, una etiqueta de cada dos para que no se solapen (la tabla tiene todas).
          className={cn('fill-muted-foreground text-[11px] tabular-nums', i % 2 === 1 && 'max-sm:hidden')}
        >
          {s}
        </text>
      ))}

      {series.map((serie) => (
        <g key={serie.nombre} data-serie={serie.nombre}>
          {serie.valores.slice(1).map((v, k) => {
            const anterior = serie.valores[k];
            if (v === null || anterior === null || anterior === undefined) return null;
            return (
              <line
                key={k}
                x1={`${xDe(k)}%`}
                x2={`${xDe(k + 1)}%`}
                y1={yDe(anterior)}
                y2={yDe(v)}
                strokeWidth="2"
                strokeLinecap="round"
                style={{ stroke: serie.estilo.color, strokeDasharray: serie.estilo.discontinua ? '5 4' : undefined }}
              />
            );
          })}
          {serie.estilo.forma !== 'linea' &&
            serie.valores.map((v, i) =>
              v === null ? null : (
                <svg key={i} x={`${xDe(i)}%`} y={yDe(v)} overflow="visible">
                  <Marcador estilo={serie.estilo} />
                </svg>
              ),
            )}
        </g>
      ))}

      {finales.map((e) => (
        <text key={e.nombre} x={`${X_ETIQUETA}%`} y={e.y + 4} className="fill-current text-xs font-medium">
          {e.nombre}
        </text>
      ))}
    </svg>
  );
}
