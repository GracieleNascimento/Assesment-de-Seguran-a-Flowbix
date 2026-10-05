/**
 * Base de conhecimento de segurança Flowbix.
 *
 * Carrega o kb.json (exportado da base Python já verificada: verificações, normas,
 * ameaças, casos reais e links) e o expõe tipado. É a fonte única consumida pelos
 * módulos de segurança e pelo motor/relatório.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import type { Ameaca, CasoReal, Check, RefControle } from "@flowbix/core";

interface KbCheck {
  id: string;
  plataforma: string;
  titulo: string;
  categoria: string;
  severidade: string;
  recomendacao: string;
  refs: Record<string, RefControle[]>;
  ameaca?: Ameaca;
}

interface Kb {
  versao: number;
  plataformas: Record<string, string>;
  severidades: string[];
  pesos: Record<string, number>;
  normas: Record<string, string>;
  norma_urls: Record<string, string>;
  owasp_top10_urls: Record<string, string>;
  mitre: Record<string, string>;
  casos: Record<string, CasoReal>;
  checks: Record<string, KbCheck>;
}

const aqui = dirname(fileURLToPath(import.meta.url));
const kb: Kb = JSON.parse(readFileSync(join(aqui, "..", "data", "kb.json"), "utf-8"));

/** Todas as verificações de segurança da base, no tipo Check do core. */
export const checksSeguranca: Record<string, Check> = Object.fromEntries(
  Object.entries(kb.checks).map(([id, c]) => [
    id,
    {
      id: c.id,
      plataforma: c.plataforma,
      tipo: "seguranca" as const,
      titulo: c.titulo,
      categoria: c.categoria,
      severidade: c.severidade as Check["severidade"],
      recomendacao: c.recomendacao,
      refs: c.refs,
      ameaca: c.ameaca,
    },
  ]),
);

/** Verificações de segurança de uma plataforma específica. */
export function checksDaPlataforma(plataforma: string): Check[] {
  return Object.values(checksSeguranca).filter((c) => c.plataforma === plataforma);
}

export const casos: Record<string, CasoReal> = kb.casos;
export const normas: Record<string, string> = kb.normas;
export const normaUrls: Record<string, string> = kb.norma_urls;
export const plataformas: Record<string, string> = kb.plataformas;

/** Pronto para passar ao motor (rodarAssessment). */
export function baseConhecimento() {
  return { casos, normas };
}
