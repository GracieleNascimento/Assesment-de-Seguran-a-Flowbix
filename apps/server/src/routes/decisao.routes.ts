import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { autenticar, autorizar } from "../middlewares/auth.middleware.js";
import { decisaoValidator } from "../validators/decisao.validator.js";
import { erroView, errosPadrao, paginadoView } from "../views/comum.view.js";
import { decisaoView } from "../views/decisao.view.js";

/** Decisões go / condicional / no-go. Registrar: ADMIN. Consultar: todos. */
export const decisaoRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = app.container.controllers.decisoes;
  const doc = { tags: ["Comitê"], security: [{ bearerAuth: [] }] };
  const leitura = [autenticar];

  app.post("/assessments/:id/decisao", {
    onRequest: [autenticar, autorizar("ADMIN")],
    schema: {
      ...doc,
      summary: "Registra a decisão do comitê (única e imutável)",
      ...decisaoValidator.registrar,
      response: { 201: decisaoView, 409: erroView, 422: erroView, ...errosPadrao },
    },
  }, c.registrar);

  app.get("/assessments/:id/decisao", {
    onRequest: leitura,
    schema: { ...doc, summary: "Decisão do comitê de um assessment", ...decisaoValidator.obter, response: { 200: decisaoView, ...errosPadrao } },
  }, c.obter);

  app.get("/decisoes", {
    onRequest: leitura,
    schema: {
      ...doc,
      summary: "Histórico de decisões (trilha de evidências)",
      ...decisaoValidator.listar,
      response: { 200: paginadoView(decisaoView), ...errosPadrao },
    },
  }, c.listar);
};
