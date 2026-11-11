'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { salir } from '@/acciones/paciente';
import { Button } from '@/components/ui/button';

/** «Salir»: cierra el acceso en este dispositivo (spec 005, contracts/server-actions.md `salir`). */
export function BotonSalir() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          await salir();
          router.refresh();
        })
      }
    >
      <LogOut aria-hidden className="size-4" />
      Salir
    </Button>
  );
}
