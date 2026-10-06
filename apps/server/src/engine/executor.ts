/**
 * Executa assessments em segundo plano e persiste o resultado.
 *
 * O service cria o registro (PENDENTE) e a API responde 202 na hora; o executor roda o
 * motor do @flowbix/core, avalia o comitê e grava CONCLUIDO ou ERRO. O cliente acompanha
 * por GET /assessments/:id. Roda no mesmo processo: se o volume crescer, trocar por uma
 * fila (ex.: pg-boss/BullMQ) mantendo esta mesma interface.
 */
import type { FastifyBaseLogger } from "fastify";
import {
  Ambiente, BaseConhecimento, Registro, avaliarComite, criteriosPadrao, rodarAssessment,
} from "@flowbix/core";

import { decisaoParaDb } from "../lib/decisao.js";
import type { AssessmentModel } from "../models/assessment.model.js";

export class ExecutorAssessments {
  private emAndamento = new Set<Promise<void>>();

  constructor(
    private readonly assessments: AssessmentModel,
    private readonly registro: Registro,
    private readonly kb: BaseConhecimento,
    private readonly log: FastifyBaseLogger,
  ) {}

  /** Agenda a execução sem bloquear a requisição. */
  agendar(id: string): void {
    const p = this.executar(id).finally(() => this.emAndamento.delete(p));
    this.emAndamento.add(p);
  }

  /** Aguarda as execuções em curso (desligamento gracioso e testes). */
  async aguardar(): Promise<void> {
    await Promise.all([...this.emAndamento]);
  }

  /** Na subida: o que estava rodando quando o processo caiu não vai terminar sozinho. */
  recuperarInterrompidos(): Promise<number> {
    return this.assessments.falharInterrompidos();
  }

  private async executar(id: string): Promise<void> {
    const logs: string[] = [];
    try {
      const a = await this.assessments.iniciarExecucao(id);
      const ambiente: Ambiente = {
        nome: a.ambiente.nome,
        alvos: a.ambiente.alvos as Ambiente["alvos"],
        opcoes: a.ambiente.opcoes as Record<string, unknown>,
      };

      const resultado = await rodarAssessment(this.registro, ambiente, this.kb, {
        executadoPor: a.executadoPor.nome,
        modulos: a.modulos,
        log: (m) => logs.push(m),
      });
      const comite = avaliarComite(resultado.achados, resultado.resumo, criteriosPadrao());

      await this.assessments.concluir(id, {
        score: resultado.resumo.score,
        nota: resultado.resumo.nota,
        recomendacao: decisaoParaDb(comite.recomendacao),
        resultado,
        comite,
        log: logs,
      });
      this.log.info({ assessmentId: id, score: resultado.resumo.score }, "assessment concluído");
    } catch (e) {
      this.log.error({ err: e, assessmentId: id }, "assessment falhou");
      await this.assessments
        .falhar(id, (e as Error).message, logs)
        .catch((e2) => this.log.error({ err: e2, assessmentId: id }, "não foi possível gravar o erro"));
    }
  }
}
