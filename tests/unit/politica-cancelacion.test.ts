import { describe, expect, it } from 'vitest';
import { limiteCancelacionPaciente } from '@/dominio/plazo-paciente';
import { enunciadoPoliticaCancelacion } from '@/dominio/politica-cancelacion';
import { formatearLimite } from '@/lib/formato';
import { instanteLocal } from '@/lib/zona';

const Z = 'Europe/Madrid';
const eleva = { zonaHoraria: Z, clinicaNombre: 'Clínica Eleva', clinicaTelefono: '911 234 567' };

describe('FR-016 — enunciado canónico de la política', () => {
  it('texto exacto para la cita de referencia (lunes 16/11/2026 10:00)', () => {
    expect(enunciadoPoliticaCancelacion({ ...eleva, inicio: instanteLocal('2026-11-16', '10:00', Z) })).toBe(
      'Puedes cancelar esta cita desde tu enlace antes del domingo, 15/11/2026 a las 10:00. ' +
        'Después, llama a Clínica Eleva al 911 234 567.',
    );
  });

  it('usa «antes del», nunca «hasta el»', () => {
    const texto = enunciadoPoliticaCancelacion({ ...eleva, inicio: instanteLocal('2026-11-17', '19:15', Z) });
    expect(texto).toContain('antes del lunes, 16/11/2026 a las 19:15');
    expect(texto).not.toMatch(/hasta el/i);
  });

  it.each([
    ['2026-11-16', '10:00'],
    ['2026-11-17', '19:15'],
    ['2026-10-26', '09:00'],
  ])('FR-017 / SC-004 — cita %s %s: el límite del texto es el instante que se aplica', (fecha, hora) => {
    const inicio = instanteLocal(fecha, hora, Z);
    const texto = enunciadoPoliticaCancelacion({ ...eleva, inicio });
    expect(texto).toContain(`antes del ${formatearLimite(limiteCancelacionPaciente(inicio), Z)}.`);
  });

  it('una clínica en Canarias muestra el límite en su hora local', () => {
    const inicio = instanteLocal('2026-11-16', '10:00', 'Atlantic/Canary');
    expect(
      enunciadoPoliticaCancelacion({ inicio, zonaHoraria: 'Atlantic/Canary', clinicaNombre: 'Clínica Teide', clinicaTelefono: '922 000 111' }),
    ).toBe('Puedes cancelar esta cita desde tu enlace antes del domingo, 15/11/2026 a las 10:00. Después, llama a Clínica Teide al 922 000 111.');
  });
});
