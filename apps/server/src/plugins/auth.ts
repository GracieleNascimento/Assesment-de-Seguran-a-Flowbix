/** Registra o JWT e o campo request.usuario. A checagem em si está em middlewares/auth.middleware.ts. */
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";

import type { Perfil } from "../generated/prisma/client.js";

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string; iat: number; exp: number };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    usuario: UsuarioAutenticado;
  }
}

export interface OpcoesAuth {
  segredo: string;
  expiraEm: string;
}

export default fp<OpcoesAuth>(async (app, opts) => {
  await app.register(jwt, { secret: opts.segredo, sign: { expiresIn: opts.expiraEm } });
  app.decorateRequest("usuario", null as unknown as UsuarioAutenticado);
}, { name: "auth" });
