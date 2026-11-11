/**
 * Página «Analítica» (spec 004). Solo lectura (FR-015): sin formularios ni Server Actions; el
 * único control es el desplegable de detalle por profesional.
 */
import type { Metadata } from 'next';
import { GraficoBarras } from '@/components/analitica/grafico-barras';
import { GraficoLineas, type SerieLineas } from '@/components/analitica/grafico-lineas';
import { ESTILO_CLINICA, estiloSerie, Leyenda } from '@/components/analitica/leyenda';
import {
  etiquetaSemana,
  TablaIngresos,
  TablaNoAsistencia,
  TablaOcupacion,
  TablaSemanal,
  TablaSemanalProfesional,
} from '@/components/analitica/tablas';
import { TarjetasResumen } from '@/components/analitica/tarjetas-resumen';
import type { Indicadores, ResumenAnalitica } from '@/dominio/analitica';
import { formatearDiaMes, formatearEntero, formatearPorcentaje, formatearPrecio } from '@/lib/formato';
import { exigirSesion } from '@/lib/sesion';
import { obtenerAnalitica } from '@/servicios/analitica';

export const metadata: Metadata = { title: 'Analítica · CitaClara' };
export const dynamic = 'force-dynamic';

/** Marca de eje en porcentaje entero: 250 décimas → «25 %». */
const marcaPorcentaje = (decimas: number) => `${formatearEntero(Math.round(decimas / 10))} %`;

/** Redondea hacia arriba a un múltiplo de `paso` (mínimo `paso`). */
const techo = (valor: number, paso: number) => Math.max(paso, Math.ceil(valor / paso) * paso);

function mayor<T>(elementos: T[], valor: (e: T) => number | null): T | undefined {
  let mejor: T | undefined;
  let max = -Infinity;
  for (const e of elementos) {
    const v = valor(e);
    if (v !== null && v > max) {
      max = v;
      mejor = e;
    }
  }
  return mejor;
}

function Bloque({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border bg-card/70 p-4 shadow-xs sm:p-6">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {titulo}
      </h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-start">{children}</div>
    </section>
  );
}

export default async function PaginaAnalitica() {
  const clinicaId = await exigirSesion();
  const r = await obtenerAnalitica(clinicaId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Analítica</h1>
        <p className="mt-1 text-muted-foreground">Últimas 8 semanas: {r.periodo.etiqueta}</p>
        <p className="text-sm text-muted-foreground">La semana en curso no se incluye.</p>
      </header>

      {r.hayDatos ? (
        <Contenido r={r} />
      ) : (
        <p className="rounded-2xl border bg-card px-6 py-16 text-center">
          Todavía no hay citas suficientes para mostrar la analítica.
        </p>
      )}
    </div>
  );
}

function Contenido({ r }: { r: ResumenAnalitica }) {
  const color = (i: number) => estiloSerie(i).color;

  const masOcupado = mayor(r.profesionales, (p) => p.ocupacionDecimas);
  const masNoAsistencia = mayor(r.profesionales, (p) => p.tasaNoAsistenciaDecimas);
  const servicioTop = mayor(r.ingresosPorServicio, (s) => s.importeCentimos);
  const semanaTop = mayor(r.semanas, (s) => s.ingresosCentimos);
  const maxTasa = Math.max(0, ...r.profesionales.map((p) => p.tasaNoAsistenciaDecimas ?? 0));

  return (
    <>
      <TarjetasResumen clinica={r.clinica} ingresosTotalCentimos={r.ingresosTotalCentimos} />

      <Bloque id="bloque-ocupacion" titulo="Ocupación por profesional">
        <GraficoBarras
          id="grafico-ocupacion"
          titulo="Ocupación por profesional"
          descripcion={
            masOcupado
              ? `${masOcupado.nombre} tiene la ocupación más alta: ${formatearPorcentaje(masOcupado.ocupacionDecimas)}. Clínica: ${formatearPorcentaje(r.clinica.ocupacionDecimas)}.`
              : 'Sin datos de ocupación.'
          }
          orientacion="horizontal"
          maximo={1000}
          filas={r.profesionales.map((p, i) => ({
            etiqueta: p.nombre,
            valor: p.ocupacionDecimas,
            texto: formatearPorcentaje(p.ocupacionDecimas),
            color: color(i),
          }))}
        />
        <TablaOcupacion profesionales={r.profesionales} clinica={r.clinica} />
      </Bloque>

      <Bloque id="bloque-no-asistencia" titulo="No asistencia por profesional">
        <GraficoBarras
          id="grafico-no-asistencia"
          titulo="No asistencia por profesional"
          descripcion={
            masNoAsistencia
              ? `${masNoAsistencia.nombre} tiene la tasa más alta: ${formatearPorcentaje(masNoAsistencia.tasaNoAsistenciaDecimas)}. Clínica: ${formatearPorcentaje(r.clinica.tasaNoAsistenciaDecimas)}.`
              : 'Sin datos de no asistencia.'
          }
          orientacion="horizontal"
          maximo={techo(maxTasa, 50)}
          filas={r.profesionales.map((p, i) => ({
            etiqueta: p.nombre,
            valor: p.tasaNoAsistenciaDecimas,
            texto:
              p.tasaNoAsistenciaDecimas === null
                ? 'Sin datos'
                : `${formatearPorcentaje(p.tasaNoAsistenciaDecimas)} (${formatearEntero(p.noAsistidas)} de ${formatearEntero(p.completadas + p.noAsistidas)})`,
            color: color(i),
          }))}
        />
        <TablaNoAsistencia profesionales={r.profesionales} clinica={r.clinica} />
      </Bloque>

      <Bloque id="bloque-ingresos" titulo="Ingresos por servicio">
        <GraficoBarras
          id="grafico-ingresos"
          titulo="Ingresos por servicio"
          descripcion={
            servicioTop && servicioTop.importeCentimos > 0
              ? `${servicioTop.nombre} es el servicio con más ingresos: ${formatearPrecio(servicioTop.importeCentimos)}. Total: ${formatearPrecio(r.ingresosTotalCentimos)}.`
              : `Total: ${formatearPrecio(r.ingresosTotalCentimos)}.`
          }
          orientacion="horizontal"
          maximo={Math.max(1, ...r.ingresosPorServicio.map((s) => s.importeCentimos))}
          filas={r.ingresosPorServicio.map((s) => ({
            etiqueta: s.nombre,
            valor: s.importeCentimos,
            texto: formatearPrecio(s.importeCentimos),
          }))}
        />
        <TablaIngresos servicios={r.ingresosPorServicio} totalCentimos={r.ingresosTotalCentimos} />
      </Bloque>

      <Evolucion r={r} semanaTop={semanaTop?.lunes} />
    </>
  );
}

