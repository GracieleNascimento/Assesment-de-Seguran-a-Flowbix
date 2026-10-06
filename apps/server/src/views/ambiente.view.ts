import { z } from "zod";
import type { Alvos, Ambiente } from "../models/ambiente.model.js";
import { alvoSchema } from "../validators/ambiente.validator.js";
import { iso, referencia } from "./comum.view.js";

export const ambienteView = z.object({
  id: z.string(),
  nome: z.string(),
  cliente: z.string().nullable(),
  descricao: z.string().nullable(),
  alvos: z.record(z.string(), alvoSchema),
  opcoes: z.record(z.string(), z.unknown()),
  criadoPor: referencia,
  criadoEm: z.string(),
  atualizadoEm: z.string(),
  arquivadoEm: z.string().nullable(),
});

export function renderAmbiente(a: Ambiente): z.infer<typeof ambienteView> {
  return {
    id: a.id,
    nome: a.nome,
    cliente: a.cliente,
    descricao: a.descricao,
    alvos: a.alvos as Alvos,
    opcoes: a.opcoes as Record<string, unknown>,
    criadoPor: a.criadoPor,
    criadoEm: a.criadoEm.toISOString(),
    atualizadoEm: a.atualizadoEm.toISOString(),
    arquivadoEm: iso(a.arquivadoEm),
  };
}
