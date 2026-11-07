/**
 * Teléfonos de pacientes (FR-016b, FR-016c): solo números españoles de 9 cifras que empiezan
 * por 6, 7, 8 o 9, con o sin prefijo +34 / 0034. Para comparar se ignoran espacios, guiones,
 * puntos, paréntesis y el prefijo: «612 345 678», «612-345-678» y «+34 612345678» son el mismo.
 */
const SEPARADORES = /[\s\-.()]/g;
const ESPANOL = /^[6-9]\d{8}$/;

/** Forma normalizada (9 cifras) o `null` si no es un teléfono español válido. */
export function normalizarTelefono(texto: string): string | null {
  let t = texto.trim().replace(SEPARADORES, '');
  if (t.startsWith('+')) {
    if (!t.startsWith('+34')) return null;
    t = t.slice(3);
  } else if (t.startsWith('0034')) {
    t = t.slice(4);
  } else if (t.length === 11 && t.startsWith('34')) {
    t = t.slice(2);
  }
  return ESPANOL.test(t) ? t : null;
}

export function esTelefonoValido(texto: string): boolean {
  return normalizarTelefono(texto) !== null;
}

/** Cifras de un texto de búsqueda que parece un teléfono (al menos 3), sin prefijo. */
export function cifrasDeBusqueda(texto: string): string | null {
  const t = texto.trim().replace(SEPARADORES, '');
  if (!/^\+?\d{3,}$/.test(t)) return null;
  const cifras = t.replace(/^\+?(0034|34)(?=\d{9}$)/, '');
  return cifras.replace('+', '');
}
