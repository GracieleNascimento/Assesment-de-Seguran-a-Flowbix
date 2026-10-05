/** Validação ponta a ponta (dev): Grafana simulado -> assessment -> comitê -> relatório. */
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { Ambiente, Registro, avaliarComite, criteriosPadrao, rodarAssessment } from "@flowbix/core";
import { baseConhecimento } from "@flowbix/knowledge";
import { renderRelatorio } from "@flowbix/report";
import grafanaSeguranca from "@flowbix/module-grafana-security";

const RESP: Record<string, unknown> = {
  "/api/health": { version: "8.2.0", database: "ok" },
  "/api/admin/settings": {
    "auth.anonymous": { enabled: "true", org_role: "Editor" },
    users: { allow_sign_up: "true" },
    security: { cookie_secure: "false", content_security_policy: "false", allow_embedding: "true" },
    auth: { disable_brute_force_login_protection: "false" },
    plugins: { allow_loading_unsigned_plugins: "foo" },
    snapshots: { external_enabled: "true" },
    server: { protocol: "http" },
  },
  "/api/users": [{ login: "admin", isAdmin: true }, { login: "maria", isAdmin: true }],
  "/api/auth/keys": [{ name: "k1", expiration: null }],
  "/api/serviceaccounts/search": { serviceAccounts: [] },
};

const srv = createServer((req, res) => {
  const p = (req.url ?? "").split("?")[0];
  res.setHeader("Content-Type", "application/json");
  res.statusCode = p in RESP ? 200 : 404;
  res.end(JSON.stringify(RESP[p] ?? {}));
});

await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
const port = (srv.address() as { port: number }).port;

const registro = new Registro();
registro.registrar(grafanaSeguranca);

const ambiente: Ambiente = {
  nome: "Ambiente de Teste",
  alvos: { grafana: { url: `http://127.0.0.1:${port}`, apiToken: "x", verificarTls: false } },
  opcoes: { testarSenhaPadrao: false, maxAdmins: 3 },
};

const resultado = await rodarAssessment(registro, ambiente, baseConhecimento(), {
  executadoPor: "Validação", log: (m) => console.log(m),
});
const comite = avaliarComite(resultado.achados, resultado.resumo, criteriosPadrao());

console.log(`\nAchados: ${resultado.achados.length}`);
console.log(`Índice: ${resultado.resumo.score}% (nota ${resultado.resumo.nota})`);
console.log(`Comitê: ${comite.recomendacao.toUpperCase()}`);
for (const a of resultado.achados) console.log(`  ${a.checkId} ${a.status} | ${a.evidencia.slice(0, 70)}`);

writeFileSync("validacao_relatorio.html", renderRelatorio(resultado, { comite }), "utf-8");
console.log("\nRelatório salvo em validacao_relatorio.html");
srv.close();
