'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** «‹ Anterior», «Hoy», «Siguiente ›», selector de fecha y etiqueta del día (FR-007). */
export function NavegacionDia({
  profesionalId,
  fecha,
  etiquetaFecha,
  anterior,
  siguiente,
  hoy,
  esHoy,
}: {
  profesionalId: string;
  fecha: string;
  etiquetaFecha: string;
  anterior: string;
  siguiente: string;
  hoy: string;
  esHoy: boolean;
}) {
  const router = useRouter();
  const base = `/agenda/${profesionalId}`;
  const boton = cn(buttonVariants({ variant: 'outline' }), 'h-11 min-w-11 bg-card');

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight first-letter:uppercase">
          {etiquetaFecha}
        </h1>
        {esHoy && <p className="text-sm font-medium text-primary">Hoy</p>}
      </div>
      <nav aria-label="Cambiar de día" className="flex flex-wrap items-center gap-2">
        <Link href={`${base}/${anterior}`} className={boton} aria-label="Día anterior">
          <ChevronLeft aria-hidden className="size-4" />
          <span className="max-[400px]:sr-only">Anterior</span>
        </Link>
        <Link
          href={`${base}/${hoy}`}
          className={cn(boton, esHoy && 'pointer-events-none opacity-60')}
          aria-disabled={esHoy || undefined}
        >
          Hoy
        </Link>
        <Link href={`${base}/${siguiente}`} className={boton} aria-label="Día siguiente">
          <span className="max-[400px]:sr-only">Siguiente</span>
          <ChevronRight aria-hidden className="size-4" />
        </Link>
        <label className="relative">
          <span className="sr-only">Elegir fecha</span>
          <CalendarDays
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="date"
            value={fecha}
            onChange={(ev) => ev.target.value && router.push(`${base}/${ev.target.value}`)}
            className="h-11 rounded-md border border-input bg-card pr-3 pl-9 text-base shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </label>
      </nav>
    </div>
  );
}
