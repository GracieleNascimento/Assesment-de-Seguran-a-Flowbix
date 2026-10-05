/** Resolve segredos no formato "env:NOME" lendo de variáveis de ambiente. */
import { Ambiente } from "./types.js";

const CAMPOS_SEGREDO = ["senha", "apiToken"];

function resolver(valor: unknown): unknown {
  if (typeof valor === "string" && valor.startsWith("env:")) {
    return process.env[valor.slice(4).trim()] ?? "";
  }
  return valor;
}

/** Devolve uma cópia do ambiente com os segredos env: resolvidos. */
export function resolverSegredos(ambiente: Ambiente): Ambiente {
  const alvos: Ambiente["alvos"] = {};
  for (const [plataforma, cfg] of Object.entries(ambiente.alvos)) {
    if (!cfg) continue;
    const copia = { ...cfg };
    for (const campo of CAMPOS_SEGREDO) {
      if (campo in copia) copia[campo] = resolver(copia[campo]);
    }
    alvos[plataforma] = copia;
  }
  return { ...ambiente, alvos };
}
