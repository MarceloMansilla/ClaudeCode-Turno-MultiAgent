import { redirect } from 'next/navigation';
import { exigirSesion } from '@/lib/sesion';
import { ahora } from '@/lib/reloj';
import { fechaLocal } from '@/lib/zona';
import { listarProfesionales, obtenerClinica } from '@/servicios/catalogo';

/** US1 #3: al entrar, agenda de hoy del primer profesional. */
export default async function PaginaAgenda() {
  const clinicaId = await exigirSesion();
  const [clinica, profesionales] = await Promise.all([
    obtenerClinica(clinicaId),
    listarProfesionales(clinicaId),
  ]);
  const primero = profesionales[0];
  if (!clinica || !primero) {
    return (
      <p className="rounded-xl border bg-card p-6 text-center">
        Todavía no hay profesionales en la clínica.
      </p>
    );
  }
  redirect(`/agenda/${primero.id}/${fechaLocal(ahora(), clinica.zonaHoraria)}`);
}
