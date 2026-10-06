import { z } from "zod";
import { DECISOES } from "../lib/decisao.js";
import { idParam, paginacaoQuery } from "./comum.validator.js";

export const decisaoValidator = {
  registrar: {
    params: idParam,
    body: z.object({
      decisao: z.enum(DECISOES),
      observacao: z.string().trim().min(10, "justifique a decisão (mín. 10 caracteres)").max(4000),
    }),
  },
  obter: { params: idParam },
  listar: {
    querystring: paginacaoQuery.extend({
      ambienteId: z.uuid().optional(),
      decisao: z.enum(DECISOES).optional(),
    }),
  },
};
