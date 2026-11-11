'use client';

import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/**
 * Panel lateral del alta de cita: lateral en portátil y a pantalla completa en móvil
 * (contracts/ui-routes.md). Al cerrarlo se vuelve a la agenda del día.
 */
export function PanelAlta({
  volverA,
  titulo,
  descripcion,
  children,
}: {
  volverA: string;
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Sheet defaultOpen onOpenChange={(abierto) => !abierto && router.push(volverA)}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="text-xl">{titulo}</SheetTitle>
          <SheetDescription>{descripcion}</SheetDescription>
        </SheetHeader>
        <div className="p-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
