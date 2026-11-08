/**
 * Listas fijas para la semilla de demostración: nombres y apellidos españoles habituales. Las
 * personas son ficticias; teléfonos y correos se generan y no corresponden a nadie real.
 */
export const NOMBRES = [
  'Lucía', 'Carmen', 'Sofía', 'Marta', 'Elena', 'Paula', 'Laura', 'Isabel', 'Rocío', 'Nuria',
  'Alba', 'Cristina', 'Pilar', 'Silvia', 'Raquel', 'Beatriz', 'Irene', 'Teresa', 'Noelia', 'Ainhoa',
  'Javier', 'Daniel', 'Alejandro', 'Pablo', 'Sergio', 'Álvaro', 'Manuel', 'Adrián', 'Diego', 'Rubén',
  'Iván', 'Óscar', 'Miguel', 'Hugo', 'Andrés', 'Raúl', 'Íñigo', 'Fernando', 'Antonio', 'Gonzalo',
] as const;

export const APELLIDOS = [
  'García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez',
  'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez',
  'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil',
  'Ramírez', 'Serrano', 'Blanco', 'Molina', 'Morales', 'Suárez', 'Ortega', 'Delgado', 'Castro',
  'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Iglesias',
] as const;

/** Dominio reservado para ejemplos: ningún correo de la semilla llega a nadie. */
export const DOMINIO_CORREO = 'example.com';
