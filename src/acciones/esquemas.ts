/**
 * Validación de entradas de las Server Actions (contracts/server-actions.md). Las reglas de
 * negocio se validan en los servicios; aquí solo la forma de los datos.
 */
import { z } from 'zod';

const uuid = z.uuid();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const esquemaCrearCita = z.object({
  profesionalId: uuid,
  servicioId: uuid,
  fecha,
  hora,
  paciente: z.union([
    z.object({ id: uuid }),
    z.object({
      nuevo: z.object({
        nombre: z.string().max(200),
        telefono: z.string().max(40),
        email: z.string().max(200).optional().nullable(),
      }),
    }),
  ]),
});

export const esquemaBuscarPacientes = z.object({ texto: z.string().max(100) });

export const esquemaCambiarEstado = z.object({
  citaId: uuid,
  accion: z.enum(['cancelar', 'completar', 'no_asistida']),
});
