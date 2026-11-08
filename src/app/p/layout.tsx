import type { Metadata } from 'next';
import { clinicaDeLaInstalacion } from '@/servicios/enlaces';

/**
 * Rutas del paciente (spec 005). El título es siempre «CitaClara · <clínica>», nunca el nombre
 * del paciente (research R10), y estas páginas no se indexan.
 */
export async function generateMetadata(): Promise<Metadata> {
  const clinica = await clinicaDeLaInstalacion();
  return {
    title: { absolute: `CitaClara · ${clinica?.nombre ?? 'tu clínica'}` },
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

export default function LayoutPaciente({ children }: { children: React.ReactNode }) {
  return children;
}
