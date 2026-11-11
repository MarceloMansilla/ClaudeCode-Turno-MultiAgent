import { Loader2 } from 'lucide-react';

export default function CargandoAgenda() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
      <Loader2 aria-hidden className="size-5 animate-spin" />
      Cargando la agenda…
    </div>
  );
}
