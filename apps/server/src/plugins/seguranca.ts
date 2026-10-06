/** Cabeçalhos de segurança (helmet), CORS e limite de requisições por IP. */
import fp from "fastify-plugin";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { AppError } from "../lib/erros.js";

export interface OpcoesSeguranca {
  corsOrigens: string[];
  limitePorMinuto: number;
}

export default fp<OpcoesSeguranca>(async (app, opts) => {
  await app.register(helmet);
  await app.register(cors, {
    origin: opts.corsOrigens.length ? opts.corsOrigens : false,
    exposedHeaders: ["Location", "X-Request-Id"],
  });
  await app.register(rateLimit, {
    max: opts.limitePorMinuto,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, ctx) =>
      new AppError(429, "LIMITE_DE_REQUISICOES", `Muitas requisições. Tente novamente em ${ctx.after}.`),
  });
}, { name: "seguranca" });
