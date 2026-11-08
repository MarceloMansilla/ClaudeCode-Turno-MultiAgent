import { notFound } from 'next/navigation';
import { FormularioCifras } from '@/components/paciente/formulario-cifras';
import { MarcoPaciente, TelefonoClinica } from '@/components/paciente/marco-paciente';
import { PantallaEnlaceBloqueado } from '@/components/paciente/pantalla-enlace-bloqueado';
import { ProximasCitas } from '@/components/paciente/proximas-citas';
import { cookieDeAcceso } from '@/lib/sesion-paciente';
import { pantallaPaciente } from '@/servicios/portal-paciente';

/**
 * `/p/[token]` (spec 005, contracts/ui-routes.md). El servidor decide la pantalla en cada carga:
 * no válido (404, misma respuesta para todo enlace no válido, FR-007), bloqueado, en pausa,
 * cifras o, con el acceso abierto, «Sus próximas citas».
 */
export default async function PaginaPaciente({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pantalla = await pantallaPaciente(token, await cookieDeAcceso());

  if (pantalla.tipo === 'no_valido') notFound();

  return (
    <MarcoPaciente clinica={pantalla.clinica}>
      {pantalla.tipo === 'bloqueado' && <PantallaEnlaceBloqueado clinica={pantalla.clinica} />}
      {pantalla.tipo === 'pausa' && <FormularioCifras key="pausa" token={token} pausaHasta={pantalla.hasta} />}
      {pantalla.tipo === 'cifras' && <FormularioCifras key="cifras" token={token} />}
      {(pantalla.tipo === 'pausa' || pantalla.tipo === 'cifras') && (
        // FR-006: antes de entrar solo se ve el nombre y el teléfono de la clínica.
        <p className="mt-5 flex flex-wrap items-center gap-x-2 text-base text-muted-foreground">
          ¿Tiene algún problema? Llame a {pantalla.clinica.nombre}:
          <TelefonoClinica telefono={pantalla.clinica.telefono} />
        </p>
      )}
      {pantalla.tipo === 'dentro' && <ProximasCitas citas={pantalla.citas} clinica={pantalla.clinica} token={token} />}
    </MarcoPaciente>
  );
}
