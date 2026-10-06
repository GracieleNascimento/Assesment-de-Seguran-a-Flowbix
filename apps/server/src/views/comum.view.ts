import { z } from "zod";
import type { Pagina, Paginacao } from "../models/paginacao.js";

export const referencia = z.object({ id: z.string(), nome: z.string() });

export const erroView = z.object({
  erro: z.object({
    codigo: z.string(),
    mensagem: z.string(),
    detalhes: z.unknown().optional(),
  }),
  requestId: z.string(),
});

/** Respostas de erro comuns a rotas autenticadas, para o OpenAPI. */
export const errosPadrao = {
  400: erroView,
  401: erroView,
  403: erroView,
  404: erroView,
} as const;

export function paginadoView<T extends z.ZodType>(item: T) {
  return z.object({
    dados: z.array(item),
    paginacao: z.object({
      pagina: z.number(),
      porPagina: z.number(),
      total: z.number(),
      totalPaginas: z.number(),
    }),
  });
}

export function renderPagina<M, V>({ itens, total }: Pagina<M>, p: Paginacao, render: (m: M) => V) {
  return {
    dados: itens.map(render),
    paginacao: {
      pagina: p.pagina,
      porPagina: p.porPagina,
      total,
      totalPaginas: Math.ceil(total / p.porPagina),
    },
  };
}

export const iso = (d: Date | null) => d?.toISOString() ?? null;
