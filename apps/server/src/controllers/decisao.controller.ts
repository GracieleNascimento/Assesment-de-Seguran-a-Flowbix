import { decisaoParaDb } from "../lib/decisao.js";
import type { Req, Res } from "../lib/http.js";
import type { DecisaoService } from "../services/decisao.service.js";
import type { decisaoValidator } from "../validators/decisao.validator.js";
import { renderPagina } from "../views/comum.view.js";
import { renderDecisao } from "../views/decisao.view.js";

export class DecisaoController {
  constructor(private readonly decisoes: DecisaoService) {}

  registrar = async (req: Req<typeof decisaoValidator.registrar>, reply: Res) => {
    const { decisao, observacao } = req.body;
    const d = await this.decisoes.registrar(req.params.id, decisaoParaDb(decisao), observacao, req.usuario.id);
    return reply.code(201).header("Location", req.url).send(renderDecisao(d));
  };

  obter = async (req: Req<typeof decisaoValidator.obter>) =>
    renderDecisao(await this.decisoes.obter(req.params.id));

  listar = async (req: Req<typeof decisaoValidator.listar>) => {
    const { pagina, porPagina, ambienteId, decisao } = req.query;
    const p = { pagina, porPagina };
    const filtro = { ambienteId, decisao: decisao && decisaoParaDb(decisao) };
    return renderPagina(await this.decisoes.listar(filtro, p), p, renderDecisao);
  };
}
