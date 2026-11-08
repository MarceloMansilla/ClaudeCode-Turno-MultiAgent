import { LinkIcon } from 'lucide-react';
import { mensajes } from '@/dominio/errores';
import { TelefonoClinica } from './marco-paciente';

/**
 * «Enlace no válido» (spec 005, FR-007): la misma respuesta para un enlace inventado, mal
 * copiado o regenerado. Solo muestra el nombre y el teléfono de la clínica.
 */
export function PantallaEnlaceNoValido({ clinica }: { clinica: { nombre: string; telefono: string } | undefined }) {
  return (
    <section aria-labelledby="titulo-enlace" className="space-y-4 rounded-2xl border bg-card p-5 shadow-xs">
      <LinkIcon aria-hidden className="size-8 text-muted-foreground" />
      <h1 id="titulo-enlace" className="text-xl font-semibold">
        Enlace no válido
      </h1>
      {clinica ? (
        <>
          <p className="text-base">{mensajes.enlaceNoValido(clinica.nombre, clinica.telefono)}</p>
          <TelefonoClinica telefono={clinica.telefono} />
        </>
      ) : (
        <p className="text-base">Este enlace no es válido. Pide uno nuevo a tu clínica.</p>
      )}
    </section>
  );
}
