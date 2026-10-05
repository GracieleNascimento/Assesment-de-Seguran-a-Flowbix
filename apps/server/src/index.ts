/**
 * Servidor da plataforma de assessment Flowbix (API REST).
 *
 * Expõe os módulos registrados, roda assessments de um ambiente (técnico + segurança
 * unificados), gera o relatório com a marca e avalia o portão do comitê.
 *
 *   npm run build && node apps/server/dist/index.js
 *   PORT=8090 node apps/server/dist/index.js
 */
import Fastify from "fastify";
import {
  Ambiente, avaliarComite, criteriosPadrao, rodarAssessment,
} from "@flowbix/core";
import { baseConhecimento, plataformas } from "@flowbix/knowledge";
import { renderRelatorio, marca } from "@flowbix/report";

import { montarRegistro } from "./registro.js";

const registro = montarRegistro();
const kb = baseConhecimento();
const app = Fastify({ logger: true });

app.get("/api/saude", async () => ({ ok: true, modulos: registro.todos().length }));

app.get("/api/modulos", async () => ({
  plataformas,
  modulos: registro.todos().map((m) => ({
    id: m.id, nome: m.nome, plataforma: m.plataforma, tipo: m.tipo, versao: m.versao,
    verificacoes: m.catalogo().length,
  })),
}));

app.get("/api/catalogo", async () => registro.catalogoCompleto());

/** Roda o assessment de um ambiente. Corpo = Ambiente (ver tipos de @flowbix/core). */
app.post<{ Body: { ambiente: Ambiente; executadoPor?: string; modulos?: string[] } }>(
  "/api/assessment",
  async (req) => {
    const { ambiente, executadoPor, modulos } = req.body;
    const resultado = await rodarAssessment(registro, ambiente, kb, { executadoPor, modulos });
    const comite = avaliarComite(resultado.achados, resultado.resumo, criteriosPadrao());
    return { resultado, comite };
  },
);

/** Mesmo que /api/assessment, mas devolve o relatório HTML com a marca Flowbix. */
app.post<{ Body: { ambiente: Ambiente; executadoPor?: string } }>(
  "/api/relatorio",
  async (req, reply) => {
    const { ambiente, executadoPor } = req.body;
    const resultado = await rodarAssessment(registro, ambiente, kb, { executadoPor });
    const comite = avaliarComite(resultado.achados, resultado.resumo, criteriosPadrao());
    reply.type("text/html");
    return renderRelatorio(resultado, { comite });
  },
);

app.get("/", async (_req, reply) => {
  reply.type("text/html");
  return `<!doctype html><meta charset=utf-8><title>Flowbix Assessment</title>
<body style="font-family:${marca.FONTE};max-width:760px;margin:40px auto;color:#333">
<div>${marca.wordmark()}</div>
<h1>Plataforma de Assessment — API</h1>
<p>Servidor modular (técnico + segurança). Endpoints:</p>
<ul>
<li><code>GET /api/saude</code></li>
<li><code>GET /api/modulos</code> — módulos registrados</li>
<li><code>GET /api/catalogo</code> — todas as verificações</li>
<li><code>POST /api/assessment</code> — body <code>{ "ambiente": {...} }</code> → achados + comitê (JSON)</li>
<li><code>POST /api/relatorio</code> — mesmo body → relatório HTML</li>
</ul>
<p style="color:#595959">${marca.EMPRESA} · ${marca.TAGLINE}</p>`;
});

const port = Number(process.env.PORT || 8090);
app.listen({ host: process.env.HOST || "127.0.0.1", port }).then(() => {
  app.log.info(`Flowbix Assessment em http://localhost:${port}`);
});
