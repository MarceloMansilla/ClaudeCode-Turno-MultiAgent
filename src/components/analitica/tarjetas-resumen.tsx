/** Resumen de la clínica en tres cifras (spec 004: valores «de la clínica» de FR-006, FR-008 y FR-011). */
import { CalendarCheck, Euro, UserX } from 'lucide-react';
import type { Indicadores } from '@/dominio/analitica';
import { formatearEntero, formatearPorcentaje, formatearPrecio } from '@/lib/formato';

function Tarjeta({
  titulo,
  valor,
  detalle,
  Icono,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  Icono: typeof Euro;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs">
      <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icono aria-hidden className="size-4" />
        {titulo}
      </dt>
      <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{valor}</dd>
      <dd className="mt-1 text-sm text-muted-foreground tabular-nums">{detalle}</dd>
    </div>
  );
}

export function TarjetasResumen({ clinica, ingresosTotalCentimos }: { clinica: Indicadores; ingresosTotalCentimos: number }) {
  return (
    <dl aria-label="Resumen de la clínica" className="grid gap-3 sm:grid-cols-3">
      <Tarjeta
        titulo="Ocupación"
        valor={formatearPorcentaje(clinica.ocupacionDecimas)}
        detalle={`${formatearEntero(clinica.minutosOcupados)} de ${formatearEntero(clinica.minutosDisponibles)} minutos`}
        Icono={CalendarCheck}
      />
      <Tarjeta
        titulo="No asistencia"
        valor={formatearPorcentaje(clinica.tasaNoAsistenciaDecimas)}
        detalle={`${formatearEntero(clinica.noAsistidas)} de ${formatearEntero(clinica.completadas + clinica.noAsistidas)}`}
        Icono={UserX}
      />
      <Tarjeta
        titulo="Ingresos"
        valor={formatearPrecio(ingresosTotalCentimos)}
        detalle={`${formatearEntero(clinica.completadas)} citas completadas`}
        Icono={Euro}
      />
    </dl>
  );
}
