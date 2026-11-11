import { minutosDeHora } from '@/lib/zona';
import type { AgendaDia, CitaVista } from '@/servicios/agenda';
import type { Hueco } from '@/dominio/huecos';
import { BloqueCita } from './bloque-cita';
import { BloqueHueco } from './bloque-hueco';

type Elemento =
  | { tipo: 'cita'; desde: number; hasta: number; cita: CitaVista }
  | { tipo: 'hueco'; desde: number; hasta: number; hueco: Hueco }
  | { tipo: 'ahora'; desde: number; hora: string };

/** Altura mínima táctil (44 px) y proporcional a la duración del tramo. */
function altura(minutos: number): number {
  return Math.max(64, Math.round(minutos * 1.6));
}

/**
 * Agenda del día en orden cronológico: citas (todos los estados), huecos libres y la línea de
 * «ahora» si el día es hoy. `renderAcciones` permite a la US3 añadir botones a cada cita.
 */
export function LineaTiempo({
  agenda,
  renderAcciones,
}: {
  agenda: AgendaDia;
  renderAcciones?: (cita: CitaVista) => React.ReactNode;
}) {
  const elementos: Elemento[] = [
    ...agenda.citas.map((cita) => ({
      tipo: 'cita' as const,
      desde: minutosDeHora(cita.inicio),
      hasta: minutosDeHora(cita.fin),
      cita,
    })),
    ...agenda.huecosLibres.map((hueco) => ({
      tipo: 'hueco' as const,
      desde: minutosDeHora(hueco.inicio),
      hasta: minutosDeHora(hueco.fin),
      hueco,
    })),
  ];
  if (agenda.ahora) {
    const m = minutosDeHora(agenda.ahora);
    if (m >= minutosDeHora(agenda.horario.apertura) && m < minutosDeHora(agenda.horario.cierre)) {
      elementos.push({ tipo: 'ahora', desde: m, hora: agenda.ahora });
    }
  }
  // Orden: por hora; a igual hora, primero la línea de «ahora», luego citas y después huecos.
  const prioridad = { ahora: 0, cita: 1, hueco: 2 } as const;
  elementos.sort((a, b) => a.desde - b.desde || prioridad[a.tipo] - prioridad[b.tipo]);

  const base = `/agenda/${agenda.profesional.id}/${agenda.fecha}/nueva`;

  return (
    <ol aria-label={`Agenda de ${agenda.profesional.nombre}`} className="space-y-2">
      {elementos.map((el) => {
        if (el.tipo === 'ahora') {
          return (
            <li key="ahora" className="flex items-center gap-2 py-1" aria-label={`Ahora, ${el.hora}`}>
              <span className="w-14 text-right text-xs font-bold text-ahora tabular-nums">{el.hora}</span>
              <span aria-hidden className="size-2.5 rounded-full bg-ahora" />
              <span aria-hidden className="h-0.5 flex-1 rounded bg-ahora" />
              <span className="text-xs font-bold text-ahora uppercase">Ahora</span>
            </li>
          );
        }
        const clave = el.tipo === 'cita' ? el.cita.id : `hueco-${el.hueco.inicio}`;
        const hora = el.tipo === 'cita' ? el.cita.inicio : el.hueco.inicio;
        return (
          <li key={clave} className="flex gap-2">
            <span className="w-14 shrink-0 pt-3 text-right text-xs font-medium text-muted-foreground tabular-nums">
              {hora}
            </span>
            <div className="min-w-0 flex-1" style={{ minHeight: altura(el.hasta - el.desde) }}>
              {el.tipo === 'cita' ? (
                <BloqueCita cita={el.cita} acciones={renderAcciones?.(el.cita)} />
              ) : (
                <BloqueHueco hueco={el.hueco} hrefReservar={`${base}?hora=${el.hueco.inicio}`} />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
