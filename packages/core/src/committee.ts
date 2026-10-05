/**
 * Portão do comitê: avalia critérios de aceite sobre os achados e registra a decisão
 * (go / no-go / condicional) com quem aprovou e quando. Base do "Termo de Validação".
 */
import { AchadoCompleto } from "./types.js";
import { Resumo } from "./scoring.js";

export interface Criterio {
  id: string;
  titulo: string;
  obrigatorio: boolean;
  /** avalia o critério; retorna ok + detalhe legível. */
  avaliar: (achados: AchadoCompleto[], resumo: Resumo) => { ok: boolean; detalhe: string };
}

const nFail = (achados: AchadoCompleto[], sev: string) =>
  achados.filter((a) => a.status === "FAIL" && a.check.severidade === sev).length;

/** Critérios padrão de aceite para repasse de ambiente de monitoramento ao cliente. */
export function criteriosPadrao(indiceMinimo = 70): Criterio[] {
  return [
    {
      id: "sem_criticos",
      titulo: "Nenhuma não conformidade CRÍTICA",
      obrigatorio: true,
      avaliar: (a) => {
        const n = nFail(a, "CRITICO");
        return { ok: n === 0, detalhe: n === 0 ? "Nenhum item crítico em falha." : `${n} item(ns) crítico(s) em falha.` };
      },
    },
    {
      id: "sem_altos",
      titulo: "Nenhuma não conformidade ALTA",
      obrigatorio: true,
      avaliar: (a) => {
        const n = nFail(a, "ALTO");
        return { ok: n === 0, detalhe: n === 0 ? "Nenhum item alto em falha." : `${n} item(ns) alto(s) em falha.` };
      },
    },
    {
      id: "indice_minimo",
      titulo: `Índice de segurança ≥ ${indiceMinimo}%`,
      obrigatorio: false,
      avaliar: (_a, r) => {
        const ok = r.score !== null && r.score >= indiceMinimo;
        return { ok, detalhe: `Índice atual: ${r.score ?? "-"}%.` };
      },
    },
  ];
}

export type Decisao = "go" | "no-go" | "condicional";

export interface AvaliacaoCriterio {
  id: string;
  titulo: string;
  obrigatorio: boolean;
  ok: boolean;
  detalhe: string;
}

export interface ResultadoComite {
  criterios: AvaliacaoCriterio[];
  recomendacao: Decisao;
  obrigatoriosOk: boolean;
}

/** Avalia os critérios e recomenda go/no-go (go só se todos os obrigatórios passam). */
export function avaliarComite(
  achados: AchadoCompleto[],
  resumo: Resumo,
  criterios: Criterio[] = criteriosPadrao(),
): ResultadoComite {
  const avaliados = criterios.map((c) => {
    const r = c.avaliar(achados, resumo);
    return { id: c.id, titulo: c.titulo, obrigatorio: c.obrigatorio, ok: r.ok, detalhe: r.detalhe };
  });
  const obrigatoriosOk = avaliados.filter((c) => c.obrigatorio).every((c) => c.ok);
  const todosOk = avaliados.every((c) => c.ok);
  const recomendacao: Decisao = obrigatoriosOk ? (todosOk ? "go" : "condicional") : "no-go";
  return { criterios: avaliados, recomendacao, obrigatoriosOk };
}

/** Registro imutável de uma decisão do comitê (vira evidência/Termo de Validação). */
export interface DecisaoComite {
  ambiente: string;
  decisao: Decisao;
  recomendacao: Decisao;
  decididoPor: string;
  decididoEm: string;
  observacao: string;
  score: number | null;
  nota: string;
  criticos: number;
  altos: number;
  criterios: AvaliacaoCriterio[];
  relatorio?: string;
}
