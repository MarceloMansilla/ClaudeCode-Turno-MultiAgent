import { ShieldAlert } from 'lucide-react';
import { mensajes } from '@/dominio/errores';
import { TelefonoClinica } from './marco-paciente';

/**
 * «Enlace bloqueado» (spec 005, FR-006a): tras 10 fallos seguidos ya no se piden las cifras.
 * Solo se desbloquea si recepción genera un enlace nuevo.
 */
export function PantallaEnlaceBloqueado({ clinica }: { clinica: { nombre: string; telefono: string } }) {
  return (
    <section aria-labelledby="titulo-bloqueado" className="space-y-4 rounded-2xl border bg-card p-5 shadow-xs">
      <ShieldAlert aria-hidden className="size-8 text-destructive" />
      <h1 id="titulo-bloqueado" className="text-xl font-semibold">
        Enlace bloqueado
      </h1>
      <p className="text-base">{mensajes.enlaceBloqueado(clinica.nombre, clinica.telefono)}</p>
      <TelefonoClinica telefono={clinica.telefono} />
    </section>
  );
}
