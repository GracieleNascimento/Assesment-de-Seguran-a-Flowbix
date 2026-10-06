import fp from "fastify-plugin";
import type { PrismaClient } from "../generated/prisma/client.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp<{ prisma: PrismaClient }>(async (app, { prisma }) => {
  app.decorate("prisma", prisma);
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
}, { name: "prisma" });
