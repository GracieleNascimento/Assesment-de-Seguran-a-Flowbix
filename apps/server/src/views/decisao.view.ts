import { z } from "zod";
import { DECISOES, decisaoParaApi } from "../lib/decisao.js";
import type { DecisaoComite } from "../models/decisao.model.js";
import { referencia } from "./comum.view.js";

export const decisaoView = z.object({
  id: z.string(),
  assessmentId: z.string(),
  decisao: z.enum(DECISOES),
  recomendacao: z.enum(DECISOES).describe("Recomendação automática no momento da decisão"),
  divergeDaRecomendacao: z.boolean(),
  observacao: z.string(),
  decididoPor: referencia,
  decididoEm: z.string(),
});

export function renderDecisao(d: DecisaoComite): z.infer<typeof decisaoView> {
  return {
    id: d.id,
    assessmentId: d.assessmentId,
    decisao: decisaoParaApi(d.decisao),
    recomendacao: decisaoParaApi(d.recomendacao),
    divergeDaRecomendacao: d.decisao !== d.recomendacao,
    observacao: d.observacao,
    decididoPor: d.decididoPor,
    decididoEm: d.decididoEm.toISOString(),
  };
}
