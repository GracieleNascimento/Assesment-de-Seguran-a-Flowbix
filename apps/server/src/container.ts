/**
 * Composição das camadas (injeção de dependências manual):
 *
 *   Prisma → Models → Services → Controllers
 *                ↘ Engine (registro de módulos + executor) ↗
 *
 * É o único lugar que dá "new" nas classes. Trocar uma implementação (ex.: um executor
 * com fila) = mudar uma linha aqui.
 */
import type { FastifyBaseLogger } from "fastify";
import { baseConhecimento } from "@flowbix/knowledge";

import { AmbienteController } from "./controllers/ambiente.controller.js";
import { AssessmentController } from "./controllers/assessment.controller.js";
import { AuthController } from "./controllers/auth.controller.js";
import { CatalogoController } from "./controllers/catalogo.controller.js";
import { DecisaoController } from "./controllers/decisao.controller.js";
import { SaudeController } from "./controllers/saude.controller.js";
import { UsuarioController } from "./controllers/usuario.controller.js";
import { ExecutorAssessments } from "./engine/executor.js";
import { montarRegistro } from "./engine/registro.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { criarModels } from "./models/index.js";
import { AmbienteService } from "./services/ambiente.service.js";
import { AssessmentService } from "./services/assessment.service.js";
import { AuthService } from "./services/auth.service.js";
import { CatalogoService } from "./services/catalogo.service.js";
import { DecisaoService } from "./services/decisao.service.js";
import { SaudeService } from "./services/saude.service.js";
import { UsuarioService } from "./services/usuario.service.js";

export function criarContainer(prisma: PrismaClient, log: FastifyBaseLogger) {
  const models = criarModels(prisma);

  const registro = montarRegistro();
  const executor = new ExecutorAssessments(models.assessments, registro, baseConhecimento(), log);

  const services = {
    auth: new AuthService(models.usuarios),
    usuarios: new UsuarioService(models.usuarios),
    ambientes: new AmbienteService(models.ambientes),
    assessments: new AssessmentService(models.assessments, models.ambientes, registro, executor),
    decisoes: new DecisaoService(models.decisoes, models.assessments),
    catalogo: new CatalogoService(registro),
    saude: new SaudeService(models, registro),
  };

  const controllers = {
    auth: new AuthController(services.auth, services.usuarios),
    usuarios: new UsuarioController(services.usuarios),
    ambientes: new AmbienteController(services.ambientes),
    assessments: new AssessmentController(services.assessments),
    decisoes: new DecisaoController(services.decisoes),
    catalogo: new CatalogoController(services.catalogo),
    saude: new SaudeController(services.saude),
  };

  return { models, registro, executor, services, controllers };
}

export type Container = ReturnType<typeof criarContainer>;
