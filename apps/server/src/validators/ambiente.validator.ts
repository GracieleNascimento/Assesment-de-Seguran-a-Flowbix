import { z } from "zod";
import { boolQuery, idParam, paginacaoQuery } from "./comum.validator.js";

/**
 * Segredos (senha, apiToken) NUNCA são gravados no banco: o ambiente guarda só a
 * referência "env:NOME" e o valor é lido da variável de ambiente do servidor na execução.
 */
const refSegredo = z
  .string()
  .regex(/^env:[A-Za-z_][A-Za-z0-9_]*$/, "use a referência env:NOME_DA_VARIAVEL (segredos não são gravados no banco)");

export const alvoSchema = z.looseObject({
  url: z.url().optional(),
  usuario: z.string().optional(),
  senha: refSegredo.optional(),
  apiToken: refSegredo.optional(),
  verificarTls: z.boolean().optional(),
});

const campos = z.object({
  nome: z.string().trim().min(2).max(160),
  cliente: z.string().trim().max(160).optional(),
  descricao: z.string().trim().max(2000).optional(),
  alvos: z
    .record(z.string().regex(/^[a-z][a-z0-9-]*$/, "nome de plataforma inválido"), alvoSchema)
    .refine((a) => Object.keys(a).length > 0, "informe ao menos um alvo (ex.: grafana)"),
  opcoes: z.record(z.string(), z.unknown()),
});

export const ambienteValidator = {
  listar: {
    querystring: paginacaoQuery.extend({
      busca: z.string().trim().min(1).optional().describe("Filtra por nome ou cliente"),
      incluirArquivados: boolQuery.default(false),
    }),
  },
  obter: { params: idParam },
  criar: {
    body: campos.extend({ opcoes: campos.shape.opcoes.default({}) }),
  },
  /** PATCH: campos enviados substituem os atuais (alvos/opcoes são trocados por inteiro). */
  atualizar: {
    params: idParam,
    body: campos.partial().refine((b) => Object.keys(b).length > 0, "informe ao menos um campo"),
  },
  arquivar: { params: idParam },
};
