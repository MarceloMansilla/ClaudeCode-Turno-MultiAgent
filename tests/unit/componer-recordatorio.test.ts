import { describe, expect, it } from 'vitest';
import { componerRecordatorio, TEXTO_BOTON } from '@/correo/componer-recordatorio';
import { rutaEnlacePaciente } from '@/dominio/enlace';
import { enunciadoPoliticaCancelacion } from '@/dominio/politica-cancelacion';

const ZONA = 'Europe/Madrid';
const TOKEN = 'AnaAnaAnaAnaAnaAnaAnaAnaAnaAnaAnaAnaAnaAna0';
const URL_PUBLICA = 'https://citas.clinicaeleva.es';
const inicio = new Date('2026-11-16T10:00:00+01:00');
const fin = new Date('2026-11-16T10:45:00+01:00');
const enlace = `${URL_PUBLICA}${rutaEnlacePaciente(TOKEN)}`;
// El enunciado lo da la 005 (FR-016); este test no lo redacta.
const enunciado = enunciadoPoliticaCancelacion({
  inicio,
  zonaHoraria: ZONA,
  clinicaNombre: 'Clínica Eleva',
  clinicaTelefono: '911 234 567',
});

const correo = componerRecordatorio({
  clinica: { nombre: 'Clínica Eleva' },
  paciente: { nombre: 'Ana Pérez' },
  profesional: { nombre: 'María' },
  servicio: { nombre: 'Sesión de fisioterapia' },
  inicio,
  fin,
  zona: ZONA,
  enlacePersonal: enlace,
  enunciado,
});

/** Patrones de plazo que solo puede contener el enunciado de la 005 (FR-022, 005 FR-017). */
const PLAZO = [
  /24\s*horas/i,
  /\b24\s*h\b/i,
  /antelación/i,
  /día anterior/i,
  /hasta la hora de la cita/i,
  /(antes|hasta) del? (lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i,
];

describe('FR-007 / FR-008 contenido del recordatorio', () => {
  it('FR-008 asunto exacto', () => {
    expect(correo.asunto).toBe('Recordatorio de su cita en Clínica Eleva: lunes, 16/11/2026, 10:00');
  });

  it('FR-007 texto plano del contrato, con saludo por nombre de pila', () => {
    expect(correo.texto).toBe(
      [
        'Hola, Ana:',
        '',
        'Le recordamos su cita en Clínica Eleva:',
        '',
        '  Día:         lunes, 16/11/2026',
        '  Hora:        10:00–10:45',
        '  Profesional: María',
        '  Servicio:    Sesión de fisioterapia',
        '',
        'Si no puede venir, cancele la cita para que otra persona pueda aprovechar el hueco:',
        enlace,
        '',
        enunciado,
        '',
        'Clínica Eleva',
        '',
      ].join('\n'),
    );
  });

  it('FR-007 sin precio ni datos de contacto del paciente', () => {
    for (const parte of [correo.texto, correo.html]) {
      expect(parte).not.toMatch(/€|40,00/);
      expect(parte).not.toContain('612');
      expect(parte).not.toContain('ana@example.com');
    }
  });
});

describe('FR-019 / FR-020 / FR-022 enlace personal y enunciado de la 005', () => {
  it('FR-019 el único enlace es el personal del paciente', () => {
    const urls = [...correo.texto.matchAll(/https?:\/\/\S+/g), ...correo.html.matchAll(/https?:\/\/[^"<\s]+/g)].map(
      (m) => m[0],
    );
    expect(urls.length).toBeGreaterThan(0);
    expect(new Set(urls)).toEqual(new Set([enlace]));
    expect(correo.html).toContain(`href="${enlace}"`);
  });

  it('FR-020 el enunciado es exactamente el de enunciadoPoliticaCancelacion, sin retoques', () => {
    expect(correo.texto).toContain(`\n${enunciado}\n`);
    expect(correo.html).toContain(`>${enunciado}<`);
    expect(enunciado).toContain('Clínica Eleva');
    expect(enunciado).toContain('911 234 567');
  });

  it('FR-022 fuera del enunciado ningún texto menciona el plazo', () => {
    for (const parte of [correo.asunto, correo.texto.replace(enunciado, ''), correo.html.replace(enunciado, ''), TEXTO_BOTON]) {
      for (const re of PLAZO) expect(parte).not.toMatch(re);
    }
  });
});

describe('SC-006 legible desde 360 px y accesible', () => {
  it('SC-006 una columna de 600 px como máximo, sin anchos fijos mayores de 360 px', () => {
    expect(correo.html).toContain('max-width:600px');
    const anchos = [...correo.html.matchAll(/(?<!max-)width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const a of anchos) expect(a).toBeLessThanOrEqual(360);
  });

  it('SC-006 sin imágenes ni recursos externos', () => {
    expect(correo.html).not.toMatch(/<img|<link|<script|url\(|src=/i);
  });

  it('SC-006 botón con texto ≥ 16 px, área táctil ≥ 44 px y la URL en texto debajo', () => {
    const boton = /<a href="[^"]+" style="([^"]+)">Ver o cancelar mi cita<\/a>/.exec(correo.html);
    expect(boton).not.toBeNull();
    expect(boton![1]).toContain('font-size:16px');
    expect(boton![1]).toContain('min-height:44px');
    expect(boton![1]).toContain('background:#0b5cad;color:#ffffff');
    expect(correo.html).toContain(`>${enlace}</a>`);
  });
});
