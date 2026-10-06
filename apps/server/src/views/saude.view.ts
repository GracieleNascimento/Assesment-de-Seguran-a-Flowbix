import { z } from "zod";

export const livenessView = z.object({
  status: z.literal("ok"),
  versao: z.string(),
  uptimeSegundos: z.number(),
});

export const readinessView = z.object({
  status: z.enum(["ok", "indisponivel"]),
  banco: z.enum(["ok", "falha"]),
  modulos: z.number(),
});
