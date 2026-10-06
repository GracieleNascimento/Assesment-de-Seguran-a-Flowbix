import { z } from "zod";
import { SEVERIDADES } from "@flowbix/core";

export const TIPOS = ["seguranca", "tecnico"] as const;

export const catalogoValidator = {
  listarChecks: {
    querystring: z.object({
      plataforma: z.string().optional(),
      tipo: z.enum(TIPOS).optional(),
      severidade: z.enum(SEVERIDADES as [string, ...string[]]).optional(),
    }),
  },
};
