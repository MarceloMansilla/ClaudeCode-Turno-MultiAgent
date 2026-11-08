/**
 * pnpm recordatorios
 * Proceso diario de recordatorios de cita (spec 003, contracts/comando-recordatorios.md).
 * Códigos de salida: 0 sin fallidos · 2 algún fallido (también interrumpido) · 1 error general.
 */
import './cargar-entorno';
import { cerrarBd } from '../src/db/cliente';
import { ErrorConfiguracion, leerConfiguracionCorreo } from '../src/correo/configuracion';
import { crearTransporte } from '../src/correo/transporte';
import { textoResultado } from '../src/dominio/resultado-recordatorio';
import { ahora } from '../src/lib/reloj';
import { ejecutarRecordatorios, textoEjecucion } from '../src/servicios/recordatorios';

let codigo = 1;
try {
  const config = leerConfiguracionCorreo(process.env);
  const ejecucion = await ejecutarRecordatorios({ ahora: ahora(), config, transporte: crearTransporte(config) });
  console.log(textoEjecucion(ejecucion, textoResultado));
  codigo = ejecucion.resumen.totales.fallido > 0 ? 2 : 0;
} catch (error) {
  if (error instanceof ErrorConfiguracion) {
    console.error(`Configuración no válida: ${error.message}`);
  } else {
    console.error(`No se pudo ejecutar el proceso de recordatorios: ${error instanceof Error ? error.message : String(error)}`);
  }
  codigo = 1;
} finally {
  await cerrarBd();
}
process.exit(codigo);
