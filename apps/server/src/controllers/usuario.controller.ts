import type { Req, Res } from "../lib/http.js";
import type { UsuarioService } from "../services/usuario.service.js";
import type { usuarioValidator } from "../validators/usuario.validator.js";
import { renderPagina } from "../views/comum.view.js";
import { renderUsuario } from "../views/usuario.view.js";

export class UsuarioController {
  constructor(private readonly usuarios: UsuarioService) {}

  listar = async (req: Req<typeof usuarioValidator.listar>) => {
    const { pagina, porPagina, ...filtro } = req.query;
    const p = { pagina, porPagina };
    return renderPagina(await this.usuarios.listar(filtro, p), p, renderUsuario);
  };

  obter = async (req: Req<typeof usuarioValidator.obter>) =>
    renderUsuario(await this.usuarios.obter(req.params.id));

  criar = async (req: Req<typeof usuarioValidator.criar>, reply: Res) => {
    const u = await this.usuarios.criar(req.body);
    return reply.code(201).header("Location", `${req.url}/${u.id}`).send(renderUsuario(u));
  };

  atualizar = async (req: Req<typeof usuarioValidator.atualizar>) =>
    renderUsuario(await this.usuarios.atualizar(req.params.id, req.body, req.usuario.id));
}
