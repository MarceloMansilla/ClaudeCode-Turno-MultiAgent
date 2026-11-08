import { Phone } from 'lucide-react';
import { Marca } from '@/components/marca';
import { normalizarTelefono } from '@/dominio/telefono';

/** Enlace `tel:` con el teléfono de la clínica (Principio VII: se puede llamar con un toque). */
export function TelefonoClinica({ telefono, className }: { telefono: string; className?: string }) {
  const cifras = normalizarTelefono(telefono);
  return (
    <a
      href={cifras ? `tel:+34${cifras}` : undefined}
      className={
        className ??
        'inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline underline-offset-4'
      }
    >
      <Phone aria-hidden className="size-4" />
      {telefono}
    </a>
  );
}

/**
 * Marco común de las pantallas del paciente (spec 005): solo la marca de la clínica, nunca el
 * nombre del paciente antes de entrar. Mobile-first desde 360 px.
 */
export function MarcoPaciente({
  clinica,
  children,
}: {
  clinica: { nombre: string } | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <p className="truncate text-base font-semibold">{clinica?.nombre ?? 'CitaClara'}</p>
          <Marca className="shrink-0 text-sm text-muted-foreground" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
