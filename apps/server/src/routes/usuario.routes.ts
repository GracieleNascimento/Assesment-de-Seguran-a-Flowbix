import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { autenticar, autorizar } from "../middlewares/auth.middleware.js";
import { usuarioValidator } from "../validators/usuario.validator.js";
import { erroView, errosPadrao, paginadoView } from "../views/comum.view.js";
import { usuarioView } from "../views/usuario.view.js";

/** Gestão de usuários: só ADMIN. Não há DELETE; desative com ativo=false. */
export const usuarioRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = app.container.controllers.usuarios;
  const doc = { tags: ["Usuários"], security: [{ bearerAuth: [] }] };
  const onRequest = [autenticar, autorizar("ADMIN")];

  app.get("/usuarios", {
    onRequest,
    schema: { ...doc, summary: "Lista usuários", ...usuarioValidator.listar, response: { 200: paginadoView(usuarioView), ...errosPadrao } },
  }, c.listar);

  app.post("/usuarios", {
    onRequest,
    schema: { ...doc, summary: "Cria usuário", ...usuarioValidator.criar, response: { 201: usuarioView, 409: erroView, ...errosPadrao } },
  }, c.criar);

  app.get("/usuarios/:id", {
    onRequest,
    schema: { ...doc, summary: "Detalha usuário", ...usuarioValidator.obter, response: { 200: usuarioView, ...errosPadrao } },
  }, c.obter);

  app.patch("/usuarios/:id", {
    onRequest,
    schema: {
      ...doc,
      summary: "Atualiza nome, perfil, status ou senha",
      ...usuarioValidator.atualizar,
      response: { 200: usuarioView, 422: erroView, ...errosPadrao },
    },
  }, c.atualizar);
};
