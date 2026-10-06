import type { Decisao, Prisma, PrismaClient } from "../generated/prisma/client.js";
import { type Pagina, type Paginacao, skipTake } from "./paginacao.js";

export const comAutorDecisao = { decididoPor: { select: { id: true, nome: true } } } as const;

export type DecisaoComite = Prisma.DecisaoComiteGetPayload<{ include: typeof comAutorDecisao }>;

export interface FiltroDecisoes {
  ambienteId?: string;
  decisao?: Decisao;
}

export interface DadosDecisao {
  assessmentId: string;
  decisao: Decisao;
  recomendacao: Decisao;
  observacao: string;
  decididoPorId: string;
}

/** Decisões são imutáveis: este model não tem atualizar nem excluir de propósito. */
export class DecisaoModel {
  constructor(private readonly prisma: PrismaClient) {}

  criar(dados: DadosDecisao): Promise<DecisaoComite> {
    return this.prisma.decisaoComite.create({ data: dados, include: comAutorDecisao });
  }

  buscarPorAssessment(assessmentId: string): Promise<DecisaoComite | null> {
    return this.prisma.decisaoComite.findUnique({ where: { assessmentId }, include: comAutorDecisao });
  }

  async listar(f: FiltroDecisoes, p: Paginacao): Promise<Pagina<DecisaoComite>> {
    const where: Prisma.DecisaoComiteWhereInput = {
      ...(f.decisao && { decisao: f.decisao }),
      ...(f.ambienteId && { assessment: { ambienteId: f.ambienteId } }),
    };
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.decisaoComite.findMany({ where, include: comAutorDecisao, orderBy: { decididoEm: "desc" }, ...skipTake(p) }),
      this.prisma.decisaoComite.count({ where }),
    ]);
    return { itens, total };
  }
}
