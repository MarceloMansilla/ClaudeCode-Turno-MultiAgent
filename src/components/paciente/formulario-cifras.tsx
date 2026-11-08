'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { confirmarCifras } from '@/acciones/paciente';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mensajes } from '@/dominio/errores';

/**
 * «Confirma que eres tú» (spec 005, FR-006): segundo paso del acceso con las 4 últimas cifras
 * del teléfono de la ficha. Con `pausaHasta` se muestra deshabilitado (FR-006a).
 */
export function FormularioCifras({
  token,
  pausaHasta,
  aviso,
}: {
  token: string;
  pausaHasta?: string;
  aviso?: string;
}) {
  const router = useRouter();
  const campo = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | undefined>(
    pausaHasta ? mensajes.accesoEnPausa(pausaHasta) : undefined,
  );
  const [enPausa, setEnPausa] = useState(Boolean(pausaHasta));
  const [enviando, iniciar] = useTransition();

  function enviar(datos: FormData) {
    const cifras = String(datos.get('cifras') ?? '');
    iniciar(async () => {
      const r = await confirmarCifras({ token, cifras });
      if (r.ok) {
        router.refresh();
        return;
      }
      if (r.codigo === 'ENLACE_BLOQUEADO' || r.codigo === 'ENLACE_NO_VALIDO') {
        router.refresh(); // la página muestra la pantalla que corresponda
        return;
      }
      setError(r.mensaje);
      if (r.codigo === 'ACCESO_EN_PAUSA') {
        setEnPausa(true);
        return;
      }
      if (campo.current) {
        campo.current.value = '';
        campo.current.focus();
      }
    });
  }

  const deshabilitado = enPausa || enviando;
  return (
    <section aria-labelledby="titulo-cifras" className="space-y-5 rounded-2xl border bg-card p-5 shadow-xs">
      <div className="space-y-1">
        <h1 id="titulo-cifras" className="text-xl font-semibold">
          Confirma que eres tú
        </h1>
        {aviso && (
          <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
            {aviso}
          </p>
        )}
      </div>
      <form action={enviar} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="cifras" className="text-base">
            Escribe las 4 últimas cifras de tu teléfono
          </Label>
          <Input
            ref={campo}
            id="cifras"
            name="cifras"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{4}"
            maxLength={4}
            required
            autoFocus
            disabled={enPausa}
            className="h-12 max-w-40 text-center text-lg tracking-[0.4em]"
            aria-invalid={error && !enPausa ? true : undefined}
            aria-describedby="cifras-error"
          />
          <p id="cifras-error" aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
            {error}
          </p>
        </div>
        <Button type="submit" className="h-12 w-full text-base" disabled={deshabilitado}>
          {enviando && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Entrar
        </Button>
      </form>
    </section>
  );
}
