'use client';

import { Copy, KeyRound, Link2, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { obtenerEnlacePaciente, regenerarEnlacePaciente } from '@/acciones/enlaces';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

/**
 * Menú «Enlace del paciente» del bloque de cita (spec 005, contracts/ui-routes.md «Panel»):
 * copiar el enlace vigente (FR-005) o generar uno nuevo con confirmación (FR-004).
 */
export function EnlacePaciente({ pacienteId, paciente }: { pacienteId: string; paciente: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [manual, setManual] = useState<string | null>(null);

  async function copiar(ruta: string, aviso: string) {
    const url = `${window.location.origin}${ruta}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(aviso);
      setManual(null);
    } catch {
      setManual(url); // sin portapapeles: se muestra para copiarla a mano
    }
  }

  function manejarFallo(r: { codigo: string; mensaje: string }) {
    if (r.codigo === 'SESION_CADUCADA') router.push('/entrar?motivo=sesion');
    else toast.error(r.mensaje);
  }

  function copiarVigente() {
    iniciar(async () => {
      const r = await obtenerEnlacePaciente({ pacienteId });
      if (r.ok) await copiar(r.datos.ruta, `Enlace de ${paciente} copiado`);
      else manejarFallo(r);
    });
  }

  function regenerar() {
    iniciar(async () => {
      const r = await regenerarEnlacePaciente({ pacienteId });
      setConfirmando(false);
      if (!r.ok) return manejarFallo(r);
      const { ruta } = r.datos;
      toast.success('Enlace nuevo generado', {
        action: { label: 'Copiar', onClick: () => void copiar(ruta, `Enlace de ${paciente} copiado`) },
      });
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="h-11 bg-card" disabled={pendiente}>
            {pendiente ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Link2 aria-hidden className="size-4" />}
            Enlace del paciente
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="min-h-11" onSelect={copiarVigente}>
            <Copy aria-hidden className="size-4" />
            Copiar enlace
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => setConfirmando(true)}>
            <RefreshCw aria-hidden className="size-4" />
            Generar enlace nuevo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {manual && (
        <div className="w-full space-y-1">
          <label htmlFor={`enlace-${pacienteId}`} className="text-sm font-medium">
            Cópialo y envíaselo al paciente
          </label>
          <Input
            id={`enlace-${pacienteId}`}
            readOnly
            value={manual}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            className="h-11"
          />
        </div>
      )}

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Generar un enlace nuevo para {paciente}?</AlertDialogTitle>
            <AlertDialogDescription>
              El enlace actual dejará de funcionar ahora mismo, también si estaba bloqueado. Sus citas no
              cambian. Tendrás que darle el enlace nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={pendiente}>
              Cancelar
            </AlertDialogCancel>
            <Button type="button" className="h-11" disabled={pendiente} onClick={regenerar}>
              {pendiente ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <KeyRound aria-hidden className="size-4" />}
              Generar enlace nuevo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
