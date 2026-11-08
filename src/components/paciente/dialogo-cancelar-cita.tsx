'use client';

import { CircleSlash, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cancelarMiCita } from '@/acciones/paciente';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

/**
 * «¿Cancelar tu cita?» (spec 005, FR-012): repite día, hora, servicio y profesional; sin
 * confirmar no se cancela nada. El foco empieza en «No, mantener cita» y Escape cierra sin
 * cancelar. El plazo se vuelve a comprobar en el servidor al confirmar (FR-009).
 */
export function DialogoCancelarCita({
  token,
  cita,
}: {
  token: string;
  cita: { id: string; fecha: string; hora: string; servicio: string; profesional: string };
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();

  function confirmar() {
    iniciar(async () => {
      const r = await cancelarMiCita({ token, citaId: cita.id });
      setAbierto(false);
      if (r.ok) toast.success(r.datos.mensaje);
      else if (r.codigo === 'FUERA_DE_PLAZO' || r.codigo === 'ESTADO_CAMBIADO' || r.codigo === 'NO_ENCONTRADO') {
        toast.error(r.mensaje);
      }
      // ACCESO_CADUCADO, ENLACE_NO_VALIDO, ENLACE_BLOQUEADO: la página muestra la pantalla que
      // corresponda; tras volver a entrar, la cancelación hay que pedirla otra vez.
      router.refresh();
    });
  }

  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-full text-destructive hover:text-destructive sm:w-auto">
          <CircleSlash aria-hidden className="size-4" />
          Cancelar cita
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar tu cita?</AlertDialogTitle>
          <AlertDialogDescription>
            {cita.servicio} con {cita.profesional}, el {cita.fecha} a las {cita.hora}. El hueco quedará libre para
            otro paciente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={pendiente}>
            No, mantener cita
          </AlertDialogCancel>
          <Button
            type="button"
            className="h-11 bg-destructive text-white hover:bg-destructive/90"
            disabled={pendiente}
            onClick={confirmar}
          >
            {pendiente && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Sí, cancelar mi cita
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
