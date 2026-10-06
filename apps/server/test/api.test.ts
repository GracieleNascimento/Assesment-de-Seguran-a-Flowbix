/**
 * Testes de integração da API contra um Postgres real (DATABASE_URL_TESTE) e um
 * Grafana simulado. O banco de teste é migrado e limpo a cada execução.
 *
 *   npm run db:up && npm test
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";

import { construirApp, type App } from "../src/app.js";
import { carregarEnv } from "../src/config/env.js";
import { gerarHash } from "../src/lib/senha.js";

// Importar config/env.js já carregou o apps/server/.env.
const URL_TESTE = process.env.DATABASE_URL_TESTE;
const DIR_SERVER = fileURLToPath(new URL("..", import.meta.url));

/** Respostas do Grafana simulado: versão vulnerável e configurações inseguras. */
const GRAFANA: Record<string, unknown> = {
  "/api/health": { version: "8.2.0", database: "ok" },
  "/api/admin/settings": {
    "auth.anonymous": { enabled: "true", org_role: "Editor" },
    users: { allow_sign_up: "true" },
    security: { cookie_secure: "false", content_security_policy: "false", allow_embedding: "true" },
    server: { protocol: "http" },
  },
  "/api/users": [{ login: "admin", isAdmin: true }],
  "/api/auth/keys": [],
  "/api/serviceaccounts/search": { serviceAccounts: [] },
};

