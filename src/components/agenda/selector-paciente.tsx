'use client';

import { Check, Loader2, Search, UserPlus, Users } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { buscarPacientes } from '@/acciones/pacientes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface PacienteElegido {
  id: string;
  nombre: string;
  telefono: string;
}

export interface DatosNuevo {
  nombre: string;
  telefono: string;
  email: string;
}

export type ValorPaciente =
  | { modo: 'existente'; paciente: PacienteElegido | null }
  | { modo: 'nuevo'; datos: DatosNuevo };

/**
 * Elección del paciente (FR-016, FR-016a): buscador por nombre o teléfono, o alta rápida de
 * ficha nueva. Los errores de campo llegan desde el formulario de la cita.
 */
export function SelectorPaciente({
  valor,
  onCambio,
  errores,
}: {
  valor: ValorPaciente;
  onCambio: (v: ValorPaciente) => void;
  errores: { nombre?: string; telefono?: string; email?: string; paciente?: string };
}) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<PacienteElegido[]>([]);
  const [buscando, setBuscando] = useState(false);
  const ultima = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** Búsqueda con espera de 200 ms; solo cuenta la respuesta de la última pulsación. */
  function cambiarTexto(nuevo: string) {
    setTexto(nuevo);
    clearTimeout(temporizador.current);
    const n = ++ultima.current;
    if (nuevo.trim().length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    temporizador.current = setTimeout(async () => {
      const r = await buscarPacientes({ texto: nuevo });
      if (n !== ultima.current) return;
      setResultados(r.ok ? r.datos : []);
      setBuscando(false);
    }, 200);
  }

  if (valor.modo === 'nuevo') {
    const d = valor.datos;
    const set = (campo: keyof DatosNuevo) => (ev: React.ChangeEvent<HTMLInputElement>) =>
      onCambio({ modo: 'nuevo', datos: { ...d, [campo]: ev.target.value } });
    return (
      <fieldset className="space-y-4 rounded-xl border bg-muted/40 p-4">
        <legend className="px-1 text-sm font-semibold">Paciente nuevo</legend>
        <Campo id={`${id}-nombre`} etiqueta="Nombre y apellidos" error={errores.nombre}>
          <Input id={`${id}-nombre`} value={d.nombre} onChange={set('nombre')} autoComplete="off" className="h-11 text-base" aria-invalid={!!errores.nombre || undefined} aria-describedby={errores.nombre ? `${id}-nombre-error` : undefined} />
        </Campo>
        <Campo id={`${id}-telefono`} etiqueta="Teléfono" ayuda="Número español de 9 cifras" error={errores.telefono}>
          <Input id={`${id}-telefono`} value={d.telefono} onChange={set('telefono')} inputMode="tel" autoComplete="off" className="h-11 text-base" aria-invalid={!!errores.telefono || undefined} aria-describedby={`${id}-telefono-ayuda${errores.telefono ? ` ${id}-telefono-error` : ''}`} />
        </Campo>
        <Campo id={`${id}-email`} etiqueta="Correo electrónico (opcional)" error={errores.email}>
          <Input id={`${id}-email`} value={d.email} onChange={set('email')} type="email" inputMode="email" autoComplete="off" className="h-11 text-base" aria-invalid={!!errores.email || undefined} aria-describedby={errores.email ? `${id}-email-error` : undefined} />
        </Campo>
        <Button type="button" variant="ghost" className="h-11" onClick={() => onCambio({ modo: 'existente', paciente: null })}>
          <Users aria-hidden className="size-4" />
          Buscar un paciente existente
        </Button>
      </fieldset>
    );
  }

  const elegido = valor.paciente;
  return (
    <div className="space-y-3">
      {elegido ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-accent p-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium">
              <Check aria-hidden className="size-4 text-primary" />
              {elegido.nombre}
            </p>
            <p className="text-sm text-muted-foreground">{elegido.telefono}</p>
          </div>
          <Button type="button" variant="outline" className="h-11 bg-card" onClick={() => onCambio({ modo: 'existente', paciente: null })}>
            Cambiar
          </Button>
        </div>
      ) : (
        <>
          <Campo id={`${id}-buscar`} etiqueta="Buscar paciente" ayuda="Escribe el nombre o el teléfono" error={errores.paciente}>
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={`${id}-buscar`}
                value={texto}
                onChange={(ev) => cambiarTexto(ev.target.value)}
                autoComplete="off"
                className="h-11 pl-9 text-base"
                aria-describedby={`${id}-buscar-ayuda`}
                aria-controls={`${id}-resultados`}
              />
              {buscando && <Loader2 aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
          </Campo>
          <div id={`${id}-resultados`} aria-live="polite">
            {resultados.length > 0 && (
              <ul className="divide-y overflow-hidden rounded-xl border bg-card" aria-label="Pacientes encontrados">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onCambio({ modo: 'existente', paciente: p })}
                      className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    >
                      <span className="truncate font-medium">{p.nombre}</span>
                      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{p.telefono}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!buscando && texto.trim().length >= 2 && resultados.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay pacientes con ese nombre o teléfono.</p>
            )}
          </div>
        </>
      )}
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full bg-card"
        onClick={() =>
          onCambio({
            modo: 'nuevo',
            datos: { nombre: /\d/.test(texto) ? '' : texto, telefono: /\d/.test(texto) ? texto : '', email: '' },
          })
        }
      >
        <UserPlus aria-hidden className="size-4" />
        Paciente nuevo
      </Button>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className={cn('text-sm font-medium text-destructive')}>
          {error}
        </p>
      )}
    </div>
  );
}
