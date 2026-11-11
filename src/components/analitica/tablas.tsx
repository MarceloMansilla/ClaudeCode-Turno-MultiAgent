/**
 * Tablas con las cifras exactas de cada bloque (spec 004, US1 #7, FR-013): son la fuente
 * accesible de los gráficos. En móvil se desplazan dentro de su propio contenedor.
 */
import type { IndicadoresProfesional, Indicadores, IngresoServicio, Semana } from '@/dominio/analitica';
import { formatearEntero, formatearFechaNumerica, formatearPorcentaje, formatearPrecio } from '@/lib/formato';
import { cn } from '@/lib/utils';

function Tabla({ titulo, cabeceras, children }: { titulo: string; cabeceras: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card" tabIndex={0} role="region" aria-label={`Tabla: ${titulo}`}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{titulo}</caption>
        <thead>
          <tr className="border-b bg-muted/60 text-left text-muted-foreground">
            {cabeceras.map((c, i) => (
              <th key={c} scope="col" className={cn('px-3 py-2 align-bottom font-medium', i > 0 && 'text-right')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

function Fila({ celdas, total = false }: { celdas: React.ReactNode[]; total?: boolean }) {
  return (
    <tr className={cn('border-b last:border-b-0', total && 'bg-muted/40 font-semibold')}>
      {celdas.map((c, i) =>
        i === 0 ? (
          <th key={i} scope="row" className="px-3 py-2 text-left font-medium">
            {c}
          </th>
        ) : (
          <td key={i} className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
            {c}
          </td>
        ),
      )}
    </tr>
  );
}

type ConNombre = Indicadores & { nombre: string };

const conClinica = (profesionales: IndicadoresProfesional[], clinica: Indicadores): ConNombre[] => [
  ...profesionales,
  { ...clinica, nombre: 'Clínica' },
];

export function TablaOcupacion({ profesionales, clinica }: { profesionales: IndicadoresProfesional[]; clinica: Indicadores }) {
  const filas = conClinica(profesionales, clinica);
  return (
    <Tabla titulo="Ocupación por profesional" cabeceras={['Profesional', 'Minutos ocupados', 'Minutos disponibles', 'Ocupación']}>
      <tbody>
        {filas.map((p, i) => (
          <Fila
            key={p.nombre}
            total={i === filas.length - 1}
            celdas={[p.nombre, formatearEntero(p.minutosOcupados), formatearEntero(p.minutosDisponibles), formatearPorcentaje(p.ocupacionDecimas)]}
          />
        ))}
      </tbody>
    </Tabla>
  );
}

export function TablaNoAsistencia({ profesionales, clinica }: { profesionales: IndicadoresProfesional[]; clinica: Indicadores }) {
  const filas = conClinica(profesionales, clinica);
  return (
    <Tabla titulo="No asistencia por profesional" cabeceras={['Profesional', 'No asistidas', 'Completadas + no asistidas', 'Tasa']}>
      <tbody>
        {filas.map((p, i) => (
          <Fila
            key={p.nombre}
            total={i === filas.length - 1}
            celdas={[
              p.nombre,
              formatearEntero(p.noAsistidas),
              formatearEntero(p.completadas + p.noAsistidas),
              formatearPorcentaje(p.tasaNoAsistenciaDecimas),
            ]}
          />
        ))}
      </tbody>
    </Tabla>
  );
}

export function TablaIngresos({ servicios, totalCentimos }: { servicios: IngresoServicio[]; totalCentimos: number }) {
  return (
    <Tabla titulo="Ingresos por servicio" cabeceras={['Servicio', 'Precio', 'Citas completadas', 'Importe']}>
      <tbody>
        {servicios.map((s) => (
          <Fila key={s.servicioId} celdas={[s.nombre, formatearPrecio(s.precioCentimos), formatearEntero(s.citas), formatearPrecio(s.importeCentimos)]} />
        ))}
        <Fila
          total
          celdas={['Total', '', formatearEntero(servicios.reduce((a, s) => a + s.citas, 0)), formatearPrecio(totalCentimos)]}
        />
      </tbody>
    </Tabla>
  );
}

const CABECERAS_SEMANA = ['Completadas', 'No asistidas', 'Canceladas', 'No asistencia', 'Ocupación'];

function celdasIndicadores(x: Indicadores): string[] {
  return [
    formatearEntero(x.completadas),
    formatearEntero(x.noAsistidas),
    formatearEntero(x.canceladas),
    formatearPorcentaje(x.tasaNoAsistenciaDecimas),
    formatearPorcentaje(x.ocupacionDecimas),
  ];
}

export const etiquetaSemana = (lunes: string) => `semana del ${formatearFechaNumerica(lunes)}`;

export function TablaSemanal({ semanas, clinica, totalCentimos }: { semanas: Semana[]; clinica: Indicadores; totalCentimos: number }) {
  return (
    <Tabla titulo="Evolución semanal de la clínica" cabeceras={['Semana', ...CABECERAS_SEMANA, 'Ingresos']}>
      <tbody>
        {semanas.map((s) => (
          <Fila key={s.lunes} celdas={[etiquetaSemana(s.lunes), ...celdasIndicadores(s.clinica), formatearPrecio(s.ingresosCentimos)]} />
        ))}
        <Fila total celdas={['Total', ...celdasIndicadores(clinica), formatearPrecio(totalCentimos)]} />
      </tbody>
    </Tabla>
  );
}

export function TablaSemanalProfesional({ semanas }: { semanas: Semana[] }) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex min-h-11 cursor-pointer items-center rounded-xl px-4 text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        Ver detalle por profesional
      </summary>
      <div className="border-t p-3">
        <Tabla titulo="Evolución semanal por profesional" cabeceras={['Semana', 'Profesional', ...CABECERAS_SEMANA]}>
          {semanas.map((s) => (
            <tbody key={s.lunes} className="border-b last:border-b-0">
              {s.porProfesional.map((p, i) => (
                <tr key={p.profesionalId} className="border-b border-border/60 last:border-b-0" data-semana={s.lunes} data-profesional={p.nombre}>
                  {i === 0 && (
                    <th scope="rowgroup" rowSpan={s.porProfesional.length} className="px-3 py-2 text-left align-top font-medium">
                      {etiquetaSemana(s.lunes)}
                    </th>
                  )}
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    {p.nombre}
                  </th>
                  {celdasIndicadores(p).map((c, k) => (
                    <td key={k} className="px-3 py-2 text-right tabular-nums">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </Tabla>
      </div>
    </details>
  );
}
