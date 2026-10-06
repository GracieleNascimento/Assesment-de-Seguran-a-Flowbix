import type { Ambiente as AmbienteCore, Registro } from "@flowbix/core";

import type { ExecutorAssessments } from "../engine/executor.js";
import { naoEncontrado, regraDeNegocio } from "../lib/erros.js";
import type { AmbienteModel } from "../models/ambiente.model.js";
import type {
  AssessmentCompleto, AssessmentModel, AssessmentResumo, FiltroAssessments,
} from "../models/assessment.model.js";
import type { Paginacao } from "../models/paginacao.js";

export class AssessmentService {
  constructor(
    private readonly assessments: AssessmentModel,
    private readonly ambientes: AmbienteModel,
    private readonly registro: Registro,
    private readonly executor: ExecutorAssessments,
  ) {}

  /** Valida, cria o registro PENDENTE e agenda a execução em segundo plano. */
  async iniciar(ambienteId: string, modulosPedidos: string[], executadoPorId: string): Promise<AssessmentResumo> {
    const amb = await this.ambientes.buscarPorId(ambienteId);
    if (!amb) throw naoEncontrado("Ambiente");
    if (amb.arquivadoEm) throw regraDeNegocio("Ambiente arquivado não pode ser avaliado.");

    const modulos = [...new Set(modulosPedidos)];
    const conhecidos = new Set(this.registro.todos().map((m) => m.id));
    const desconhecidos = modulos.filter((m) => !conhecidos.has(m));
    if (desconhecidos.length) throw regraDeNegocio("Módulos desconhecidos.", { modulos: desconhecidos });

    const ambiente: AmbienteCore = { nome: amb.nome, alvos: amb.alvos as AmbienteCore["alvos"] };
    const aplicaveis = this.registro.aplicaveis(ambiente)
      .filter((m) => !modulos.length || modulos.includes(m.id));
    if (!aplicaveis.length) {
      throw regraDeNegocio("Nenhum módulo aplicável: confira os alvos do ambiente e os módulos solicitados.");
    }

    const a = await this.assessments.criar({ ambienteId, executadoPorId, modulos });
    this.executor.agendar(a.id);
    return a;
  }

  listar(filtro: FiltroAssessments, p: Paginacao) {
    return this.assessments.listar(filtro, p);
  }

  async obter(id: string): Promise<AssessmentCompleto> {
    const a = await this.assessments.buscarPorId(id);
    if (!a) throw naoEncontrado("Assessment");
    return a;
  }

  /** Para o relatório: só faz sentido com o assessment concluído. */
  async obterConcluido(id: string): Promise<AssessmentCompleto> {
    const a = await this.obter(id);
    if (a.status !== "CONCLUIDO" || !a.resultado) {
      throw regraDeNegocio(`Relatório disponível só para assessment CONCLUIDO (status atual: ${a.status}).`);
    }
    return a;
  }
}
