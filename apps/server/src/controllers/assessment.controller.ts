import type { Req, Res } from "../lib/http.js";
import type { AssessmentService } from "../services/assessment.service.js";
import type { assessmentValidator } from "../validators/assessment.validator.js";
import {
  renderAssessment, renderAssessmentResumo, renderRelatorioHtml,
} from "../views/assessment.view.js";
import { renderPagina } from "../views/comum.view.js";

export class AssessmentController {
  constructor(private readonly assessments: AssessmentService) {}

  /** 202 Accepted: a execução continua em segundo plano. */
  iniciar = async (req: Req<typeof assessmentValidator.iniciar>, reply: Res) => {
    const a = await this.assessments.iniciar(req.params.id, req.body.modulos ?? [], req.usuario.id);
    return reply
      .code(202)
      .header("Location", `/api/v1/assessments/${a.id}`)
      .send(renderAssessmentResumo(a));
  };

  listar = async (req: Req<typeof assessmentValidator.listar>) => {
    const { pagina, porPagina, ...filtro } = req.query;
    const p = { pagina, porPagina };
    return renderPagina(await this.assessments.listar(filtro, p), p, renderAssessmentResumo);
  };

  obter = async (req: Req<typeof assessmentValidator.obter>) =>
    renderAssessment(await this.assessments.obter(req.params.id));

  relatorio = async (req: Req<typeof assessmentValidator.relatorio>, reply: Res) => {
    const a = await this.assessments.obterConcluido(req.params.id);
    if (req.query.download === "true") {
      reply.header("Content-Disposition", `attachment; filename="assessment-${a.id}.html"`);
    }
    return reply.type("text/html; charset=utf-8").send(renderRelatorioHtml(a));
  };
}
