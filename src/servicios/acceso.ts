/**
 * Acceso con clave de clínica (FR-001, FR-002). En la 001 cada instalación sirve a una sola
 * clínica: la clave se compara con el hash Argon2id de esa clínica.
 */
import { verify } from '@node-rs/argon2';
import { asc } from 'drizzle-orm';
import { obtenerBd } from '@/db/cliente';
import { clinica } from '@/db/esquema';

/** Devuelve el `clinicaId` si la clave es correcta; si no, `null`. */
export async function verificarClave(clave: string): Promise<string | null> {
  if (!clave) return null;
  const [unica] = await obtenerBd()
    .select({ id: clinica.id, claveHash: clinica.claveHash })
    .from(clinica)
    .orderBy(asc(clinica.id))
    .limit(1);
  if (!unica) return null;
  try {
    return (await verify(unica.claveHash, clave)) ? unica.id : null;
  } catch {
    return null;
  }
}
