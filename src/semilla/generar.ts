/**
 * Generador puro de la semilla de demostración de Clínica Eleva (FR-021–FR-024, research R8).
 *
 * - Historia: los 40 días laborables anteriores a la fecha de referencia (8 semanas), solo con
 *   estados finales: exactamente round(10 % · N) no asistidas, round(8 % · N) canceladas y el
 *   resto completadas.
 * - Futuro: 10 días laborables desde la fecha de referencia (incluida si es laborable), todo
 *   reservado.
 * - Sin solapes por profesional, dentro de 09:00–20:00, inicios en múltiplos de 15 min y solo
 *   servicios de la especialidad del profesional.
 * - Identificadores deterministas: salen de una secuencia propia en orden fijo
 *   (clínica → profesionales → servicios → pacientes → citas).
 *
 * El hash de la clave se recibe ya calculado: es lo único que puede variar entre ejecuciones.
 */
import type { Especialidad, EstadoCita } from '@/db/esquema';
import { diaSemanaIso, horaDeMinutos, instanteLocal, sumarDias } from '@/lib/zona';
import { APELLIDOS, DOMINIO_CORREO, NOMBRES } from './catalogo';
import { crearPrng, SEMILLA_DEMO } from './prng';

export const ZONA_ELEVA = 'Europe/Madrid';
export const DIAS_HISTORIA = 40;
export const DIAS_FUTURO = 10;
export const NUM_PACIENTES = 40;
export const TASA_NO_ASISTIDA = 0.1;
export const TASA_CANCELADA = 0.08;

const APERTURA = 9 * 60;
const CIERRE = 20 * 60;
const LABORABLES = [1, 2, 3, 4, 5];

export interface DatosSemilla {
  clinica: {
    id: string;
    nombre: string;
    zonaHoraria: string;
    horaApertura: string;
    horaCierre: string;
    diasLaborables: number[];
    claveHash: string;
  };
  profesionales: { id: string; clinicaId: string; nombre: string; especialidad: Especialidad; orden: number }[];
  servicios: {
    id: string;
    clinicaId: string;
    nombre: string;
    especialidad: Especialidad;
    duracionMinutos: number;
    precioCentimos: number;
  }[];
  pacientes: {
    id: string;
    clinicaId: string;
    nombre: string;
    telefono: string;
    telefonoNormalizado: string;
    email: string | null;
    creadoEn: Date;
  }[];
  citas: {
    id: string;
    clinicaId: string;
    profesionalId: string;
    servicioId: string;
    pacienteId: string;
    inicio: Date;
    fin: Date;
    estado: EstadoCita;
    creadoEn: Date;
    estadoCambiadoEn: Date | null;
  }[];
}

