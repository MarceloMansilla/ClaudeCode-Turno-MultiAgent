import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FormularioCita } from '@/components/agenda/formulario-cita';
import { LineaTiempo } from '@/components/agenda/linea-tiempo';
import { PanelAlta } from '@/components/agenda/panel-alta';
import { formatearFecha, formatearPrecio } from '@/lib/formato';
import { exigirSesion } from '@/lib/sesion';
import { esFechaValida, esHoraValida } from '@/lib/zona';
import { obtenerAgendaDia } from '@/servicios/agenda';
import { ETIQUETA_ESPECIALIDAD, listarServiciosDeEspecialidad, obtenerClinica } from '@/servicios/catalogo';

export const metadata: Metadata = { title: 'Nueva cita' };

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaginaNuevaCita({
  params,
  searchParams,
}: {
  params: Promise<{ profesionalId: string; fecha: string }>;
  searchParams: Promise<{ hora?: string }>;
}) {
  const [{ profesionalId, fecha }, { hora }] = await Promise.all([params, searchParams]);
  if (!RE_UUID.test(profesionalId) || !esFechaValida(fecha)) notFound();

  const clinicaId = await exigirSesion();
  const [clinica, agenda] = await Promise.all([
    obtenerClinica(clinicaId),
    obtenerAgendaDia(clinicaId, profesionalId, fecha),
  ]);
  if (!clinica || !agenda) notFound();
  const servicios = await listarServiciosDeEspecialidad(clinicaId, agenda.profesional.especialidad);

  const volverA = `/agenda/${profesionalId}/${fecha}`;
  return (
    <>
      {/* La agenda del día queda visible detrás del panel en portátil. */}
      <div aria-hidden inert className="pointer-events-none">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight first-letter:uppercase">
          {agenda.etiquetaFecha}
        </h1>
        {agenda.laborable && <LineaTiempo agenda={agenda} />}
      </div>
      <PanelAlta
        volverA={volverA}
        titulo="Nueva cita"
        descripcion={`${agenda.profesional.nombre} · ${ETIQUETA_ESPECIALIDAD[agenda.profesional.especialidad]} · ${formatearFecha(fecha)}`}
      >
        <FormularioCita
          profesional={{ id: agenda.profesional.id, nombre: agenda.profesional.nombre }}
          fechaInicial={fecha}
          horaInicial={hora && esHoraValida(hora) ? hora : undefined}
          servicios={servicios.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            duracionMinutos: s.duracionMinutos,
            precio: formatearPrecio(s.precioCentimos),
          }))}
          horario={{
            apertura: clinica.horaApertura.slice(0, 5),
            cierre: clinica.horaCierre.slice(0, 5),
            diasLaborables: clinica.diasLaborables,
          }}
        />
      </PanelAlta>
    </>
  );
}
