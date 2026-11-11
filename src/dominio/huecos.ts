/**
 * Huecos libres de un día (FR-006, data-model.md): el horario del día menos la unión de las
 * citas que ocupan (reservadas y completadas). Canceladas y no asistidas no ocupan.
 * Un hueco es «reservable» si empieza en el futuro (RN2); si «ahora» cae dentro de un hueco, se
 * parte en un tramo pasado y otro reservable desde el siguiente cuarto de hora.
 */
import type { EstadoCita } from '@/db/esquema';
import { fechaLocal, horaDeMinutos, horaLocal, minutosDeHora } from '@/lib/zona';
import { ESTADOS_QUE_OCUPAN } from './estados';
import { esLaborable, PASO_MINUTOS, type Horario } from './horario';

export interface Hueco {
  inicio: string; // 'HH:mm'
  fin: string;
  reservable: boolean;
}

interface CitaDelDia {
  inicio: Date;
  fin: Date;
  estado: EstadoCita;
}

export function calcularHuecosLibres(
  fecha: string,
  citas: readonly CitaDelDia[],
  horario: Horario,
  zona: string,
  ahora: Date,
): Hueco[] {
  if (!esLaborable(fecha, horario)) return [];
  const apertura = minutosDeHora(horario.horaApertura);
  const cierre = minutosDeHora(horario.horaCierre);

  const ocupados = citas
    .filter((c) => ESTADOS_QUE_OCUPAN.includes(c.estado))
    .map((c) => ({
      desde: Math.max(apertura, minutosDeHora(horaLocal(c.inicio, zona))),
      hasta: Math.min(cierre, minutosDeHora(horaLocal(c.fin, zona))),
    }))
    .filter((t) => t.hasta > t.desde)
    .sort((a, b) => a.desde - b.desde);

  const libres: { desde: number; hasta: number }[] = [];
  let cursor = apertura;
  for (const t of ocupados) {
    if (t.desde > cursor) libres.push({ desde: cursor, hasta: t.desde });
    cursor = Math.max(cursor, t.hasta);
  }
  if (cursor < cierre) libres.push({ desde: cursor, hasta: cierre });

  // Frontera entre pasado y futuro, en minutos locales del día consultado.
  const hoy = fechaLocal(ahora, zona);
  let frontera: number;
  if (fecha < hoy) frontera = Infinity;
  else if (fecha > hoy) frontera = -Infinity;
  else {
    const m = minutosDeHora(horaLocal(ahora, zona));
    frontera = Math.ceil(m / PASO_MINUTOS) * PASO_MINUTOS;
    // Con segundos pasados de la hora en punto, el cuarto actual ya no es reservable.
    if (frontera === m && ahora.getSeconds() + ahora.getMilliseconds() > 0) frontera += PASO_MINUTOS;
  }

  const huecos: Hueco[] = [];
  for (const { desde, hasta } of libres) {
    if (hasta <= frontera) {
      huecos.push({ inicio: horaDeMinutos(desde), fin: horaDeMinutos(hasta), reservable: false });
    } else if (desde >= frontera) {
      huecos.push({ inicio: horaDeMinutos(desde), fin: horaDeMinutos(hasta), reservable: true });
    } else {
      huecos.push({ inicio: horaDeMinutos(desde), fin: horaDeMinutos(frontera), reservable: false });
      huecos.push({ inicio: horaDeMinutos(frontera), fin: horaDeMinutos(hasta), reservable: true });
    }
  }
  return huecos;
}
