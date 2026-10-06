import type { Req, Res } from "../lib/http.js";
import type { AmbienteService } from "../services/ambiente.service.js";
import type { ambienteValidator } from "../validators/ambiente.validator.js";
import { renderAmbiente } from "../views/ambiente.view.js";
import { renderPagina } from "../views/comum.view.js";

export class AmbienteController {
  constructor(private readonly ambientes: AmbienteService) {}

  listar = async (req: Req<typeof ambienteValidator.listar>) => {
    const { pagina, porPagina, ...filtro } = req.query;
    const p = { pagina, porPagina };
    return renderPagina(await this.ambientes.listar(filtro, p), p, renderAmbiente);
  };

  obter = async (req: Req<typeof ambienteValidator.obter>) =>
    renderAmbiente(await this.ambientes.obter(req.params.id));

  criar = async (req: Req<typeof ambienteValidator.criar>, reply: Res) => {
    const a = await this.ambientes.criar(req.body, req.usuario.id);
    return reply.code(201).header("Location", `${req.url}/${a.id}`).send(renderAmbiente(a));
  };

  atualizar = async (req: Req<typeof ambienteValidator.atualizar>) =>
    renderAmbiente(await this.ambientes.atualizar(req.params.id, req.body));

  arquivar = async (req: Req<typeof ambienteValidator.arquivar>, reply: Res) => {
    await this.ambientes.arquivar(req.params.id);
    return reply.code(204).send(null);
  };
}
