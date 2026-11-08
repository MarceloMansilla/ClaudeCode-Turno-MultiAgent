/**
 * Contenido del recordatorio (spec 003, FR-007, FR-008, FR-019, FR-020, FR-022;
 * contracts/correo-recordatorio.md; research R4 y R5). Función pura.
 *
 * El enunciado de la política de cancelación llega ya hecho de la 005
 * (`enunciadoPoliticaCancelacion`, 005 FR-016) y se inserta sin retocarlo. Ningún otro texto de
 * este fichero dice hasta cuándo se puede cancelar (FR-022, 005 FR-017).
 */
import { formatearFecha, formatearHora, formatearRango } from '@/lib/formato';
import { fechaLocal } from '@/lib/zona';

export interface DatosRecordatorio {
  clinica: { nombre: string };
  paciente: { nombre: string };
  profesional: { nombre: string };
  servicio: { nombre: string };
  inicio: Date;
  fin: Date;
  zona: string;
  /** URL absoluta del enlace personal (`<URL_PUBLICA>` + `rutaEnlacePaciente(token)`). */
  enlacePersonal: string;
  /** Texto de `enunciadoPoliticaCancelacion` para esta cita (005 FR-016). */
  enunciado: string;
}

export interface CorreoRecordatorio {
  asunto: string;
  texto: string;
  html: string;
}

/** Texto provisional del botón hasta la guía de textos de la 002 (S10). */
export const TEXTO_BOTON = 'Ver o cancelar mi cita';

function nombreDePila(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function componerRecordatorio(d: DatosRecordatorio): CorreoRecordatorio {
  const dia = formatearFecha(fechaLocal(d.inicio, d.zona));
  const horaInicio = formatearHora(d.inicio, d.zona);
  const hora = formatearRango(horaInicio, formatearHora(d.fin, d.zona));
  const pila = nombreDePila(d.paciente.nombre);

  const asunto = `Recordatorio de su cita en ${d.clinica.nombre}: ${dia}, ${horaInicio}`;

  const texto = [
    `Hola, ${pila}:`,
    '',
    `Le recordamos su cita en ${d.clinica.nombre}:`,
    '',
    `  Día:         ${dia}`,
    `  Hora:        ${hora}`,
    `  Profesional: ${d.profesional.nombre}`,
    `  Servicio:    ${d.servicio.nombre}`,
    '',
    'Si no puede venir, cancele la cita para que otra persona pueda aprovechar el hueco:',
    d.enlacePersonal,
    '',
    d.enunciado,
    '',
    d.clinica.nombre,
    '',
  ].join('\n');

  const e = escaparHtml;
  const fila = (etiqueta: string, valor: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#4a4a4a;vertical-align:top">${etiqueta}</td>` +
    `<td style="padding:4px 0;color:#1a1a1a;font-weight:600">${e(valor)}</td></tr>`;

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(asunto)}</title></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="max-width:600px;margin:0 auto;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1a1a1a">
<p style="margin:0 0 12px">Hola, ${e(pila)}:</p>
<p style="margin:0 0 8px">Le recordamos su cita en ${e(d.clinica.nombre)}:</p>
<table role="presentation" style="border-collapse:collapse;margin:0 0 16px;font-size:16px">
${fila('Día', dia)}
${fila('Hora', hora)}
${fila('Profesional', d.profesional.nombre)}
${fila('Servicio', d.servicio.nombre)}
</table>
<p style="margin:0 0 12px">Si no puede venir, cancele la cita para que otra persona pueda aprovechar el hueco:</p>
<p style="margin:0 0 8px"><a href="${e(d.enlacePersonal)}" style="display:inline-block;min-height:44px;box-sizing:border-box;padding:12px 20px;background:#0b5cad;color:#ffffff;font-size:16px;font-weight:700;line-height:20px;text-decoration:none;border-radius:6px">${e(TEXTO_BOTON)}</a></p>
<p style="margin:0 0 16px;font-size:16px;word-break:break-all"><a href="${e(d.enlacePersonal)}" style="color:#0b5cad">${e(d.enlacePersonal)}</a></p>
<p style="margin:0 0 16px">${e(d.enunciado)}</p>
<p style="margin:0">${e(d.clinica.nombre)}</p>
</div>
</body>
</html>
`;

  return { asunto, texto, html };
}
