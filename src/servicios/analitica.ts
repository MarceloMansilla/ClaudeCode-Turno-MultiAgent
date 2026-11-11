/**
 * Lectura de la analítica (spec 004). SOLO LECTURA (FR-015): este módulo únicamente hace
 * `select`; el cálculo vive en `src/dominio/analitica.ts` (research R1, R7).
 */
import { and, eq, gte, lt } from 'drizzle-orm';
import { obtenerBd, type Ejecutor } from '@/db/cliente';
import { cita } from '@/db/esquema';
import { calcularAnalitica, periodoAnalitica, type ResumenAnalitica } from '@/dominio/analitica';
import { ahora } from '@/lib/reloj';
import { listarProfesionales, listarServicios, obtenerClinica } from './catalogo';

export async function obtenerAnalitica(
  clinicaId: string,
  bd: Ejecutor = obtenerBd(),
): Promise<ResumenAnalitica> {
  const instante = ahora();
  const clinica = await obtenerClinica(clinicaId, bd);
  if (!clinica) throw new Error('La clínica de la sesión no existe.');

  const { desde, hasta } = periodoAnalitica(instante, clinica.zonaHoraria);
  const [profesionales, servicios, citas] = await Promise.all([
    listarProfesionales(clinicaId, bd),
    listarServicios(clinicaId, bd),
    bd
      .select({
        profesionalId: cita.profesionalId,
        servicioId: cita.servicioId,
        estado: cita.estado,
        inicio: cita.inicio,
        fin: cita.fin,
      })
      .from(cita)
      .where(and(eq(cita.clinicaId, clinicaId), gte(cita.inicio, desde), lt(cita.inicio, hasta))),
  ]);

  return calcularAnalitica({ ahora: instante, clinica, profesionales, servicios, citas });
}
