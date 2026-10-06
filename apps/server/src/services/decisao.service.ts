import type { Decisao } from "../generated/prisma/client.js";
import { conflito, naoEncontrado, regraDeNegocio } from "../lib/erros.js";
import type { AssessmentModel } from "../models/assessment.model.js";
import type { DecisaoComite, DecisaoModel, FiltroDecisoes } from "../models/decisao.model.js";
import type { Paginacao } from "../models/paginacao.js";

/** Portão do comitê: decisão humana sobre um assessment concluído. */
export class DecisaoService {
  constructor(
    private readonly decisoes: DecisaoModel,
    private readonly assessments: AssessmentModel,
  ) {}

  /** Uma por assessment e imutável (é a evidência do repasse ao cliente). */
  async registrar(assessmentId: string, decisao: Decisao, observacao: string, decididoPorId: string): Promise<DecisaoComite> {
    const a = await this.assessments.buscarSituacao(assessmentId);
    if (!a) throw naoEncontrado("Assessment");
    if (a.status !== "CONCLUIDO" || !a.recomendacao) {
      throw regraDeNegocio(`Só é possível decidir sobre assessment CONCLUIDO (status atual: ${a.status}).`);
    }
    if (a.decisao) throw conflito("Este assessment já tem decisão registrada; decisões são imutáveis.");

    return this.decisoes.criar({ assessmentId, decisao, recomendacao: a.recomendacao, observacao, decididoPorId });
  }

  async obter(assessmentId: string): Promise<DecisaoComite> {
    const d = await this.decisoes.buscarPorAssessment(assessmentId);
    if (!d) throw naoEncontrado("Decisão do comitê");
    return d;
  }

  listar(filtro: FiltroDecisoes, p: Paginacao) {
    return this.decisoes.listar(filtro, p);
  }
}