function Evolucion({ r, semanaTop }: { r: ResumenAnalitica; semanaTop?: string }) {
  const ejeX = r.semanas.map((s) => formatearDiaMes(s.lunes));
  const series = (valor: (x: Indicadores) => number | null): SerieLineas[] => [
    ...r.profesionales.map((p, i) => ({
      nombre: p.nombre,
      estilo: estiloSerie(i),
      valores: r.semanas.map((s) => valor(s.porProfesional[i]!)),
    })),
    { nombre: 'Clínica', estilo: ESTILO_CLINICA, valores: r.semanas.map((s) => valor(s.clinica)) },
  ];
  const leyenda = [
    ...r.profesionales.map((p, i) => ({ nombre: p.nombre, estilo: estiloSerie(i) })),
    { nombre: 'Clínica', estilo: ESTILO_CLINICA },
  ];
  const primera = r.semanas[0]!;
  const ultima = r.semanas.at(-1)!;
  const maxTasaSemanal = Math.max(
    0,
    ...r.semanas.flatMap((s) => [s.clinica, ...s.porProfesional].map((x) => x.tasaNoAsistenciaDecimas ?? 0)),
  );
  const maxIngresos = techo(Math.max(0, ...r.semanas.map((s) => s.ingresosCentimos)), 100_000);
  const pasoIngresos = techo(maxIngresos / 4, 100_000);
  const marcasIngresos = [];
  for (let v = 0; v <= maxIngresos; v += pasoIngresos) {
    marcasIngresos.push({ valor: v, texto: `${formatearEntero(v / 100)} €` });
  }
  const tendencia = (x: (s: (typeof r.semanas)[number]) => number | null, nombre: string) =>
    `${nombre} de la clínica: ${formatearPorcentaje(x(primera))} en la ${etiquetaSemana(primera.lunes)} y ${formatearPorcentaje(x(ultima))} en la ${etiquetaSemana(ultima.lunes)}.`;

  return (
    <section aria-labelledby="bloque-evolucion" className="space-y-6 rounded-2xl border bg-card/70 p-4 shadow-xs sm:p-6">
      <div className="space-y-3">
        <h2 id="bloque-evolucion" className="text-lg font-semibold tracking-tight">
          Evolución de las últimas 8 semanas
        </h2>
        <Leyenda series={leyenda} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <figure className="space-y-2">
          <figcaption className="text-sm font-medium">Ocupación semanal</figcaption>
          <GraficoLineas
            id="grafico-ocupacion-semanal"
            titulo="Ocupación semanal por profesional y de la clínica"
            descripcion={tendencia((s) => s.clinica.ocupacionDecimas, 'Ocupación')}
            semanas={ejeX}
            series={series((x) => x.ocupacionDecimas)}
            maximo={1000}
            paso={250}
            formatearMarca={marcaPorcentaje}
          />
        </figure>
        <figure className="space-y-2">
          <figcaption className="text-sm font-medium">No asistencia semanal</figcaption>
          <GraficoLineas
            id="grafico-no-asistencia-semanal"
            titulo="No asistencia semanal por profesional y de la clínica"
            descripcion={tendencia((s) => s.clinica.tasaNoAsistenciaDecimas, 'No asistencia')}
            semanas={ejeX}
            series={series((x) => x.tasaNoAsistenciaDecimas)}
            maximo={techo(maxTasaSemanal, 50)}
            paso={50}
            formatearMarca={marcaPorcentaje}
          />
        </figure>
      </div>

      <figure className="space-y-2">
        <figcaption className="text-sm font-medium">Ingresos por semana</figcaption>
        <GraficoBarras
          id="grafico-ingresos-semanales"
          titulo="Ingresos por semana"
          descripcion={
            semanaTop
              ? `La ${etiquetaSemana(semanaTop)} fue la de más ingresos: ${formatearPrecio(r.semanas.find((s) => s.lunes === semanaTop)!.ingresosCentimos)}. Total: ${formatearPrecio(r.ingresosTotalCentimos)}.`
              : `Total: ${formatearPrecio(r.ingresosTotalCentimos)}.`
          }
          orientacion="vertical"
          maximo={maxIngresos}
          marcas={marcasIngresos}
          filas={r.semanas.map((s) => ({
            etiqueta: formatearDiaMes(s.lunes),
            valor: s.ingresosCentimos,
            texto: formatearPrecio(s.ingresosCentimos),
          }))}
        />
      </figure>

      <TablaSemanal semanas={r.semanas} clinica={r.clinica} totalCentimos={r.ingresosTotalCentimos} />
      <TablaSemanalProfesional semanas={r.semanas} />
    </section>
  );
}
