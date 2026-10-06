import { z } from "zod";

export const idParam = z.object({ id: z.uuid("id deve ser um UUID") });

export const paginacaoQuery = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

/** Booleano em querystring ("true"/"false"); z.coerce.boolean trataria "false" como true. */
export const boolQuery = z.enum(["true", "false"]).transform((v) => v === "true");
