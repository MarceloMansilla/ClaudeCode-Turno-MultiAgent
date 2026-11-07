# Contrato: acciones del servidor (Server Actions)

Todas las acciones exigen sesión válida; el `clinica_id` sale siempre de la sesión, nunca del
cliente (FR-004). Entradas validadas con Zod. Respuesta uniforme:

```ts
type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: CodigoError; mensaje: string; detalle?: unknown };
```

`mensaje` está en español de España, sin jerga técnica, y dice qué ha pasado y qué hacer
(FR-015, Principio VII).

## Códigos de error

| codigo | Cuándo | Mensaje (ejemplo) |
|--------|--------|-------------------|
| `CLAVE_INCORRECTA` | clave no válida | «La clave no es correcta. Revísala e inténtalo de nuevo.» |
| `SESION_CADUCADA` | sin sesión o caducada | «Tu sesión ha terminado. Vuelve a introducir la clave de la clínica.» |
| `SOLAPE` | viola `cita_sin_solape` | «María ya tiene una cita de 10:00 a 10:45. Elige otro hueco.» `detalle`: cita con la que choca (si es visible) |
| `HUECO_OCUPADO_A_LA_VEZ` | solape detectado en alta concurrente | «Este hueco se acaba de ocupar desde otro puesto. Elige otro hueco.» |
| `EN_EL_PASADO` | inicio < ahora (FR-013) | «No se pueden crear citas en el pasado.» |
| `FUERA_DE_HORARIO` | fuera de 09:00–20:00 o día no laborable (FR-014) | «La cita terminaría a las 20:15, después del cierre (20:00). Elige una hora anterior.» |
| `HORA_NO_VALIDA` | inicio no múltiplo de 15 min | «Las citas empiezan en punto, y cuarto, y media o menos cuarto.» |
| `SERVICIO_INCOMPATIBLE` | especialidad distinta (FR-009a) | «María no atiende "Consulta de nutrición". Elige un servicio de Fisioterapia.» |
| `TELEFONO_DUPLICADO` | teléfono ya registrado (FR-016b) | «Ya hay un paciente con este teléfono: Ana Pérez.» `detalle`: `{ pacienteId, nombre }` |
| `DATOS_NO_VALIDOS` | validación de campos | «Revisa el teléfono: debe tener 9 cifras.» |
| `CANCELACION_TARDIA` | cancelar con ahora ≥ inicio (FR-018) | «Esta cita ya ha empezado. Márcala como completada o no asistida.» |
| `TRANSICION_NO_PERMITIDA` | completar/no asistida antes del inicio | «Esta cita todavía no ha empezado.» |
| `ESTADO_CAMBIADO` | estado ya no es `reservada` (FR-020) | «Esta cita ya figura como cancelada. Hemos actualizado la agenda.» `detalle`: estado actual |

`SOLAPE` y `HUECO_OCUPADO_A_LA_VEZ` proceden ambos de la misma restricción de la BD
(código PostgreSQL `23P01`); el segundo se usa cuando la comprobación previa no encontró
conflicto y la BD sí (carrera).

## Acciones

### `entrar(clave: string) → Resultado<void>`
Comprueba la clave contra el hash de la clínica y crea la cookie de sesión (12 h). Errores:
`CLAVE_INCORRECTA`. Con una sola clínica en la 001, la clave identifica la clínica.

### `salir() → Resultado<void>`
Borra la cookie (FR-003).

### `buscarPacientes({ texto: string }) → Resultado<PacienteResumen[]>`
Busca por nombre (sin distinguir mayúsculas ni tildes) o por teléfono normalizado; máximo 10
resultados. `PacienteResumen = { id, nombre, telefono }`.

### `crearPaciente({ nombre, telefono, email? }) → Resultado<PacienteResumen>`
FR-016a/b. Errores: `DATOS_NO_VALIDOS`, `TELEFONO_DUPLICADO`.

### `crearCita(entrada) → Resultado<CitaVista>`
```ts
entrada = {
  profesionalId: string;
  servicioId: string;
  fecha: 'AAAA-MM-DD';         // día local de la clínica
  hora: 'HH:mm';               // hora local, 24 h
  paciente: { id: string } | { nuevo: { nombre: string; telefono: string; email?: string } };
}
```
Orden de validación: datos → servicio compatible → granularidad → horario → pasado → (alta de
paciente nuevo) → inserción. Paciente nuevo y cita se crean en **la misma transacción**: si la
cita falla, no queda ficha creada. Errores: todos los de alta anteriores.

### `cambiarEstadoCita({ citaId, accion: 'cancelar' | 'completar' | 'no_asistida' }) → Resultado<CitaVista>`
FR-017–FR-020. Cancelar exige confirmación en la interfaz. Errores: `CANCELACION_TARDIA`,
`TRANSICION_NO_PERMITIDA`, `ESTADO_CAMBIADO`.

## Lectura (Server Component, no acción)

### `obtenerAgendaDia({ profesionalId, fecha }) → AgendaDia`
```ts
AgendaDia = {
  profesional: { id, nombre, especialidad };
  fecha: 'AAAA-MM-DD'; etiquetaFecha: string;     // «lunes, 16/11/2026»
  laborable: boolean;
  citas: CitaVista[];                               // orden cronológico, todos los estados
  huecosLibres: { inicio: 'HH:mm'; fin: 'HH:mm'; reservable: boolean }[];  // reservable = futuro
}
CitaVista = {
  id; inicio: 'HH:mm'; fin: 'HH:mm'; estado;
  paciente: { nombre, telefono }; servicio: { nombre, duracionMinutos, precio: string /* «40,00 €» */ };
  accionesDisponibles: ('cancelar' | 'completar' | 'no_asistida')[];
}
```
