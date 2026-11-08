import { CalendarOff } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccionesCita } from '@/components/agenda/acciones-cita';
import { LineaTiempo } from '@/components/agenda/linea-tiempo';
import { formatearRango } from '@/lib/formato';
import { NavegacionDia } from '@/components/agenda/navegacion-dia';
import { SelectorProfesional } from '@/components/agenda/selector-profesional';
import { exigirSesion } from '@/lib/sesion';
import { ahora } from '@/lib/reloj';
import { esFechaValida, fechaLocal, minutosDeHora, sumarDias } from '@/lib/zona';
import { obtenerAgendaDia } from '@/servicios/agenda';
import { ETIQUETA_ESPECIALIDAD, listarProfesionales, obtenerClinica } from '@/servicios/catalogo';

type Parametros = { profesionalId: string; fecha: string };

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<Parametros> }): Promise<Metadata> {
  const { fecha } = await params;
  return { title: `Agenda ${fecha.split('-').reverse().join('/')}` };
}

function minutosATexto(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export default async function PaginaAgendaDia({ params }: { params: Promise<Parametros> }) {
  const { profesionalId, fecha } = await params;
  if (!RE_UUID.test(profesionalId) || !esFechaValida(fecha)) notFound();

  const clinicaId = await exigirSesion();
  const [clinica, profesionales, agenda] = await Promise.all([
    obtenerClinica(clinicaId),
    listarProfesionales(clinicaId),
    obtenerAgendaDia(clinicaId, profesionalId, fecha),
  ]);
  if (!clinica || !agenda) notFound();

  const hoy = fechaLocal(ahora(), clinica.zonaHoraria);
  const activas = agenda.citas.filter((c) => c.estado === 'reservada' || c.estado === 'completada');
  const libreReservable = agenda.huecosLibres
    .filter((h) => h.reservable)
    .reduce((t, h) => t + minutosDeHora(h.fin) - minutosDeHora(h.inicio), 0);

  return (
    <div className="space-y-5">
      <SelectorProfesional
        actual={profesionalId}
        fecha={fecha}
        profesionales={profesionales.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          especialidad: ETIQUETA_ESPECIALIDAD[p.especialidad],
        }))}
      />

      <NavegacionDia
        profesionalId={profesionalId}
        fecha={fecha}
        etiquetaFecha={agenda.etiquetaFecha}
        anterior={sumarDias(fecha, -1)}
        siguiente={sumarDias(fecha, 1)}
        hoy={hoy}
        esHoy={agenda.esHoy}
      />

      <section
        aria-labelledby="titulo-dia"
        className="rounded-2xl border bg-card/70 p-3 shadow-xs sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2 id="titulo-dia" className="text-lg font-semibold">
            {agenda.profesional.nombre}
            <span className="font-normal text-muted-foreground">
              {' '}
              · {ETIQUETA_ESPECIALIDAD[agenda.profesional.especialidad]}
            </span>
          </h2>
          {agenda.laborable && (
            <p className="text-sm text-muted-foreground">
              {activas.length === 1 ? '1 cita' : `${activas.length} citas`} · Libre para reservar:{' '}
              {minutosATexto(libreReservable)} · Horario {agenda.horario.apertura}–
              {agenda.horario.cierre}
            </p>
          )}
        </div>

        {agenda.laborable ? (
          <LineaTiempo
            agenda={agenda}
            renderAcciones={(cita) => (
              <AccionesCita
                citaId={cita.id}
                acciones={cita.accionesDisponibles}
                paciente={cita.paciente.nombre}
                rango={formatearRango(cita.inicio, cita.fin)}
              />
            )}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <CalendarOff aria-hidden className="size-8 text-muted-foreground" />
            <p className="text-base font-medium">La clínica no abre este día.</p>
            <p className="text-sm text-muted-foreground">Elige un día de lunes a viernes.</p>
          </div>
        )}
      </section>
    </div>
  );
}
