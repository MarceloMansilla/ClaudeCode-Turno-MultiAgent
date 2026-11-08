/**
 * 005, FR-016: único texto de la política de cancelación del paciente. La 002 (portal) y la 003
 * (recordatorios) lo importan y citan «005, FR-016»; ningún otro sitio redacta el plazo (FR-017).
 *
 * Contiene siempre los tres elementos y ningún otro plazo:
 * 1. la regla (cancelar desde el enlace hasta 24 h antes, FR-009);
 * 2. el límite concreto de la cita: «antes del [día], [dd/mm/aaaa] a las [hh:mm]» (nunca
 *    «hasta el»), que es el mismo instante que se aplica al cancelar (SC-004);
 * 3. la alternativa: llamar a la clínica, con su nombre y teléfono.
 */
import { formatearLimite } from '@/lib/formato';
import { limiteCancelacionPaciente } from './plazo-paciente';

export function enunciadoPoliticaCancelacion({
  inicio,
  zonaHoraria,
  clinicaNombre,
  clinicaTelefono,
}: {
  inicio: Date;
  zonaHoraria: string;
  clinicaNombre: string;
  clinicaTelefono: string;
}): string {
  const limite = formatearLimite(limiteCancelacionPaciente(inicio), zonaHoraria);
  return (
    `Puedes cancelar esta cita desde tu enlace antes del ${limite}. ` +
    `Después, llama a ${clinicaNombre} al ${clinicaTelefono}.`
  );
}
