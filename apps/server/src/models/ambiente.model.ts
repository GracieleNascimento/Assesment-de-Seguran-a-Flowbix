import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { type Pagina, type Paginacao, skipTake } from "./paginacao.js";

const comAutor = { criadoPor: { select: { id: true, nome: true } } } as const;

export type Ambiente = Prisma.AmbienteGetPayload<{ include: typeof comAutor }>;

/** Alvos por plataforma (url, usuario, senha/apiToken como env:NOME, verificarTls...). */
export type Alvos = Record<string, Record<string, unknown>>;

export interface FiltroAmbientes {
  busca?: string;
  incluirArquivados: boolean;
}

export interface DadosAmbiente {
  nome: string;
  cliente?: string;
  descricao?: string;
  alvos: Alvos;
  opcoes: Record<string, unknown>;
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

export class AmbienteModel {
  constructor(private readonly prisma: PrismaClient) {}

  buscarPorId(id: string): Promise<Ambiente | null> {
    return this.prisma.ambiente.findUnique({ where: { id }, include: comAutor });
  }

  async listar(f: FiltroAmbientes, p: Paginacao): Promise<Pagina<Ambiente>> {
    const where: Prisma.AmbienteWhereInput = {
      ...(!f.incluirArquivados && { arquivadoEm: null }),
      ...(f.busca && {
        OR: [
          { nome: { contains: f.busca, mode: "insensitive" } },
          { cliente: { contains: f.busca, mode: "insensitive" } },
        ],
      }),
    };
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.ambiente.findMany({ where, include: comAutor, orderBy: { nome: "asc" }, ...skipTake(p) }),
      this.prisma.ambiente.count({ where }),
    ]);
    return { itens, total };
  }

  criar(dados: DadosAmbiente, criadoPorId: string): Promise<Ambiente> {
    return this.prisma.ambiente.create({
      data: { ...dados, alvos: json(dados.alvos), opcoes: json(dados.opcoes), criadoPorId },
      include: comAutor,
    });
  }

  atualizar(id: string, dados: Partial<DadosAmbiente>): Promise<Ambiente> {
    return this.prisma.ambiente.update({
      where: { id },
      data: {
        ...dados,
        alvos: dados.alvos && json(dados.alvos),
        opcoes: dados.opcoes && json(dados.opcoes),
      },
      include: comAutor,
    });
  }

  arquivar(id: string) {
    return this.prisma.ambiente.update({ where: { id }, data: { arquivadoEm: new Date() } });
  }
}
