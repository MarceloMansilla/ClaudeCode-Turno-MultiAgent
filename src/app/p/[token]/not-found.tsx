import { MarcoPaciente } from '@/components/paciente/marco-paciente';
import { PantallaEnlaceNoValido } from '@/components/paciente/pantalla-enlace-no-valido';
import { clinicaDeLaInstalacion } from '@/servicios/enlaces';

/**
 * «Enlace no válido» (spec 005, FR-007): un enlace inventado, mal copiado o regenerado recibe
 * exactamente esta respuesta, con estado 404 y sin ningún dato de pacientes.
 */
export default async function EnlaceNoValido() {
  const clinica = await clinicaDeLaInstalacion();
  return (
    <MarcoPaciente clinica={clinica}>
      <PantallaEnlaceNoValido clinica={clinica} />
    </MarcoPaciente>
  );
}
