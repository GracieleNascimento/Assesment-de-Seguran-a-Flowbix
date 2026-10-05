/** Pontuação e agregações do assessment. Portado do motor Python (mesma fórmula). */
import {
  AchadoCompleto, PESOS, Plataforma, Severidade, Status,
} from "./types.js";

const AVALIADOS: Status[] = ["PASS", "WARN", "FAIL"];

/** Índice 0-100 ponderado por severidade; WARN vale 50%. null se nada avaliável. */
export function pontuar(achados: AchadoCompleto[]): number | null {
  let total = 0;
  let obtido = 0;
  for (const a of achados) {
    if (!AVALIADOS.includes(a.status)) continue;
    const p = PESOS[a.check.severidade];
    if (!p) continue;
    total += p;
    obtido += a.status === "PASS" ? p : a.status === "WARN" ? p * 0.5 : 0;
  }
  return total ? Math.round((1000 * obtido) / total) / 10 : null;
}

export function nota(score: number | null): string {
  if (score === null) return "-";
  for (const [lim, letra] of [[90, "A"], [75, "B"], [60, "C"], [40, "D"]] as const) {
    if (score >= lim) return letra;
  }
  return "E";
}

export interface ResumoPlataforma {
  score: number | null;
  total: number;
  fail: number;
  warn: number;
}

export interface Resumo {
  score: number | null;
  nota: string;
  contagem: Record<Status, number>;
  naoConformesPorSeveridade: Record<Severidade, number>;
  porPlataforma: Record<string, ResumoPlataforma>;
  porNorma: Record<string, number | null>;
  controlesNaoConformes: Record<string, string[]>;
}

export function resumir(achados: AchadoCompleto[], normas: string[]): Resumo {
  const contagem = {} as Record<Status, number>;
  const ncSev = {} as Record<Severidade, number>;
  for (const a of achados) {
    contagem[a.status] = (contagem[a.status] || 0) + 1;
    if (a.status === "FAIL" || a.status === "WARN") {
      ncSev[a.check.severidade] = (ncSev[a.check.severidade] || 0) + 1;
    }
  }

  const plataformas = [...new Set(achados.map((a) => a.check.plataforma))];
  const porPlataforma: Record<string, ResumoPlataforma> = {};
  for (const p of plataformas) {
    const rel = achados.filter((a) => a.check.plataforma === p);
    porPlataforma[p] = {
      score: pontuar(rel),
      total: rel.length,
      fail: rel.filter((a) => a.status === "FAIL").length,
      warn: rel.filter((a) => a.status === "WARN").length,
    };
  }

  const porNorma: Record<string, number | null> = {};
  const controlesNaoConformes: Record<string, string[]> = {};
  for (const norma of normas) {
    const rel = achados.filter((a) => norma in a.check.refs);
    porNorma[norma] = rel.length ? pontuar(rel) : null;
    const ruins = new Set<string>();
    for (const a of rel) {
      if (a.status === "FAIL") for (const r of a.check.refs[norma]) ruins.add(r.controle);
    }
    controlesNaoConformes[norma] = [...ruins].sort();
  }

  return {
    score: pontuar(achados),
    nota: nota(pontuar(achados)),
    contagem,
    naoConformesPorSeveridade: ncSev,
    porPlataforma,
    porNorma,
    controlesNaoConformes,
  };
}

export function plataformasDosAchados(achados: AchadoCompleto[]): Plataforma[] {
  return [...new Set(achados.map((a) => a.check.plataforma))];
}
