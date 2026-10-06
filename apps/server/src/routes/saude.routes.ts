import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { livenessView, readinessView } from "../views/saude.view.js";

/** Públicas: usadas por load balancer / orquestrador. */
export const saudeRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = app.container.controllers.saude;
  const tags = ["Saúde"];

  app.get("/health", {
    schema: { tags, summary: "Liveness: o processo está de pé", response: { 200: livenessView } },
  }, c.liveness);

  app.get("/health/ready", {
    schema: {
      tags,
      summary: "Readiness: banco acessível e módulos carregados",
      response: { 200: readinessView, 503: readinessView },
    },
  }, c.readiness);
};
