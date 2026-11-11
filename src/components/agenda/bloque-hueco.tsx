import { Plus } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { formatearRango } from '@/lib/formato';
import { minutosDeHora } from '@/lib/zona';
import { cn } from '@/lib/utils';
import type { Hueco } from '@/dominio/huecos';

function duracionTexto(desde: string, hasta: string): string {
  const m = minutosDeHora(hasta) - minutosDeHora(desde);
  const h = Math.floor(m / 60);
  const resto = m % 60;
  if (h === 0) return `${resto} min`;
  return resto === 0 ? `${h} h` : `${h} h ${resto} min`;
}

/** Hueco libre: borde discontinuo y «Reservar» si es futuro (FR-006, FR-008). */
export function BloqueHueco({ hueco, hrefReservar }: { hueco: Hueco; hrefReservar: string }) {
  const rango = formatearRango(hueco.inicio, hueco.fin);
  return (
    <div
      data-hueco={hueco.reservable ? 'reservable' : 'pasado'}
      className={cn(
        'flex h-full items-center justify-between gap-3 rounded-xl border-2 border-dashed px-3 py-2',
        hueco.reservable
          ? 'border-hueco-borde/70 bg-hueco'
          : 'border-border bg-transparent text-muted-foreground',
      )}
    >
      <p className="text-sm">
        <span className="font-semibold tabular-nums">{rango}</span>
        <span className="text-muted-foreground"> · Libre · {duracionTexto(hueco.inicio, hueco.fin)}</span>
      </p>
      {hueco.reservable && (
        <Link
          href={hrefReservar}
          className={cn(buttonVariants({ size: 'sm' }), 'h-11 shrink-0 px-4')}
          aria-label={`Reservar a las ${hueco.inicio}`}
        >
          <Plus aria-hidden className="size-4" />
          Reservar
        </Link>
      )}
    </div>
  );
}
