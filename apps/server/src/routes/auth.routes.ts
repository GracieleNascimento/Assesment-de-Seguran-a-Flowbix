import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { autenticar } from "../middlewares/auth.middleware.js";
import { authValidator } from "../validators/auth.validator.js";
import { loginView } from "../views/auth.view.js";
import { erroView, errosPadrao } from "../views/comum.view.js";
import { usuarioView } from "../views/usuario.view.js";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = app.container.controllers.auth;
  const tags = ["Autenticação"];
  const security = [{ bearerAuth: [] }];
  // Limite próprio, bem menor que o global: dificulta força bruta.
  const limiteSenha = { rateLimit: { max: 10, timeWindow: "1 minute" } };

  app.post("/auth/login", {
    config: limiteSenha,
    schema: {
      tags,
      summary: "Login com e-mail e senha; devolve o token JWT",
      ...authValidator.login,
      response: { 200: loginView, 400: erroView, 401: erroView, 429: erroView },
    },
  }, c.login);

  app.get("/auth/me", {
    onRequest: [autenticar],
    schema: { tags, security, summary: "Usuário logado", response: { 200: usuarioView, ...errosPadrao } },
  }, c.me);

  app.post("/auth/me/senha", {
    onRequest: [autenticar],
    config: limiteSenha,
    schema: {
      tags,
      security,
      summary: "Troca a própria senha",
      ...authValidator.trocarSenha,
      response: { 204: z.null(), 422: erroView, ...errosPadrao },
    },
  }, c.trocarSenha);
};
