/**
 * pnpm seed [--fecha-referencia AAAA-MM-DD]
 * Regenera los datos de demostración de Clínica Eleva (FR-021–FR-024). Por defecto, la fecha de
 * referencia es hoy en hora de Madrid. Misma fecha ⇒ mismos datos e identificadores.
 */
import './cargar-entorno';
import { cerrarBd, obtenerBd } from '../src/db/cliente';
import { ahora } from '../src/lib/reloj';
import { esFechaValida, fechaLocal } from '../src/lib/zona';
import { cargarSemilla, imprimirResumen } from '../src/semilla/cargar';
import { ZONA_ELEVA } from '../src/semilla/generar';

const argumentos = process.argv.slice(2);
const posicion = argumentos.indexOf('--fecha-referencia');
const fecha = posicion >= 0 ? argumentos[posicion + 1] : fechaLocal(ahora(), ZONA_ELEVA);

if (!fecha || !esFechaValida(fecha)) {
  console.error('Uso: pnpm seed --fecha-referencia AAAA-MM-DD');
  process.exit(1);
}

const clave = process.env.CLAVE_DEMO;
if (!clave) {
  console.error('Falta CLAVE_DEMO en el entorno (.env).');
  process.exit(1);
}

try {
  const resumen = await cargarSemilla(obtenerBd(), fecha, clave);
  console.log(imprimirResumen(resumen));
} finally {
  await cerrarBd();
}
