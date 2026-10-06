/**
 * Formato único de erro da API:
 *   { "erro": { "codigo": "VALIDACAO", "mensagem": "...", "detalhes": [...] }, "requestId": "..." }
 * Erros inesperados viram 500 genérico (detalhe só no log, correlacionado pelo requestId).
 */
import fp from "fastify-plugin";
import type { FastifyError, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors, isResponseSerializationError,
} from "fastify-type-provider-zod";

import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../lib/erros.js";

function corpo(req: FastifyRequest, codigo: string, mensagem: string, detalhes?: unknown) {
  return {
    erro: { codigo, mensagem, ...(detalhes !== undefined && { detalhes }) },
    requestId: String(req.id),
  };
}

export default fp(async (app) => {
  app.setNotFoundHandler((req, reply) =>
    reply.code(404).send(corpo(req, "ROTA_NAO_ENCONTRADA", `Rota ${req.method} ${req.url} não existe.`)),
  );

  app.setErrorHandler<FastifyError | AppError>((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      const detalhes = err.validation.map((v) => ({
        campo: `${err.validationContext ?? ""}${v.instancePath}`,
        mensagem: v.message,
      }));
      return reply.code(400).send(corpo(req, "VALIDACAO", "Requisição inválida.", detalhes));
    }
    if (err instanceof AppError) {
      return reply.code(err.status).send(corpo(req, err.codigo, err.message, err.detalhes));
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return reply.code(409).send(corpo(req, "CONFLITO", "Registro duplicado."));
      if (err.code === "P2025") return reply.code(404).send(corpo(req, "NAO_ENCONTRADO", "Registro não encontrado."));
    }
    const { statusCode, code } = err as FastifyError;
    if (isResponseSerializationError(err)) {
      req.log.error({ err }, "resposta fora do schema declarado");
    } else if (statusCode && statusCode < 500) {
      // Erros do próprio Fastify/plugins: JSON malformado, corpo grande demais etc.
      return reply.code(statusCode).send(corpo(req, code ?? "REQUISICAO_INVALIDA", err.message));
    } else {
      req.log.error({ err }, "erro não tratado");
    }
    return reply.code(500).send(corpo(req, "ERRO_INTERNO", "Erro interno. Informe o requestId ao suporte."));
  });
}, { name: "erros" });
