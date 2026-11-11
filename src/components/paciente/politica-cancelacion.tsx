import { normalizarTelefono } from '@/dominio/telefono';

/**
 * Pinta el enunciado de la política (005, FR-016) con el teléfono como enlace `tel:`. No
 * redacta nada: recibe el texto de `enunciadoPoliticaCancelacion` (FR-017).
 */
export function PoliticaCancelacion({ enunciado, telefono }: { enunciado: string; telefono: string }) {
  const posicion = enunciado.lastIndexOf(telefono);
  const cifras = normalizarTelefono(telefono);
  if (posicion < 0 || !cifras) return <p className="text-sm text-muted-foreground">{enunciado}</p>;
  return (
    <p className="text-sm text-muted-foreground">
      {enunciado.slice(0, posicion)}
      <a href={`tel:+34${cifras}`} className="font-semibold text-primary underline underline-offset-4">
        {telefono}
      </a>
      {enunciado.slice(posicion + telefono.length)}
    </p>
  );
}
