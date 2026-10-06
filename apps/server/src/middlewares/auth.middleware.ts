/**
 * Middlewares de acesso, usados nos hooks onRequest das rotas:
 *
 *   onRequest: [autenticar]                          // exige login
 *   onRequest: [autenticar, autorizar("ADMIN")]      // exige login + perfil
 *
 * Rodam no onRequest (antes da validação do corpo) para que um usuário sem permissão
 * receba 403, e não 400 com detalhes do formato esperado.
 *
 * O token carrega só o id (sub). Perfil e status "ativo" são lidos do banco a cada
 * requisição: desativar um usuário ou mudar seu perfil vale na hora.
 */
import type { FastifyRequest } from "fastify";

import type { Perfil } from "../generated/prisma/client.js";
import { naoAutenticado, proibido } from "../lib/erros.js";

export async function autenticar(req: FastifyRequest): Promise<void> {
  let sub: string;
  try {
    ({ sub } = await req.jwtVerify<{ sub: string }>());
  } catch {
    throw naoAutenticado("Token ausente, inválido ou expirado.");
  }
  const u = await req.server.container.models.usuarios.buscarPorId(sub);
  if (!u?.ativo) throw naoAutenticado("Usuário inexistente ou desativado.");
  req.usuario = { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil };
}

export function autorizar(...perfis: Perfil[]) {
  return async (req: FastifyRequest): Promise<void> => {
    if (!req.usuario) throw naoAutenticado();
    if (!perfis.includes(req.usuario.perfil)) throw proibido();
  };
}
