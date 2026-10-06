import { z } from "zod";
import { idParam, paginacaoQuery } from "./comum.validator.js";

export const STATUS = ["PENDENTE", "EXECUTANDO", "CONCLUIDO", "ERRO"] as const;

export const assessmentValidator = {
  iniciar: {
    params: idParam,
    body: z
      .object({
        modulos: z.array(z.string()).optional().describe("Ids dos módulos; omitido = todos os aplicáveis"),
      })
      .default({}),
  },
  listar: {
    querystring: paginacaoQuery.extend({
      ambienteId: z.uuid().optional(),
      status: z.enum(STATUS).optional(),
    }),
  },
  obter: { params: idParam },
  relatorio: {
    params: idParam,
    querystring: z.object({ download: z.enum(["true", "false"]).default("false") }),
  },
};