describe("API v1", { skip: !URL_TESTE && "defina DATABASE_URL_TESTE no apps/server/.env" }, () => {
  let app: App;
  let grafana: Server;
  let grafanaUrl: string;
  let tokenAdmin: string;
  let adminId: string;

  const SENHA = "senha-de-teste-123";
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  async function login(email: string, senha = SENHA) {
    const r = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email, senha } });
    assert.equal(r.statusCode, 200, r.body);
    return r.json().token as string;
  }

  before(async () => {
    const env = { ...process.env, DATABASE_URL: URL_TESTE, NODE_ENV: "test", RATE_LIMIT_MAX: "10000" };
    execSync("npx prisma migrate deploy", { cwd: DIR_SERVER, env, stdio: "pipe" });

    app = await construirApp({ env: carregarEnv(env) });
    await app.prisma.$executeRawUnsafe(
      "TRUNCATE decisoes_comite, assessments, ambientes, usuarios RESTART IDENTITY CASCADE",
    );
    const admin = await app.prisma.usuario.create({
      data: { nome: "Admin Teste", email: "admin@teste.local", perfil: "ADMIN", senhaHash: await gerarHash(SENHA) },
    });
    adminId = admin.id;
    tokenAdmin = await login("admin@teste.local");

    grafana = createServer((req, res) => {
      const p = (req.url ?? "").split("?")[0];
      res.setHeader("Content-Type", "application/json");
      res.statusCode = p in GRAFANA ? 200 : 404;
      res.end(JSON.stringify(GRAFANA[p] ?? {}));
    });
    await new Promise<void>((r) => grafana.listen(0, "127.0.0.1", r));
    grafanaUrl = `http://127.0.0.1:${(grafana.address() as { port: number }).port}`;
    process.env.GRAFANA_TOKEN_TESTE = "token-simulado";
  });

  after(async () => {
    await app?.close();
    grafana?.close();
  });

  describe("saúde e documentação", () => {
    it("liveness e readiness respondem ok", async () => {
      assert.equal((await app.inject("/api/v1/health")).json().status, "ok");
      const ready = await app.inject("/api/v1/health/ready");
      assert.equal(ready.statusCode, 200);
      assert.equal(ready.json().banco, "ok");
    });

    it("publica a especificação OpenAPI com as rotas", async () => {
      const r = await app.inject("/docs/json");
      assert.equal(r.statusCode, 200);
      const paths = Object.keys(r.json().paths);
      for (const p of ["/api/v1/auth/login", "/api/v1/ambientes", "/api/v1/assessments/{id}/decisao"]) {
        assert.ok(paths.includes(p), `faltou ${p}`);
      }
    });

    it("rota inexistente devolve erro no formato padrão", async () => {
      const r = await app.inject("/api/v1/nao-existe");
      assert.equal(r.statusCode, 404);
      assert.equal(r.json().erro.codigo, "ROTA_NAO_ENCONTRADA");
      assert.ok(r.json().requestId);
    });
  });

  describe("autenticação", () => {
    it("rejeita requisição sem token", async () => {
      const r = await app.inject("/api/v1/ambientes");
      assert.equal(r.statusCode, 401);
      assert.equal(r.json().erro.codigo, "NAO_AUTENTICADO");
    });

    it("rejeita senha errada sem revelar se o e-mail existe", async () => {
      const errada = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email: "admin@teste.local", senha: "x" } });
      const inexistente = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email: "ninguem@teste.local", senha: "x" } });
      assert.equal(errada.statusCode, 401);
      assert.equal(inexistente.statusCode, 401);
      assert.equal(errada.json().erro.mensagem, inexistente.json().erro.mensagem);
    });

    it("/auth/me devolve o usuário sem o hash da senha", async () => {
      const r = await app.inject({ url: "/api/v1/auth/me", headers: auth(tokenAdmin) });
      assert.equal(r.statusCode, 200);
      assert.equal(r.json().perfil, "ADMIN");
      assert.equal(r.json().senhaHash, undefined);
    });
  });

  describe("usuários e perfis", () => {
    let tokenLeitura: string;
    let leituraId: string;

    before(async () => {
      const r = await app.inject({
        method: "POST", url: "/api/v1/usuarios", headers: auth(tokenAdmin),
        payload: { nome: "Leitor", email: "Leitor@Teste.local", senha: SENHA, perfil: "LEITURA" },
      });
      assert.equal(r.statusCode, 201, r.body);
      assert.equal(r.json().email, "leitor@teste.local");
      leituraId = r.json().id;
      tokenLeitura = await login("leitor@teste.local");
    });

    it("e-mail duplicado dá 409", async () => {
      const r = await app.inject({
        method: "POST", url: "/api/v1/usuarios", headers: auth(tokenAdmin),
        payload: { nome: "Outro", email: "leitor@teste.local", senha: SENHA },
      });
      assert.equal(r.statusCode, 409);
    });

    it("LEITURA não gerencia usuários nem cria ambientes", async () => {
      assert.equal((await app.inject({ url: "/api/v1/usuarios", headers: auth(tokenLeitura) })).statusCode, 403);
      const r = await app.inject({
        method: "POST", url: "/api/v1/ambientes", headers: auth(tokenLeitura),
        payload: { nome: "X", alvos: { grafana: { url: grafanaUrl } } },
      });
      assert.equal(r.statusCode, 403);
      assert.equal(r.json().erro.codigo, "PROIBIDO");
    });

    it("admin não pode desativar a si mesmo", async () => {
      const r = await app.inject({
        method: "PATCH", url: `/api/v1/usuarios/${adminId}`, headers: auth(tokenAdmin), payload: { ativo: false },
      });
      assert.equal(r.statusCode, 422);
    });

    it("usuário desativado perde o acesso na hora, mesmo com token válido", async () => {
      const r = await app.inject({
        method: "PATCH", url: `/api/v1/usuarios/${leituraId}`, headers: auth(tokenAdmin), payload: { ativo: false },
      });
      assert.equal(r.statusCode, 200);
      assert.equal((await app.inject({ url: "/api/v1/auth/me", headers: auth(tokenLeitura) })).statusCode, 401);
    });
  });

  describe("ambientes → assessment → relatório → comitê", () => {
    let ambienteId: string;
    let assessmentId: string;

    it("recusa segredo em texto puro no ambiente", async () => {
      const r = await app.inject({
        method: "POST", url: "/api/v1/ambientes", headers: auth(tokenAdmin),
        payload: { nome: "Inseguro", alvos: { grafana: { url: grafanaUrl, apiToken: "glsa_segredo" } } },
      });
      assert.equal(r.statusCode, 400);
      assert.equal(r.json().erro.codigo, "VALIDACAO");
      assert.match(JSON.stringify(r.json().erro.detalhes), /apiToken/);
    });

    it("cadastra ambiente com referência env:", async () => {
      const r = await app.inject({
        method: "POST", url: "/api/v1/ambientes", headers: auth(tokenAdmin),
        payload: {
          nome: "Cliente Teste", cliente: "ACME",
          alvos: { grafana: { url: grafanaUrl, apiToken: "env:GRAFANA_TOKEN_TESTE", verificarTls: false } },
          opcoes: { maxAdmins: 3 },
        },
      });
      assert.equal(r.statusCode, 201, r.body);
      assert.match(r.headers.location as string, /\/api\/v1\/ambientes\//);
      ambienteId = r.json().id;
    });

    it("PATCH parcial não apaga as opções salvas", async () => {
      const r = await app.inject({
        method: "PATCH", url: `/api/v1/ambientes/${ambienteId}`, headers: auth(tokenAdmin), payload: { descricao: "Produção" },
      });
      assert.equal(r.statusCode, 200);
      assert.deepEqual(r.json().opcoes, { maxAdmins: 3 });
    });

    it("recusa módulo desconhecido", async () => {
      const r = await app.inject({
        method: "POST", url: `/api/v1/ambientes/${ambienteId}/assessments`, headers: auth(tokenAdmin),
        payload: { modulos: ["nao-existe"] },
      });
      assert.equal(r.statusCode, 422);
    });

    it("inicia assessment (202) e conclui em segundo plano", async () => {
      const r = await app.inject({
        method: "POST", url: `/api/v1/ambientes/${ambienteId}/assessments`, headers: auth(tokenAdmin), payload: {},
      });
      assert.equal(r.statusCode, 202, r.body);
      assert.equal(r.json().status, "PENDENTE");
      assessmentId = r.json().id;

      await app.container.executor.aguardar();

      const a = (await app.inject({ url: `/api/v1/assessments/${assessmentId}`, headers: auth(tokenAdmin) })).json();
      assert.equal(a.status, "CONCLUIDO", a.erro ?? "");
      assert.ok(a.resultado.achados.length > 0);
      assert.equal(typeof a.score, "number");
      assert.equal(a.recomendacao, "no-go"); // Grafana simulado é propositalmente inseguro
      assert.equal(a.decisaoComite, null);
    });

    it("lista assessments do ambiente sem os achados", async () => {
      const r = await app.inject({ url: `/api/v1/assessments?ambienteId=${ambienteId}`, headers: auth(tokenAdmin) });
      assert.equal(r.json().paginacao.total, 1);
      assert.equal(r.json().dados[0].resultado, undefined);
    });

    it("gera o relatório HTML", async () => {
      const r = await app.inject({ url: `/api/v1/assessments/${assessmentId}/relatorio?download=true`, headers: auth(tokenAdmin) });
      assert.equal(r.statusCode, 200);
      assert.match(r.headers["content-type"] as string, /text\/html/);
      assert.match(r.headers["content-disposition"] as string, /attachment/);
      assert.match(r.body, /^<!doctype html>/i);
    });

    it("registra a decisão do comitê uma única vez", async () => {
      const url = `/api/v1/assessments/${assessmentId}/decisao`;
      const payload = { decisao: "condicional", observacao: "Liberado com plano de correção em 30 dias." };
      const r = await app.inject({ method: "POST", url, headers: auth(tokenAdmin), payload });
      assert.equal(r.statusCode, 201, r.body);
      assert.equal(r.json().divergeDaRecomendacao, true);

      const repetida = await app.inject({ method: "POST", url, headers: auth(tokenAdmin), payload });
      assert.equal(repetida.statusCode, 409);

      const lista = await app.inject({ url: `/api/v1/decisoes?ambienteId=${ambienteId}`, headers: auth(tokenAdmin) });
      assert.equal(lista.json().paginacao.total, 1);
    });

    it("arquivar mantém o histórico e bloqueia novos assessments", async () => {
      const del = await app.inject({ method: "DELETE", url: `/api/v1/ambientes/${ambienteId}`, headers: auth(tokenAdmin) });
      assert.equal(del.statusCode, 204);
      const lista = await app.inject({ url: "/api/v1/ambientes", headers: auth(tokenAdmin) });
      assert.equal(lista.json().paginacao.total, 0);
      const novo = await app.inject({
        method: "POST", url: `/api/v1/ambientes/${ambienteId}/assessments`, headers: auth(tokenAdmin), payload: {},
      });
      assert.equal(novo.statusCode, 422);
      assert.equal((await app.inject({ url: `/api/v1/assessments/${assessmentId}`, headers: auth(tokenAdmin) })).statusCode, 200);
    });
  });
});
