import type {
  Decisao, Prisma, PrismaClient, StatusAssessment,
} from "../generated/prisma/client.js";
import { comAutorDecisao } from "./decisao.model.js";
import { type Pagina, type Paginacao, skipTake } from "./paginacao.js";

const resumo = {
  ambiente: { select: { id: true, nome: true } },
  executadoPor: { select: { id: true, nome: true } },
  decisao: { select: { decisao: true } },
} as const;

const completo = { ...resumo, decisao: { include: comAutorDecisao } } as const;

export type AssessmentResumo = Prisma.AssessmentGetPayload<{ include: typeof resumo }>;
export type AssessmentCompleto = Prisma.AssessmentGetPayload<{ include: typeof completo }>;

export interface FiltroAssessments {
  ambienteId?: string;
  status?: StatusAssessment;
}

export interface DadosConclusao {
  score: number | null;
  nota: string;
  recomendacao: Decisao;
  resultado: unknown;
  comite: unknown;
  log: string[];
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

export class AssessmentModel {
  constructor(private readonly prisma: PrismaClient) {}

  criar(dados: { ambienteId: string; executadoPorId: string; modulos: string[] }): Promise<AssessmentResumo> {
    return this.prisma.assessment.create({ data: dados, include: resumo });
  }

  buscarPorId(id: string): Promise<AssessmentCompleto | null> {
    return this.prisma.assessment.findUnique({ where: { id }, include: completo });
  }

  /** Consulta leve (sem achados) para validar regras antes de decidir. */
  buscarSituacao(id: string) {
    return this.prisma.assessment.findUnique({
      where: { id },
      select: { status: true, recomendacao: true, decisao: { select: { id: true } } },
    });
  }

  async listar(f: FiltroAssessments, p: Paginacao): Promise<Pagina<AssessmentResumo>> {
    const where: Prisma.AssessmentWhereInput = {
      ...(f.ambienteId && { ambienteId: f.ambienteId }),
      ...(f.status && { status: f.status }),
    };
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.assessment.findMany({ where, include: resumo, orderBy: { criadoEm: "desc" }, ...skipTake(p) }),
      this.prisma.assessment.count({ where }),
    ]);
    return { itens, total };
  }

  /** Transição PENDENTE → EXECUTANDO; devolve o que o motor precisa para rodar. */
  iniciarExecucao(id: string) {
    return this.prisma.assessment.update({
      where: { id },
      data: { status: "EXECUTANDO", iniciadoEm: new Date() },
      include: { ambiente: true, executadoPor: { select: { nome: true } } },
    });
  }

  concluir(id: string, d: DadosConclusao) {
    return this.prisma.assessment.update({
      where: { id },
      data: {
        status: "CONCLUIDO",
        concluidoEm: new Date(),
        score: d.score,
        nota: d.nota,
        recomendacao: d.recomendacao,
        resultado: json(d.resultado),
        comite: json(d.comite),
        log: d.log,
      },
    });
  }

  falhar(id: string, erro: string, log: string[]) {
    return this.prisma.assessment.update({
      where: { id },
      data: { status: "ERRO", erro, log, concluidoEm: new Date() },
    });
  }

  /** Marca como ERRO o que ficou PENDENTE/EXECUTANDO quando o processo caiu. */
  async falharInterrompidos(): Promise<number> {
    const { count } = await this.prisma.assessment.updateMany({
      where: { status: { in: ["PENDENTE", "EXECUTANDO"] } },
      data: { status: "ERRO", erro: "Interrompido por reinício do servidor.", concluidoEm: new Date() },
    });
    return count;
  }
}
