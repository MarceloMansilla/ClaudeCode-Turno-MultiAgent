/**
 * Generador pseudoaleatorio determinista (mulberry32) para la semilla de demostración
 * (Principio V, research.md R8). Misma semilla ⇒ misma secuencia, en cualquier máquina.
 */
export const SEMILLA_DEMO = 20261107;

export interface Prng {
  /** Entero sin signo de 32 bits. */
  u32(): number;
  /** Real en [0, 1). */
  real(): number;
  /** Entero en [min, max] (ambos incluidos). */
  entero(min: number, max: number): number;
  /** Verdadero con probabilidad `p`. */
  probabilidad(p: number): boolean;
  elegir<T>(lista: readonly T[]): T;
  /** Copia barajada (Fisher–Yates). */
  barajar<T>(lista: readonly T[]): T[];
  /** UUID con formato v4 construido con 16 bytes de la secuencia. */
  uuid(): string;
  /** `n` bytes de la secuencia (spec 005: tokens deterministas de la semilla, research R9). */
  bytes(n: number): Uint8Array;
}

export function crearPrng(semilla: number): Prng {
  let estado = semilla >>> 0;

  const u32 = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  const real = () => u32() / 4294967296;
  const entero = (min: number, max: number) => min + Math.floor(real() * (max - min + 1));

  return {
    u32,
    real,
    entero,
    probabilidad: (p) => real() < p,
    elegir: (lista) => {
      if (lista.length === 0) throw new Error('No se puede elegir de una lista vacía.');
      return lista[entero(0, lista.length - 1)]!;
    },
    barajar: (lista) => {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = entero(0, i);
        [copia[i], copia[j]] = [copia[j]!, copia[i]!];
      }
      return copia;
    },
    uuid: () => {
      const bytes = new Uint8Array(16);
      for (let i = 0; i < 16; i += 4) {
        const v = u32();
        bytes[i] = v >>> 24;
        bytes[i + 1] = (v >>> 16) & 0xff;
        bytes[i + 2] = (v >>> 8) & 0xff;
        bytes[i + 3] = v & 0xff;
      }
      bytes[6] = (bytes[6]! & 0x0f) | 0x40; // versión 4
      bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variante RFC 4122
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    },
    bytes: (n) => {
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i += 4) {
        const v = u32();
        for (let k = 0; k < 4 && i + k < n; k++) bytes[i + k] = (v >>> (24 - 8 * k)) & 0xff;
      }
      return bytes;
    },
  };
}
