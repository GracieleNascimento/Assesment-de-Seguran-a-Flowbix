/** Camada Model: único lugar que fala com o banco (Prisma). */
import type { PrismaClient } from "../generated/prisma/client.js";
import { AmbienteModel } from "./ambiente.model.js";
import { AssessmentModel } from "./assessment.model.js";
import { DecisaoModel } from "./decisao.model.js";
import { UsuarioModel } from "./usuario.model.js";

export function criarModels(prisma: PrismaClient) {
  return {
    usuarios: new UsuarioModel(prisma),
    ambientes: new AmbienteModel(prisma),
    assessments: new AssessmentModel(prisma),
    decisoes: new DecisaoModel(prisma),
    /** Readiness: o banco responde? */
    async bancoDisponivel(): Promise<boolean> {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },
  };
}

export type Models = ReturnType<typeof criarModels>;
