import Link from 'next/link';
import { CalendarDays, ChartColumn, LogOut } from 'lucide-react';
import { salir } from '@/acciones/acceso';
import { Marca } from '@/components/marca';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SeccionPanel = 'agenda' | 'analitica';

const SECCIONES = [
  { id: 'agenda', etiqueta: 'Agenda', href: '/agenda', Icono: CalendarDays },
  { id: 'analitica', etiqueta: 'Analítica', href: '/analitica', Icono: ChartColumn },
] as const;

/**
 * Cabecera del panel: marca, nombre de la clínica, navegación entre secciones (spec 004,
 * FR-002) y «Cerrar sesión» (FR-003). En móvil la navegación ocupa una segunda fila para no
 * provocar desplazamiento horizontal a 360 px.
 */
export function Cabecera({ nombreClinica, seccion }: { nombreClinica: string; seccion: SeccionPanel }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 px-4 sm:h-16 sm:flex-nowrap">
        <div className="flex h-16 min-w-0 items-center gap-3 sm:h-auto">
          <Marca />
          <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
          <span className="hidden truncate text-sm text-muted-foreground sm:block">{nombreClinica}</span>
        </div>
        <nav
          aria-label="Secciones del panel"
          className="order-last -mx-1 flex w-full gap-1 pb-2 sm:order-none sm:mx-0 sm:w-auto sm:pb-0"
        >
          {SECCIONES.map(({ id, etiqueta, href, Icono }) => {
            const activa = id === seccion;
            return (
              <Link
                key={id}
                href={href}
                aria-current={activa ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors sm:flex-none',
                  'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  activa
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icono aria-hidden className="size-4" />
                {etiqueta}
              </Link>
            );
          })}
        </nav>
        <form action={salir}>
          <Button type="submit" variant="ghost" className="h-11 gap-2">
            <LogOut aria-hidden className="size-4" />
            Cerrar sesión
          </Button>
        </form>
      </div>
    </header>
  );
}
