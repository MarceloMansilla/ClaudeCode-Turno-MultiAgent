'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface OpcionProfesional {
  id: string;
  nombre: string;
  especialidad: string; // etiqueta: «Fisioterapia», «Nutrición»
}

/** Pestañas en portátil y desplegable en móvil (contracts/ui-routes.md). */
export function SelectorProfesional({
  profesionales,
  actual,
  fecha,
}: {
  profesionales: OpcionProfesional[];
  actual: string;
  fecha: string;
}) {
  const router = useRouter();

  return (
    <>
      <div className="sm:hidden">
        <label htmlFor="selector-profesional" className="mb-1.5 block text-sm font-medium">
          Profesional
        </label>
        <select
          id="selector-profesional"
          value={actual}
          onChange={(ev) => router.push(`/agenda/${ev.target.value}/${fecha}`)}
          className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {profesionales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} · {p.especialidad}
            </option>
          ))}
        </select>
      </div>

      <nav aria-label="Profesionales" className="hidden sm:block">
        <ul className="inline-flex gap-1 rounded-xl border bg-card p-1 shadow-xs">
          {profesionales.map((p) => {
            const activo = p.id === actual;
            return (
              <li key={p.id}>
                <Link
                  href={`/agenda/${p.id}/${fecha}`}
                  aria-current={activo ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 flex-col justify-center rounded-lg px-4 py-1.5 text-left transition-colors',
                    'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    activo
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <span className="text-sm leading-tight font-semibold">{p.nombre}</span>
                  <span
                    className={cn(
                      'text-xs leading-tight',
                      activo ? 'text-primary-foreground/85' : 'text-muted-foreground',
                    )}
                  >
                    {p.especialidad}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
