import { describe, expect, it } from 'vitest';
import { seSolapan } from '@/dominio/solape';
import { fechaLocal, horaLocal, minutosDeHora } from '@/lib/zona';
import {
  DIAS_FUTURO,
  DIAS_HISTORIA,
  diasDeLaSemilla,
  generarSemilla,
  resumirSemilla,
  ZONA_ELEVA,
} from '@/semilla/generar';

const REFERENCIA = '2026-11-09';
const datos = generarSemilla(REFERENCIA, 'hash-fijo');
const resumen = resumirSemilla(datos, REFERENCIA);
const { historia, futuro } = diasDeLaSemilla(REFERENCIA);
const primerDiaFuturo = futuro[0]!;

describe('FR-021 / SC-005 — semilla determinista', () => {
  it('dos generaciones con la misma fecha son idénticas, identificadores incluidos', () => {
    expect(generarSemilla(REFERENCIA, 'hash-fijo')).toEqual(datos);
  });

  it('solo el hash de la clave depende de la entrada externa', () => {
    const otra = generarSemilla(REFERENCIA, 'otro-hash');
    expect({ ...otra, clinica: { ...otra.clinica, claveHash: 'x' } }).toEqual({
      ...datos,
      clinica: { ...datos.clinica, claveHash: 'x' },
    });
  });

  it('todos los identificadores son UUID v4 únicos', () => {
    const todos = [
      datos.clinica.id,
      ...datos.profesionales.map((p) => p.id),
      ...datos.servicios.map((s) => s.id),
      ...datos.pacientes.map((p) => p.id),
      ...datos.citas.map((c) => c.id),
    ];
    for (const id of todos) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
    expect(new Set(todos).size).toBe(todos.length);
  });
});

describe('FR-022 — contenido de la semilla', () => {
  it('Clínica Eleva, 3 profesionales y 4 servicios con duración y precio exactos', () => {
    expect(datos.clinica.nombre).toBe('Clínica Eleva');
    expect(datos.profesionales.map((p) => [p.nombre, p.especialidad])).toEqual([
      ['María', 'fisioterapia'],
      ['Jorge', 'fisioterapia'],
      ['Lucía', 'nutricion'],
    ]);
    expect(datos.servicios.map((s) => [s.nombre, s.duracionMinutos, s.precioCentimos])).toEqual([
      ['Sesión de fisioterapia', 45, 4000],
      ['Primera visita de fisioterapia', 60, 5000],
      ['Consulta de nutrición', 30, 3500],
      ['Primera visita de nutrición', 45, 4500],
    ]);
  });

  it('40 pacientes con teléfonos españoles válidos y todos distintos (FR-016b/c)', () => {
    expect(datos.pacientes).toHaveLength(40);
    const telefonos = datos.pacientes.map((p) => p.telefonoNormalizado);
    for (const t of telefonos) expect(t).toMatch(/^[6-9]\d{8}$/);
    expect(new Set(telefonos).size).toBe(40);
  });
});

describe('FR-023 — historia y futuro', () => {
  it(`historia de ${DIAS_HISTORIA} días laborables (8 semanas) y ${DIAS_FUTURO} días futuros`, () => {
    expect(historia).toHaveLength(40);
    expect(futuro).toHaveLength(10);
    expect(historia.at(-1)).toBe('2026-11-06');
    expect(primerDiaFuturo).toBe('2026-11-09');
  });

  it('la historia solo tiene estados finales y el futuro solo citas reservadas', () => {
    for (const c of datos.citas) {
      const pasada = fechaLocal(c.inicio, ZONA_ELEVA) < primerDiaFuturo;
      if (pasada) expect(c.estado).not.toBe('reservada');
      else expect(c.estado).toBe('reservada');
    }
  });

  it('no asistidas = 10 % ± 1 y canceladas = 8 % ± 1 de la historia (SC-005)', () => {
    expect(resumen.historia.total).toBeGreaterThan(500);
    expect(Math.abs(resumen.porcentajeNoAsistida - 10)).toBeLessThanOrEqual(1);
    expect(Math.abs(resumen.porcentajeCancelada - 8)).toBeLessThanOrEqual(1);
    expect(resumen.historia.no_asistida).toBe(Math.round(resumen.historia.total * 0.1));
    expect(resumen.historia.cancelada).toBe(Math.round(resumen.historia.total * 0.08));
  });

  it('hay citas reservadas en las 2 semanas futuras', () => {
    expect(resumen.futuro.reservada).toBeGreaterThan(50);
  });

  it('los servicios coinciden con la especialidad del profesional (FR-009a)', () => {
    for (const c of datos.citas) {
      const p = datos.profesionales.find((x) => x.id === c.profesionalId)!;
      const s = datos.servicios.find((x) => x.id === c.servicioId)!;
      expect(s.especialidad).toBe(p.especialidad);
    }
  });
});

describe('FR-024 — la semilla respeta RN1, el horario y la granularidad', () => {
  it('ninguna cita sale del horario 09:00–20:00 de lunes a viernes ni rompe los 15 min', () => {
    for (const c of datos.citas) {
      const desde = minutosDeHora(horaLocal(c.inicio, ZONA_ELEVA));
      const hasta = minutosDeHora(horaLocal(c.fin, ZONA_ELEVA));
      expect(desde).toBeGreaterThanOrEqual(9 * 60);
      expect(hasta).toBeLessThanOrEqual(20 * 60);
      expect(desde % 15).toBe(0);
      expect(fechaLocal(c.inicio, ZONA_ELEVA)).toBe(fechaLocal(c.fin, ZONA_ELEVA));
    }
  });

  it('ningún profesional tiene dos citas solapadas (en ningún estado)', () => {
    for (const p of datos.profesionales) {
      const suyas = datos.citas
        .filter((c) => c.profesionalId === p.id)
        .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
      for (let i = 1; i < suyas.length; i++) {
        expect(seSolapan(suyas[i - 1]!, suyas[i]!)).toBe(false);
      }
    }
  });
});
