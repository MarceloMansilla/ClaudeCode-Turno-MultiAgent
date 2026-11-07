import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function AgendaNoEncontrada() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-16 text-center">
      <SearchX aria-hidden className="size-8 text-muted-foreground" />
      <h1 className="text-lg font-semibold">No encontramos esa agenda</h1>
      <p className="text-sm text-muted-foreground">
        El profesional o la fecha no existen. Vuelve a la agenda de hoy.
      </p>
      <Link href="/agenda" className={buttonVariants({ className: 'h-11' })}>
        Ir a la agenda de hoy
      </Link>
    </div>
  );
}
