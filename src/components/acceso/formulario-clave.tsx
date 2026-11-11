'use client';

import { Loader2, LockKeyhole } from 'lucide-react';
import { useActionState } from 'react';
import { entrar, type EstadoEntrar } from '@/acciones/acceso';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FormularioClave({ aviso }: { aviso?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoEntrar, FormData>(entrar, {});

  return (
    <form action={accion} className="space-y-5" noValidate>
      {aviso && !estado.error && (
        <p className="rounded-lg border border-border bg-muted px-3 py-2.5 text-sm" role="status">
          {aviso}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="clave" className="text-base">
          Clave de la clínica
        </Label>
        <div className="relative">
          <LockKeyhole
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="clave"
            name="clave"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            className="h-12 pl-9 text-base"
            aria-invalid={estado.error ? true : undefined}
            aria-describedby={estado.error ? 'clave-error' : undefined}
          />
        </div>
        {estado.error && (
          <p id="clave-error" role="alert" className="text-sm font-medium text-destructive">
            {estado.error}
          </p>
        )}
      </div>
      <Button type="submit" className="h-12 w-full text-base" disabled={enviando}>
        {enviando && <Loader2 aria-hidden className="size-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}
