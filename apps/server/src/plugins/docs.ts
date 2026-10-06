/** Especificação OpenAPI gerada dos schemas Zod das rotas + Swagger UI em /docs. */
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

export const VERSAO_API = "1.0.0";

export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Flowbix Assessment API",
        version: VERSAO_API,
        description:
          "API da plataforma de assessment (técnico + segurança) de ambientes de monitoramento. " +
          "Autentique em POST /api/v1/auth/login e use o token no botão **Authorize**.",
      },
      tags: [
        { name: "Saúde", description: "Liveness e readiness" },
        { name: "Autenticação", description: "Login e conta do usuário logado" },
        { name: "Usuários", description: "Gestão de usuários (ADMIN)" },
        { name: "Catálogo", description: "Módulos registrados e verificações" },
        { name: "Ambientes", description: "Ambientes de clientes a avaliar" },
        { name: "Assessments", description: "Execuções e relatórios" },
        { name: "Comitê", description: "Decisões go / condicional / no-go" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs", staticCSP: true });
}, { name: "docs" });