/** Días laborables anteriores (orden cronológico) y desde la fecha de referencia. */
export function diasDeLaSemilla(fechaReferencia: string): { historia: string[]; futuro: string[] } {
  const historia: string[] = [];
  for (let f = sumarDias(fechaReferencia, -1); historia.length < DIAS_HISTORIA; f = sumarDias(f, -1)) {
    if (LABORABLES.includes(diaSemanaIso(f))) historia.unshift(f);
  }
  const futuro: string[] = [];
  for (let f = fechaReferencia; futuro.length < DIAS_FUTURO; f = sumarDias(f, 1)) {
    if (LABORABLES.includes(diaSemanaIso(f))) futuro.push(f);
  }
  return { historia, futuro };
}

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function generarSemilla(fechaReferencia: string, claveHash: string): DatosSemilla {
  const azar = crearPrng(SEMILLA_DEMO);
  const ids = crearPrng(SEMILLA_DEMO ^ 0x5eed);

  const clinicaId = ids.uuid();
  const clinica: DatosSemilla['clinica'] = {
    id: clinicaId,
    nombre: 'Clínica Eleva',
    zonaHoraria: ZONA_ELEVA,
    horaApertura: '09:00',
    horaCierre: '20:00',
    diasLaborables: LABORABLES,
    claveHash,
  };

  const profesionales: DatosSemilla['profesionales'] = [
    { id: ids.uuid(), clinicaId, nombre: 'María', especialidad: 'fisioterapia', orden: 1 },
    { id: ids.uuid(), clinicaId, nombre: 'Jorge', especialidad: 'fisioterapia', orden: 2 },
    { id: ids.uuid(), clinicaId, nombre: 'Lucía', especialidad: 'nutricion', orden: 3 },
  ];

  const servicios: DatosSemilla['servicios'] = [
    { id: ids.uuid(), clinicaId, nombre: 'Sesión de fisioterapia', especialidad: 'fisioterapia', duracionMinutos: 45, precioCentimos: 4000 },
    { id: ids.uuid(), clinicaId, nombre: 'Primera visita de fisioterapia', especialidad: 'fisioterapia', duracionMinutos: 60, precioCentimos: 5000 },
    { id: ids.uuid(), clinicaId, nombre: 'Consulta de nutrición', especialidad: 'nutricion', duracionMinutos: 30, precioCentimos: 3500 },
    { id: ids.uuid(), clinicaId, nombre: 'Primera visita de nutrición', especialidad: 'nutricion', duracionMinutos: 45, precioCentimos: 4500 },
  ];
  // Habitual (75 %) frente a primera visita (25 %), por especialidad.
  const serviciosDe = (esp: Especialidad) => {
    const [habitual, primera] =
      esp === 'fisioterapia' ? [servicios[0]!, servicios[1]!] : [servicios[2]!, servicios[3]!];
    return { habitual, primera };
  };

  const { historia, futuro } = diasDeLaSemilla(fechaReferencia);
  const altaPacientes = instanteLocal(historia[0]!, '08:00', ZONA_ELEVA);

  const pacientes: DatosSemilla['pacientes'] = [];
  const telefonos = new Set<string>();
  const nombresUsados = new Set<string>();
  while (pacientes.length < NUM_PACIENTES) {
    const nombre = azar.elegir(NOMBRES);
    const apellido1 = azar.elegir(APELLIDOS);
    const apellido2 = azar.elegir(APELLIDOS);
    const completo = `${nombre} ${apellido1} ${apellido2}`;
    if (apellido1 === apellido2 || nombresUsados.has(completo)) continue;
    const prefijo = azar.elegir(['6', '6', '6', '7']);
    const digitos = `${prefijo}${String(azar.entero(0, 99_999_999)).padStart(8, '0')}`;
    if (telefonos.has(digitos)) continue;
    nombresUsados.add(completo);
    telefonos.add(digitos);
    const conCorreo = azar.probabilidad(0.75);
    pacientes.push({
      id: ids.uuid(),
      clinicaId,
      nombre: completo,
      telefono: `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`,
      telefonoNormalizado: digitos,
      email: conCorreo
        ? `${sinTildes(nombre)}.${sinTildes(apellido1)}${pacientes.length + 1}@${DOMINIO_CORREO}`
        : null,
      creadoEn: altaPacientes,
    });
  }

  const citas: DatosSemilla['citas'] = [];
  const planificarDia = (fecha: string, ocupacion: number) => {
    const ocupadosHoy = new Set<string>();
    for (const prof of profesionales) {
      const { habitual, primera } = serviciosDe(prof.especialidad);
      let cursor = APERTURA;
      while (cursor < CIERRE) {
        if (!azar.probabilidad(ocupacion)) {
          cursor += azar.elegir([15, 30, 45]);
          continue;
        }
        const srv = azar.probabilidad(0.25) ? primera : habitual;
        if (cursor + srv.duracionMinutos > CIERRE) break;
        let paciente = azar.elegir(pacientes);
        for (let intento = 0; ocupadosHoy.has(paciente.id) && intento < 10; intento++) {
          paciente = azar.elegir(pacientes);
        }
        ocupadosHoy.add(paciente.id);
        const inicio = instanteLocal(fecha, horaDeMinutos(cursor), ZONA_ELEVA);
        const fin = new Date(inicio.getTime() + srv.duracionMinutos * 60_000);
        const antelacion = azar.entero(1, 21);
        citas.push({
          id: ids.uuid(),
          clinicaId,
          profesionalId: prof.id,
          servicioId: srv.id,
          pacienteId: paciente.id,
          inicio,
          fin,
          estado: 'reservada',
          creadoEn: new Date(inicio.getTime() - antelacion * 24 * 60 * 60_000),
          estadoCambiadoEn: null,
        });
        cursor += srv.duracionMinutos;
      }
    }
  };

  for (const fecha of historia) planificarDia(fecha, 0.72);
  const totalHistoria = citas.length;
  for (const fecha of futuro) planificarDia(fecha, 0.5);

  // Estados de la historia con proporciones exactas (SC-005).
  const indices = azar.barajar(Array.from({ length: totalHistoria }, (_, i) => i));
  const noAsistidas = Math.round(TASA_NO_ASISTIDA * totalHistoria);
  const canceladas = Math.round(TASA_CANCELADA * totalHistoria);
  indices.forEach((i, posicion) => {
    const c = citas[i]!;
    if (posicion < noAsistidas) {
      c.estado = 'no_asistida';
      c.estadoCambiadoEn = new Date(c.inicio.getTime() + 15 * 60_000);
    } else if (posicion < noAsistidas + canceladas) {
      c.estado = 'cancelada';
      const horasAntes = azar.entero(2, 72);
      c.estadoCambiadoEn = new Date(
        Math.max(c.creadoEn.getTime() + 60_000, c.inicio.getTime() - horasAntes * 60 * 60_000),
      );
    } else {
      c.estado = 'completada';
      c.estadoCambiadoEn = c.fin;
    }
  });

  return { clinica, profesionales, servicios, pacientes, citas };
}

