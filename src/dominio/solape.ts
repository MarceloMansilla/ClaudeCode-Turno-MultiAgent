/**
 * RN1 (FR-011): dos citas se solapan si sus intervalos semiabiertos [inicio, fin) se cortan:
 * `inicio_A < fin_B` y `inicio_B < fin_A`. Citas contiguas (fin de una = inicio de otra) no se
 * solapan. La garantía real la impone la BD (`cita_sin_solape`); esta función sirve para
 * explicar el conflicto a recepción y para verificar datos.
 */
export interface Intervalo {
  inicio: Date;
  fin: Date;
}

export function seSolapan(a: Intervalo, b: Intervalo): boolean {
  return a.inicio.getTime() < b.fin.getTime() && b.inicio.getTime() < a.fin.getTime();
}
