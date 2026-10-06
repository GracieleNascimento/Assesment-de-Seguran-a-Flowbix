import { z } from "zod";
import { SEVERIDADES, type Modulo } from "@flowbix/core";
import { TIPOS } from "../validators/catalogo.validator.js";

export const moduloView = z.object({
  id: z.string(),
  nome: z.string(),
  plataforma: z.string(),
  tipo: z.enum(TIPOS),
  versao: z.string(),
  verificacoes: z.number(),
});

export const checkView = z.object({
  id: z.string(),
  plataforma: z.string(),
  tipo: z.enum(TIPOS),
  titulo: z.string(),
  categoria: z.string(),
  severidade: z.enum(SEVERIDADES as [string, ...string[]]),
  recomendacao: z.string(),
  refs: z.record(z.string(), z.array(z.object({ controle: z.string(), url: z.string().optional() }))),
  ameaca: z
    .object({
      por_que: z.string(),
      impacto: z.string(),
      mitre: z.array(z.object({ id: z.string(), nome: z.string(), url: z.string() })),
      casos: z.array(z.string()),
    })
    .optional(),
});

export function renderModulo(m: Modulo): z.infer<typeof moduloView> {
  return {
    id: m.id,
    nome: m.nome,
    plataforma: m.plataforma,
    tipo: m.tipo,
    versao: m.versao,
    verificacoes: m.catalogo().length,
  };
}
