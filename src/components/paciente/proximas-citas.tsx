import { CalendarDays } from 'lucide-react';
import type { CitaDelPaciente } from '@/servicios/portal-paciente';
import { BotonSalir } from './boton-salir';
import { DialogoCancelarCita } from './dialogo-cancelar-cita';
import { TelefonoClinica } from './marco-paciente';
import { PoliticaCancelacion } from './politica-cancelacion';

/**
 * «Sus próximas citas» (spec 005, research R1): lista mínima y provisional tras entrar. La 002
 * la sustituye por sus pantallas y reutiliza los componentes de acceso y cancelación.
 */
export function ProximasCitas({
  citas,
  clinica,
  token,
}: {
  citas: CitaDelPaciente[];
  clinica: { nombre: string; telefono: string };
  token: string;
}) {
  return (
    <section aria-labelledby="titulo-citas" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 id="titulo-citas" className="text-xl font-semibold">
          Sus próximas citas
        </h1>
        <BotonSalir />
      </div>
      {citas.length === 0 ? (
        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <p className="text-base">No tiene citas próximas.</p>
          <p className="text-sm text-muted-foreground">Para pedir una, llame a {clinica.nombre}:</p>
          <TelefonoClinica telefono={clinica.telefono} />
        </div>
      ) : (
        <ul className="space-y-3">
          {citas.map((c) => (
            <li key={c.id}>
              <article
                aria-label={`${c.fecha} · ${c.hora}, ${c.servicio} con ${c.profesional}`}
                className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <CalendarDays aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-base font-semibold">
                      {c.fecha} · {c.hora}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {c.servicio} con {c.profesional}
                    </p>
                  </div>
                </div>
                {/* FR-011: «Cancelar» solo en plazo; el enunciado (FR-016) siempre. */}
                {c.puedeCancelar && <DialogoCancelarCita token={token} cita={c} />}
                <PoliticaCancelacion enunciado={c.enunciado} telefono={clinica.telefono} />
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
