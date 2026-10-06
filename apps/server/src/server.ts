/**
 * Ponto de entrada da API Flowbix Assessment.
 *
 *   npm run dev          (recarrega ao salvar)
 *   npm run build && npm start
 *
 * Docs interativas: http://localhost:8090/docs
 */
import { construirApp } from "./app.js";
import { carregarEnv } from "./config/env.js";

let env;
try {
  env = carregarEnv();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}

const app = await construirApp({ env });

const interrompidos = await app.container.executor.recuperarInterrompidos();
if (interrompidos) app.log.warn({ interrompidos }, "assessments interrompidos marcados como ERRO");

for (const sinal of ["SIGINT", "SIGTERM"] as const) {
  process.once(sinal, async () => {
    app.log.info({ sinal }, "encerrando: aguardando requisições e assessments em curso");
    await app.close();
    process.exit(0);
  });
}

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (err) {
  app.log.fatal({ err }, "falha ao iniciar");
  process.exit(1);
}
