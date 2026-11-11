import { LogOut } from 'lucide-react';
import { salir } from '@/acciones/acceso';
import { Marca } from '@/components/marca';
import { Button } from '@/components/ui/button';

/** Cabecera del panel: marca, nombre de la clínica y «Cerrar sesión» (FR-003). */
export function Cabecera({ nombreClinica }: { nombreClinica: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Marca />
          <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
          <span className="hidden truncate text-sm text-muted-foreground sm:block">
            {nombreClinica}
          </span>
        </div>
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
