import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { autenticar } from "../middlewares/auth.middleware.js";
import { catalogoValidator } from "../validators/catalogo.validator.js";
import { checkView, moduloView } from "../views/catalogo.view.js";
import { errosPadrao } from "../views/comum.view.js";

/** Leitura do que a plataforma sabe avaliar. Qualquer usuário autenticado. */
export const catalogoRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = app.container.controllers.catalogo;
  const doc = { tags: ["Catálogo"], security: [{ bearerAuth: [] }] };
  const onRequest = [autenticar];

  app.get("/modulos", {
    onRequest,
    schema: { ...doc, summary: "Módulos de assessment registrados", response: { 200: z.array(moduloView), ...errosPadrao } },
  }, c.listarModulos);

  app.get("/catalogo", {
    onRequest,
    schema: {
      ...doc,
      summary: "Verificações (checks) de todos os módulos, com normas e ameaças",
      ...catalogoValidator.listarChecks,
      response: { 200: z.array(checkView), ...errosPadrao },
    },
  }, c.listarChecks);
};
