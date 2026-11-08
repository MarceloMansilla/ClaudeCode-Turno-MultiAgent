import { Cabecera } from '@/components/cabecera';
import { exigirSesion } from '@/lib/sesion';
import { obtenerClinica } from '@/servicios/catalogo';

export default async function LayoutAgenda({ children }: { children: React.ReactNode }) {
  const clinicaId = await exigirSesion();
  const clinica = await obtenerClinica(clinicaId);

  return (
    <div className="min-h-dvh bg-muted/40">
      <Cabecera nombreClinica={clinica?.nombre ?? ''} />
      <main className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:pt-6">{children}</main>
    </div>
  );
}
