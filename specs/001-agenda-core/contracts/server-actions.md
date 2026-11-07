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
| `DATOS_NO_VALIDOS` | validación de campos | Teléfono (FR-016c): «Revisa el teléfono: debe ser un número español de 9 cifras.»; nombre: «Escribe el nombre del paciente.» |
| `CANCELACION_TARDIA` | cancelar con ahora ≥ inicio (FR-018, fila «Recepción (panel)») | «Esta cita ya ha empezado. Márcala como completada o no asistida.» |
| `TRANSICION_NO_PERMITIDA` | completar/no asistida antes del inicio | «Esta cita todavía no ha empezado.» |
| `ESTADO_CAMBIADO` | estado ya no es `reservada` (FR-020) | «Esta cita ya figura como cancelada. Hemos actualizado la agenda.» `detalle`: estado actual |
| `NO_ENCONTRADO` | cita, profesional, servicio o paciente inexistente (o de otra clínica) | «No encontramos esa cita. Actualiza la agenda e inténtalo de nuevo.» |

`SOLAPE` / `HUECO_OCUPADO_A_LA_VEZ`: si PostgreSQL aborta una de dos altas simultáneas por
interbloqueo al comprobar `cita_sin_solape` (40P01), la transacción se repite (máx. 3 veces) y
la perdedora recibe el rechazo normal; nunca se guarda un solape.

`SOLAPE` y `HUECO_OCUPADO_A_LA_VEZ` proceden ambos de la misma restricción de la BD
(código PostgreSQL `23P01`); el segundo se usa cuando la comprobación previa no encontró
conflicto y la BD sí (carrera).

## Acciones

### `entrar(clave: string) → Resultado<void>`
Comprueba la clave contra el hash de la clínica y crea la cookie de sesión (12 h). Errores:
`CLAVE_INCORRECTA`. En la 001 cada instalación tiene una sola clínica (FR-001): la clave se
compara con el hash de esa clínica.

### `salir() → Resultado<void>`
Borra la cookie (FR-003).

### `buscarPacientes({ texto: string }) → Resultado<PacienteResumen[]>`
Busca por nombre (sin distinguir mayúsculas ni tildes) o por teléfono normalizado; máximo 10
resultados. `PacienteResumen = { id, nombre, telefono }`.

### Alta de paciente (dentro de `crearCita`)
FR-016a/b/c. No se expone como acción independiente: la ficha nueva solo se crea junto con
su cita (`paciente: { nuevo }`), en la misma transacción. Errores: `DATOS_NO_VALIDOS`,
`TELEFONO_DUPLICADO` (con `detalle: { pacienteId, nombre, telefono }`).

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

*(Enmienda revisión cruzada S2–S5, FR-018a)* Esta acción es la cancelación de recepción:
con `accion: 'cancelar'` escribe, en el mismo `UPDATE` condicional,
`estado = 'cancelada'`, `estado_cambiado_en = ahora` y `cancelada_por = 'recepcion'`. El
origen no es un parámetro de entrada: el cliente no puede elegirlo. `completar` y
`no_asistida` dejan `cancelada_por` nulo. La cancelación del paciente (`cancelada_por =
'paciente'`) no pasa por esta acción; la define la spec 005.

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
