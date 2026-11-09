/**
 * Spec 005, FR-017 / FR-018 / SC-004: el plazo del paciente vive solo en
 * `src/dominio/plazo-paciente.ts` y su texto solo en `src/dominio/politica-cancelacion.ts`.
 * Ningún otro código (portal, correos de la 003, canales futuros) puede redactarlo por su cuenta.
 * Se ignoran los comentarios, que pueden citar la regla («24 h, 005 FR-009»).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const PERMITIDOS = new Set(['dominio/plazo-paciente.ts', 'dominio/politica-cancelacion.ts']);
const PROHIBIDOS: [string, RegExp][] = [
  ['«24 horas»', /24\s*horas/i],
  ['«24 h»', /\b24\s*h\b/i],
  ['86.400.000 ms', /86[._ ]?400[._ ]?000/],
  ['«hasta el día anterior»', /hasta el día anterior/i],
  ['«con un día de antelación»', /con un día de antelación/i],
  ['«hasta la hora de la cita»', /hasta la hora de la cita/i],
  ['«hasta el» + día de la semana', /hasta el (lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i],
];

function ficheros(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const ruta = join(dir, d.name);
    if (d.isDirectory()) return d.name === 'migraciones' ? [] : ficheros(ruta);
    return /\.(ts|tsx)$/.test(d.name) ? [ruta] : [];
  });
}

/** Quita comentarios de bloque, de línea y de JSX (aproximado, suficiente para este código). */
function sinComentarios(codigo: string): string {
  return codigo
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

describe('FR-017 — ningún texto redacta el plazo del paciente fuera de la spec 005', () => {
  const casos = ficheros(SRC)
    .map((f) => relative(SRC, f).split(sep).join('/'))
    .filter((f) => !PERMITIDOS.has(f));

  it('hay código que revisar', () => {
    expect(casos.length).toBeGreaterThan(20);
  });

  it.each(casos)('%s', (fichero) => {
    const codigo = sinComentarios(readFileSync(join(SRC, fichero), 'utf8'));
    const encontrados = PROHIBIDOS.filter(([, re]) => re.test(codigo)).map(([nombre]) => nombre);
    expect(encontrados).toEqual([]);
  });
});
