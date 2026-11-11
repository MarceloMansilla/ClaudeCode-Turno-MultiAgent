'use client';

import { CircleCheck, CircleSlash, Loader2, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { cambiarEstadoCita } from '@/acciones/citas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ETIQUETA_ACCION, type AccionCita } from '@/dominio/estados';

/** Acciones de estado de una cita (US3): solo las de `accionesDisponibles`. */
export function AccionesCita({
  citaId,
  acciones,
  paciente,
  rango,
}: {
  citaId: string;
  acciones: AccionCita[];
  paciente: string;
  rango: string;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  function ejecutar(accion: AccionCita) {
    iniciar(async () => {
      const r = await cambiarEstadoCita({ citaId, accion });
      if (r.ok) {
        toast.success(`${paciente} (${rango}): ${r.datos.etiquetaEstado.toLowerCase()}`);
      } else if (r.codigo === 'SESION_CADUCADA') {
        router.push('/entrar?motivo=sesion');
        return;
      } else {
        toast.error(r.mensaje);
      }
      router.refresh();
    });
  }

  if (acciones.length === 0) return null;
  const icono = pendiente ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null;

  return (
    <>
      {acciones.includes('completar') && (
        <Button type="button" variant="outline" className="h-11 bg-card" disabled={pendiente} onClick={() => ejecutar('completar')}>
          {icono ?? <CircleCheck aria-hidden className="size-4" />}
          {ETIQUETA_ACCION.completar}
        </Button>
      )}
      {acciones.includes('no_asistida') && (
        <Button type="button" variant="outline" className="h-11 bg-card" disabled={pendiente} onClick={() => ejecutar('no_asistida')}>
          {icono ?? <UserX aria-hidden className="size-4" />}
          {ETIQUETA_ACCION.no_asistida}
        </Button>
      )}
      {acciones.includes('cancelar') && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" className="h-11 bg-card text-destructive hover:text-destructive" disabled={pendiente}>
              {icono ?? <CircleSlash aria-hidden className="size-4" />}
              {ETIQUETA_ACCION.cancelar}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                ¿Cancelar la cita de {paciente} ({rango})?
              </AlertDialogTitle>
              <AlertDialogDescription>
                El hueco quedará libre para otra reserva. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11">Volver</AlertDialogCancel>
              <AlertDialogAction
                className="h-11 bg-destructive text-white hover:bg-destructive/90"
                onClick={() => ejecutar('cancelar')}
              >
                Sí, cancelar la cita
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
