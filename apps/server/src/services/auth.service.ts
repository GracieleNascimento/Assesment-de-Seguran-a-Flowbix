import { naoAutenticado, naoEncontrado, regraDeNegocio } from "../lib/erros.js";
import { conferirSenha, gerarHash, HASH_FICTICIO } from "../lib/senha.js";
import type { Usuario, UsuarioModel } from "../models/usuario.model.js";

export class AuthService {
  constructor(private readonly usuarios: UsuarioModel) {}

  /** Confere credenciais. Mesma mensagem e mesmo tempo para e-mail inexistente ou senha errada. */
  async autenticar(email: string, senha: string): Promise<Usuario> {
    const u = await this.usuarios.buscarPorEmail(email);
    const senhaOk = await conferirSenha(senha, u?.senhaHash ?? HASH_FICTICIO);
    if (!u || !senhaOk || !u.ativo) throw naoAutenticado("E-mail ou senha inválidos.");
    return u;
  }

  async trocarSenha(usuarioId: string, senhaAtual: string, novaSenha: string): Promise<void> {
    const u = await this.usuarios.buscarPorId(usuarioId);
    if (!u) throw naoEncontrado("Usuário");
    if (!(await conferirSenha(senhaAtual, u.senhaHash))) throw regraDeNegocio("Senha atual incorreta.");
    await this.usuarios.atualizar(u.id, { senhaHash: await gerarHash(novaSenha) });
  }
}
