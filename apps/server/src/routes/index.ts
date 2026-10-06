/** Todas as rotas da v1. Novo recurso = model + service + controller + view + validator + uma linha aqui. */
import type { FastifyPluginAsync } from "fastify";

import { ambienteRoutes } from "./ambiente.routes.js";
import { assessmentRoutes } from "./assessment.routes.js";
import { authRoutes } from "./auth.routes.js";
import { catalogoRoutes } from "./catalogo.routes.js";
import { decisaoRoutes } from "./decisao.routes.js";
import { saudeRoutes } from "./saude.routes.js";
import { usuarioRoutes } from "./usuario.routes.js";

export const rotasV1: FastifyPluginAsync = async (app) => {
  await app.register(saudeRoutes);
  await app.register(authRoutes);
  await app.register(usuarioRoutes);
  await app.register(catalogoRoutes);
  await app.register(ambienteRoutes);
  await app.register(assessmentRoutes);
  await app.register(decisaoRoutes);
};
