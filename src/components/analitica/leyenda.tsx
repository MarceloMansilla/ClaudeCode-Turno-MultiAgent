/**
 * Identidad visual de cada serie (spec 004, FR-013, Principio VII): color **y** forma del
 * marcador, siempre con el nombre en texto. La asignación sigue el orden de la agenda y nunca
 * depende del valor (el color acompaña a la persona, no a su posición en un ranking).
 */
export type Forma = 'circulo' | 'cuadrado' | 'triangulo' | 'rombo' | 'linea';

export interface EstiloSerie {
  color: string;
  forma: Forma;
  discontinua?: boolean;
}

const FORMAS: Forma[] = ['circulo', 'cuadrado', 'triangulo', 'rombo'];

/** Profesional en la posición `indice` (0 = primero de la agenda). */
export function estiloSerie(indice: number): EstiloSerie {
  // Tres colores validados para daltonismo; a partir del cuarto profesional, gris neutro y la
  // forma distingue la serie (nunca se genera un color nuevo).
  const color = indice < 3 ? `var(--grafico-${indice + 1})` : 'var(--muted-foreground)';
  return { color, forma: FORMAS[indice % FORMAS.length]! };
}

/** La clínica: línea discontinua en el color del texto. */
export const ESTILO_CLINICA: EstiloSerie = { color: 'var(--foreground)', forma: 'linea', discontinua: true };

/** Marcador centrado en (0, 0); se coloca con un `<svg x y overflow="visible">` o un `<g transform>`. */
export function Marcador({ estilo, tamano = 9 }: { estilo: EstiloSerie; tamano?: number }) {
  const r = tamano / 2;
  const relleno = { fill: estilo.color, stroke: 'var(--card)', strokeWidth: 1.5 };
  switch (estilo.forma) {
    case 'circulo':
      return <circle cx="0" cy="0" r={r} style={relleno} />;
    case 'cuadrado':
      return <rect x={-r} y={-r} width={tamano} height={tamano} style={relleno} />;
    case 'triangulo':
      return <polygon points={`0,${-r - 1} ${r + 1},${r} ${-r - 1},${r}`} style={relleno} />;
    case 'rombo':
      return <polygon points={`0,${-r - 1} ${r + 1},0 0,${r + 1} ${-r - 1},0`} style={relleno} />;
    case 'linea':
      return (
        <line
          x1={-r - 3}
          x2={r + 3}
          y1="0"
          y2="0"
          style={{ stroke: estilo.color, strokeWidth: 2, strokeDasharray: estilo.discontinua ? '4 3' : undefined }}
        />
      );
  }
}

export function Leyenda({ series }: { series: { nombre: string; estilo: EstiloSerie }[] }) {
  return (
    <ul aria-label="Leyenda" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {series.map(({ nombre, estilo }) => (
        <li key={nombre} className="inline-flex items-center gap-2">
          <svg aria-hidden width="18" height="12" className="overflow-visible">
            <g transform="translate(9 6)">
              <Marcador estilo={estilo} />
            </g>
          </svg>
          {nombre}
        </li>
      ))}
    </ul>
  );
}
