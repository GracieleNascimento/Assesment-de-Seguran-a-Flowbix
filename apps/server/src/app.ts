/**
 * Monta a aplicação Fastify (sem abrir porta). Usado pelo server.ts e pelos testes.
 *
 * Ordem: validação/serialização Zod → erros → segurança HTTP → banco → JWT → docs →
 * container (models, services, controllers) → rotas /api/v1.
 */
import Fastify from "fastify";
import {
  serializerCompiler, validatorCompiler, type ZodTypeProvider,
} from "fastify-type-provider-zod";

import type { Env } from "./config/env.js";
import { type Container, criarContainer } from "./container.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { criarPrisma } from "./models/prisma.js";
import authPlugin from "./plugins/auth.js";
import docsPlugin from "./plugins/docs.js";
import errosPlugin from "./plugins/erros.js";
import prismaPlugin from "./plugins/prisma.js";
import segurancaPlugin from "./plugins/seguranca.js";
import { rotasV1 } from "./routes/index.js";

declare module "fastify" {
  interface FastifyInstance {
    container: Container;
  }
}

export interface OpcoesApp {
  env: Env;
  /** Injetável para testes; por padrão cria a partir de DATABASE_URL. */
  prisma?: PrismaClient;
}

export async function construirApp({ env, prisma = criarPrisma(env.DATABASE_URL) }: OpcoesApp) {
  const app = Fastify({
    logger: env.NODE_ENV === "test" ? false : { level: env.LOG_LEVEL },
    requestIdHeader: "x-request-id",
    bodyLimit: 1024 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook("onSend", async (req, reply) => {
    reply.header("X-Request-Id", req.id);
  });

  await app.register(errosPlugin);
  await app.register(segurancaPlugin, { corsOrigens: env.CORS_ORIGINS, limitePorMinuto: env.RATE_LIMIT_MAX });
  await app.register(prismaPlugin, { prisma });
  await app.register(authPlugin, { segredo: env.JWT_SECRET, expiraEm: env.JWT_EXPIRES_IN });
  await app.register(docsPlugin);

  const container = criarContainer(prisma, app.log);
  app.decorate("container", container);
  // preClose roda antes do onClose (que desconecta o banco): deixa os assessments terminarem.
  app.addHook("preClose", () => container.executor.aguardar());

  await app.register(rotasV1, { prefix: "/api/v1" });
  app.get("/", { schema: { hide: true } }, (_req, reply) => reply.redirect("/docs"));

  return app;
}

export type App = Awaited<ReturnType<typeof construirApp>>;
