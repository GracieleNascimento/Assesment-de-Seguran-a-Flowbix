import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { autenticar, autorizar } from "../middlewares/auth.middleware.js";
import { ambienteValidator } from "../validators/ambiente.validator.js";
import { ambienteView } from "../views/ambiente.view.js";
import { erroView, errosPadrao, paginadoView } from "../views/comum.view.js";

/** Leitura: todos os perfis. Escrita: ADMIN e ANALISTA. Arquivar: ADMIN. */
export const ambienteRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = app.container.controllers.ambientes;
  const doc = { tags: ["Ambientes"], security: [{ bearerAuth: [] }] };
  const leitura = [autenticar];
  const escrita = [autenticar, autorizar("ADMIN", "ANALISTA")];

  app.get("/ambientes", {
    onRequest: leitura,
    schema: { ...doc, summary: "Lista ambientes", ...ambienteValidator.listar, response: { 200: paginadoView(ambienteView), ...errosPadrao } },
  }, c.listar);

  app.post("/ambientes", {
    onRequest: escrita,
    schema: { ...doc, summary: "Cadastra ambiente", ...ambienteValidator.criar, response: { 201: ambienteView, ...errosPadrao } },
  }, c.criar);

  app.get("/ambientes/:id", {
    onRequest: leitura,
    schema: { ...doc, summary: "Detalha ambiente", ...ambienteValidator.obter, response: { 200: ambienteView, ...errosPadrao } },
  }, c.obter);

  app.patch("/ambientes/:id", {
    onRequest: escrita,
    schema: {
      ...doc,
      summary: "Atualiza ambiente",
      ...ambienteValidator.atualizar,
      response: { 200: ambienteView, 422: erroView, ...errosPadrao },
    },
  }, c.atualizar);

  app.delete("/ambientes/:id", {
    onRequest: [autenticar, autorizar("ADMIN")],
    schema: {
      ...doc,
      summary: "Arquiva ambiente (mantém o histórico)",
      ...ambienteValidator.arquivar,
      response: { 204: z.null(), ...errosPadrao },
    },
  }, c.arquivar);
};
