import type { Metadata } from 'next';
import { FormularioClave } from '@/components/acceso/formulario-clave';
import { Marca } from '@/components/marca';
import { mensajes } from '@/dominio/errores';

export const metadata: Metadata = { title: 'Entrar' };

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const aviso = motivo === 'sesion' ? mensajes.sesionCaducada() : undefined;

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Marca className="text-xl" />
        </div>
        <section
          aria-labelledby="titulo-entrar"
          className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
        >
          <h1 id="titulo-entrar" className="text-xl font-semibold tracking-tight">
            Panel de recepción
          </h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Introduce la clave de la clínica para ver la agenda.
          </p>
          <FormularioClave aviso={aviso} />
        </section>
      </div>
    </main>
  );
}