export interface ResumenSemilla {
  fechaReferencia: string;
  primerDiaHistoria: string;
  ultimoDiaFuturo: string;
  pacientes: number;
  totalCitas: number;
  historia: { total: number; completada: number; cancelada: number; no_asistida: number };
  futuro: { reservada: number };
  porProfesional: Record<string, Record<EstadoCita, number>>;
  porcentajeNoAsistida: number;
  porcentajeCancelada: number;
}

export function resumirSemilla(datos: DatosSemilla, fechaReferencia: string): ResumenSemilla {
  const { historia, futuro } = diasDeLaSemilla(fechaReferencia);
  const vacio = (): Record<EstadoCita, number> => ({
    reservada: 0,
    completada: 0,
    cancelada: 0,
    no_asistida: 0,
  });
  const porProfesional: ResumenSemilla['porProfesional'] = {};
  const totales = vacio();
  for (const p of datos.profesionales) porProfesional[p.nombre] = vacio();
  for (const c of datos.citas) {
    const nombre = datos.profesionales.find((p) => p.id === c.profesionalId)!.nombre;
    porProfesional[nombre]![c.estado]++;
    totales[c.estado]++;
  }
  const totalHistoria = totales.completada + totales.cancelada + totales.no_asistida;
  const pct = (n: number) => Math.round((n / totalHistoria) * 1000) / 10;
  return {
    fechaReferencia,
    primerDiaHistoria: historia[0]!,
    ultimoDiaFuturo: futuro.at(-1)!,
    pacientes: datos.pacientes.length,
    totalCitas: datos.citas.length,
    historia: {
      total: totalHistoria,
      completada: totales.completada,
      cancelada: totales.cancelada,
      no_asistida: totales.no_asistida,
    },
    futuro: { reservada: totales.reservada },
    porProfesional,
    porcentajeNoAsistida: pct(totales.no_asistida),
    porcentajeCancelada: pct(totales.cancelada),
  };
}
