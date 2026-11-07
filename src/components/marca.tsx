import { CalendarCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Logotipo de CitaClara: icono + nombre. */
export function Marca({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <CalendarCheck2 aria-hidden className="size-4.5" />
      </span>
      CitaClara
    </span>
  );
}
