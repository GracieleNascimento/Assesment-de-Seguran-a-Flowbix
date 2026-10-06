import type { Perfil, Prisma, PrismaClient, Usuario } from "../generated/prisma/client.js";
import { type Pagina, type Paginacao, skipTake } from "./paginacao.js";

export type { Usuario };

export interface FiltroUsuarios {
  busca?: string;
  ativo?: boolean;
}

export interface DadosNovoUsuario {
  nome: string;
  email: string;
  perfil: Perfil;
  senhaHash: string;
}

export type DadosAtualizarUsuario = Partial<Pick<Usuario, "nome" | "perfil" | "ativo" | "senhaHash">>;

export class UsuarioModel {
  constructor(private readonly prisma: PrismaClient) {}

  buscarPorId(id: string) {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  buscarPorEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  async listar(f: FiltroUsuarios, p: Paginacao): Promise<Pagina<Usuario>> {
    const where: Prisma.UsuarioWhereInput = {
      ...(f.ativo !== undefined && { ativo: f.ativo }),
      ...(f.busca && {
        OR: [
          { nome: { contains: f.busca, mode: "insensitive" } },
          { email: { contains: f.busca, mode: "insensitive" } },
        ],
      }),
    };
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({ where, orderBy: { nome: "asc" }, ...skipTake(p) }),
      this.prisma.usuario.count({ where }),
    ]);
    return { itens, total };
  }

  criar(dados: DadosNovoUsuario) {
    return this.prisma.usuario.create({ data: dados });
  }

  atualizar(id: string, dados: DadosAtualizarUsuario) {
    return this.prisma.usuario.update({ where: { id }, data: dados });
  }
}
