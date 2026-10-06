import type { Req, Res } from "../lib/http.js";
import type { AuthService } from "../services/auth.service.js";
import type { UsuarioService } from "../services/usuario.service.js";
import type { authValidator } from "../validators/auth.validator.js";
import { renderLogin } from "../views/auth.view.js";
import { renderUsuario } from "../views/usuario.view.js";

export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly usuarios: UsuarioService,
  ) {}

  login = async (req: Req<typeof authValidator.login>, reply: Res) => {
    const u = await this.auth.autenticar(req.body.email, req.body.senha);
    const token = await reply.jwtSign({ sub: u.id });
    const { exp } = req.server.jwt.decode<{ exp: number }>(token)!;
    req.log.info({ usuarioId: u.id }, "login");
    return renderLogin(token, new Date(exp * 1000), u);
  };

  me = async (req: Req) => renderUsuario(await this.usuarios.obter(req.usuario.id));

  trocarSenha = async (req: Req<typeof authValidator.trocarSenha>, reply: Res) => {
    await this.auth.trocarSenha(req.usuario.id, req.body.senhaAtual, req.body.novaSenha);
    return reply.code(204).send(null);
  };
}
