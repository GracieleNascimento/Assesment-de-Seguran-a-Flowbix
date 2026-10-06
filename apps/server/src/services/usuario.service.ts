import type { Perfil } from "../generated/prisma/client.js";
import { conflito, naoEncontrado, regraDeNegocio } from "../lib/erros.js";
import { gerarHash } from "../lib/senha.js";
import type { Paginacao } from "../models/paginacao.js";
import type { FiltroUsuarios, Usuario, UsuarioModel } from "../models/usuario.model.js";

export interface NovoUsuario {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
}

export type AlteracaoUsuario = Partial<{ nome: string; perfil: Perfil; ativo: boolean; senha: string }>;

export class UsuarioService {
  constructor(private readonly usuarios: UsuarioModel) {}

  listar(filtro: FiltroUsuarios, p: Paginacao) {
    return this.usuarios.listar(filtro, p);
  }

  async obter(id: string): Promise<Usuario> {
    const u = await this.usuarios.buscarPorId(id);
    if (!u) throw naoEncontrado("Usuário");
    return u;
  }

  async criar({ senha, ...dados }: NovoUsuario): Promise<Usuario> {
    if (await this.usuarios.buscarPorEmail(dados.email)) {
      throw conflito("Já existe um usuário com este e-mail.");
    }
    return this.usuarios.criar({ ...dados, senhaHash: await gerarHash(senha) });
  }

  async atualizar(id: string, { senha, ...dados }: AlteracaoUsuario, solicitanteId: string): Promise<Usuario> {
    await this.obter(id);
    if (id === solicitanteId && (dados.ativo === false || (dados.perfil && dados.perfil !== "ADMIN"))) {
      throw regraDeNegocio("Você não pode desativar nem rebaixar o próprio usuário.");
    }
    return this.usuarios.atualizar(id, { ...dados, ...(senha && { senhaHash: await gerarHash(senha) }) });
  }
}
