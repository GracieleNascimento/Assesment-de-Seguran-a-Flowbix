import { z } from "zod";
import type { ResultadoAssessment, ResultadoComite } from "@flowbix/core";
import { renderRelatorio } from "@flowbix/report";

import { DECISOES, decisaoParaApi } from "../lib/decisao.js";
import type { AssessmentCompleto, AssessmentResumo } from "../models/assessment.model.js";
import { STATUS } from "../validators/assessment.validator.js";
import { iso, referencia } from "./comum.view.js";
import { decisaoView, renderDecisao } from "./decisao.view.js";

/** Visão de lista: sem o resultado completo (que pode ter centenas de achados). */
export const assessmentResumoView = z.object({
  id: z.string(),
  ambiente: referencia,
  status: z.enum(STATUS),
  modulos: z.array(z.string()),
  score: z.number().nullable(),
  nota: z.string().nullable(),
  recomendacao: z.enum(DECISOES).nullable(),
  decisao: z.enum(DECISOES).nullable().describe("Decisão do comitê, se já registrada"),
  executadoPor: referencia,
  erro: z.string().nullable(),
  criadoEm: z.string(),
  iniciadoEm: z.string().nullable(),
  concluidoEm: z.string().nullable(),
});

export const assessmentView = assessmentResumoView.extend({
  resultado: z.unknown().nullable().describe("ResultadoAssessment do @flowbix/core: achados, resumo e módulos"),
  comite: z.unknown().nullable().describe("ResultadoComite: critérios avaliados e recomendação"),
  log: z.array(z.string()),
  decisaoComite: decisaoView.nullable(),
});

export function renderAssessmentResumo(a: AssessmentResumo | AssessmentCompleto): z.infer<typeof assessmentResumoView> {
  return {
    id: a.id,
    ambiente: a.ambiente,
    status: a.status,
    modulos: a.modulos,
    score: a.score,
    nota: a.nota,
    recomendacao: a.recomendacao && decisaoParaApi(a.recomendacao),
    decisao: a.decisao ? decisaoParaApi(a.decisao.decisao) : null,
    executadoPor: a.executadoPor,
    erro: a.erro,
    criadoEm: a.criadoEm.toISOString(),
    iniciadoEm: iso(a.iniciadoEm),
    concluidoEm: iso(a.concluidoEm),
  };
}

export function renderAssessment(a: AssessmentCompleto): z.infer<typeof assessmentView> {
  return {
    ...renderAssessmentResumo(a),
    resultado: a.resultado,
    comite: a.comite,
    log: a.log,
    decisaoComite: a.decisao && renderDecisao(a.decisao),
  };
}

/** View HTML: o relatório com a marca Flowbix (pacote @flowbix/report). */
export function renderRelatorioHtml(a: AssessmentCompleto): string {
  return renderRelatorio(a.resultado as unknown as ResultadoAssessment, {
    comite: (a.comite ?? undefined) as ResultadoComite | undefined,
  });
}
