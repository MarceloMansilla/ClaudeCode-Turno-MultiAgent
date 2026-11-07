'use client';

import { TriangleAlert } from 'lucide-react';

/** Spec 004, Edge Cases «Fallo al cargar»: ninguna cifra parcial, solo el aviso. */
export default function ErrorAnalitica() {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-16 text-center">
      <TriangleAlert aria-hidden className="size-6 text-muted-foreground" />
      <p>No hemos podido cargar la analítica. Vuelve a intentarlo en unos segundos.</p>
    </div>
  );
}
