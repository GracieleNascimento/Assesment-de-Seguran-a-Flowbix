import { z } from "zod";
import type { Usuario } from "../models/usuario.model.js";
import { PERFIS } from "../validators/usuario.validator.js";

export const usuarioView = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  perfil: z.enum(PERFIS),
  ativo: z.boolean(),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
});

/** Nunca expõe senhaHash: toda saída de usuário passa por aqui. */
export function renderUsuario(u: Usuario): z.infer<typeof usuarioView> {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    ativo: u.ativo,
    criadoEm: u.criadoEm.toISOString(),
    atualizadoEm: u.atualizadoEm.toISOString(),
  };
}
