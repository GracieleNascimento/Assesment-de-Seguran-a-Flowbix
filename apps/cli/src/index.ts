/**
 * CLI de teste da plataforma: roda um assessment a partir de um arquivo de ambiente JSON.
 *
 *   node apps/cli/dist/index.js caminho/ambiente.json [saida.html]
 *
 * Sem argumentos, lista os módulos registrados.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  Ambiente, avaliarComite, criteriosPadrao, Registro, rodarAssessment,
} from "@flowbix/core";
import { baseConhecimento } from "@flowbix/knowledge";
import { renderRelatorio } from "@flowbix/report";
import grafanaSeguranca from "@flowbix/module-grafana-security";

function montarRegistro(): Registro {
  const registro = new Registro();
  registro.registrar(grafanaSeguranca);
  // registrar aqui os demais módulos (zabbix/elastic/graylog segurança, técnicos) conforme portados
  return registro;
}

async function main() {
  const registro = montarRegistro();
  const arquivo = process.argv[2];
  if (!arquivo) {
    console.log("Módulos registrados:");
    for (const m of registro.todos()) {
      console.log(`  - ${m.id} (${m.tipo}/${m.plataforma}) · ${m.catalogo().length} verificações`);
    }
    console.log("\nUso: node apps/cli/dist/index.js ambiente.json [saida.html]");
    return;
  }
  const ambiente: Ambiente = JSON.parse(readFileSync(arquivo, "utf-8"));
  const kb = baseConhecimento();
  const resultado = await rodarAssessment(registro, ambiente, kb, { log: (m) => console.log(m) });
  const comite = avaliarComite(resultado.achados, resultado.resumo, criteriosPadrao());

  console.log(`\nÍndice: ${resultado.resumo.score}% (nota ${resultado.resumo.nota})`);
  console.log(`Comitê: recomendação ${comite.recomendacao.toUpperCase()}`);
  for (const c of comite.criterios) console.log(`  ${c.ok ? "✓" : "✗"} ${c.titulo} — ${c.detalhe}`);

  const saida = process.argv[3];
  if (saida) {
    writeFileSync(saida, renderRelatorio(resultado, { comite }), "utf-8");
    console.log(`\nRelatório salvo em ${saida}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
