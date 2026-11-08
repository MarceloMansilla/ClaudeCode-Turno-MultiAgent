import { CalendarClock, CircleCheck, CircleSlash, UserX, type LucideIcon } from 'lucide-react';
import type { EstadoCita } from '@/db/esquema';
import { formatearRango } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { CitaVista } from '@/servicios/agenda';

const ESTILO: Record<EstadoCita, { icono: LucideIcon; clase: string; borde: string }> = {
  reservada: {
    icono: CalendarClock,
    clase: 'bg-estado-reservada text-estado-reservada-foreground',
    borde: 'border-l-estado-reservada-foreground',
  },
  completada: {
    icono: CircleCheck,
    clase: 'bg-estado-completada text-estado-completada-foreground',
    borde: 'border-l-estado-completada-foreground',
  },
  cancelada: {
    icono: CircleSlash,
    clase: 'bg-estado-cancelada text-estado-cancelada-foreground',
    borde: 'border-l-estado-cancelada-foreground/50',
  },
  no_asistida: {
    icono: UserX,
    clase: 'bg-estado-no-asistida text-estado-no-asistida-foreground',
    borde: 'border-l-estado-no-asistida-foreground',
  },
};

/** Distintivo de estado: color + icono + texto (nunca solo color). */
export function EstadoCitaDistintivo({ estado, etiqueta }: { estado: EstadoCita; etiqueta: string }) {
  const { icono: Icono, clase } = ESTILO[estado];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        clase,
      )}
    >
      <Icono aria-hidden className="size-3.5" />
      {etiqueta}
    </span>
  );
}

/** Bloque de una cita en la agenda del día (US1). `acciones` lo aporta la US3. */
export function BloqueCita({ cita, acciones }: { cita: CitaVista; acciones?: React.ReactNode }) {
  const inactiva = cita.estado === 'cancelada' || cita.estado === 'no_asistida';
  return (
    <article
      aria-label={`${formatearRango(cita.inicio, cita.fin)}, ${cita.paciente.nombre}, ${cita.etiquetaEstado}`}
      data-estado={cita.estado}
      className={cn(
        'flex h-full flex-col gap-1.5 rounded-xl border border-l-4 bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:gap-4',
        ESTILO[cita.estado].borde,
        inactiva && 'bg-card/60 shadow-none',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold tabular-nums">
            {formatearRango(cita.inicio, cita.fin)}
          </span>
          <EstadoCitaDistintivo estado={cita.estado} etiqueta={cita.etiquetaEstado} />
        </div>
        <p
          className={cn(
            'mt-0.5 truncate text-base font-medium',
            inactiva && 'text-muted-foreground line-through decoration-1',
          )}
        >
          {cita.paciente.nombre}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {cita.servicio.nombre} · {cita.servicio.duracionMinutos} min · {cita.servicio.precio}
          <span className="hidden md:inline"> · {cita.paciente.telefono}</span>
        </p>
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
    </article>
  );
}
