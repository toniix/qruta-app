import * as z from "zod";

/**
 * Shared zod schemas. They mirror the backend jakarta constraints so invalid
 * data is rejected before the request leaves the browser (fast feedback +
 * fewer useless round trips). They are NOT the security boundary: everything
 * is re-validated server-side (@Valid DTOs). Never rely on these alone.
 */

/** Runs a schema and returns first-message-per-field errors (or null). */
export function validateWith(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data, fieldErrors: null };
  const { fieldErrors } = z.flattenError(result.error);
  const first = Object.fromEntries(
    Object.entries(fieldErrors).map(([field, messages]) => [
      field,
      messages?.[0] || "Valor inválido.",
    ]),
  );
  return { ok: false, data: null, fieldErrors: first };
}

/** Optional text field that also accepts '' (raw input state). */
const optionalText = (max, message) =>
  z.string().trim().max(max, message).optional().or(z.literal(""));

const requiredText = (min, max, emptyMessage, tooLongMessage) =>
  z
    .string()
    .trim()
    .min(min, emptyMessage)
    .max(max, tooLongMessage || emptyMessage);

const uuidField = (message) =>
  z.uuid(message || "Seleccioná una opción válida.");

const latitudeField = (message) =>
  z.coerce
    .number(message || "Latitud inválida.")
    .min(-90, "La latitud va de -90 a 90.")
    .max(90, "La latitud va de -90 a 90.");

const longitudeField = (message) =>
  z.coerce
    .number(message || "Longitud inválida.")
    .min(-180, "La longitud va de -180 a 180.")
    .max(180, "La longitud va de -180 a 180.");

const colorField = () =>
  z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido.");

const statusField = () =>
  z.enum(["ACTIVE", "INACTIVE"], { error: "Estado inválido." });

const directionField = () =>
  z.enum(["IDA", "VUELTA"], { error: "Sentido inválido." });

// ── Cities ────────────────────────────────────────────────────────────────
export const citySchema = z.object({
  name: requiredText(1, 120, "El nombre de la ciudad es obligatorio."),
  department: requiredText(1, 120, "El departamento es obligatorio."),
  country: optionalText(60, "País demasiado largo."),
  latitude: latitudeField().nullish(),
  longitude: longitudeField().nullish(),
  radiusKm: z.coerce
    .number("Radio inválido.")
    .min(1, "El radio mínimo es 1 km.")
    .max(200, "El radio máximo es 200 km."),
});

// ── Transport lines ───────────────────────────────────────────────────────
export const lineSchema = z.object({
  cityId: uuidField("Seleccioná una ciudad."),
  name: requiredText(1, 120, "El nombre de la línea es obligatorio."),
  code: optionalText(20, "Código demasiado largo (máx. 20)."),
  color: colorField(),
  company: optionalText(120, "Empresa demasiado larga (máx. 120)."),
  contact: optionalText(120, "Contacto demasiado largo (máx. 120)."),
  description: optionalText(500, "Descripción demasiado larga (máx. 500)."),
  status: statusField(),
});

// ── Stops ─────────────────────────────────────────────────────────────────
export const stopSchema = z.object({
  cityId: uuidField("No se pudo determinar la ciudad."),
  name: requiredText(1, 120, "El nombre del paradero es obligatorio."),
  latitude: latitudeField(),
  longitude: longitudeField(),
  reference: optionalText(200, "Referencia demasiado larga (máx. 200)."),
  address: optionalText(200, "Dirección demasiado larga (máx. 200)."),
  isAccessible: z.boolean(),
});

// ── Routes (basic data shared by drawer + wizard step 1) ──────────────────
export const routeBasicsSchema = z.object({
  transportLineId: uuidField("Seleccioná una línea de transporte."),
  code: requiredText(1, 20, "El código de ruta es obligatorio."),
  name: requiredText(1, 120, "El nombre de la ruta es obligatorio."),
  color: colorField(),
  fare: z
    .string()
    .trim()
    .regex(/^(\d+(\.\d{1,2})?)?$/, "Tarifa inválida (ej: 1.50).")
    .optional()
    .or(z.literal("")),
  schedule: optionalText(60, "Horario demasiado largo (máx. 60)."),
  frequency: optionalText(60, "Frecuencia demasiado larga (máx. 60)."),
  description: optionalText(500, "Descripción demasiado larga (máx. 500)."),
  status: statusField(),
});

// ── Routes (full single-POST payload: basics + directions) ────────────────
const routeStopItemSchema = z.object({
  stopId: uuidField("Paradero inválido."),
  stopOrder: z.coerce.number().int().positive("Orden inválido."),
  distanceFromStart: z.coerce.number().min(0, "Distancia inválida."),
});

const routePointItemSchema = z.object({
  pointOrder: z.coerce.number().int().positive("Orden inválido."),
  latitude: latitudeField(),
  longitude: longitudeField(),
});

const routeDirectionSchema = z.object({
  direction: directionField(),
  originName: optionalText(120, "Origen demasiado largo (máx. 120)."),
  destinationName: optionalText(120, "Destino demasiado largo (máx. 120)."),
  totalDistanceKm: z.coerce
    .number("Distancia inválida.")
    .min(0.1, "La distancia debe ser mayor a 0.")
    .max(10000, "Distancia poco realista."),
  estimatedMinutes: z.coerce
    .number("Tiempo inválido.")
    .int("Minutos debe ser entero.")
    .min(1, "El tiempo mínimo es 1 minuto.")
    .max(1440, "El tiempo máximo es 24 horas."),
  stops: z.array(routeStopItemSchema),
  routePoints: z.array(routePointItemSchema),
});

export const routePayloadSchema = routeBasicsSchema.extend({
  directions: z
    .array(routeDirectionSchema)
    .min(1, "Agregá al menos un sentido."),
});

// ── Auth ──────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresá tu correo electrónico.")
    .max(120, "Correo demasiado largo.")
    .pipe(z.email("Ingresá un correo válido.")),
  password: requiredText(1, 128, "Ingresá tu contraseña."),
});

// ── Community ─────────────────────────────────────────────────────────────
export const aliasSchema = z
  .string()
  .trim()
  .min(2, "El alias necesita al menos 2 letras.")
  .max(15, "El alias admite hasta 15 caracteres.");

export const communityPostSchema = z.object({
  authorAlias: aliasSchema,
  category: requiredText(1, 60, "Elegí una categoría."),
  content: requiredText(4, 600, "Escribí un mensaje de al menos 4 caracteres."),
  routeId: z.uuid("Ruta inválida.").nullish().or(z.literal("")),
});

export const communityCommentSchema = z.object({
  authorAlias: aliasSchema,
  content: requiredText(
    2,
    400,
    "El comentario necesita al menos 2 caracteres.",
  ),
});

// ── Search ────────────────────────────────────────────────────────────────
export const searchQuerySchema = z
  .string()
  .trim()
  .min(1, "Escribí algo para buscar.")
  .max(100, "Búsqueda demasiado larga (máx. 100).");
