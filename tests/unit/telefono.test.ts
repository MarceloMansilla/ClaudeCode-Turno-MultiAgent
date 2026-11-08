import { describe, expect, it } from 'vitest';
import { cifrasDeBusqueda, normalizarTelefono } from '@/dominio/telefono';

describe('FR-016b — normalización del teléfono', () => {
  it.each(['612 345 678', '612-345-678', '+34 612345678', '0034612345678', '612.345.678', '(+34) 612 34 56 78', '34612345678'])(
    '«%s» → 612345678',
    (entrada) => {
      expect(normalizarTelefono(entrada)).toBe('612345678');
    },
  );

  it('acepta fijos y móviles que empiezan por 6, 7, 8 o 9', () => {
    expect(normalizarTelefono('912 345 678')).toBe('912345678');
    expect(normalizarTelefono('812345678')).toBe('812345678');
    expect(normalizarTelefono('712345678')).toBe('712345678');
  });
});

describe('FR-016c — solo teléfonos españoles', () => {
  it.each([
    ['512 345 678', 'empieza por 5'],
    ['+44 7700 900123', 'prefijo extranjero'],
    ['61234567', '8 cifras'],
    ['6123456789', '10 cifras'],
    ['61234567a', 'contiene letras'],
    ['', 'vacío'],
    ['+34 512345678', 'prefijo español pero empieza por 5'],
  ])('rechaza «%s» (%s)', (entrada) => {
    expect(normalizarTelefono(entrada)).toBeNull();
  });
});

describe('FR-016 — búsqueda por teléfono', () => {
  it('extrae las cifras de un texto con forma de teléfono', () => {
    expect(cifrasDeBusqueda('612 34')).toBe('61234');
    expect(cifrasDeBusqueda('+34 612 345 678')).toBe('612345678');
    expect(cifrasDeBusqueda('María')).toBeNull();
    expect(cifrasDeBusqueda('61')).toBeNull();
  });
});
