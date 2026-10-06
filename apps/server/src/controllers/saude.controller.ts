import type { Req, Res } from "../lib/http.js";
import { VERSAO_API } from "../plugins/docs.js";
import type { SaudeService } from "../services/saude.service.js";

export class SaudeController {
  constructor(private readonly saude: SaudeService) {}

  liveness = async () => ({
    status: "ok" as const,
    versao: VERSAO_API,
    uptimeSegundos: Math.round(process.uptime()),
  });

  readiness = async (req: Req, reply: Res) => {
    const { bancoOk, modulos } = await this.saude.prontidao();
    if (!bancoOk) req.log.warn("readiness: banco indisponível");
    return reply.code(bancoOk ? 200 : 503).send({
      status: bancoOk ? "ok" : "indisponivel",
      banco: bancoOk ? "ok" : "falha",
      modulos,
    });
  };
}
