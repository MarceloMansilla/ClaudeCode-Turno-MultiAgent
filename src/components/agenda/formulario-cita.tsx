'use client';

import { AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { crearCita } from '@/acciones/citas';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { horasDeInicio } from '@/dominio/horario';
import { formatearFecha } from '@/lib/formato';
import { esFechaValida, horaDeMinutos, minutosDeHora } from '@/lib/zona';
import { SelectorPaciente, type ValorPaciente } from './selector-paciente';

export interface OpcionServicio {
  id: string;
  nombre: string;
  duracionMinutos: number;
  precio: string; // «40,00 €»
}

interface Error {
  mensaje: string;
  campo?: string;
  duplicado?: { pacienteId: string; nombre: string; telefono: string };
}

const claseSelect =
  'h-11 w-full rounded-md border border-input bg-card px-3 text-base shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';

/** Alta de cita (US2, contracts/ui-routes.md). */
export function FormularioCita({
  profesional,
  fechaInicial,
  horaInicial,
  servicios,
  horario,
}: {
  profesional: { id: string; nombre: string };
  fechaInicial: string;
  horaInicial?: string;
  servicios: OpcionServicio[];
  horario: { apertura: string; cierre: string; diasLaborables: number[] };
}) {
  const id = useId();
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? '');
  const [fecha, setFecha] = useState(fechaInicial);
  const [hora, setHora] = useState(horaInicial ?? horario.apertura);
  const [paciente, setPaciente] = useState<ValorPaciente>({ modo: 'existente', paciente: null });
  const [error, setError] = useState<Error | null>(null);

  const servicio = servicios.find((s) => s.id === servicioId);
  const horas = useMemo(
    () =>
      servicio
        ? horasDeInicio(servicio.duracionMinutos, {
            horaApertura: horario.apertura,
            horaCierre: horario.cierre,
            diasLaborables: horario.diasLaborables,
          })
        : [],
    [servicio, horario],
  );
  const termina = servicio ? horaDeMinutos(minutosDeHora(hora) + servicio.duracionMinutos) : null;
  const errorDe = (campo: string) => (error?.campo === campo ? error.mensaje : undefined);
  const errorGeneral =
    error && !['nombre', 'telefono', 'email', 'paciente'].includes(error.campo ?? '') ? error : null;

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (paciente.modo === 'existente' && !paciente.paciente) {
      setError({ campo: 'paciente', mensaje: 'Elige un paciente o crea uno nuevo.' });
      return;
    }
    const datosPaciente =
      paciente.modo === 'existente'
        ? { id: paciente.paciente!.id }
        : { nuevo: { nombre: paciente.datos.nombre, telefono: paciente.datos.telefono, email: paciente.datos.email || null } };

    iniciar(async () => {
      const r = await crearCita({ profesionalId: profesional.id, servicioId, fecha, hora, paciente: datosPaciente });
      if (r.ok) {
        toast.success(`Cita reservada: ${r.datos.inicio}–${r.datos.fin} · ${r.datos.pacienteNombre}`);
        router.push(`/agenda/${profesional.id}/${r.datos.fecha}`);
        router.refresh();
        return;
      }
      if (r.codigo === 'SESION_CADUCADA') {
        router.push('/entrar?motivo=sesion');
        return;
      }
      setError({
        mensaje: r.mensaje,
        campo: r.campo,
        duplicado:
          r.codigo === 'TELEFONO_DUPLICADO' ? (r.detalle as Error['duplicado']) : undefined,
      });
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-5" noValidate>
      {errorGeneral && (
        <div role="alert" className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {errorGeneral.mensaje}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-servicio`}>Servicio</Label>
        <select id={`${id}-servicio`} value={servicioId} onChange={(ev) => setServicioId(ev.target.value)} className={claseSelect}>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} · {s.duracionMinutos} min · {s.precio}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-fecha`}>Día</Label>
          <input
            id={`${id}-fecha`}
            type="date"
            value={fecha}
            onChange={(ev) => ev.target.value && setFecha(ev.target.value)}
            required
            className={claseSelect}
            aria-describedby={`${id}-fecha-texto`}
          />
          {/* Principio II: el formato del control depende del navegador; aquí, siempre en español. */}
          <p id={`${id}-fecha-texto`} className="text-sm font-medium first-letter:uppercase" aria-live="polite">
            {esFechaValida(fecha) ? formatearFecha(fecha) : 'Elige un día'}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-hora`}>Hora</Label>
          <select id={`${id}-hora`} value={hora} onChange={(ev) => setHora(ev.target.value)} className={claseSelect}>
            {!horas.includes(hora) && <option value={hora}>{hora}</option>}
            {horas.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>
      {termina && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock aria-hidden className="size-4" />
          Termina a las <span className="font-semibold text-foreground tabular-nums">{termina}</span>
        </p>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Paciente</h3>
        <SelectorPaciente
          valor={paciente}
          onCambio={(v) => {
            setPaciente(v);
            if (error?.campo && ['nombre', 'telefono', 'email', 'paciente'].includes(error.campo)) setError(null);
          }}
          errores={{
            nombre: errorDe('nombre'),
            telefono: error?.duplicado ? undefined : errorDe('telefono'),
            email: errorDe('email'),
            paciente: errorDe('paciente'),
          }}
        />
        {error?.duplicado && (
          <div role="alert" className="space-y-3 rounded-xl border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-medium">{error.mensaje}</p>
            <Button
              type="button"
              className="h-11"
              onClick={() => {
                const d = error.duplicado!;
                setPaciente({ modo: 'existente', paciente: { id: d.pacienteId, nombre: d.nombre, telefono: d.telefono } });
                setError(null);
              }}
            >
              Usar esta ficha
            </Button>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-1 border-t bg-background/95 px-1 pt-4 pb-1 backdrop-blur">
        <Button type="submit" className="h-12 w-full text-base" disabled={pendiente || !servicio}>
          {pendiente && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Reservar cita
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">Con {profesional.nombre}</p>
      </div>
    </form>
  );
}
