import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { autenticar, autorizar } from "../middlewares/auth.middleware.js";
import { assessmentValidator } from "../validators/assessment.validator.js";
import { assessmentResumoView, assessmentView } from "../views/assessment.view.js";
import { erroView, errosPadrao, paginadoView } from "../views/comum.view.js";

/** Iniciar: ADMIN e ANALISTA. Consultar e baixar relatório: todos. */
export const assessmentRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = app.container.controllers.assessments;
  const doc = { tags: ["Assessments"], security: [{ bearerAuth: [] }] };
  const leitura = [autenticar];

  app.post("/ambientes/:id/assessments", {
    onRequest: [autenticar, autorizar("ADMIN", "ANALISTA")],
    schema: {
      ...doc,
      summary: "Inicia um assessment do ambiente (assíncrono)",
      description: "Responde 202 imediatamente. Acompanhe por GET /assessments/{id} até status CONCLUIDO ou ERRO.",
      ...assessmentValidator.iniciar,
      response: { 202: assessmentResumoView, 422: erroView, ...errosPadrao },
    },
  }, c.iniciar);

  app.get("/assessments", {
    onRequest: leitura,
    schema: {
      ...doc,
      summary: "Lista assessments (sem os achados)",
      ...assessmentValidator.listar,
      response: { 200: paginadoView(assessmentResumoView), ...errosPadrao },
    },
  }, c.listar);

  app.get("/assessments/:id", {
    onRequest: leitura,
    schema: {
      ...doc,
      summary: "Detalha assessment: status, achados, comitê e log",
      ...assessmentValidator.obter,
      response: { 200: assessmentView, ...errosPadrao },
    },
  }, c.obter);

  app.get("/assessments/:id/relatorio", {
    onRequest: leitura,
    schema: {
      ...doc,
      summary: "Relatório HTML com a marca Flowbix",
      ...assessmentValidator.relatorio,
      produces: ["text/html"],
      response: { 200: z.string().describe("Documento HTML"), 422: erroView, ...errosPadrao },
    },
  }, c.relatorio);
};
