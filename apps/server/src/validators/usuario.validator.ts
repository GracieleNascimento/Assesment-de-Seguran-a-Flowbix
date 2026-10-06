import { z } from "zod";
import { boolQuery, idParam, paginacaoQuery } from "./comum.validator.js";

export const PERFIS = ["ADMIN", "ANALISTA", "LEITURA"] as const;

/** Política mínima de senha (NIST 800-63B: comprimento > complexidade). */
export const senhaSchema = z.string().min(10, "a senha deve ter pelo menos 10 caracteres").max(128);

export const emailSchema = z.email().max(254).transform((e) => e.toLowerCase());

export const usuarioValidator = {
  listar: {
    querystring: paginacaoQuery.extend({
      busca: z.string().trim().min(1).optional().describe("Filtra por nome ou e-mail"),
      ativo: boolQuery.optional(),
    }),
  },
  obter: { params: idParam },
  criar: {
    body: z.object({
      nome: z.string().trim().min(2).max(120),
      email: emailSchema,
      senha: senhaSchema,
      perfil: z.enum(PERFIS).default("LEITURA"),
    }),
  },
  atualizar: {
    params: idParam,
    body: z
      .object({
        nome: z.string().trim().min(2).max(120),
        perfil: z.enum(PERFIS),
        ativo: z.boolean(),
        senha: senhaSchema,
      })
      .partial()
      .refine((b) => Object.keys(b).length > 0, "informe ao menos um campo"),
  },
};
